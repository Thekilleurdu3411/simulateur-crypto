// Fiscalité dans la partie : enregistrement des opérations, prélèvements, déclarations et paiements.
import { reglesDe } from './config.js';
import { fiscDe, acquisition, cession, bilan, calendrier, redressement } from './fiscalite.js';
import { journal } from './state.js';
import { eur } from './format.js';
import { maintenant as tJeu } from './horloge.js';

// Valeur de tous les actifs numériques du joueur (fournie par l'appli, qui connaît les prix).
let evaluateur = () => 0;
export function definirEvaluateur(f) { evaluateur = f; }

// Modes : Découverte désactivée, Investisseur prélevée à chaque vente, Expert automatique, Réalité manuelle.
export function mode(partie) {
  return reglesDe(partie).impots || 'auto';
}

export function noterAchat(partie, eurDepense, t = tJeu()) {
  if (mode(partie) === 'off') return;
  acquisition(fiscDe(partie), eurDepense, t);
}
export function noterMinage(partie, valeur, t = tJeu()) {
  if (mode(partie) === 'off' || !(valeur > 0)) return;
  acquisition(fiscDe(partie), valeur, t, 'minage');
}

/** À appeler APRÈS la cession : la valeur globale d'avant = valeur restante + euros reçus. */
export function noterCession(partie, prix, t = tJeu()) {
  if (mode(partie) === 'off') return null;
  const f = fiscDe(partie);
  const pv = cession(f, prix, evaluateur(partie) + prix, t);
  if (mode(partie) === 'preleve') prelever(partie, new Date(t).getFullYear());
  return pv;
}

// Investisseur : la flat tax de l'année est ajustée à chaque cession (prélevée ou rendue sur la banque).
function prelever(partie, an) {
  const f = fiscDe(partie);
  const b = bilan(f, an, partie.profil);
  const deja = f.preleve[an] || 0;
  const delta = Math.round((b.impotPV - deja) * 100) / 100;
  if (Math.abs(delta) < 0.01) return;
  partie.banque.solde -= delta;
  f.preleve[an] = deja + delta;
  journal(partie, 'impot', delta > 0 ? `Flat tax prélevée sur ta plus-value : ${eur(delta)}` : `Flat tax remboursée (moins-value) : ${eur(-delta)}`);
}

function anneesActives(f) {
  const ans = new Set([...f.cessions.map(c => new Date(c.t).getFullYear()), ...f.minage.map(m => new Date(m.t).getFullYear())]);
  return [...ans].sort();
}

/** Ouvre les déclarations, applique les échéances et les paiements. Renvoie les événements. */
export function echeances(partie, maintenant = tJeu()) {
  if (mode(partie) === 'off' || !partie.fisc) return [];
  const f = partie.fisc;
  const m = mode(partie);
  const evts = [];
  for (const an of anneesActives(f)) {
    if (an >= new Date(maintenant).getFullYear()) continue;
    const cal = calendrier(an);
    const d = f.declarations[an] || (f.declarations[an] = { statut: 'a-venir' });
    const reel = bilan(f, an, partie.profil);
    if (d.statut === 'a-venir' && maintenant >= cal.ouverture) {
      if (m === 'manuel') { d.statut = 'ouverte'; evts.push(`Déclaration des revenus ${an} ouverte : remplis-la avant le ${new Date(cal.limite).toLocaleDateString('fr-FR')}.`); }
      else { d.statut = 'deposee'; d.declare = { pv: reel.pvNette, recettes: reel.recettesMinage }; evts.push(`Déclaration des revenus ${an} remplie automatiquement : ${eur(reel.total)} d'impôt.`); }
    }
    if (d.statut === 'ouverte' && maintenant > cal.limite) { d.statut = 'retard'; evts.push(`Date limite dépassée pour ta déclaration ${an} : majoration de 10 %.`); }
    if (['deposee', 'retard', 'ouverte'].includes(d.statut) && maintenant >= cal.paiement) {
      const mois = Math.round((cal.paiement - cal.limite) / (30 * 864e5));
      const r = m === 'manuel' ? redressement(reel, d.statut === 'retard' && !d.declare ? null : d.declare, partie.profil, mois) : { du: reel.total, motif: null };
      const deja = f.preleve[an] || 0;
      const reste = Math.round((r.du - deja) * 100) / 100;
      partie.banque.solde -= reste;
      d.statut = 'payee'; d.paye = r.du; d.motif = r.motif;
      const texte = `Impôt sur tes revenus crypto ${an} : ${eur(reste)} prélevés` + (r.motif ? ' · ' + r.motif : '') + (partie.banque.solde < 0 ? ' (compte à découvert)' : '');
      partie.historique.unshift({ t: cal.paiement, type: 'impot', texte });
      evts.push(texte);
    }
  }
  return evts;
}

// Réalité : le joueur dépose sa déclaration (plus-value nette et recettes de minage).
export function deposer(partie, an, pv, recettes) {
  const f = fiscDe(partie);
  const d = f.declarations[an];
  if (!d || !['ouverte', 'retard'].includes(d.statut)) return { erreur: 'Aucune déclaration à déposer pour cette année.' };
  d.declare = { pv, recettes };
  if (d.statut === 'ouverte') d.statut = 'deposee';
  journal(partie, 'impot', `Déclaration ${an} déposée : plus-value ${eur(pv)}, recettes de minage ${eur(recettes)}`);
  return {};
}
