// Réseau social du jeu, messages privés des personnalités, classement des fortunes.
import { PERSONNALITES, SCENARIOS, perso, rng, fortune, publicationsDuJour } from './personnalites.js';
import { minageDe, valeurReventeEUR } from './jeuminage.js';
import { journal } from './state.js';
import { noterAchat } from './jeufisc.js';
import { maintenant as tJeu } from './horloge.js';

const JOUR = 864e5, AN = 365.25 * JOUR;
const jourDe = t => Math.floor(t / JOUR);
const borne = (x, a = 0, b = 100) => Math.max(a, Math.min(b, x));

export function socialDe(partie) {
  return partie.social || (partie.social = { abonnes: 15, reputation: 50, fil: [], messages: [], jour: jourDe(partie.creeLe || tJeu()), a2f: false, predictions: [], derniers: {}, prixDepart: null, publies: {} });
}
export const seedDe = partie => (partie.simulation ? partie.simulation.seed : 0) ^ ((partie.creeLe / 1000) | 0);

/** Rapports des prix actuels à ceux du départ (pour les fortunes des personnalités). */
export function rapports(partie, prix) {
  const s = socialDe(partie);
  const alts = ['SOL', 'XRP', 'ADA', 'DOGE', 'AVAX', 'LINK'];
  const actuel = { BTC: prix('BTC'), ETH: prix('ETH'), ALT: null };
  const vals = alts.map(b => prix(b)).filter(Boolean);
  if (!actuel.BTC || !actuel.ETH) return { BTC: 1, ETH: 1, ALT: 1 };
  if (!s.prixDepart) s.prixDepart = { BTC: actuel.BTC, ETH: actuel.ETH, ALT: Object.fromEntries(alts.map(b => [b, prix(b)]).filter(x => x[1])) };
  const ra = Object.entries(s.prixDepart.ALT).map(([b, p0]) => (prix(b) ? prix(b) / p0 : 1));
  return { BTC: actuel.BTC / s.prixDepart.BTC, ETH: actuel.ETH / s.prixDepart.ETH, ALT: ra.length ? ra.reduce((a, x) => a + x, 0) / ra.length : 1 };
}

/** Classement des fortunes : personnalités et joueur. */
export function classement(partie, prix, patrimoineJoueur) {
  const r = rapports(partie, prix), ans = (tJeu() - (partie.creeLe || tJeu())) / AN, seed = seedDe(partie);
  const liste = PERSONNALITES.map(p => ({ id: p.id, nom: p.nom, pseudo: p.pseudo, role: p.role, couleur: p.couleur, fortune: fortune(p, r, ans, seed) }));
  liste.push({ id: 'moi', nom: [partie.profil.prenom, partie.profil.nom].filter(Boolean).join(' ') || 'Toi', pseudo: pseudoJoueur(partie), role: 'Toi', couleur: '#F3B33D', fortune: patrimoineJoueur || 0, moi: true });
  return liste.sort((a, b) => b.fortune - a.fortune);
}
export function pseudoJoueur(partie) { return ((partie.profil.prenom || 'Moi') + (partie.profil.nom ? partie.profil.nom[0] : '')).replace(/\s/g, '') + '_crypto'; }

// ---------- Une journée sur le réseau ----------
/**
 * ctx : { prix(base) → €, variation (bitcoin sur 24 h), actus: [], enSimulation, prixFutur(t) → prix BTC simulé ou null, patrimoine, cryptos, machines }
 * Renvoie les textes d'événements (nouveaux messages, résultats…).
 */
export function avancerSocial(partie, t, ctx) {
  const s = socialDe(partie);
  const evts = [];
  const seed = seedDe(partie);
  let j = Math.max(s.jour, jourDe(t) - 30), n = 0; // au-delà d'un mois d'écart, on ne rejoue que le dernier mois
  while (j < jourDe(t) && n++ < 30) {
    j++;
    const dernier = j === jourDe(t);
    const debutJour = j * JOUR;
    // Publications des personnalités
    for (const p of publicationsDuJour(j, seed, dernier ? ctx.variation || 0 : 0, dernier ? ctx.actus || [] : [])) s.fil.unshift({ ...p, t: debutJour + p.h * 36e5 });
    // Abonnés : la réputation fait grandir (ou fondre) ton audience
    const R = rng(seed, j, 11);
    s.abonnes = Math.max(0, Math.round(s.abonnes * (1 + (s.reputation - 45) / 100 * 0.004) + (R() < 0.3 ? 1 : 0)));
    // Pronostics publiés il y a 7 jours
    for (const pr of s.predictions.filter(x => !x.fini && debutJour - x.t >= 7 * JOUR)) {
      const p = ctx.prix(pr.base);
      if (!p) continue;
      pr.fini = true;
      const juste = pr.sens === 'hausse' ? p > pr.prix : p < pr.prix;
      s.reputation = borne(s.reputation + (juste ? 4 : -5));
      if (juste) s.justes = (s.justes || 0) + 1;
      const gain = juste ? Math.round(s.abonnes * 0.05 + 20) : -Math.round(s.abonnes * 0.03);
      s.abonnes = Math.max(0, s.abonnes + gain);
      evts.push(juste ? `Ton pronostic sur ${pr.base} était juste : +${gain} abonnés, ta réputation monte.` : `Ton pronostic sur ${pr.base} était faux : des abonnés te quittent.`);
    }
    // Pari avec Zoé
    if (s.pari && debutJour - s.pari.t >= 30 * JOUR && ctx.patrimoine) {
      const moi = ctx.patrimoine / s.pari.patrimoine - 1;
      const zoe = (ctx.prix('BTC') || 1) / s.pari.btc * 0.6 + 0.4 - 1 + (rng(seed, j, 5)() - 0.5) * 0.1;
      const gagne = moi > zoe;
      partie.banque.solde += gagne ? 100 : -100;
      evts.push(`Pari avec Zoé : ${gagne ? 'tu gagnes' : 'tu perds'} 100 € (toi ${(moi * 100).toFixed(1).replace('.', ',')} %, elle ${(zoe * 100).toFixed(1).replace('.', ',')} %).`);
      s.pari = null;
    }
    // Abonnement VIP du Renard : 299 € par mois
    if (s.vip && debutJour >= s.vip.prochain) { partie.banque.solde -= 299; s.vip.prochain += 30 * JOUR; evts.push('Groupe VIP du Renard : 299 € prélevés.'); }
    // Piratage du compte plateforme sans double authentification (rare)
    if (!s.a2f && ctx.plateforme > 500 && R() < 0.0004) evts.push(pirater(partie));
    // Message privé (environ deux par semaine)
    if (R() < 0.28) {
      const m = nouveauMessage(partie, s, debutJour, ctx, R);
      if (m) { s.messages.unshift(m); evts.push(`Nouveau message de ${perso(m.de).nom}.`); }
    }
  }
  s.jour = jourDe(t);
  if (s.fil.length > 80) s.fil.length = 80;
  if (s.messages.length > 40) s.messages.length = 40;
  return evts;
}

function pirater(partie) {
  const pl = partie.plateforme;
  const perteEur = Math.round(pl.soldeEUR * 0.25 * 100) / 100;
  pl.soldeEUR -= perteEur;
  for (const a of Object.values(pl.actifs)) a.qte *= 0.75;
  journal(partie, 'vie', 'Piratage : quelqu\'un a vidé une partie de ton compte plateforme (25 %). La double authentification t\'aurait protégé.');
  return 'Ton compte plateforme a été piraté : 25 % de tes avoirs ont disparu.';
}

function nouveauMessage(partie, s, t, ctx, R) {
  const c = { cryptos: ctx.cryptos || 0, patrimoine: ctx.patrimoine || 0, machines: ctx.machines || 0, abonnes: s.abonnes, a2f: s.a2f };
  const eligibles = SCENARIOS.filter(x => (!x.condition || x.condition(c)) && (!x.simulation || ctx.enSimulation) && !(s.derniers[x.id] > t - 30 * JOUR));
  if (!eligibles.length) return null;
  const tot = eligibles.reduce((a, x) => a + x.poids, 0);
  let r = R() * tot, sc = eligibles[0];
  for (const x of eligibles) { r -= x.poids; if (r <= 0) { sc = x; break; } }
  s.derniers[sc.id] = t;
  let texte = sc.texte;
  const meta = {};
  if (texte.includes('{tuyau}')) {
    // Tuyau sur le bitcoin dans deux semaines : juste avec la probabilité propre à la personnalité
    const p0 = ctx.prix('BTC'), p1 = ctx.prixFutur ? ctx.prixFutur(t + 14 * JOUR) : null;
    if (!p0 || !p1) return null;
    const juste = R() < perso(sc.de).fiabilite;
    const hausse = (p1 > p0) === juste;
    texte = texte.replace('{tuyau}', hausse ? 'le bitcoin devrait nettement monter d\'ici deux semaines' : 'le bitcoin risque de baisser dans les deux semaines');
    Object.assign(meta, { tuyau: hausse ? 'hausse' : 'baisse', prix: p0 });
  }
  if (texte.includes('{alt}')) { const alt = ['Dogecoin', 'Shiba Inu', 'Avalanche', 'Chainlink'][Math.floor(R() * 4)]; texte = texte.replace('{alt}', alt); meta.alt = alt; }
  return { id: t.toString(36) + sc.id, scenario: sc.id, de: sc.de, texte, t, reponses: sc.reponses, reponse: null, lu: false, ...meta };
}

// ---------- Réponses aux messages ----------
/** Applique la réponse choisie. ctx : { prix(base), eurUsd }. Renvoie { texte } (résultat) ou { erreur }. */
export function repondre(partie, msgId, reponseId, ctx, R = Math.random) {
  const s = socialDe(partie);
  const m = s.messages.find(x => x.id === msgId);
  if (!m || m.reponse) return { erreur: 'Message déjà traité.' };
  const lib = (m.reponses.find(x => x[0] === reponseId) || [, ''])[1];
  let texte = '';
  const pl = partie.plateforme;
  switch (reponseId) {
    case 'vip-payer':
      if (partie.banque.solde < 299) return { erreur: 'Pas assez sur ton compte bancaire.' };
      partie.banque.solde -= 299; s.vip = { depuis: tJeu(), prochain: tJeu() + 30 * JOUR };
      texte = 'Tu as rejoint le groupe VIP. 299 € par mois, résiliable dans l\'onglet Social.'; break;
    case 'signaler':
      s.reputation = borne(s.reputation + 2); texte = 'Signalement envoyé. Ta réputation monte un peu.'; break;
    case 'airdrop-connecter': {
      let perdu = 0;
      for (const [b, a] of Object.entries(pl.actifs)) { const q = a.qte * 0.6; a.qte -= q; perdu += q * (ctx.prix(b) || 0); }
      journal(partie, 'vie', `Arnaque à l'airdrop : ton portefeuille a été vidé en partie (${Math.round(perdu).toLocaleString('fr-FR')} € de cryptos volées).`);
      texte = `C'était une arnaque : ${Math.round(perdu).toLocaleString('fr-FR')} € de cryptos volés. Ne connecte jamais ton portefeuille à un site inconnu.`; break;
    }
    case 'a2f-activer': s.a2f = true; texte = 'Double authentification activée : ton compte est protégé contre le piratage.'; break;
    case 'pump-accepter': {
      const enquete = R() < 0.4;
      if (enquete) {
        const amende = Math.max(5000, Math.round((partie.banque.solde + pl.soldeEUR) * 0.1));
        partie.banque.solde -= amende; s.reputation = borne(s.reputation - 25);
        journal(partie, 'vie', `Manipulation de marché : l'Autorité des marchés numériques t'inflige ${amende.toLocaleString('fr-FR')} € d'amende.`);
        texte = `Enquête de l'Autorité des marchés numériques : ${amende.toLocaleString('fr-FR')} € d'amende et ta réputation s'effondre.`;
      } else {
        const gain = Math.round(500 + s.abonnes * 0.3);
        partie.banque.solde += gain; s.reputation = borne(s.reputation - 12); s.abonnes = Math.round(s.abonnes * 0.85);
        texte = `Le pump a marché : +${gain.toLocaleString('fr-FR')} €, mais tes abonnés ont perdu de l'argent et beaucoup te quittent.`;
      }
      break;
    }
    case 'otc-accepter': {
      if (partie.banque.solde < 20000) return { erreur: 'Il faut 20 000 € sur ton compte bancaire.' };
      partie.banque.solde -= 20000;
      const p = ctx.prix('BTC');
      if (R() < 0.45 || !p) { journal(partie, 'vie', 'Gré à gré avec Viktor : les 20 000 € ont disparu, la société chypriote n\'existe plus.'); texte = 'Les 20 000 € ont disparu : la société n\'existe plus. Leçon chère.'; }
      else {
        const q = 20000 / (p * 0.94);
        const a = pl.actifs.BTC || (pl.actifs.BTC = { qte: 0, cout: 0 });
        a.qte += q; a.cout = (a.cout || 0) + 20000;
        noterAchat(partie, 20000);
        journal(partie, 'achat', `Achat de gré à gré : ${q.toFixed(5).replace('.', ',')} BTC pour 20 000 € (6 % sous le marché).`);
        texte = `Ça a marché : ${q.toFixed(5).replace('.', ',')} BTC reçus sur ta plateforme, 6 % sous le marché.`;
      }
      break;
    }
    case 'ravi-acheter': {
      if (partie.banque.solde < 300) return { erreur: 'Pas assez sur ton compte bancaire.' };
      if (partie.profil.logement === 'parents') return { erreur: 'Pas de place chez tes parents pour une machine.' };
      partie.banque.solde -= 300;
      const mn = minageDe(partie), t = tJeu();
      mn.machines.push({ id: t.toString(36) + 'ravi', modele: 's19', statut: 'livraison', livraisonLe: t + 3 * JOUR, acheteLe: t, prixPaye: 300, mode: 'normal', santeHash: R() < 0.3 ? 0.85 : 1, heures: 20000, heuresDepuisNettoyage: 2000, garantieFin: 0, lieu: 'maison', engagementFin: 0 });
      journal(partie, 'machine', 'Achat d\'un Antminer S19 d\'occasion à Ravi pour 300 € (livraison en 3 jours).');
      texte = 'Marché conclu : le S19 arrive dans 3 jours. Pas de garantie entre particuliers !'; break;
    }
    case 'kenji-vendre': {
      const mn = minageDe(partie);
      const ventes = mn.machines.filter(x => x.statut !== 'livraison' && x.lieu === 'maison');
      if (!ventes.length || !ctx.eurUsd) return { erreur: 'Aucune machine à vendre chez toi.' };
      const total = Math.round(ventes.reduce((a, x) => a + valeurReventeEUR(x, ctx.eurUsd) * 1.1, 0));
      mn.machines = mn.machines.filter(x => !ventes.includes(x));
      partie.banque.solde += total;
      journal(partie, 'machine', `Parc vendu à Kumo Mining : ${ventes.length} machines pour ${total.toLocaleString('fr-FR')} €.`);
      texte = `Vendu : ${total.toLocaleString('fr-FR')} € pour ${ventes.length} machines.`; break;
    }
    case 'collab': { const g = Math.round(1500 + R() * 6000); s.abonnes += g; s.reputation = borne(s.reputation + 2); if (partie.jauges) partie.jauges.energie = borne(partie.jauges.energie - 8); texte = `La vidéo cartonne : +${g.toLocaleString('fr-FR')} abonnés.`; break; }
    case 'fonds-investir': {
      if (partie.banque.solde < 50000) return { erreur: 'Il faut 50 000 € sur ton compte bancaire.' };
      partie.banque.solde -= 50000;
      const f = s.fonds || (s.fonds = { parts: [] });
      f.parts.push({ montant: 50000, t: tJeu(), btc: ctx.prix('BTC'), eth: ctx.prix('ETH') });
      journal(partie, 'vie', 'Investissement de 50 000 € dans le fonds Fontaine Digital (frais 2 % par an).');
      texte = '50 000 € investis dans le fonds de Clara. Tu peux récupérer ta part dans l\'onglet Social.'; break;
    }
    case 'pari': s.pari = { t: tJeu(), patrimoine: ctx.patrimoine || 1, btc: ctx.prix('BTC') || 1 }; texte = 'Pari lancé pour un mois !'; break;
    case 'interview': { const g = Math.round(3000 + R() * 7000); s.abonnes += g; s.reputation = borne(s.reputation + 3); if (partie.jauges) partie.jauges.stress = borne(partie.jauges.stress + 5); texte = `L'article sort : +${g.toLocaleString('fr-FR')} abonnés.`; break; }
    default: texte = '';
  }
  m.reponse = reponseId; m.reponseTexte = lib; m.resultat = texte; m.lu = true;
  return { texte };
}

export function resilierVip(partie) { const s = socialDe(partie); s.vip = null; journal(partie, 'vie', 'Groupe VIP résilié.'); }

/** Valeur du fonds de Clara : 50 % BTC, 25 % ETH, 25 % prudent, moins 2 % de frais par an. */
export function valeurFonds(partie, prix, t = tJeu()) {
  const f = partie.social && partie.social.fonds;
  if (!f || !f.parts.length) return 0;
  return f.parts.reduce((a, x) => {
    const rb = prix('BTC') && x.btc ? prix('BTC') / x.btc : 1, re = prix('ETH') && x.eth ? prix('ETH') / x.eth : 1;
    return a + x.montant * (0.5 * rb + 0.25 * re + 0.25 * 1.02 ** ((t - x.t) / AN)) * 0.98 ** ((t - x.t) / AN);
  }, 0);
}
export function retirerFonds(partie, prix) {
  const v = Math.round(valeurFonds(partie, prix));
  if (!v) return { erreur: 'Aucune part dans le fonds.' };
  partie.banque.solde += v; partie.social.fonds = null;
  journal(partie, 'vie', `Parts du fonds Fontaine Digital revendues : ${v.toLocaleString('fr-FR')} €.`);
  return { montant: v };
}

// ---------- Publier ----------
export const TYPES_PUBLICATION = [
  ['avis', 'Pronostic'], ['gains', 'Montrer mes résultats'], ['conseil', 'Conseil pédagogique'], ['meme', 'Mème']
];
/** Publication du joueur. opts : { base, sens } pour un pronostic ; perf (fraction) pour les résultats. */
export function publier(partie, type, opts, ctx, R = Math.random) {
  const s = socialDe(partie), t = tJeu(), j = jourDe(t);
  s.publies[j] = (s.publies[j] || 0) + 1;
  if (s.publies[j] > 3) return { erreur: 'Trois publications par jour, c\'est déjà beaucoup.' };
  let texte = '', gain = 0;
  if (type === 'avis') {
    const p = ctx.prix(opts.base);
    if (!p) return { erreur: 'Prix indisponible.' };
    s.predictions.push({ t, base: opts.base, sens: opts.sens, prix: p });
    texte = `Mon avis : ${opts.base} va ${opts.sens === 'hausse' ? 'monter 📈' : 'baisser 📉'} cette semaine. On en reparle dans 7 jours.`;
    gain = Math.round(2 + s.abonnes * 0.002);
  } else if (type === 'gains') {
    const perf = opts.perf || 0;
    texte = perf >= 0 ? `Mon portefeuille : +${(perf * 100).toFixed(1).replace('.', ',')} % depuis le début 💪` : `Je suis à ${(perf * 100).toFixed(1).replace('.', ',')} %… on apprend.`;
    gain = Math.round((perf > 0 ? 5 + s.abonnes * 0.01 * Math.min(3, perf * 10) : 2) * (0.5 + R()));
    if (perf > 0.5) s.reputation = borne(s.reputation - 1); // la frime agace
    else if (perf < 0) s.reputation = borne(s.reputation + 1); // l'honnêteté plaît
  } else if (type === 'conseil') {
    texte = ['N\'investissez que ce que vous pouvez perdre.', 'Activez la double authentification, toujours.', 'Méfiez-vous des promesses de rendement garanti.', 'Gardez une épargne de précaution avant d\'investir.'][Math.floor(R() * 4)];
    s.reputation = borne(s.reputation + 1); gain = Math.round(1 + s.abonnes * 0.003);
  } else {
    texte = ['Moi quand le bitcoin baisse de 2 % : 🫠', 'Ma banque quand je vire tout sur la plateforme : 👀', '« Je vends au sommet » — personne, jamais'][Math.floor(R() * 3)];
    gain = R() < 0.1 ? Math.round(50 + R() * 500 + s.abonnes * 0.1) : Math.round(R() * 5 + s.abonnes * 0.002);
  }
  s.abonnes += gain;
  s.fil.unshift({ auteur: 'moi', texte, t, likes: Math.round(gain * 3 + R() * 5) });
  if (partie.jauges) partie.jauges.energie = borne(partie.jauges.energie - 1);
  return { texte, gain };
}
