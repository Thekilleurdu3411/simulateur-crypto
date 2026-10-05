// Écran des contrats perpétuels.
import { DIFFICULTES, reglesDe } from './config.js';
import { CONTRATS, contrat, prixLiquidation, FRAIS_PRENEUR, pnl, risque } from './futures.js';
import { futuresDe } from './jeufutures.js';
import { eur, duree, echapper as e } from './format.js';

const u = v => (v == null || !isFinite(v)) ? '—' : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' USDT';
const px = v => (v == null || !isFinite(v)) ? '—' : v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Valeurs mises à jour en direct pour cet écran.
export function valeurFutures(k, arg, ctx) {
  const m = ctx.F.etat.marques;
  const f = ctx.partie.futures;
  switch (k) {
    case 'fm': return { t: m[arg] ? px(m[arg].p) : '—' };
    case 'ff': return m[arg] ? { t: (m[arg].r * 100).toLocaleString('fr-FR', { maximumFractionDigits: 4 }) + ' % · dans ' + duree(m[arg].T - Date.now()), cls: m[arg].r >= 0 ? '' : 'hausse' } : { t: '—' };
    case 'fp': {
      const pos = f && f.positions.find(x => x.id === arg);
      if (!pos || !m[pos.s]) return { t: '—' };
      const v = pnl(pos, m[pos.s].p);
      return { t: (v >= 0 ? '+' : '') + u(v) + ' (' + (v / pos.marge * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %)', cls: v >= 0 ? 'hausse' : 'baisse' };
    }
    case 'fusdt': return { t: f ? u(f.soldeUSDT) + (ctx.D.etat.eurUsd ? ' ≈ ' + eur(f.soldeUSDT / ctx.D.etat.eurUsd) : '') : '—' };
    case 'festim': {
      const p = ctx.app.perp, c = contrat(p.s), mk = m[p.s];
      const marge = Number(String(p.marge).replace(/\s/g, '').replace(',', '.')) || 0;
      if (!mk || !marge) return { t: 'Indique une marge en USDT.' };
      const taille = marge * p.levier, qte = taille / mk.p;
      const liq = prixLiquidation(p.sens, mk.p, qte, marge, c.mmr);
      return { t: `Position ≈ ${u(taille)} · liquidation ≈ ${px(liq)} · frais ≈ ${u(taille * FRAIS_PRENEUR)}` };
    }
  }
  return { t: '' };
}

export function ongletPerp(ctx, live) {
  const { partie, app, D } = ctx;
  const d = reglesDe(partie);
  if (!d.levierMax) return `<div class="carte info" style="font-size:14px;color:var(--texte-2)">Les dérivés avec levier sont désactivés dans ta partie (Découverte, ou levier à zéro dans les réglages avancés).</div>`;
  if (partie.plateforme.statut !== 'ouvert') return `<div class="carte info" style="font-size:14px;color:var(--texte-2)">Ouvre d'abord un compte sur la plateforme (onglet Finances).</div>`;
  const f = futuresDe(partie);
  const p = app.perp;
  const c = contrat(p.s);
  const lmax = Math.min(c.levierMax, d.levierMax);
  return `<section class="carte">
      <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">Portefeuille de marge</span>${live('fusdt', ctx, 'num')}</div>
      <div class="segment">
        <button data-action="perp-tr-sens" data-v="vers-marge" aria-pressed="${p.trSens === 'vers-marge'}">€ → USDT</button>
        <button data-action="perp-tr-sens" data-v="vers-euros" aria-pressed="${p.trSens !== 'vers-marge'}">USDT → €</button>
      </div>
      <div class="grille-2" style="align-items:end">
        <label class="champ">Montant (${p.trSens === 'vers-marge' ? '€' : 'USDT'})<input id="f-perp-tr" class="num" inputmode="decimal" placeholder="0,00" value="${e(p.tr)}" data-input="perp-tr" autocomplete="off"></label>
        <button class="bouton petit" data-action="perp-transferer">Convertir</button>
      </div>
      <p class="discret" style="font-size:12px">Au cours EUR/USDT réel, 0,1 % de frais. Euros disponibles sur la plateforme : ${eur(partie.plateforme.soldeEUR)}.</p>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Contrats</h2><span class="discret" style="font-size:12px">prix de marque · financement</span></div>
      <div class="carte liste-lignes" style="padding:0 16px;gap:0">
        ${CONTRATS.map(x => `<button class="rangee" data-action="perp-contrat" data-v="${x.s}">
          <span class="g"><span class="t">${x.base}USDT ${x.s === p.s ? '<span class="badge ok">Choisi</span>' : ''}</span><span class="s">Perpétuel · levier jusqu'à ${Math.min(x.levierMax, d.levierMax)}</span></span>
          <span class="d"><span class="num" style="font-size:14px">${live('fm:' + x.s, ctx)}</span><span class="num" style="font-size:11px">${live('ff:' + x.s, ctx)}</span></span></button>`).join('')}
      </div>
    </section>
    <section class="carte">
      <div class="carte-titre">Ouvrir une position ${c.base}USDT</div>
      <div class="segment">
        <button class="achat" data-action="perp-sens" data-v="long" aria-pressed="${p.sens === 'long'}">Long (hausse)</button>
        <button class="vente" data-action="perp-sens" data-v="short" aria-pressed="${p.sens === 'short'}">Short (baisse)</button>
      </div>
      <label class="champ">Levier : <strong style="color:var(--texte)" data-perp-levier>×${Math.min(p.levier, lmax)}</strong>
        <input id="f-perp-levier" type="range" min="1" max="${lmax}" step="1" value="${Math.min(p.levier, lmax)}" data-input="perp-levier"></label>
      <label class="champ">Marge engagée (USDT)<input id="f-perp-marge" class="num" inputmode="decimal" placeholder="0,00" value="${e(p.marge)}" data-input="perp-marge" autocomplete="off"></label>
      <div class="num" style="font-size:12px;color:var(--texte-2);min-height:18px">${live('festim', ctx)}</div>
      <button class="bouton ${p.sens === 'long' ? 'achat' : 'vente'}" data-action="perp-ouvrir" ${app.enCours ? 'disabled' : ''}>${app.enCours ? 'Envoi…' : 'Ouvrir le ' + (p.sens === 'long' ? 'long' : 'short') + ' ×' + Math.min(p.levier, lmax)}</button>
      <p class="discret" style="font-size:12px">Marge isolée. Frais 0,05 % à l'ouverture et à la fermeture. Financement toutes les 8 h (0 h, 8 h, 16 h UTC) au taux réel.${d.bruit === 'alertes' ? ' Ta difficulté prévient à 80 % de marge perdue et ne liquide pas pendant ton absence.' : ' La liquidation peut arriver à tout moment, même appli fermée.'}</p>
    </section>
    ${f.positions.length ? `<section class="section"><div class="section-titre"><h2>Positions ouvertes</h2></div>
      ${f.positions.map(pos => `<article class="carte" style="gap:8px">
        <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${contrat(pos.s).base}USDT · <span class="${pos.sens === 'long' ? 'hausse' : 'baisse'}">${pos.sens === 'long' ? 'Long' : 'Short'} ×${pos.levier}</span></span>${live('fp:' + pos.id, ctx, 'num')}</div>
        <div class="ligne-kv" style="font-size:13px"><span>Quantité · entrée</span><span class="num">${pos.qte.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} · ${px(pos.entree)}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Prix de marque</span>${live('fm:' + pos.s, ctx, 'num')}</div>
        <div class="ligne-kv" style="font-size:13px"><span>Liquidation</span><span class="num baisse">${px(pos.liquidation)}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Marge · financement cumulé</span><span class="num">${u(pos.marge)} · ${pos.financement >= 0 ? '+' : ''}${u(pos.financement)}</span></div>
        <button class="bouton secondaire petit" data-action="perp-fermer" data-v="${pos.id}" ${app.enCours ? 'disabled' : ''}>Fermer au marché</button>
      </article>`).join('')}</section>` : ''}`;
}
