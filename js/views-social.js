// Onglet « Social » : fil du réseau, messages privés, classement, publier.
import { perso } from './personnalites.js';
import { socialDe, classement, pseudoJoueur, TYPES_PUBLICATION, valeurFonds } from './jeusocial.js';
import { eur, echapper as e } from './format.js';
import { maintenant as tJeu } from './horloge.js';

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
      <button data-action="sous-social" data-v="classement" aria-pressed="${sous === 'classement'}">Classement</button>
      <button data-action="sous-social" data-v="publier" aria-pressed="${sous === 'publier'}">Publier</button>
    </div>
    ${sous === 'fil' ? fil(ctx) : sous === 'messages' ? messages(ctx) : sous === 'classement' ? vueClassement(ctx) : vuePublier(ctx)}`;
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
