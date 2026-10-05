// Section « Impôts » de l'onglet Finances.
import { DIFFICULTES, reglesDe } from './config.js';
import { fiscDe, bilan, calendrier, SEUIL_CESSIONS, PFU } from './fiscalite.js';
import { mode } from './jeufisc.js';
import { eur, dateHeure, echapper as e } from './format.js';

const STATUTS = { 'a-venir': 'À venir', ouverte: 'À remplir', deposee: 'Déposée', retard: 'En retard', payee: 'Payée' };

export function sectionImpots(ctx) {
  const { partie, app } = ctx;
  const m = mode(partie);
  if (m === 'off') return `<section class="section"><div class="section-titre"><h2>Impôts</h2></div>
    <div class="carte" style="font-size:13px;color:var(--texte-2)">Fiscalité désactivée dans ta partie.</div></section>`;
  const d = reglesDe(partie);
  const f = fiscDe(partie);
  const an = new Date().getFullYear();
  const b = bilan(f, an, partie.profil.situation);
  const cal = calendrier(an);
  const decls = Object.entries(f.declarations).sort((x, y) => y[0] - x[0]);
  const cessionsAn = f.cessions.filter(c => new Date(c.t).getFullYear() === an);
  return `<section class="section"><div class="section-titre"><h2>Impôts</h2><span class="discret" style="font-size:12px">${{ preleve: 'prélevés à chaque vente', auto: 'calculés pour toi', manuel: 'à déclarer toi-même' }[m]}</span></div>
    <div class="carte" style="gap:8px">
      <div class="carte-titre">Année ${an} en cours</div>
      <div class="ligne-kv" style="font-size:13px"><span>Ventes imposables (contre euros)</span><span class="num">${b.nbCessions} · ${eur(b.totalCessions)}</span></div>
      <div class="ligne-kv" style="font-size:13px"><span>Prix total d'acquisition restant</span><span class="num">${eur(f.pta)}</span></div>
      <div class="ligne-kv" style="font-size:13px"><span>Revenus de minage reçus</span><span class="num">${eur(b.recettesMinage)}</span></div>
      ${d.aides ? `<div class="ligne-kv" style="font-size:13px"><span>Plus-value nette</span><span class="num ${b.pvNette >= 0 ? 'hausse' : 'baisse'}">${eur(b.pvNette)}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Impôt estimé</span><span class="num" style="color:var(--texte)">${eur(b.total)}${b.exonere && b.totalCessions > 0 ? ' (ventes sous 305 €)' : ''}</span></div>
        ${m === 'preleve' ? `<div class="ligne-kv" style="font-size:13px"><span>Déjà prélevé</span><span class="num">${eur(f.preleve[an] || 0)}</span></div>` : ''}`
      : `<p class="discret" style="font-size:12px">Aucune estimation en Réalité : à toi de calculer avec la méthode du formulaire 2086 (détail des ventes ci-dessous).</p>`}
      <p class="discret" style="font-size:12px">Plus-values : flat tax de ${String(PFU * 100).replace('.', ',')} % au-delà de ${SEUIL_CESSIONS} € de ventes dans l'année, moins-values de l'année déduites. Échanger une crypto contre une autre (USDT compris) n'est pas imposable. Minage : micro-BNC, 34 % d'abattement. Déclaration au printemps ${an + 1}, avant le ${new Date(cal.limite).toLocaleDateString('fr-FR')}, paiement en septembre.</p>
    </div>
    ${m === 'manuel' && cessionsAn.length ? `<div class="carte" style="gap:0;padding:4px 16px">
      ${cessionsAn.map(c => `<div class="rangee" style="min-height:0;padding:8px 0;font-size:12px"><span class="num">${e(dateHeure(c.t))}</span>
        <span class="d num"><span>vente ${eur(c.prix)}</span><span class="discret">portefeuille ${eur(c.valeurGlobale)} · acquisition ${eur(c.ptaAvant)}</span></span></div>`).join('')}
    </div>` : ''}
    ${decls.map(([a, dc]) => carteDeclaration(Number(a), dc, partie, app)).join('')}
  </section>`;
}

function carteDeclaration(an, dc, partie, app) {
  const cal = calendrier(an);
  const formulaire = mode(partie) === 'manuel' && ['ouverte', 'retard'].includes(dc.statut);
  const s = app.decl || { pv: '', recettes: '' };
  return `<div class="carte" style="gap:8px">
    <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">Revenus ${an}</span><span class="badge ${dc.statut === 'payee' ? 'ok' : dc.statut === 'retard' ? 'ko' : 'attente'}">${STATUTS[dc.statut]}</span></div>
    ${dc.statut === 'payee' ? `<div class="ligne-kv" style="font-size:13px"><span>Impôt payé</span><span class="num">${eur(dc.paye)}</span></div>${dc.motif ? `<p style="font-size:12px;color:var(--baisse)">${e(dc.motif)}</p>` : ''}` : ''}
    ${dc.declare ? `<div class="ligne-kv" style="font-size:12px"><span>Déclaré</span><span class="num">plus-value ${eur(dc.declare.pv)} · minage ${eur(dc.declare.recettes)}</span></div>` : ''}
    ${['ouverte', 'retard', 'deposee'].includes(dc.statut) ? `<div class="ligne-kv" style="font-size:12px"><span>Date limite · paiement</span><span>${new Date(cal.limite).toLocaleDateString('fr-FR')} · ${new Date(cal.paiement).toLocaleDateString('fr-FR')}</span></div>` : ''}
    ${formulaire ? `<label class="champ">Plus-value nette, ou moins-value avec un signe moins (cases 3AN / 3BN)<input id="f-decl-pv" class="num" inputmode="decimal" value="${e(s.pv)}" data-input="decl-pv" placeholder="0,00"></label>
      <label class="champ">Recettes de minage (case 5KU, micro-BNC)<input id="f-decl-rec" class="num" inputmode="decimal" value="${e(s.recettes)}" data-input="decl-recettes" placeholder="0,00"></label>
      <button class="bouton petit" data-action="declarer" data-v="${an}">Déposer ma déclaration</button>
      <p class="discret" style="font-size:12px">Une erreur sera redressée avec des intérêts de retard ; une déclaration absente à la date limite coûte 10 % de plus.</p>` : ''}
  </div>`;
}
