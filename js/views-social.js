// Onglet « Social » : fil du réseau, messages privés, classement, publier.
import { perso } from './personnalites.js';
import { socialDe, classement, pseudoJoueur, TYPES_PUBLICATION, valeurFonds } from './jeusocial.js';
import { eur, echapper as e } from './format.js';
import { maintenant as tJeu } from './horloge.js';
import { PERSONNALITES } from './personnalites.js';
import { competitionDe, classementLigue, nomTrimestre, finTrimestre, DIVISIONS, PRIMES, MONTEE, DESCENTE, MIN_LIGUE, MISES, CHOIX_DIRECTION, TROPHEES } from './competition.js';

const nb = n => Math.round(n).toLocaleString('fr-FR');
function quand(t) {
  const d = tJeu() - t;
  if (d < 36e5) return Math.max(1, Math.round(d / 60000)) + ' min';
  if (d < 864e5) return Math.round(d / 36e5) + ' h';
  return new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
function avatar(p, taille = 36) {
  const ini = p.nom.split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase();
  return `<span style="flex-shrink:0;width:${taille}px;height:${taille}px;border-radius:${taille / 2}px;background:${p.couleur};color:#0B0E11;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:${Math.round(taille * 0.38)}px">${e(ini)}</span>`;
}
const moi = partie => ({ nom: partie.profil.prenom || 'Moi', couleur: '#F3B33D', pseudo: pseudoJoueur(partie) });

export function nonLus(partie) { return (partie.social?.messages || []).filter(m => !m.lu).length; }

export function ongletSocial(ctx) {
  const { partie, app } = ctx;
  const s = socialDe(partie);
  const sous = app.sousSocial || 'fil';
  const n = nonLus(partie);
  return `<h1 style="font-size:24px;font-weight:800">Social</h1>
    <div class="carte" style="flex-direction:row;align-items:center;gap:12px">
      ${avatar(moi(partie), 44)}
      <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0"><span style="font-weight:800">@${e(pseudoJoueur(partie))}</span>
        <span class="discret" style="font-size:12px">${nb(s.abonnes)} abonnés · réputation ${Math.round(s.reputation)}/100${s.a2f ? ' · 🔒 2FA' : ''}</span></div>
    </div>
    <div class="segment sur-fond">
      <button data-action="sous-social" data-v="fil" aria-pressed="${sous === 'fil'}">Fil</button>
      <button data-action="sous-social" data-v="messages" aria-pressed="${sous === 'messages'}">Messages${n ? ` (${n})` : ''}</button>
      <button data-action="sous-social" data-v="classement" aria-pressed="${sous === 'classement'}">Compétition</button>
      <button data-action="sous-social" data-v="publier" aria-pressed="${sous === 'publier'}">Publier</button>
    </div>
    ${sous === 'fil' ? fil(ctx) : sous === 'messages' ? messages(ctx) : sous === 'classement' ? vueCompetition(ctx) : vuePublier(ctx)}`;
}

function fil(ctx) {
  const { partie } = ctx;
  const s = socialDe(partie);
  if (!s.fil.length) return '<div class="carte info" style="font-size:13px;color:var(--texte-2)">Le fil se remplit au fil des jours de jeu.</div>';
  return `<div class="carte" style="gap:0;padding:4px 16px">${s.fil.slice(0, 40).map(post => {
    const p = post.auteur === 'moi' ? moi(partie) : perso(post.auteur);
    return `<div style="display:flex;gap:10px;padding:12px 0;border-bottom:1px solid var(--ligne)">
      ${avatar(p)}
      <div style="display:flex;flex-direction:column;gap:3px;min-width:0;flex:1">
        <span style="font-size:13px"><b style="color:var(--texte)">${e(p.nom)}</b> <span class="discret">@${e(p.pseudo)} · ${quand(post.t)}</span></span>
        <span style="font-size:14px;color:var(--texte)">${e(post.texte)}</span>
        <span class="discret" style="font-size:12px">♥ ${nb(post.likes || 0)}</span>
      </div></div>`;
  }).join('')}</div>`;
}

function messages(ctx) {
  const { partie } = ctx;
  const s = socialDe(partie);
  const vip = s.vip ? `<div class="carte alerte" style="font-size:13px;gap:6px"><span>Tu paies 299 € par mois au groupe VIP du Renard.</span><button class="lien" style="align-self:flex-start" data-action="vip-resilier">Résilier</button></div>` : '';
  const fonds = s.fonds && s.fonds.parts.length ? `<div class="carte" style="gap:6px"><div class="ligne-kv" style="font-size:13px"><span>Fonds Fontaine Digital</span><span class="num">${eur(valeurFonds(partie, ctx.M.prixDeBase))}</span></div><button class="bouton secondaire petit" data-action="fonds-retirer">Récupérer ma part</button></div>` : '';
  if (!s.messages.length) return vip + fonds + '<div class="carte info" style="font-size:13px;color:var(--texte-2)">Aucun message pour l\'instant. Les personnalités t\'écriront au fil du temps : conseils, affaires… et arnaques.</div>';
  return vip + fonds + s.messages.map(m => {
    const p = perso(m.de);
    return `<div class="carte" style="gap:8px;${m.lu ? '' : 'border-color:var(--ambre)'}">
      <div style="display:flex;gap:10px;align-items:center">${avatar(p, 32)}<span style="font-size:13px;flex:1"><b style="color:var(--texte)">${e(p.nom)}</b><br><span class="discret">${e(p.role)} · ${quand(m.t)}</span></span></div>
      <p style="font-size:14px;color:var(--texte)">${e(m.texte)}</p>
      ${m.reponse ? `<p style="font-size:13px;color:var(--ambre)">Toi : ${e(m.reponseTexte)}</p>${m.resultat ? `<p class="discret" style="font-size:13px">${e(m.resultat)}</p>` : ''}`
        : `<div style="display:flex;flex-direction:column;gap:6px">${m.reponses.map(([id, txt]) => `<button class="bouton secondaire petit" data-action="repondre" data-v="${m.id}|${id}">${e(txt)}</button>`).join('')}</div>`}
    </div>`;
  }).join('');
}

function vueClassement(ctx) {
  const { partie } = ctx;
  const liste = classement(partie, ctx.M.prixDeBase, ctx.patrimoineTotal ? ctx.patrimoineTotal() : 0);
  const rang = liste.findIndex(x => x.moi) + 1;
  return `<div class="carte info" style="font-size:13px">Tu es <b>${rang}${rang === 1 ? 'er' : 'e'}</b> sur ${liste.length}. Les fortunes des personnalités suivent le marché, comme la tienne.</div>
    <div class="carte" style="gap:0;padding:4px 16px">${liste.map((x, i) => `<div style="display:flex;gap:10px;align-items:center;padding:10px 0;border-bottom:1px solid var(--ligne);${x.moi ? 'background:var(--ambre-fond);margin:0 -16px;padding-left:16px;padding-right:16px' : ''}">
      <span class="num discret" style="width:22px;text-align:right">${i + 1}</span>${avatar(x, 30)}
      <span style="display:flex;flex-direction:column;flex:1;min-width:0;font-size:13px"><b style="color:var(--texte)">${e(x.nom)}</b><span class="discret" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${e(x.role)}</span></span>
      <span class="num" style="font-size:13px">${x.fortune >= 1e6 ? (x.fortune / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€' : eur(x.fortune)}</span></div>`).join('')}</div>`;
}

function vuePublier(ctx) {
  const { app, partie } = ctx;
  const pub = app.publication || { type: 'avis', base: 'BTC', sens: 'hausse' };
  const bases = ['BTC', 'ETH', 'SOL', 'XRP', 'DOGE'];
  return `<div class="carte" style="gap:10px">
    <div class="puces">${TYPES_PUBLICATION.map(([id, nom]) => `<button class="puce" data-action="pub-type" data-v="${id}" aria-pressed="${pub.type === id}">${nom}</button>`).join('')}</div>
    ${pub.type === 'avis' ? `<div class="puces">${bases.map(b => `<button class="puce" data-action="pub-base" data-v="${b}" aria-pressed="${pub.base === b}">${b}</button>`).join('')}</div>
      <div class="segment"><button data-action="pub-sens" data-v="hausse" aria-pressed="${pub.sens === 'hausse'}">Va monter</button><button data-action="pub-sens" data-v="baisse" aria-pressed="${pub.sens === 'baisse'}">Va baisser</button></div>
      <p class="discret" style="font-size:12px">Jugé dans 7 jours : juste, ta réputation et tes abonnés montent ; faux, ils baissent.</p>` : ''}
    ${pub.type === 'gains' ? '<p class="discret" style="font-size:12px">Partage ta performance depuis le début. Les gros gains attirent… et agacent un peu.</p>' : ''}
    ${pub.type === 'conseil' ? '<p class="discret" style="font-size:12px">Un conseil utile : peu d\'abonnés, mais ta réputation monte.</p>' : ''}
    ${pub.type === 'meme' ? '<p class="discret" style="font-size:12px">Souvent ignoré, parfois viral.</p>' : ''}
    <button class="bouton" data-action="publier">Publier</button>
  </div>`;
}

// ---------- Compétition (V0.19) ----------
const pc = x => x == null ? '—' : (x >= 0 ? '+' : '') + (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
const couleurPerf = x => x == null ? 'var(--texte-2)' : x >= 0 ? 'var(--hausse)' : 'var(--baisse)';
const dateCourte = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });

function vueCompetition(ctx) {
  const { app, partie } = ctx;
  const c = competitionDe(partie);
  const sous = app.sousCompet || 'ligue';
  const liste = classement(partie, ctx.M.prixDeBase, ctx.patrimoineTotal ? ctx.patrimoineTotal() : 0);
  const nT = Object.keys(c.trophees).length;
  return `<div class="puces">
      ${[['ligue', 'Ligue'], ['defis', 'Défis' + (c.offre ? ' •' : '')], ['trophees', `🏆 ${nT}/${TROPHEES.length}`], ['fortunes', 'Fortunes']].map(([id, nom]) => `<button class="puce" data-action="sous-compet" data-v="${id}" aria-pressed="${sous === id}">${nom}</button>`).join('')}
    </div>
    ${sous === 'ligue' ? vueLigue(ctx, c, liste) : sous === 'defis' ? vueDefis(ctx, c) : sous === 'trophees' ? vueTrophees(c) : vueClassement(ctx)}`;
}

function vueLigue(ctx, c, liste) {
  const { partie } = ctx;
  if (!c.ligue) return '<div class="carte info" style="font-size:13px;color:var(--texte-2)">La ligue démarre dans un instant.</div>';
  const t = tJeu(), cl = classementLigue(partie, liste, t);
  const i = cl.findIndex(x => x.moi), moi = cl[i];
  const jours = Math.max(0, Math.ceil((finTrimestre(c.ligue.trimestre) - t) / 864e5));
  const div = c.division;
  const rival = cl.find(x => x.id === c.rival);
  return `<div class="carte" style="gap:6px">
      <span class="discret" style="font-size:12px">Ligue Kryptal · ${nomTrimestre(c.ligue.trimestre)} · ${jours} jour${jours > 1 ? 's' : ''} restant${jours > 1 ? 's' : ''}</span>
      <span style="font-size:20px;font-weight:800">Division ${DIVISIONS[div]}</span>
      ${moi.inscrit ? `<span style="font-size:14px">Tu es <b>${i + 1}${i ? 'e' : 'er'}</b> sur ${cl.length} avec <b style="color:${couleurPerf(moi.perf)}">${pc(moi.perf)}</b></span>`
        : `<span style="font-size:13px;color:var(--texte-2)">Non classé : il faut au moins ${MIN_LIGUE} € sur ta plateforme.</span>`}
      <span class="discret" style="font-size:12px">Performance du portefeuille au comptant depuis le début du trimestre ; les virements, le minage et les perpétuels ne comptent pas. Les ${MONTEE} premiers montent${div < DIVISIONS.length - 1 ? ` en ${DIVISIONS[div + 1]}` : ''} et touchent une prime (${PRIMES[div].toLocaleString('fr-FR')} € pour le 1er) ; à partir du ${DESCENTE}e, on descend.</span>
    </div>
    ${rival ? `<div class="carte" style="gap:8px">
      <div style="display:flex;align-items:center;gap:10px">${avatar(perso(c.rival), 36)}<span style="flex:1;font-size:13px"><b style="color:var(--texte)">Ton rival : ${e(rival.nom)}</b><br><span class="discret">Bilan : ${c.rivalV} victoire${c.rivalV > 1 ? 's' : ''}, ${c.rivalD} défaite${c.rivalD > 1 ? 's' : ''}</span></span></div>
      <div class="ligne-kv" style="font-size:13px"><span>Ce trimestre</span><span class="num"><span style="color:${couleurPerf(moi.perf)}">toi ${pc(moi.perf)}</span> · <span style="color:${couleurPerf(rival.perf)}">${e(rival.nom.split(' ')[0])} ${pc(rival.perf)}</span></span></div>
      <label class="champ">Changer de rival<select data-input="rival">${PERSONNALITES.map(p => `<option value="${p.id}" ${p.id === c.rival ? 'selected' : ''}>${e(p.nom)} (${e(p.role)})</option>`).join('')}</select></label>
    </div>` : ''}
    <div class="carte" style="gap:0;padding:4px 16px">${cl.map((x, k) => {
      const zone = k < MONTEE ? 'var(--hausse)' : k + 1 >= DESCENTE ? 'var(--baisse)' : 'transparent';
      return `<div style="display:flex;gap:10px;align-items:center;padding:8px 0;border-bottom:1px solid var(--ligne);${x.moi ? 'background:var(--ambre-fond);margin:0 -16px;padding-left:16px;padding-right:16px;' : ''}box-shadow:inset 3px 0 0 ${zone}">
        <span class="num discret" style="width:22px;text-align:right">${k + 1}</span>${avatar(x, 28)}
        <span style="flex:1;min-width:0;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis"><b style="color:var(--texte)">${e(x.nom)}</b>${x.id === c.rival ? ' <span class="discret">· rival</span>' : ''}</span>
        <span class="num" style="font-size:13px;color:${couleurPerf(x.perf)}">${pc(x.perf)}</span></div>`;
    }).join('')}</div>
    ${c.palmares.length ? `<div class="carte" style="gap:6px"><span style="font-weight:700">Palmarès</span>${c.palmares.slice(0, 8).map(x => `<div class="ligne-kv" style="font-size:13px"><span>${nomTrimestre(x.trimestre)} · ${DIVISIONS[x.division]}</span><span class="num">${x.rang ? `${x.rang}${x.rang === 1 ? 'er 🏆' : 'e'} · ${pc(x.perf)}` : 'non classé'}</span></div>`).join('')}</div>` : ''}`;
}

function vueDefis(ctx, c) {
  const { partie, app } = ctx;
  const bilan = `<div class="carte info" style="font-size:13px">Défis : ${c.defisGagnes} gagné${c.defisGagnes > 1 ? 's' : ''}, ${c.defisPerdus} perdu${c.defisPerdus > 1 ? 's' : ''}. Les personnalités te lancent un défi de temps en temps ; la mise est prise sur ton compte bancaire.</div>`;
  const d = c.defi;
  if (d) {
    const p = perso(d.de), ratio = c.indice / d.indice0;
    const suivi = d.type === 'direction' ? `Toi : ${e((CHOIX_DIRECTION.find(x => x[0] === d.choix) || [])[1])} · ${e(p.nom.split(' ')[0])} : ${e((CHOIX_DIRECTION.find(x => x[0] === d.choixAdversaire) || [])[1])}`
      : d.type === 'abonnes' ? `Abonnés : ${nb(partie.social.abonnes)} (objectif ${nb(d.abonnes0 * 1.2)})`
      : `Ta performance : <b style="color:${couleurPerf(ratio - 1)}">${pc(ratio - 1)}</b>${d.type === 'objectif' ? ' (objectif +10 %)' : ''}`;
    return `<div class="carte" style="gap:8px;border-color:var(--ambre)">
      <div style="display:flex;gap:10px;align-items:center">${avatar(p, 32)}<span style="font-size:13px;flex:1"><b style="color:var(--texte)">${e(d.titre)}</b><br><span class="discret">contre ${e(p.nom)} · fin le ${dateCourte(d.fin)}</span></span></div>
      <span style="font-size:14px">${suivi}</span>
      <span class="discret" style="font-size:12px">Mise : ${eur(d.mise)}${d.cote ? ` · gain si réussi : ${eur(d.mise * d.cote)}` : ''}</span>
    </div>` + bilan;
  }
  const o = c.offre;
  if (!o) return bilan;
  const p = perso(o.de), choix = app.defiChoix;
  const mises = MISES.filter(m => m <= partie.banque.solde);
  return `<div class="carte" style="gap:10px;border-color:var(--ambre)">
    <div style="display:flex;gap:10px;align-items:center">${avatar(p, 32)}<span style="font-size:13px;flex:1"><b style="color:var(--texte)">${e(p.nom)}</b><br><span class="discret">${e(p.role)} · expire le ${dateCourte(o.expire)}</span></span></div>
    <span style="font-weight:700">${e(o.titre)}</span>
    <p style="font-size:14px;color:var(--texte)">${e(o.texte)}</p>
    ${o.type === 'direction' ? `<div class="puces">${CHOIX_DIRECTION.map(([id, nom]) => `<button class="puce" data-action="defi-choix" data-v="${id}" aria-pressed="${choix === id}">${nom}</button>`).join('')}</div>` : ''}
    ${mises.length ? `<span class="discret" style="font-size:12px">Accepter avec une mise de :</span><div class="puces">${mises.map(m => `<button class="puce" data-action="defi-accepter" data-v="${m}">${nb(m)} €</button>`).join('')}</div>`
      : '<span class="discret" style="font-size:13px">Pas assez sur ton compte bancaire pour miser.</span>'}
    <button class="lien" style="align-self:flex-start" data-action="defi-refuser">Refuser</button>
  </div>` + bilan;
}

function vueTrophees(c) {
  return `<div class="carte" style="gap:0;padding:4px 16px">${TROPHEES.map(([id, nom, desc]) => {
    const t = c.trophees[id];
    return `<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid var(--ligne);${t ? '' : 'opacity:.5'}">
      <span style="font-size:22px;width:28px;text-align:center">${t ? '🏆' : '🔒'}</span>
      <span style="flex:1;font-size:13px"><b style="color:var(--texte)">${e(nom)}</b><br><span class="discret">${e(desc)}${t ? ' · ' + dateCourte(t) : ''}</span></span></div>`;
  }).join('')}</div>`;
}
