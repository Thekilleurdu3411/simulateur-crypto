// Règles du minage dans la partie : achats, mise en marche, factures, versements.
import { CATALOGUE, COMPTEUR, LIVRAISON, MODES, GARANTIE_JOURS, ENVOI_SAV, VENTILATION, modele, pool, avancer, puissanceDispo, prixMachineEUR, jourTempo, infosPanne, valeurReventeUSD } from './minage.js';
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

const wDe = m => modele(m.modele).w * MODES[m.mode || 'normal'].w / 1000;
export function kwEnMarche(minage) {
  return minage.machines.filter(m => m.statut === 'marche').reduce((s, m) => s + wDe(m), 0);
}
export function thEnMarche(minage) {
  return minage.machines.filter(m => m.statut === 'marche').reduce((s, m) => s + modele(m.modele).th * MODES[m.mode || 'normal'].th * (m.santeHash ?? 1), 0);
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
  const machine = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), modele: id, statut: 'livraison', livraisonLe: Date.now() + delai, acheteLe: Date.now(), prixPaye: p.total,
    mode: 'normal', santeHash: 1, heures: 0, heuresDepuisNettoyage: 0, garantieFin: m.etat === 'neuf' ? Date.now() + delai + GARANTIE_JOURS * 864e5 : 0 };
  mn.machines.push(machine);
  journal(partie, 'machine', `Achat : ${m.nom} (${m.etat}) pour ${eur(p.total)}, livraison prévue dans ${Math.round(delai / 36e5)} h`);
  return { machine };
}

export function demarrer(partie, id) {
  const mn = minageDe(partie);
  const m = mn.machines.find(x => x.id === id);
  if (!m || m.statut !== 'arret') return { erreur: 'Machine indisponible.' };
  const dispo = puissanceDispo(partie.profil.logement, mn.contrat.kva);
  const apres = kwEnMarche(mn) + wDe(m);
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
export function avancerPartie(partie, maintenant, { reseau, couleurs, prixBTC, temperature, absence }) {
  const mn = minageDe(partie);
  if (reseau) mn.reseau = reseau;
  const r = mn.reseau;
  if (!r) return []; // sans données réseau, on attend plutôt que de compter l'électricité seule
  Object.assign(mn.couleurs, couleurs || {});
  const d = DIFFICULTES[partie.difficulte];
  const pl = partie.plateforme;
  const evts = avancer(mn, mn.dernierCalcul, maintenant, {
    reseau: r, couleurs: mn.couleurs, multMinage: d.minage, multElec: d.elec, peutRecevoir: pl.statut === 'ouvert',
    logement: partie.profil.logement, temperature, rng: Math.random, bruit: d.bruit,
    pannes: absence && d.protectionAbsence ? 0 : d.pannes,
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

// ---------- Gestion du parc (V0.4) ----------

export function changerMode(partie, id, mode) {
  const mn = minageDe(partie);
  const m = mn.machines.find(x => x.id === id);
  if (!m || !MODES[mode]) return { erreur: 'Réglage impossible.' };
  if (m.statut === 'marche') {
    const dispo = puissanceDispo(partie.profil.logement, mn.contrat.kva);
    const apres = kwEnMarche(mn) - wDe(m) + modele(m.modele).w * MODES[mode].w / 1000;
    if (apres > dispo + 1e-9) return { erreur: `Le compteur ne suit pas en mode ${MODES[mode].nom} : ${apres.toFixed(1).replace('.', ',')} kW pour ${dispo} kW disponibles.` };
  }
  m.mode = mode;
  journal(partie, 'machine', `${modele(m.modele).nom} réglée en mode ${MODES[mode].nom}`);
  return {};
}

export function depoussierer(partie, id) {
  const m = minageDe(partie).machines.find(x => x.id === id);
  if (!m) return { erreur: 'Machine introuvable.' };
  m.heuresDepuisNettoyage = 0;
  journal(partie, 'machine', `${modele(m.modele).nom} dépoussiérée`);
  return {};
}

// Coût et délai d'une réparation (gratuite hors envoi si la garantie court encore).
export function devisReparation(partie, m) {
  const p = infosPanne(m);
  if (!p) return null;
  const garantie = m.garantieFin && Date.now() < m.garantieFin;
  const d = DIFFICULTES[partie.difficulte];
  return { panne: p, garantie, cout: garantie ? ENVOI_SAV : p.cout, delai: (garantie ? Math.max(p.jours, 10) : p.jours) * 864e5 / d.temps };
}

export function reparer(partie, id) {
  const m = minageDe(partie).machines.find(x => x.id === id);
  const devis = m && devisReparation(partie, m);
  if (!devis) return { erreur: 'Aucune panne à réparer.' };
  if (devis.cout > partie.banque.solde + 1e-9) return { erreur: 'Solde bancaire insuffisant pour la réparation : ' + eur(devis.cout) + '.' };
  partie.banque.solde -= devis.cout;
  m.statut = 'reparation'; m.reparationFin = Date.now() + devis.delai;
  journal(partie, 'machine', `Réparation lancée : ${devis.panne.nom} sur ${modele(m.modele).nom}, ${eur(devis.cout)}${devis.garantie ? ' (sous garantie, frais d\'envoi)' : ''}`);
  return {};
}

export function valeurReventeEUR(m, eurUsd) { return eurUsd ? valeurReventeUSD(m) / eurUsd * 0.9 : 0; } // 10 % de frais de vente

export function vendre(partie, id, eurUsd) {
  const mn = minageDe(partie);
  const i = mn.machines.findIndex(x => x.id === id);
  const m = mn.machines[i];
  if (!m || !['arret', 'panne'].includes(m.statut)) return { erreur: 'Arrête la machine avant de la vendre.' };
  if (!eurUsd) return { erreur: 'Taux euro-dollar indisponible pour le moment.' };
  const v = Math.round(valeurReventeEUR(m, eurUsd) * 100) / 100;
  partie.banque.solde += v;
  mn.machines.splice(i, 1);
  journal(partie, 'machine', `Vente d'occasion : ${modele(m.modele).nom} pour ${eur(v)}`);
  return { montant: v };
}

export function valeurParc(partie, eurUsd) {
  if (!partie.minage || !eurUsd) return 0;
  return partie.minage.machines.filter(m => m.statut !== 'livraison').reduce((s, m) => s + valeurReventeEUR(m, eurUsd), 0)
    + partie.minage.machines.filter(m => m.statut === 'livraison').reduce((s, m) => s + m.prixPaye, 0);
}

export function acheterVentilation(partie) {
  const mn = minageDe(partie);
  if (mn.ventilation) return { erreur: 'Déjà installé.' };
  if (VENTILATION.prix > partie.banque.solde) return { erreur: 'Solde bancaire insuffisant : ' + eur(VENTILATION.prix) + '.' };
  partie.banque.solde -= VENTILATION.prix;
  mn.ventilation = true;
  journal(partie, 'machine', `Installation d'un extracteur d'air : ${eur(VENTILATION.prix)}`);
  return {};
}
