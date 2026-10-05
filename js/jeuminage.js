// Règles du minage dans la partie : achats, mise en marche, factures, versements.
import { CATALOGUE, COMPTEUR, LIVRAISON, modele, pool, avancer, puissanceDispo, prixMachineEUR, jourTempo } from './minage.js';
import { DIFFICULTES } from './config.js';
import { journal } from './state.js';
import { eur } from './format.js';

function premierDuMoisSuivant(t) {
  const d = new Date(t);
  return new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
}

export function minageDe(partie) {
  if (!partie.minage) {
    const kva = COMPTEUR[partie.profil.logement] || 6;
    partie.minage = {
      pool: 'braiins', machines: [], soldePool: 0, gainsTotal: 0, factureKWh: 0, factureEUR: 0,
      contrat: { type: 'base', kva }, dernierCalcul: Date.now(), prochaineFacture: premierDuMoisSuivant(Date.now()),
      reseau: null, couleurs: {}
    };
  }
  return partie.minage;
}

export function kwEnMarche(minage) {
  return minage.machines.filter(m => m.statut === 'marche').reduce((s, m) => s + modele(m.modele).w, 0) / 1000;
}
export function thEnMarche(minage) {
  return minage.machines.filter(m => m.statut === 'marche').reduce((s, m) => s + modele(m.modele).th, 0);
}

export function acheter(partie, id, eurUsd) {
  const m = modele(id);
  const d = DIFFICULTES[partie.difficulte];
  if (!m) return { erreur: 'Machine inconnue.' };
  if (partie.profil.logement === 'parents') return { erreur: "Chez tes parents, pas de place pour un ASIC : bruit, chaleur et compteur partagé. Il faudra un hébergeur (version 0.6)." };
  if (m.refroidissement === 'hydro') return { erreur: 'Cette machine demande un circuit de refroidissement à eau. Installations hydro : version 0.6.' };
  if (!eurUsd) return { erreur: 'Taux euro-dollar indisponible pour le moment. Réessaie dans un instant.' };
  const p = prixMachineEUR(m, eurUsd);
  if (p.total > partie.banque.solde + 1e-9) return { erreur: 'Solde bancaire insuffisant : il faut ' + eur(p.total) + ', tu as ' + eur(partie.banque.solde) + '.' };
  partie.banque.solde -= p.total;
  const mn = minageDe(partie);
  const delai = LIVRAISON[m.etat].jours * 864e5 / d.temps;
  const machine = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), modele: id, statut: 'livraison', livraisonLe: Date.now() + delai, acheteLe: Date.now(), prixPaye: p.total };
  mn.machines.push(machine);
  journal(partie, 'machine', `Achat : ${m.nom} (${m.etat}) pour ${eur(p.total)}, livraison prévue dans ${Math.round(delai / 36e5)} h`);
  return { machine };
}

export function demarrer(partie, id) {
  const mn = minageDe(partie);
  const m = mn.machines.find(x => x.id === id);
  if (!m || m.statut !== 'arret') return { erreur: 'Machine indisponible.' };
  const dispo = puissanceDispo(partie.profil.logement, mn.contrat.kva);
  const apres = kwEnMarche(mn) + modele(m.modele).w / 1000;
  if (apres > dispo + 1e-9) return { erreur: `Ton compteur de ${mn.contrat.kva} kVA ne suit pas : ${apres.toFixed(1).replace('.', ',')} kW demandés pour ${dispo} kW disponibles (2 kVA restent pour le logement). Le disjoncteur sauterait.` };
  m.statut = 'marche';
  journal(partie, 'machine', `${modele(m.modele).nom} mise en marche`);
  return {};
}

export function arreter(partie, id) {
  const mn = minageDe(partie);
  const m = mn.machines.find(x => x.id === id);
  if (!m || m.statut !== 'marche') return { erreur: 'Machine déjà arrêtée.' };
  m.statut = 'arret';
  journal(partie, 'machine', `${modele(m.modele).nom} arrêtée`);
  return {};
}

/**
 * Fait avancer le minage jusqu'à maintenant. reseau : données réseau réelles (ou dernières connues).
 * prixBTC : prix actuel du bitcoin en euros (valeur des versements reçus).
 */
export function avancerPartie(partie, maintenant, { reseau, couleurs, prixBTC }) {
  const mn = minageDe(partie);
  if (reseau) mn.reseau = reseau;
  const r = mn.reseau;
  if (!r) return []; // sans données réseau, on attend plutôt que de compter l'électricité seule
  Object.assign(mn.couleurs, couleurs || {});
  const d = DIFFICULTES[partie.difficulte];
  const pl = partie.plateforme;
  const evts = avancer(mn, mn.dernierCalcul, maintenant, {
    reseau: r, couleurs: mn.couleurs, multMinage: d.minage, multElec: d.elec, peutRecevoir: pl.statut === 'ouvert',
    payer: (base, q, t) => {
      const a = pl.actifs[base] || (pl.actifs[base] = { qte: 0, cout: 0 });
      const valeur = prixBTC ? q * prixBTC : 0;
      a.qte += q; a.cout += valeur; // prix de revient = valeur au moment de la réception
      (partie.revenusMinage || (partie.revenusMinage = [])).push({ t, btc: q, eur: valeur });
    }
  });
  mn.dernierCalcul = maintenant;
  for (const e of evts) partie.historique.unshift({ t: e.t, type: 'machine', texte: e.texte });

  // Facture mensuelle, prélevée sur le compte bancaire le 1er du mois
  while (maintenant >= mn.prochaineFacture) {
    if (mn.factureEUR > 0.005) {
      const montant = Math.round(mn.factureEUR * 100) / 100;
      partie.banque.solde -= montant;
      const texte = `Facture d'électricité du minage : ${Math.round(mn.factureKWh)} kWh, ${eur(montant)} prélevés` + (partie.banque.solde < 0 ? ' (compte à découvert)' : '');
      partie.historique.unshift({ t: mn.prochaineFacture, type: 'facture', texte });
      evts.push({ t: mn.prochaineFacture, texte });
    }
    mn.factureEUR = 0; mn.factureKWh = 0;
    mn.prochaineFacture = premierDuMoisSuivant(mn.prochaineFacture + 1);
  }
  if (evts.length) partie.historique.sort((a, b) => b.t - a.t);
  return evts.map(e => e.texte);
}

// Jours Tempo couverts par une période (pour charger leurs couleurs réelles).
export function joursEntre(t0, t1) {
  const jours = new Set();
  for (let t = t0; t <= t1 + 864e5; t += 6 * 36e5) jours.add(jourTempo(Math.min(t, t1 + 864e5)));
  return [...jours].slice(-40);
}
