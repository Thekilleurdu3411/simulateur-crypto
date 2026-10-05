// Écran « Réglages avancés » de la nouvelle partie.
import { DIFFICULTES, REGLAGES } from './config.js';
import { icone } from './views.js';
import { echapper as e } from './format.js';

/** Valeur lisible d'un réglage. */
export function valeurTexte(g, v) {
  if (g.type === 'bool') return v ? 'Oui' : 'Non';
  if (g.type === 'choix') return (g.options.find(o => o[0] === v) || [, String(v)])[1];
  const n = Number((v * (g.echelle || 1)).toFixed(2));
  const t = String(n).replace('.', ',');
  return g.unite === '×' ? '×' + t : t + ' ' + g.unite;
}

/** Liste des réglages modifiés : « Vitesse du temps hors marché : ×5 (Expert : ×2) ». */
export function changements(base, reglages) {
  const d = DIFFICULTES[base];
  return REGLAGES.filter(g => reglages && g.cle in reglages)
    .map(g => `${g.nom} : ${valeurTexte(g, reglages[g.cle])} (${d.nom} : ${valeurTexte(g, d[g.cle])})`);
}

function controle(g, v) {
  if (g.type === 'nombre') {
    const ech = g.echelle || 1;
    return `<input type="range" min="${g.min}" max="${g.max}" step="${g.pas}" value="${Number((v * ech).toFixed(4))}" data-input="reg:${g.cle}" aria-label="${e(g.nom)}">`;
  }
  const opts = g.type === 'bool' ? [[true, 'Oui'], [false, 'Non']] : g.options;
  const cls = opts.length > 3 ? 'puces' : 'segment';
  return `<div class="${cls}">${opts.map(([val, nom]) => `<button class="${cls === 'puces' ? 'puce' : ''}" data-action="reg" data-v="${g.cle}:${val}" aria-pressed="${val === v}">${e(nom)}</button>`).join('')}</div>`;
}

export function vueReglages(ctx) {
  const b = ctx.app.brouillon, d = DIFFICULTES[b.difficulte];
  const r = b.reglages || {};
  const n = Object.keys(r).length;
  return `<main class="ecran">
    <div class="entete">
      <button class="retour" data-action="fin-reglages">${icone('retour', 18)} Nouvelle partie</button>
      <div class="surtitre">Base : ${e(d.nom)}</div>
      <h1>Réglages avancés</h1>
      <p>Chaque réglage part des valeurs de ta difficulté. Au moindre changement, la partie devient « Personnalisée » et a son propre classement.</p>
    </div>
    <div class="carte ${n ? 'info' : ''}" style="flex-direction:row;align-items:center;justify-content:space-between;gap:10px">
      <span style="font-size:14px;font-weight:700">${n ? `Personnalisée · ${n} réglage${n > 1 ? 's' : ''} modifié${n > 1 ? 's' : ''}` : `Identique à ${e(d.nom)}`}</span>
      ${n ? '<button class="lien" style="white-space:nowrap" data-action="reg-reset">Tout remettre</button>' : ''}
    </div>
    ${REGLAGES.map(g => {
      const v = g.cle in r ? r[g.cle] : d[g.cle];
      const modifie = g.cle in r;
      return `<div class="carte" style="gap:8px">
        <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${e(g.nom)}</span><span class="${g.type === 'nombre' ? 'num' : ''}" style="white-space:nowrap;color:${modifie ? 'var(--ambre)' : 'var(--texte-2)'}" data-reg-val="${g.cle}">${e(valeurTexte(g, v))}</span></div>
        ${g.aide ? `<p class="discret" style="font-size:12px">${e(g.aide)}</p>` : ''}
        ${controle(g, v)}
        ${modifie ? `<span class="discret" style="font-size:12px">${e(d.nom)} : ${e(valeurTexte(g, d[g.cle]))}</span>` : ''}
      </div>`;
    }).join('')}
    <button class="bouton" data-action="fin-reglages">Valider</button>
  </main>`;
}
