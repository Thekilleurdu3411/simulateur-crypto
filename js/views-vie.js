// Section « Vie quotidienne » de l'onglet Finances.
import { SITUATIONS, METIERS, reglesDe } from './config.js';
import { salaireNet, depenses, EXPERIENCES, loyer, prestations, TRANSPORTS, impotRevenu } from './vie.js';
import { vieDe, periode, indice } from './jeuvie.js';
import { possede, exigence, formationPour, nomDiplome } from './carriere.js';
import { COMPTEUR } from './minage.js';
import { eur, dateHeure, echapper as e } from './format.js';
import { maintenant as tJeu } from './horloge.js';

export function sectionVie(ctx) {
  const { partie, app } = ctx;
  const p = partie.profil;
  const v = vieDe(partie);
  const kva = partie.minage ? partie.minage.contrat.kva : (COMPTEUR[p.logement] || 6);
  const k = indice(partie); // montants ramenés à l'année du jeu (inflation)
  const sal0 = salaireNet(p) * k;
  const aides = prestations(p).map(a => ({ ...a, montant: a.montant * k }));
  const sal = sal0 + aides.reduce((s, a) => s + a.montant, 0);
  const dep = depenses(p, kva, { impot: reglesDe(partie).impots !== 'off' }).map(x => ({ ...x, montant: x.montant * k }));
  const total = dep.reduce((s, d) => s + d.montant, 0);
  const jours = periode(partie) / 864e5;
  const c = app.carriere || { situation: p.situation, metier: p.metier || METIERS[0][1][0], experience: p.experience || 'debutant', annee: p.anneeApprentissage || 1 };
  const situationTxt = SITUATIONS.find(s => s.id === p.situation)?.nom + (p.metier && (p.situation === 'salarie' || p.situation === 'alternant') ? ' · ' + p.metier : '');
  return `<section class="section"><div class="section-titre"><h2>Vie quotidienne</h2><span class="discret" style="font-size:12px">${jours >= 29 ? 'chaque mois' : 'tous les ' + jours.toFixed(1).replace('.', ',') + ' jours'}</span></div>
    <div class="carte" style="gap:8px">
      <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${e(situationTxt)}</span><span class="num hausse">${sal0 ? '+' + eur(sal0) : '0,00 €'}</span></div>
      ${aides.map(a => `<div class="ligne-kv" style="font-size:13px"><span>${e(a.nom)} (CAF)</span><span class="num hausse">+${eur(a.montant)}</span></div>`).join('')}
      ${dep.map(d => `<div class="ligne-kv" style="font-size:13px"><span>${e(d.nom)}</span><span class="num">−${eur(d.montant)}</span></div>`).join('')}
      <div class="ligne-kv" style="border-top:1px solid var(--ligne);padding-top:8px"><span>Reste ${jours >= 29 ? 'par mois' : 'par échéance'}</span><span class="num ${sal - total >= 0 ? 'hausse' : 'baisse'}">${(sal - total >= 0 ? '+' : '') + eur(sal - total)}</span></div>
      <div class="ligne-kv" style="font-size:12px"><span>Prochaine échéance</span><span>${e(dateHeure(v.prochaineEcheance))}</span></div>
      ${v.changement ? `<div class="carte info" style="font-size:13px;padding:10px 12px;gap:6px"><span>${e(v.changement.texte)} Le ${e(dateHeure(v.changement.le))}.</span><button class="lien" style="align-self:flex-start" data-action="annuler-carriere">Annuler</button></div>` : ''}
      <p class="discret" style="font-size:12px">${Math.abs(k - 1) > 0.001 ? `Montants de ${new Date(tJeu()).getFullYear()} : ${k > 1 ? '+' : '−'}${Math.round(Math.abs(k - 1) * 1000) / 10} % par rapport à 2026 (inflation). ` : ''}Salaires nets 2026 (milieu de fourchette), SMIC du 1er juin 2026, loyer moyen d'un T2 dans ta ville, alimentation selon l'Insee. Impôt sur le salaire au barème 2026 pour une personne seule. Un découvert coûte 16 % par an d'agios.</p>
    </div>
    <div class="carte" style="gap:10px">
      <div class="carte-titre">Transport</div>
      <div class="puces">${TRANSPORTS.map(([id, nom]) => `<button class="puce" data-action="transport-vie" data-v="${id}" aria-pressed="${(p.transport || 'commun') === id}">${nom}</button>`).join('')}</div>
    </div>
    <div class="carte" style="gap:10px">
      <div class="carte-titre">Changer de situation</div>
      <div class="grille-2">${SITUATIONS.map(s => `<button class="choix" style="min-height:40px;padding:8px" data-action="carriere-sit" data-v="${s.id}" aria-pressed="${c.situation === s.id}">${s.nom}</button>`).join('')}</div>
      ${c.situation === 'salarie' || c.situation === 'alternant' ? `<label class="champ">Métier<select id="f-car-metier" data-input="car-metier">
        ${METIERS.map(([sect, ms]) => `<optgroup label="${e(sect)}">${ms.map(m => `<option ${m === c.metier ? 'selected' : ''}>${e(m)}</option>`).join('')}</optgroup>`).join('')}</select></label>` : ''}
      ${c.situation === 'alternant' ? `<div class="segment">${[1, 2, 3].map(a => `<button data-action="carriere-annee" data-v="${a}" aria-pressed="${Number(c.annee) === a}">${a}${a === 1 ? 're' : 'e'} année</button>`).join('')}</div>` : ''}
      ${(() => {
        const memeMetier = c.situation === 'salarie' && p.situation === 'salarie' && c.metier === p.metier;
        const xp = memeMetier ? p.experience : 'debutant';
        const ok = c.situation !== 'salarie' || possede(p.diplomes || [], exigence(c.metier));
        const f = ok ? null : formationPour(c.metier);
        return `${c.situation === 'salarie' ? `<div class="ligne-kv" style="font-size:13px"><span>Niveau d'embauche</span><span>${memeMetier ? 'ton expérience actuelle' : 'débutant (nouveau métier)'}</span></div>` : ''}
          <div class="ligne-kv" style="font-size:13px"><span>Salaire net</span><span class="num">${eur(salaireNet({ ...p, majoration: memeMetier ? p.majoration : 1, heuresSup: 0, situation: c.situation, metier: c.metier, experience: xp, anneeApprentissage: c.annee }) * k)}</span></div>
          ${ok ? '' : `<div class="carte alerte" style="font-size:12px;padding:8px 10px">Diplôme requis : ${[].concat(exigence(c.metier)).map(nomDiplome).join(' ou ')}${f ? `. Formation : ${e(f.nom)} (${f.mois} mois)` : ''}.</div>`}`;
      })()}
      <button class="bouton secondaire petit" data-action="carriere-valider">${c.situation === 'sans' ? 'Démissionner (préavis d\'un mois)' : 'Changer (début dans un mois)'}</button>
    </div></section>`;
}

// Infos de salaire et de loyer pour l'écran de création du profil.
export function apercuProfil(p) {
  return `<div class="carte" style="gap:6px;font-size:13px">
    <div class="ligne-kv"><span>Revenu net mensuel</span><span class="num" style="color:var(--texte)">${eur(salaireNet(p))}</span></div>
    ${prestations(p).map(a => `<div class="ligne-kv"><span>${e(a.nom)}</span><span class="num" style="color:var(--texte)">+${eur(a.montant)}</span></div>`).join('')}
    ${impotRevenu(p) ? `<div class="ligne-kv"><span>Impôt sur le revenu</span><span class="num" style="color:var(--texte)">−${eur(impotRevenu(p) / 12)}/mois</span></div>` : ''}
    <div class="ligne-kv"><span>Loyer mensuel</span><span class="num" style="color:var(--texte)">${eur(loyer(p))}</span></div>
    <p class="discret" style="font-size:12px">Salaires nets 2026, grille légale des apprentis, RSA et prime d'activité d'avril 2026, loyers moyens de juillet 2026. Ville non répertoriée : 12 €/m².</p>
  </div>`;
}
