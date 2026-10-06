// Écrans de l'appli : chaque fonction renvoie le HTML d'un écran.
import { ongletEntreprise } from './views-entreprise.js';
import { DIFFICULTES, SITUATIONS, LOGEMENTS, MODES_VIE, METIERS, INTERVALLES, VERSION, reglesDe } from './config.js';
import { eur, eurSigne, prix, qte, pct, duree, dateHeure, echapper as e } from './format.js';
import { patrimoine } from './engine.js';
import { TYPES, descriptionOrdre, reserveAchat } from './orders.js';
import { ongletMinage, ongletInstallations } from './views-minage.js';
import { valeurParc } from './jeuminage.js';
import { ongletPerp, valeurFutures } from './views-futures.js';
import { valeurDerivesEUR } from './jeufutures.js';
import { sectionImpots } from './views-fisc.js';
import { apercuProfil } from './views-vie.js';
import { ongletVie } from './views-carriere.js';
import { ongletSocial, nonLus } from './views-social.js';
import { valeurBiens } from './jeuvie.js';
import { valeurFonds } from './jeusocial.js';
import { changements } from './views-reglages.js';
import { DATE_MIN_REJEU } from './state.js';
import { EXPERIENCES, TRANSPORTS } from './vie.js';
import { maintenant as tJeu, enRejeu, accelere, vitesseActuelle, vitesseMaximale, VITESSES } from './horloge.js';
import { actives as notifsActives } from './notifs.js';

const ICONES = {
  accueil: '<path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z"/>',
  marche: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  minage: '<path d="M5 5h14v14H5z"/><path d="M9 9h6v6H9z"/><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3"/>',
  installations: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  vie: '<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4 4-7 8-7s8 3 8 7"/>',
  social: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 21l1.9-5.4A8 8 0 1 1 21 12z"/>',
  finances: '<path d="M3 7h18v12H3z"/><path d="M3 7l2-3h14l2 3"/><path d="M16 13h2"/>',
  retour: '<path d="M15 6l-6 6 6 6"/>',
  suivant: '<path d="M9 6l6 6-6 6"/>'
};
export function icone(nom, taille = 22) {
  return `<svg width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[nom]}</svg>`;
}

function initiales(p) { return ((p.prenom || '?')[0] + ((p.nom || '')[0] || '')).toUpperCase(); }
function nomMetier(p) { return p.situation === 'alternant' || p.situation === 'salarie' ? p.metier : null; }
function libelleSituation(p) {
  const s = SITUATIONS.find(x => x.id === p.situation)?.nom || '';
  const m = nomMetier(p);
  return m ? s + ' · ' + m : s;
}

// ---------- Valeurs mises à jour en direct ----------

export function valeurLive(cle, ctx) {
  const { partie, M, app } = ctx;
  const [k, arg] = cle.split(':');
  if (['fm', 'ff', 'fp', 'fusdt', 'festim'].includes(k)) return valeurFutures(k, arg, ctx);
  const t = arg ? M.ticker(arg) : null;
  switch (k) {
    case 'px': return { t: t ? prix(t.c) : '—' };
    case 'chg': { if (!t) return { t: '—' }; const v = (t.c - t.o) / t.o; return { t: pct(v), cls: v >= 0 ? 'hausse' : 'baisse' }; }
    case 'h24': return { t: t ? prix(t.h) : '—' };
    case 'l24': return { t: t ? prix(t.l) : '—' };
    case 'vol': return { t: t ? Math.round(t.q).toLocaleString('fr-FR') + ' €' : '—' };
    case 'statut': {
      const s = M.etat.statut;
      if (s === 'direct') return { t: 'Direct', cls: 'badge ok' };
      if (s === 'rejeu') return { t: accelere() ? 'Historique' : 'Rejeu', cls: 'badge ok' };
      if (s === 'simulation') return { t: 'Simulé', cls: 'badge ok' };
      if (s === 'reconnexion' || s === 'connexion') return { t: s === 'connexion' ? 'Connexion' : 'Reconnexion', cls: 'badge attente' };
      return { t: 'Hors ligne', cls: 'badge ko' };
    }
    case 'horloge': return { t: new Date(tJeu()).toLocaleString('fr-FR', enRejeu() ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' } : { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' }) };
    case 'kyc': return { t: duree(partie.plateforme.kycFin - tJeu()) };
    case 'liv': { const m = partie.minage?.machines.find(x => x.id === arg); return { t: m ? duree(m.livraisonLe - tJeu()) : '' }; }
    case 'pool': { const q = partie.minage?.soldePool || 0; const p = M.prixDeBase('BTC'); return { t: qte(q) + ' BTC' + (p ? ' · ' + eur(q * p) : '') }; }
    case 'facture': { const mn = partie.minage; return { t: mn ? eur(mn.factureEUR) + ' · ' + Math.round(mn.factureKWh).toLocaleString('fr-FR') + ' kWh' : '—' }; }
    case 'factureHeb': { const mn = partie.minage; return { t: mn ? eur(mn.factureHebEUR || 0) + ' · ' + Math.round(mn.factureHebKWh || 0).toLocaleString('fr-FR') + ' kWh' : '—' }; }
  }
  if (!partie) return { t: '' };
  const P = patrimoine(partie, M.prixDeBase, valeurParc(partie, ctx.D?.etat.eurUsd), valeurDerivesEUR(partie, ctx.F?.etat.marques || {}, ctx.D?.etat.eurUsd), valeurBiens(partie) + valeurFonds(partie, M.prixDeBase));
  switch (k) {
    case 'patrimoine': return { t: eur(P.total) };
    case 'perf': { const d = P.total - partie.capitalDepart; return { t: eurSigne(d) + ' (' + pct(d / partie.capitalDepart) + ')', cls: d >= 0 ? 'hausse' : 'baisse' }; }
    case 'banque': return { t: eur(P.banque) };
    case 'plat': return { t: eur(P.plateforme) };
    case 'actifs': return { t: eur(P.actifs) };
    case 'machines': return { t: eur(P.machines) };
    case 'biens': return { t: eur(P.biens) };
    case 'val': { const a = partie.plateforme.actifs[arg], p = M.prixDeBase(arg); return { t: a && p ? eur(a.qte * p) : '—' }; }
    case 'pv': {
      const a = partie.plateforme.actifs[arg], p = M.prixDeBase(arg);
      if (!a || !p) return { t: '—' };
      const d = a.qte * p - a.cout;
      return { t: eurSigne(d) + ' (' + pct(d / a.cout) + ')', cls: d >= 0 ? 'hausse' : 'baisse' };
    }
    case 'estim': return { t: estimation(ctx) };
  }
  return { t: '' };
}

function live(cle, ctx, base = '') {
  const v = valeurLive(cle, ctx);
  const cls = [base, v.cls].filter(Boolean).join(' ');
  return `<span data-live="${cle}" data-cls="${base}" class="${cls}">${e(v.t)}</span>`;
}

export function nombre(s) {
  const n = parseFloat(String(s || '').replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) ? n : 0;
}

function estimation(ctx) {
  const { app, partie, M } = ctx;
  const c = M.cryptosDisponibles().find(x => x.s === app.crypto);
  const t = c && M.ticker(c.s);
  if (!t) return '';
  const d = reglesDe(partie);
  const sx = app.saisie;
  if (app.typeOrdre !== 'marche') {
    const q = nombre(sx.quantite), p = nombre(sx.prix), st = nombre(sx.limiteStop);
    if (!q) return 'Indique une quantité de ' + c.base + '.';
    if (app.sens === 'achat') {
      const bloque = reserveAchat({ qte: q, prix: app.typeOrdre === 'stop' ? 0 : p, limiteStop: app.typeOrdre === 'limite' ? 0 : st });
      return bloque ? 'Bloque ' + eur(bloque) + ' jusqu\'à l\'exécution ou l\'annulation' : '';
    }
    if (app.typeOrdre === 'limite') return p ? 'Recevrait ≈ ' + eur(q * p * (1 - d.frais)) : '';
    if (app.typeOrdre === 'stop') return st ? 'Recevrait ≈ ' + eur(q * st * (1 - d.frais)) + ' si le stop se déclenche' : '';
    return p && st ? '≈ ' + eur(q * p * (1 - d.frais)) + ' à la limite, ≈ ' + eur(q * st * (1 - d.frais)) + ' au stop' : '';
  }
  if (app.sens === 'achat') {
    const m = nombre(app.saisie.montant);
    if (!m) return 'Indique un montant en euros.';
    const q = m / t.c;
    return '≈ ' + qte(q) + ' ' + c.base + (d.frais ? ' · frais ≈ ' + qte(q * d.frais) + ' ' + c.base : ' · sans frais');
  }
  const q = nombre(app.saisie.quantite);
  if (!q) return 'Indique une quantité de ' + c.base + '.';
  const v = q * t.c;
  return '≈ ' + eur(v) + (d.frais ? ' · frais ≈ ' + eur(v * d.frais) : ' · sans frais');
}

// ---------- Lancement ----------

export function vueLancement(ctx) {
  const { partie } = ctx;
  return `<main class="ecran" style="min-height:100%;justify-content:center">
    <div class="entete" style="gap:14px">
      <div class="logo">${icone('marche', 30).replace('currentColor', '#F3B33D')}</div>
      <div class="surtitre">Version ${VERSION}</div>
      <h1>Proof of Life</h1>
      <p>Trading et minage sur le vrai marché, en temps réel. Tu pars de zéro, comme dans la vraie vie.</p>
    </div>
    ${partie ? `<div class="carte">
      <div class="ligne-kv"><span>Partie en cours</span><span class="badge neutre">${e(reglesDe(partie).nom)}</span></div>
      <div class="carte-titre">${e(partie.profil.prenom)} ${e(partie.profil.nom)}</div>
      <div class="discret" style="font-size:13px">Commencée le ${e(dateHeure(partie.creeLe))}</div>
      <button class="bouton" data-action="continuer">Continuer la partie</button>
    </div>` : ''}
    <button class="bouton ${partie ? 'secondaire' : ''}" data-action="nouvelle">Nouvelle partie</button>
    <button class="lien" style="align-self:center" data-action="importer">Importer une sauvegarde</button>
    <p class="discret" style="font-size:12px;text-align:center">Prix réels fournis par les flux publics de Binance. Aucun argent réel n'est utilisé.</p>
  </main>`;
}

// ---------- Profil ----------

export function vueProfil(ctx) {
  const p = ctx.app.brouillon.profil;
  const aEmploi = p.situation === 'alternant' || p.situation === 'salarie';
  return `<main class="ecran">
    <div class="entete">
      <button class="retour" data-action="accueil-app">${icone('retour', 18)} Retour</button>
      <div class="surtitre">Étape 1 sur 2</div>
      <h1>Qui es-tu ?</h1>
      <p>Ta situation fixe tes revenus, ton logement et tes contraintes pour toute la partie.</p>
    </div>
    <div class="grille-2">
      <label class="champ">Prénom<input id="f-prenom" data-input="profil.prenom" value="${e(p.prenom)}" autocomplete="off" maxlength="30"></label>
      <label class="champ">Nom<input id="f-nom" data-input="profil.nom" value="${e(p.nom)}" autocomplete="off" maxlength="30"></label>
      <label class="champ">Âge<input id="f-age" data-input="profil.age" type="number" inputmode="numeric" min="16" max="80" value="${e(p.age)}"></label>
      <label class="champ">Ville<input id="f-ville" data-input="profil.ville" value="${e(p.ville)}" autocomplete="off" maxlength="40"></label>
    </div>
    <section class="section">
      <div class="section-titre"><h2>Situation</h2></div>
      <div class="grille-2">
        ${SITUATIONS.map(s => `<button class="choix" data-action="situation" data-v="${s.id}" aria-pressed="${p.situation === s.id}">${s.nom}</button>`).join('')}
      </div>
      ${aEmploi ? `<label class="champ">Métier
        <select id="f-metier" data-input="profil.metier">
          ${METIERS.map(([sect, ms]) => `<optgroup label="${e(sect)}">${ms.map(m => `<option ${m === p.metier ? 'selected' : ''}>${e(m)}</option>`).join('')}</optgroup>`).join('')}
        </select></label>
        ${p.situation === 'salarie' ? `<div class="segment sur-fond">${EXPERIENCES.map(([id, nom]) => `<button data-action="experience" data-v="${id}" aria-pressed="${(p.experience || 'debutant') === id}">${nom}</button>`).join('')}</div>` : ''}
        ${p.situation === 'alternant' ? `<div class="segment sur-fond">${[1, 2, 3].map(a => `<button data-action="annee-app" data-v="${a}" aria-pressed="${Number(p.anneeApprentissage || 1) === a}">${a}${a === 1 ? 're' : 'e'} année</button>`).join('')}</div>` : ''}` : ''}
      ${p.situation === 'etudiant' ? `<div class="carte" style="font-size:13px;color:var(--texte-2)">Petit revenu : un job étudiant de 10 h par semaine payé au SMIC, environ 420 € par mois.</div>` : ''}
      ${p.situation === 'sans' ? `<div class="carte alerte" style="font-size:13px">Aucun salaire : le RSA (651,69 € par mois, dès 25 ans) et ton épargne. Avant 25 ans, aucun revenu. Le mode le plus risqué.</div>` : ''}
    </section>
    <section class="section">
      <div class="section-titre"><h2>Transport</h2></div>
      <div class="puces">${TRANSPORTS.map(([id, nom]) => `<button class="puce" data-action="transport" data-v="${id}" aria-pressed="${(p.transport || 'commun') === id}">${nom}</button>`).join('')}</div>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Logement</h2></div>
      ${LOGEMENTS.map(l => `<button class="choix" data-action="logement" data-v="${l.id}" aria-pressed="${p.logement === l.id}">
        <span class="t">${l.nom}</span><span class="plus">+ ${l.plus}</span><span class="moins">− ${l.moins}</span></button>`).join('')}
    </section>
    ${apercuProfil(p)}
    <section class="section">
      <div class="section-titre"><h2>Mode de vie</h2></div>
      <div class="segment sur-fond">
        ${MODES_VIE.map(m => `<button data-action="mode-vie" data-v="${m.id}" aria-pressed="${p.modeVie === m.id}">${m.nom}</button>`).join('')}
      </div>
    </section>
    <button class="bouton" data-action="vers-partie">Continuer</button>
  </main>`;
}

// ---------- Nouvelle partie ----------

export function vueNouvellePartie(ctx) {
  const b = ctx.app.brouillon, p = b.profil, d = DIFFICULTES[b.difficulte];
  const chg = changements(b.difficulte, b.reglages);
  const acc = (b.reglages && 'vitesseMax' in b.reglages ? b.reglages.vitesseMax : d.vitesseMax) > 1;
  const chips = [1000, 10000, 100000, 1000000, 10000000];
  return `<main class="ecran">
    <div class="entete">
      <button class="retour" data-action="vers-profil">${icone('retour', 18)} Profil</button>
      <div class="surtitre">Étape 2 sur 2</div>
      <h1>Nouvelle partie</h1>
      <p>Règle ton capital et ta difficulté. Les prix du marché restent réels dans tous les cas.</p>
    </div>
    <section class="section">
      <div class="section-titre"><h2>Profil</h2><button class="lien" data-action="vers-profil">Modifier</button></div>
      <div class="carte" style="flex-direction:row;align-items:center;gap:14px">
        <div class="avatar" style="width:52px;height:52px;border-radius:26px;font-size:18px">${e(initiales(p))}</div>
        <div style="display:flex;flex-direction:column;gap:3px;min-width:0">
          <div class="carte-titre">${e(p.prenom)} ${e(p.nom)}${p.age ? ', ' + e(p.age) + ' ans' : ''}</div>
          <div class="discret" style="font-size:13px">${e(libelleSituation(p))}</div>
          <div class="discret" style="font-size:13px">${e(LOGEMENTS.find(l => l.id === p.logement).nom)}${p.ville ? ' · ' + e(p.ville) : ''}</div>
        </div>
      </div>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Capital de départ</h2></div>
      <div class="carte">
        <div class="ligne-kv"><span class="num" style="font-size:30px;font-weight:600;color:var(--texte)" data-capital>${eur(b.capital)}</span><span style="font-size:12px">proposé : ${eur(d.capital)}</span></div>
        <label class="champ">Montant libre, sans limite
          <input id="f-capital" class="num" inputmode="decimal" autocomplete="off" value="${e(b.capitalSaisie ?? String(b.capital))}" data-input="capital" placeholder="0"></label>
        <div class="puces">${chips.map(v => `<button class="puce" data-action="capital" data-v="${v}" aria-pressed="${b.capital === v}">${v >= 1e6 ? (v / 1e6).toLocaleString('fr-FR') + ' M€' : v.toLocaleString('fr-FR') + ' €'}</button>`).join('')}</div>
      </div>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Difficulté</h2></div>
      <div class="grille-2">
        ${Object.values(DIFFICULTES).map(x => `<button class="choix" data-action="difficulte" data-v="${x.id}" aria-pressed="${b.difficulte === x.id}">
          <span class="t">${x.nom}</span><span class="s">${x.ligne}</span><span class="score">Score ×${String(x.score).replace('.', ',')}</span></button>`).join('')}
      </div>
      <div class="carte" style="gap:8px">
        <div style="font-size:13px;font-weight:700">En ${d.nom}${chg.length ? ' · Personnalisée' : ''}</div>
        ${d.effets.map(t => `<div class="effet"><span class="puce-pt"></span><span>${e(t)}</span></div>`).join('')}
        ${chg.length ? `<div style="font-size:13px;font-weight:700;color:var(--ambre);margin-top:4px">Tes réglages</div>${chg.map(t => `<div class="effet"><span class="puce-pt"></span><span>${e(t)}</span></div>`).join('')}` : ''}
      </div>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Date de départ</h2></div>
      <div class="carte">
        <div class="segment">
          <button data-action="depart" data-v="direct" aria-pressed="${b.depart.type === 'direct'}">Aujourd'hui (direct)</button>
          <button data-action="depart" data-v="passe" aria-pressed="${b.depart.type === 'passe'}">Date passée</button>
        </div>
        ${b.depart.type === 'passe' ? `<label class="champ">Jour de départ<input id="f-depart" type="date" min="${DATE_MIN_REJEU}" max="${new Date(Date.now() - 864e5).toISOString().slice(0, 10)}" value="${e(b.depart.jour)}" data-input="depart-jour"></label>
          <p class="discret" style="font-size:13px">Le marché rejoue les vraies bougies de ce jour-là${acc ? ', aussi vite que tu le choisis' : ', minute par minute, au rythme réel'}. Réseau Bitcoin, météo, euro-dollar et jours Tempo suivent aussi la date. Possible depuis le 5 janvier 2020 (premières cotations en euros).${acc ? " Une fois aujourd'hui rattrapé, le marché devient simulé." : ''}</p>
          <div class="carte alerte" style="font-size:12px;gap:4px"><span>Pas encore rejoués : perpétuels, minage hors Bitcoin, carnet d'ordres réel (reconstitué autour du prix). Salaires, loyers et tarifs d'électricité restent ceux de 2026.</span></div>`
        : `<p class="discret" style="font-size:13px">${acc ? "Ta partie démarre aujourd'hui avec les vrais prix, puis le temps file à la vitesse que tu choisis : le marché, le réseau Bitcoin et l'actualité deviennent simulés, réalistes et imprévisibles." : 'Ta partie démarre maintenant, synchronisée sur le marché réel.'}</p>`}
      </div>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Options</h2></div>
      <div class="carte liste-lignes" style="padding:0 16px;gap:0">
        <div class="rangee"><span>Devise d'affichage</span><span class="discret">Euro (€)</span></div>
        <button class="rangee" style="width:100%;background:none;border:0;text-align:left;color:inherit;font:inherit" data-action="vers-reglages"><span>Réglages avancés</span><span class="${chg.length ? '' : 'discret'}" style="${chg.length ? 'color:var(--ambre)' : ''}">${chg.length ? chg.length + ' modifié' + (chg.length > 1 ? 's' : '') : 'Aucun changement'} ›</span></button>
      </div>
    </section>
    <button class="bouton" data-action="lancer">Lancer la partie</button>
    <p class="discret" style="font-size:12px;text-align:center">Classement : ${chg.length ? 'Personnalisée (base ' + d.nom + ')' : d.nom}</p>
  </main>`;
}

// ---------- Jeu ----------

const NOMS_ALT = { RVN: 'Ravencoin', ETC: 'Ethereum Classic', ERG: 'Ergo', XMR: 'Monero', KAS: 'Kaspa' };
const ONGLETS = [['accueil', 'Accueil'], ['marche', 'Marché'], ['minage', 'Minage'], ['social', 'Social'], ['vie', 'Vie'], ['finances', 'Finances']];

export function vueJeu(ctx) {
  const { app, partie } = ctx;
  const d = reglesDe(partie);
  const corps = {
    accueil: ongletAccueil, marche: ongletMarche, finances: ongletFinances, vie: ongletVie, social: ongletSocial,
    minage: c => ongletMinage(c, live),
    installations: c => ongletInstallations(c, live)
  }[app.onglet](ctx);
  return `<header class="barre-haut">
      <div class="qui"><div class="avatar">${e(initiales(partie.profil))}</div>
        <div style="display:flex;flex-direction:column;min-width:0"><span class="n">${e(partie.profil.prenom)}</span><span class="d">${live('horloge', ctx)} · ${e(d.nom)}</span></div></div>
      ${live('statut', ctx, 'badge')}
    </header>
    ${accelere() ? barreVitesse() : ''}
    <main class="contenu">${corps}</main>
    <nav class="nav" aria-label="Navigation principale">
      ${ONGLETS.map(([id, nom]) => `<button data-action="onglet" data-v="${id}" ${app.onglet === id ? 'aria-current="page"' : ''} style="position:relative">${icone(id)}${nom}${id === 'social' && nonLus(partie) ? `<span style="position:absolute;top:4px;right:calc(50% - 18px);min-width:16px;height:16px;border-radius:8px;background:var(--baisse);color:#fff;font-size:10px;font-weight:800;display:flex;align-items:center;justify-content:center">${nonLus(partie)}</span>` : ''}</button>`).join('')}
    </nav>`;
}

// Temps accéléré : vitesse réglable, pause comprise (jusqu'au maximum de la difficulté).
function barreVitesse() {
  const v = vitesseActuelle(), max = vitesseMaximale();
  return `<div class="barre-vitesse" role="group" aria-label="Vitesse du temps">
    ${VITESSES.filter(([x]) => x <= max).map(([x, nom]) => `<button class="puce" data-action="vitesse" data-v="${x}" aria-pressed="${v === x}">${x === 0 ? '⏸ ' : ''}${nom}</button>`).join('')}
  </div>`;
}

function ongletBientot(titre, version, texte) {
  return `<h1 style="font-size:24px;font-weight:800">${titre}</h1>
    <div class="carte info"><span class="badge attente" style="align-self:flex-start">Version ${version}</span>
      <p style="font-size:14px;color:var(--texte-2)">${texte}</p></div>`;
}

function ongletAccueil(ctx) {
  const { partie, M } = ctx;
  const d = reglesDe(partie);
  const pl = partie.plateforme;
  const etapes = [
    ['Ouvrir un compte sur la plateforme', pl.statut === 'ouvert'],
    ['Virer de l\'argent depuis ta banque', pl.soldeEUR > 0 || Object.keys(pl.actifs).length > 0 || partie.historique.some(h => h.type === 'virement')],
    ['Acheter ta première crypto', partie.historique.some(h => h.type === 'achat')]
  ];
  const guide = d.aides && etapes.some(x => !x[1]);
  const actifs = Object.entries(pl.actifs);
  return `${carteAbsence(ctx)}<section class="carte" style="border-radius:20px">
      <span class="discret" style="font-size:13px">Patrimoine total</span>
      ${live('patrimoine', ctx, 'gros-chiffre')}
      <span class="num" style="font-size:13px">${live('perf', ctx)} <span class="discret">depuis le départ</span></span>
      <div class="repartition" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div><span class="l">Banque</span>${live('banque', ctx, 'v')}</div>
        <div><span class="l">Plateforme</span>${live('plat', ctx, 'v')}</div>
        <div><span class="l">Cryptos</span>${live('actifs', ctx, 'v')}</div>
        <div><span class="l">Machines (revente)</span>${live('machines', ctx, 'v')}</div>
        ${partie.profil.proprietaire || partie.profil.voiture || partie.social?.fonds ? `<div><span class="l">Logement, voiture, fonds</span>${live('biens', ctx, 'v')}</div>` : ''}
      </div>
    </section>
    ${guide ? `<section class="carte"><div class="carte-titre">Pour bien démarrer</div>
      ${etapes.map((x, i) => `<div class="etape ${x[1] ? 'faite' : ''}"><span class="rond">${x[1] ? '✓' : i + 1}</span><span class="txt">${x[0]}</span></div>`).join('')}
      <button class="bouton petit" data-action="onglet" data-v="${pl.statut === 'ouvert' && pl.soldeEUR > 0 ? 'marche' : 'finances'}">${pl.statut === 'ouvert' && pl.soldeEUR > 0 ? 'Aller au marché' : 'Aller aux finances'}</button>
    </section>` : ''}
    ${(partie.actualites || []).length ? `<section class="section"><div class="section-titre"><h2>Actualités</h2>${M.phase() ? `<span class="discret" style="font-size:12px">marché ${e(M.phase())}</span>` : ''}</div>
      <div class="carte" style="gap:0;padding:4px 16px">${partie.actualites.slice(0, 5).map(a => `<div class="rangee" style="min-height:0;padding:10px 0;align-items:flex-start;gap:10px;font-size:13px">
        <span class="num discret" style="flex-shrink:0">${e(new Date(a.t).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' }))}</span>
        <span style="display:flex;flex-direction:column;gap:2px;flex:1"><span style="font-weight:700;color:var(--texte)">${e(a.titre)}</span><span class="discret">${e(a.texte)}</span></span>
        ${a.impact ? `<span class="num ${a.impact.pct >= 0 ? 'hausse' : 'baisse'}" style="flex-shrink:0">${a.impact.pct > 0 ? '+' : ''}${a.impact.pct} %</span>` : ''}</div>`).join('')}</div></section>` : ''}
    <section class="section">
      <div class="section-titre"><h2>Mes cryptos</h2></div>
      ${actifs.length ? `<div class="carte liste-lignes" style="padding:0 16px;gap:0">
        ${actifs.map(([base, a]) => {
          const c = M.cryptosDisponibles().find(x => x.base === base);
          if (!c) return `<div class="rangee">
            <span style="display:flex;gap:12px;align-items:center;min-width:0"><span class="jeton">${e(base)}</span>
              <span class="g"><span class="t">${e(NOMS_ALT[base] || base)}</span><span class="s num">${qte(a.qte)} ${e(base)} · ${live('val:' + base, ctx)}</span></span></span>
            <button class="bouton secondaire petit" style="min-height:36px;padding:0 12px;font-size:13px" data-action="convertir" data-v="${e(base)}">En BTC</button></div>`;
          return `<button class="rangee" data-action="crypto" data-s="${c.s}">
            <span style="display:flex;gap:12px;align-items:center;min-width:0"><span class="jeton">${e(base)}</span>
              <span class="g"><span class="t">${e(c ? c.nom : base)}</span><span class="s num">${qte(a.qte)} ${e(base)}</span></span></span>
            <span class="d"><span class="num" style="font-size:14px">${live('val:' + base, ctx)}</span><span class="num" style="font-size:12px">${live('pv:' + base, ctx)}</span></span>
          </button>`;
        }).join('')}</div>` : `<div class="carte vide">Tu ne possèdes encore aucune crypto${(pl.ordres || []).length ? ' disponible (le reste est bloqué dans tes ordres)' : ''}.</div>`}
    </section>
    ${ordresOuverts(ctx)}
    ${journalHtml(partie, 6)}`;
}

function journalHtml(partie, n) {
  return `<section class="section"><div class="section-titre"><h2>Journal</h2></div>
    <div class="carte journal" style="padding:4px 16px;gap:0">
      ${partie.historique.slice(0, n).map(h => `<div class="item"><span class="h">${e(dateHeure(h.t))}</span><span>${e(h.texte)}</span></div>`).join('')}
    </div></section>`;
}

function ongletMarche(ctx) {
  const { app, partie, M } = ctx;
  const ouvert = partie.plateforme.statut === 'ouvert';
  if (app.crypto) return detailCrypto(ctx);
  const liste = M.cryptosDisponibles();
  const choix = `<div class="segment sur-fond"><button data-action="vue-marche" data-v="comptant" aria-pressed="${app.vueMarche !== 'perp'}">Comptant</button><button data-action="vue-marche" data-v="perp" aria-pressed="${app.vueMarche === 'perp'}">Perpétuels</button></div>`;
  if (app.vueMarche === 'perp') return `<h1 style="font-size:24px;font-weight:800">Marché</h1>${choix}${ongletPerp(ctx, live)}`;
  return `<h1 style="font-size:24px;font-weight:800">Marché</h1>${choix}
    ${!ouvert ? `<div class="carte info" style="font-size:13px;color:var(--texte-2)">Tu peux suivre les prix, mais il te faut un compte sur la plateforme pour acheter.
      <button class="bouton petit" data-action="onglet" data-v="finances">Ouvrir un compte</button></div>` : ''}
    <div class="carte liste-lignes" style="padding:0 16px;gap:0">
      ${liste.map(c => `<button class="rangee" data-action="crypto" data-s="${c.s}">
        <span style="display:flex;gap:12px;align-items:center;min-width:0"><span class="jeton">${e(c.base)}</span>
          <span class="g"><span class="t">${e(c.nom)}</span><span class="s">${e(c.base)} / EUR</span></span></span>
        <span class="d"><span class="num" style="font-size:15px">${live('px:' + c.s, ctx)}</span><span class="num" style="font-size:12px">${live('chg:' + c.s, ctx)}</span></span>
      </button>`).join('')}
    </div>
    <p class="discret" style="font-size:12px">Variation sur 24 h. Prix en euros, en direct.</p>`;
}

function detailCrypto(ctx) {
  const { app, partie } = ctx;
  const c = ctx.M.cryptosDisponibles().find(x => x.s === app.crypto);
  if (!c) return '<div class="vide">Crypto indisponible.</div>';
  const d = reglesDe(partie);
  const pl = partie.plateforme;
  const a = pl.actifs[c.base];
  const ouvert = pl.statut === 'ouvert';
  const achat = app.sens === 'achat';
  const modeTxt = d.execution === 'carnet' ? "Exécuté sur le vrai carnet d'ordres : un gros montant paie un prix moyen moins bon."
    : d.execution === 'meilleur' ? 'Exécuté au meilleur prix affiché, sans glissement.' : 'Exécuté au prix moyen entre achat et vente.';
  return `<div><button class="retour" data-action="liste">${icone('retour', 18)} Marché</button></div>
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px">
      <div style="display:flex;flex-direction:column;gap:4px">
        <span style="font-size:18px;font-weight:800">${e(c.nom)} <span class="discret" style="font-weight:600">${e(c.base)}/EUR</span></span>
        ${live('px:' + c.s, ctx, 'gros-chiffre')}
        <span class="num" style="font-size:13px">${live('chg:' + c.s, ctx)} <span class="discret">24 h</span></span>
      </div>
    </div>
    <div class="puces">${INTERVALLES.map(i => `<button class="puce num" data-action="intervalle" data-v="${i.id}" aria-pressed="${app.intervalle === i.id}">${i.nom}</button>`).join('')}</div>
    <div class="graph-boite"><canvas id="graphique" class="graphique" role="img" aria-label="Cours de ${e(c.nom)} en chandeliers"></canvas>
      <div class="graph-msg" id="graph-msg">${app.graphErreur ? 'Graphique indisponible pour le moment.' : 'Chargement du graphique…'}</div></div>
    <div class="grille-3" style="font-size:12px">
      <div class="carte" style="padding:10px;gap:2px"><span class="discret">Haut 24 h</span>${live('h24:' + c.s, ctx, 'num')}</div>
      <div class="carte" style="padding:10px;gap:2px"><span class="discret">Bas 24 h</span>${live('l24:' + c.s, ctx, 'num')}</div>
      <div class="carte" style="padding:10px;gap:2px"><span class="discret">Volume 24 h</span>${live('vol:' + c.s, ctx, 'num')}</div>
    </div>
    ${a ? `<section class="carte" style="gap:8px"><div class="carte-titre">Ma position</div>
      <div class="ligne-kv"><span>Quantité</span><span class="num">${qte(a.qte)} ${e(c.base)}</span></div>
      <div class="ligne-kv"><span>Prix de revient moyen</span><span class="num">${prix(a.cout / a.qte)} €</span></div>
      <div class="ligne-kv"><span>Valeur</span>${live('val:' + c.base, ctx, 'num')}</div>
      <div class="ligne-kv"><span>Plus-value latente</span>${live('pv:' + c.base, ctx, 'num')}</div></section>` : ''}
    <section class="carte">
      ${!ouvert ? `<p style="font-size:14px;color:var(--texte-2)">Ouvre un compte sur la plateforme pour passer des ordres.</p>
        <button class="bouton petit" data-action="onglet" data-v="finances">Aller aux finances</button>` : `
      <div class="segment">
        <button class="achat" data-action="sens" data-v="achat" aria-pressed="${achat}">Acheter</button>
        <button class="vente" data-action="sens" data-v="vente" aria-pressed="${!achat}">Vendre</button>
      </div>
      <div class="segment">
        ${TYPES_UI.map(([id, nom]) => `<button data-action="type-ordre" data-v="${id}" aria-pressed="${app.typeOrdre === id}">${nom}</button>`).join('')}
      </div>
      ${champsOrdre(app, c, a, pl, achat)}
      <div class="puces">${[25, 50, 75, 100].map(v => `<button class="puce" data-action="part" data-v="${v}">${v} %</button>`).join('')}</div>
      <div class="num" style="font-size:13px;color:var(--texte-2);min-height:18px">${live('estim', ctx)}</div>
      <button class="bouton ${achat ? 'achat' : 'vente'}" data-action="ordre" ${app.enCours ? 'disabled' : ''}>${app.enCours ? 'Envoi de l\'ordre…' : app.typeOrdre === 'marche' ? (achat ? 'Acheter ' : 'Vendre ') + e(c.base) : 'Placer l\'ordre ' + (achat ? "d'achat" : 'de vente')}</button>
      <p class="discret" style="font-size:12px">${app.typeOrdre === 'marche' ? modeTxt : AIDES_TYPE[app.typeOrdre]} Frais : ${d.frais ? String(d.frais * 100).replace('.', ',') + ' %' : 'aucun'}.</p>`}
    </section>
    ${ordresOuverts(ctx, c.s)}`;
}

const TYPES_UI = [['marche', 'Marché'], ['limite', 'Limite'], ['stop', 'Stop'], ['oco', 'OCO']];
const AIDES_TYPE = {
  limite: "S'exécute seulement si le prix réel traverse ton prix limite.",
  stop: 'Quand le prix atteint le déclenchement, un ordre limite est placé à ton prix limite.',
  oco: "Deux ordres liés : un limite et un stop-limit. Dès que l'un s'exécute, l'autre est annulé."
};

function champ(id, label, cle, app, ph = '0,00') {
  return `<label class="champ">${label}<input id="f-${id}" class="num" inputmode="decimal" placeholder="${ph}" value="${e(app.saisie[cle])}" data-input="${cle}" autocomplete="off"></label>`;
}

function champsOrdre(app, c, a, pl, achat) {
  const dispo = achat
    ? `<div class="ligne-kv" style="font-size:13px"><span>Disponible</span><span class="num">${eur(pl.soldeEUR)}</span></div>`
    : `<div class="ligne-kv" style="font-size:13px"><span>Disponible</span><span class="num">${a ? qte(a.qte) : '0'} ${e(c.base)}</span></div>`;
  const t = app.typeOrdre;
  if (t === 'marche') {
    return (achat ? champ('montant', 'Montant à dépenser (€)', 'montant', app) : champ('quantite', 'Quantité à vendre (' + e(c.base) + ')', 'quantite', app, '0')) + dispo;
  }
  const qteChamp = champ('quantite', 'Quantité (' + e(c.base) + ')', 'quantite', app, '0');
  if (t === 'limite') return `<div class="grille-2">${champ('prix', 'Prix limite (€)', 'prix', app)}${qteChamp}</div>${dispo}`;
  if (t === 'stop') return `<div class="grille-2">${champ('stop', 'Déclenchement (€)', 'stop', app)}${champ('limiteStop', 'Prix limite (€)', 'limiteStop', app)}</div>${qteChamp}${dispo}`;
  return `${champ('prix', 'Prix limite (€)', 'prix', app)}
    <div class="grille-2">${champ('stop', 'Déclenchement du stop (€)', 'stop', app)}${champ('limiteStop', 'Limite du stop (€)', 'limiteStop', app)}</div>${qteChamp}${dispo}`;
}

function ordresOuverts(ctx, s) {
  const liste = (ctx.partie.plateforme.ordres || []).filter(o => !s || o.s === s);
  if (!liste.length) return '';
  return `<section class="section"><div class="section-titre"><h2>Ordres en attente</h2><span class="discret" style="font-size:12px">${liste.length}</span></div>
    <div class="carte liste-lignes" style="padding:0 16px;gap:0">
      ${liste.map(o => `<div class="rangee">
        <span class="g"><span class="t" style="font-size:14px"><span class="${o.sens === 'achat' ? 'hausse' : 'baisse'}">${o.sens === 'achat' ? 'Achat' : 'Vente'}</span> · ${TYPES[o.type]}${o.declenche ? ' · stop déclenché' : ''}</span>
          <span class="s num">${e(descriptionOrdre(o, prix, qte))}</span></span>
        <button class="bouton secondaire petit" style="min-height:36px;padding:0 12px;font-size:13px" data-action="annuler-ordre" data-v="${o.id}">Annuler</button>
      </div>`).join('')}
    </div></section>`;
}

function carteAbsence(ctx) {
  const a = ctx.app.absence;
  if (!a) return '';
  return `<section class="carte info">
    <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">Pendant ton absence</span><span class="discret" style="font-size:12px">${e(a.duree)}</span></div>
    ${a.evenements.slice(0, 8).map(t => `<div class="effet"><span class="puce-pt"></span><span>${e(t)}</span></div>`).join('')}
    <button class="bouton petit" data-action="fermer-absence">Compris</button>
  </section>`;
}

function ongletFinances(ctx) {
  const { app, partie } = ctx;
  const pl = partie.plateforme;
  const d = reglesDe(partie);
  const versPlat = app.virement.sens === 'plateforme';
  let carteP;
  if (pl.statut === 'aucun') {
    carteP = `<p style="font-size:14px;color:var(--texte-2)">Pour acheter des cryptos, ouvre un compte sur une plateforme d'échange. Une vérification d'identité est obligatoire.</p>
      <button class="bouton" data-action="kyc">Ouvrir un compte</button>`;
  } else if (pl.statut === 'verification') {
    carteP = `<div class="ligne-kv"><span>Vérification d'identité</span><span class="badge attente"><span class="pt"></span>En cours</span></div>
      <div class="ligne-kv"><span>Temps restant</span>${live('kyc', ctx, 'num')}</div>
      <p class="discret" style="font-size:12px">Délai réel d'environ 20 minutes, divisé par la vitesse du temps de ta difficulté.</p>`;
  } else {
    const bloque = (pl.ordres || []).reduce((s, o) => s + (o.reserve.eur || 0), 0);
    carteP = `<div class="ligne-kv"><span>Euros disponibles</span><span class="num" style="font-size:18px;color:var(--texte)">${eur(pl.soldeEUR)}</span></div>
      ${bloque ? `<div class="ligne-kv"><span>Bloqués dans des ordres</span><span class="num">${eur(bloque)}</span></div>` : ''}
      <div class="ligne-kv"><span>Cryptos</span>${live('actifs', ctx, 'num')}</div>`;
  }
  const segFin = `<div class="segment sur-fond"><button data-action="sous-finances" data-v="perso" aria-pressed="${app.sousFinances !== 'entreprise'}">Moi</button><button data-action="sous-finances" data-v="entreprise" aria-pressed="${app.sousFinances === 'entreprise'}">Mon entreprise</button></div>`;
  if (app.sousFinances === 'entreprise') return `<h1 style="font-size:24px;font-weight:800">Finances</h1>${segFin}${ongletEntreprise(ctx)}`;
  return `<h1 style="font-size:24px;font-weight:800">Finances</h1>${segFin}
    <section class="carte">
      <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">Compte bancaire</span><span class="badge neutre">Banque</span></div>
      <div class="ligne-kv"><span>Solde</span><span class="num" style="font-size:18px;color:var(--texte)">${eur(partie.banque.solde)}</span></div>

    </section>
    <section class="carte">
      <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">Plateforme d'échange</span>${pl.statut === 'ouvert' ? '<span class="badge ok"><span class="pt"></span>Ouvert</span>' : ''}</div>
      ${carteP}
    </section>
    ${pl.statut === 'ouvert' ? `<section class="carte">
      <div class="carte-titre">Virement</div>
      <div class="segment">
        <button data-action="vir-sens" data-v="plateforme" aria-pressed="${versPlat}">Banque → Plateforme</button>
        <button data-action="vir-sens" data-v="banque" aria-pressed="${!versPlat}">Plateforme → Banque</button>
      </div>
      <label class="champ">Montant (€)<input id="f-virement" class="num" inputmode="decimal" placeholder="0,00" value="${e(app.virement.montant)}" data-input="virement" autocomplete="off"></label>
      <div class="ligne-kv" style="font-size:13px"><span>Disponible</span><span class="num">${eur(versPlat ? partie.banque.solde : pl.soldeEUR)}</span></div>
      <button class="bouton" data-action="virer">Virer</button>
      <p class="discret" style="font-size:12px">Virement SEPA instantané, sans frais.</p>
    </section>` : ''}
    ${sectionImpots(ctx)}
    ${journalHtml(partie, 30)}
    <section class="section">
      <div class="section-titre"><h2>Partie</h2></div>
      <div class="carte" style="gap:8px">
        <div class="ligne-kv"><span>Difficulté</span><span>${d.personnalisee ? `Personnalisée (base ${e(d.base)})` : `${e(d.nom)} · score ×${String(d.score).replace('.', ',')}`}</span></div>
        ${d.personnalisee ? changements(partie.difficulte, partie.reglages).map(t => `<div class="effet" style="font-size:12px"><span class="puce-pt"></span><span>${e(t)}</span></div>`).join('') : ''}
        <div class="ligne-kv"><span>Début</span><span>${partie.depart && partie.depart.type === 'passe' ? 'Rejeu · ' + new Date(partie.creeLe).toLocaleDateString('fr-FR') : e(dateHeure(partie.creeLe))}</span></div>
        <div class="ligne-kv"><span>Capital de départ</span><span class="num">${eur(partie.capitalDepart)}</span></div>
        <div class="grille-2" style="margin-top:8px">
          <button class="bouton secondaire petit" data-action="exporter">Exporter</button>
          <button class="bouton secondaire petit" data-action="importer">Importer</button>
          <button class="bouton secondaire petit" data-action="notifs">${notifsActives() ? 'Notifications : oui' : 'Notifications : non'}</button>
          <button class="bouton danger petit" data-action="abandonner">Abandonner</button>
        </div>
      </div>
    </section>`;
}

// ---------- Superpositions ----------

export function vueSuperpositions(app) {
  let h = '';
  if (app.confirmation) {
    const c = app.confirmation;
    h += `<div class="voile" role="dialog" aria-modal="true" aria-labelledby="dlg-t"><div class="dialogue">
      <h2 id="dlg-t">${e(c.titre)}</h2><p>${e(c.texte)}</p>
      <div class="grille-2"><button class="bouton secondaire petit" data-action="annuler">Annuler</button>
      <button class="bouton ${c.danger ? 'danger' : ''} petit" data-action="confirmer">${e(c.bouton)}</button></div>
    </div></div>`;
  }
  if (app.toast) h += `<div class="toast ${app.toast.type || ''}" role="status">${e(app.toast.texte)}</div>`;
  return h;
}
