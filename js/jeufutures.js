// Règles des perpétuels dans la partie : portefeuille de marge, positions, financement, liquidations.
import { DIFFICULTES } from './config.js';
import { contrat, ouvrir, fermer, estLiquidee, financement, prochainFinancement, risque, pnl } from './futures.js';
import { journal } from './state.js';
import { eur } from './format.js';

const u = v => v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';

export function futuresDe(partie) {
  return partie.futures || (partie.futures = { soldeUSDT: 0, positions: [], suiviJusqua: Date.now(), resultats: [] });
}

// Conversion euros ↔ USDT au cours réel EUR/USDT, 0,1 % de frais.
export function transferer(partie, sens, montant, eurUsd) {
  const f = futuresDe(partie), pl = partie.plateforme;
  if (!eurUsd) return { erreur: 'Cours EUR/USDT indisponible pour le moment.' };
  if (!(montant > 0)) return { erreur: 'Indique un montant.' };
  if (sens === 'vers-marge') {
    if (montant > pl.soldeEUR + 1e-9) return { erreur: 'Solde insuffisant : ' + eur(pl.soldeEUR) + ' disponibles.' };
    const usdt = montant * eurUsd * 0.999;
    pl.soldeEUR -= montant; f.soldeUSDT += usdt;
    journal(partie, 'derive', `Conversion de ${eur(montant)} en ${u(usdt)} pour la marge`);
    return { recu: usdt };
  }
  if (montant > f.soldeUSDT + 1e-9) return { erreur: 'Solde de marge insuffisant : ' + u(f.soldeUSDT) + '.' };
  const e = montant / eurUsd * 0.999;
  f.soldeUSDT -= montant; pl.soldeEUR += e;
  journal(partie, 'derive', `Conversion de ${u(montant)} en ${eur(e)}`);
  return { recu: e };
}

export function ouvrirPosition(partie, p, marche, regles) {
  const f = futuresDe(partie);
  const d = DIFFICULTES[partie.difficulte];
  if (!d.levierMax) return { erreur: 'Les dérivés sont désactivés en Découverte.' };
  const r = ouvrir({ ...p, bid: marche.bid, ask: marche.ask, pas: regles.pas, minNotional: regles.minNotional, solde: f.soldeUSDT, levierMax: d.levierMax, maintenant: Date.now() });
  if (r.erreur) return r;
  const pos = r.position;
  pos.prochainFinancement = prochainFinancement(pos.ouverteLe);
  f.soldeUSDT -= pos.marge + r.frais;
  f.positions.push(pos);
  if (f.positions.length === 1) f.suiviJusqua = Date.now();
  journal(partie, 'derive', `${pos.sens === 'long' ? 'Achat' : 'Vente'} ×${pos.levier} de ${pos.qte.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} ${contrat(pos.s).base} à ${pos.entree.toLocaleString('fr-FR')} USDT (marge ${u(pos.marge)}, liquidation ${Math.round(pos.liquidation).toLocaleString('fr-FR')})`);
  return r;
}

export function fermerPosition(partie, id, bid, ask) {
  const f = futuresDe(partie);
  const i = f.positions.findIndex(x => x.id === id);
  if (i < 0) return { erreur: 'Position introuvable.' };
  const pos = f.positions[i];
  const r = fermer(pos, bid, ask);
  f.soldeUSDT += r.rendu;
  f.positions.splice(i, 1);
  f.resultats.push({ t: Date.now(), s: pos.s, net: r.net, financement: pos.financement });
  journal(partie, 'derive', `Position ${pos.sens} ${contrat(pos.s).base} fermée à ${r.prix.toLocaleString('fr-FR')} : résultat ${r.net >= 0 ? '+' : ''}${u(r.net)}`);
  return r;
}

function liquider(partie, pos, prix, t) {
  const f = futuresDe(partie);
  f.positions = f.positions.filter(x => x.id !== pos.id);
  f.resultats.push({ t, s: pos.s, net: -pos.marge + pos.financement, financement: pos.financement, liquidation: true });
  const texte = `Liquidation : position ${pos.sens} ×${pos.levier} ${contrat(pos.s).base} à ${Math.round(prix).toLocaleString('fr-FR')} USDT, marge de ${u(pos.marge)} perdue`;
  partie.historique.unshift({ t, type: 'derive', texte });
  return texte;
}

function payerFinancement(partie, pos, marque, taux, t) {
  const montant = financement(pos, marque, taux);
  const f = futuresDe(partie);
  f.soldeUSDT += montant;
  pos.financement += montant;
  pos.prochainFinancement = prochainFinancement(t);
}

/**
 * Nouveau prix de marque en direct : financement échu, alerte, liquidation.
 * Renvoie les textes d'événements à afficher.
 */
export function surPrixMarque(partie, s, m, t = Date.now()) {
  if (!partie.futures) return [];
  const d = DIFFICULTES[partie.difficulte];
  const f = partie.futures;
  const evts = [];
  for (const pos of f.positions.filter(x => x.s === s)) {
    while (pos.prochainFinancement <= t) payerFinancement(partie, pos, m.p, m.r, pos.prochainFinancement);
    if (estLiquidee(pos, m.p, m.p)) { evts.push(liquider(partie, pos, m.p, t)); continue; }
    if (d.bruit === 'alertes' && risque(pos, m.p) >= 0.8 && !pos.alerte) {
      pos.alerte = true;
      evts.push(`Alerte : ta position ${pos.sens} ${contrat(pos.s).base} a perdu 80 % de sa marge. Liquidation à ${Math.round(pos.liquidation).toLocaleString('fr-FR')} USDT.`);
    }
  }
  if (f.positions.length) f.suiviJusqua = t;
  return evts;
}

/** Rejoue l'absence avec les vrais prix de marque et taux de financement. */
export async function rattraper(partie, F) {
  const f = partie.futures;
  if (!f || !f.positions.length) return [];
  const d = DIFFICULTES[partie.difficulte];
  const depuis = f.suiviJusqua || Date.now(), maintenant = Date.now();
  if (maintenant - depuis < 60000) return [];
  const evts = [];
  for (const s of [...new Set(f.positions.map(p => p.s))]) {
    let bougies, fin;
    try {
      [bougies, fin] = await Promise.all([F.bougiesMarque(s, depuis, maintenant), F.historiqueFinancement(s, depuis, maintenant)]);
    } catch (e) { return evts; }
    // Événements dans l'ordre du temps : financements puis bougies.
    const fil = [...fin.map(x => ({ t: x.t, fin: x })), ...bougies.map(b => ({ t: b.t, b }))].sort((a, b) => a.t - b.t);
    for (const ev of fil) {
      for (const pos of f.positions.filter(x => x.s === s)) {
        if (ev.fin && ev.t >= pos.ouverteLe && ev.t >= pos.prochainFinancement - 1000) payerFinancement(partie, pos, ev.fin.marque, ev.fin.taux, ev.t);
        if (ev.b && d.liquidationAbsence && ev.t + 60000 > pos.ouverteLe && estLiquidee(pos, ev.b.l, ev.b.h)) evts.push(liquider(partie, pos, pos.liquidation, ev.t));
      }
    }
  }
  f.suiviJusqua = maintenant;
  return evts;
}

// Valeur des dérivés en euros : solde de marge + marges engagées + résultats latents.
export function valeurDerivesEUR(partie, marques, eurUsd) {
  const f = partie.futures;
  if (!f || !eurUsd) return 0;
  let usdt = f.soldeUSDT;
  for (const pos of f.positions) {
    const m = marques[pos.s];
    usdt += Math.max(0, pos.marge + (m ? pnl(pos, m.p) : 0));
  }
  return usdt / eurUsd;
}
