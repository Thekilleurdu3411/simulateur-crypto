// Écran « Mon entreprise » (onglet Finances) : société, minage industriel, traders, comptes.
import { SITES, site, CREATION, PFU, machinesAchetables, prixLot, puissanceSite, machinesTotal, techniciensRequis, disponibilite, valeurEntreprise,
  candidats, PROFILS_TRADER, CHARGES_PATRONALES, FRAIS_RECRUTEMENT, resultat, impotSocietes, TECHNICIEN, chargesFixesMois, valeurLot, LIQUIDATION_JOURS, FRAIS_POOL, PUE } from './entreprise.js';
import { modele, btcParSeconde } from './minage.js';
import { partEntreprise } from './entreprise.js';
import { AGREMENTS, STRATEGIES, MARKETING, SECURITE, PLATEFORME, BOURSE, encours, perf12, salariesPlateforme, conditionsBourse, cours, valeurAmorcage, FRAIS_FONDS } from './expansion.js';
import { eur, eurSigne, echapper as e } from './format.js';
import { maintenant as tJeu } from './horloge.js';

const JOUR = 864e5;
const nb = n => Math.round(n).toLocaleString('fr-FR');
const date = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
const kv = (k, v, style = '') => `<div class="ligne-kv" style="font-size:13px;${style}"><span>${k}</span><span class="num">${v}</span></div>`;
const signe = x => `<span style="color:${x >= 0 ? 'var(--hausse)' : 'var(--baisse)'}">${eurSigne(x)}</span>`;
const graine = partie => ((partie.creeLe || 0) / 1000) | 0;
export const moisDe = t => { const d = new Date(t); return d.getUTCFullYear() * 12 + d.getUTCMonth(); };

export function ongletEntreprise(ctx) {
  const { partie } = ctx;
  const ent = partie.entreprise;
  if (!ent || ent.liquidee) return creation(ctx, ent);
  const t = tJeu(), prixBTC = ctx.M.prixDeBase('BTC'), eurUsd = ctx.D.etat.eurUsd;
  const sous = ctx.app.sousEntreprise || 'minage';
  const pret = t >= ent.pretLe;
  return `<section class="carte" style="gap:6px">
      <span class="discret" style="font-size:12px">SAS au capital de ${nb(ent.capital)} € · ${pret ? 'créée le ' + date(ent.creeLe) : 'immatriculation en cours, Kbis le ' + date(ent.pretLe)}</span>
      <span style="font-size:20px;font-weight:800">${e(ent.nom)}</span>
      ${kv('Valeur de la société', eur(ent.bourse && ent.bourse.cotee ? ent.bourse.capi : valeurEntreprise(ent, prixBTC, eurUsd, t) - ent.compteCourant), 'font-size:15px;color:var(--texte)')}
      ${(ent.parts ?? 1) < 1 ? kv('Ta part', `${((ent.parts) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % · ${eur(partEntreprise(ent, prixBTC, eurUsd, t) - ent.compteCourant)}`) : ''}
      ${kv('Trésorerie', `<span style="color:${ent.tresorerie < 0 ? 'var(--baisse)' : 'var(--texte)'}">${eur(ent.tresorerie)}</span>`)}
      ${ent.btc ? kv('Bitcoins gardés', `${ent.btc.toFixed(4).replace('.', ',')} BTC · ${eur(ent.btc * (prixBTC || 0))}`) : ''}
      ${kv("Ton compte courant d'associé", eur(ent.compteCourant))}
      ${kv('Bénéfices distribuables', eur(Math.max(0, ent.reserves)))}
      ${ent.tresorerie < 0 && ent.negatifDepuis ? `<p style="font-size:13px;color:var(--baisse)">Découvert depuis ${Math.floor((t - ent.negatifDepuis) / JOUR)} jours : liquidation judiciaire au bout de ${LIQUIDATION_JOURS} jours. Fais un apport.</p>` : ''}
    </section>
    <section class="carte" style="gap:8px">
      <div class="carte-titre">Entre toi et ta société</div>
      <label class="champ">Montant (€)<input id="f-ent-flux" class="num" inputmode="decimal" placeholder="0" autocomplete="off"></label>
      <div class="grille-2">
        <button class="bouton secondaire petit" data-action="ent-apport">Apporter</button>
        <button class="bouton secondaire petit" data-action="ent-rembourser">Me rembourser</button>
        <button class="bouton secondaire petit" data-action="ent-capital">Augmenter le capital</button>
      <button class="bouton secondaire petit" data-action="ent-dividendes">Dividendes</button>
      </div>
      <p class="discret" style="font-size:12px">Apport : tu prêtes à ta société (compte courant d'associé), elle te rembourse sans impôt. Capital : l'argent devient des fonds propres, exigés par l'AMF pour les agréments, mais tu ne peux plus le reprendre. Dividendes : seulement sur les bénéfices des années clôturées, avec la flat tax de ${String(PFU * 100).replace('.', ',')} %.</p>
    </section>
    <div class="segment sur-fond">
      ${[['minage', 'Minage'], ['traders', 'Traders'], ['croissance', 'Croissance'], ['comptes', 'Comptes']].map(([id, nom]) => `<button data-action="sous-entreprise" data-v="${id}" aria-pressed="${sous === id}">${nom}</button>`).join('')}
    </div>
    ${sous === 'minage' ? minage(ctx, ent, t, prixBTC, eurUsd) : sous === 'traders' ? traders(ctx, ent, t) : sous === 'croissance' ? croissance(ctx, ent, t, prixBTC, eurUsd) : comptes(ent)}`;
}

function creation(ctx, ancienne) {
  return `${ancienne ? `<div class="carte alerte" style="font-size:13px">${e(ancienne.nom)} a été liquidée le ${date(ancienne.liquidee.t)}. Tu peux recommencer.</div>` : ''}
    <section class="carte" style="gap:10px">
      <div class="carte-titre">Créer ta société</div>
      <p style="font-size:14px;color:var(--texte-2)">Une SAS te permet de passer à l'échelle : construire des fermes de minage, embaucher des techniciens et des traders. Elle a sa propre trésorerie et paie l'impôt sur les sociétés (15 % jusqu'à 42 500 € de bénéfice, 25 % au-delà). Ta responsabilité est limitée à tes apports.</p>
      <label class="champ">Nom de la société<input id="f-ent-nom" placeholder="Ex. : Valmine" maxlength="40" autocomplete="off"></label>
      <label class="champ">Capital social (€)<input id="f-ent-capital" class="num" inputmode="decimal" placeholder="${nb(CREATION.capitalMin)}" autocomplete="off"></label>
      <p class="discret" style="font-size:12px">Frais de création : ${CREATION.frais} € (greffe et annonce légale), payés par la société. Capital minimum ${nb(CREATION.capitalMin)} €, pris sur ton compte bancaire. Kbis en ${CREATION.delaiJours} jours. Ensuite, tu pourras apporter plus d'argent en compte courant.</p>
      <button class="bouton" data-action="ent-creer">Créer la société</button>
    </section>`;
}

function minage(ctx, ent, t, prixBTC, eurUsd) {
  const reseau = ctx.D.etat.reseau;
  const dispo = disponibilite(ent);
  const th = ent.sites.filter(s => s.ouvert).reduce((a, s) => a + s.lots.filter(l => l.livre).reduce((b, l) => b + l.n * modele(l.modele).th, 0), 0) * dispo;
  const btcJour = reseau ? btcParSeconde(th, reseau.difficulte, reseau.recompense, FRAIS_POOL) * 86400 : 0;
  const req = techniciensRequis(ent);
  const choix = machinesAchetables(t);
  const sitesOk = ent.sites;
  return `<section class="carte" style="gap:6px">
      ${kv('Machines', nb(machinesTotal(ent)))}
      ${kv('Puissance de calcul en marche', th >= 1000 ? (th / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' PH/s' : nb(th) + ' TH/s')}
      ${kv('Production', `${btcJour.toFixed(4).replace('.', ',')} BTC par jour${prixBTC ? ' · ' + eur(btcJour * prixBTC) : ''}`)}
      ${kv('Machines en marche', Math.round(dispo * 100) + ' %')}
      <div class="ligne-kv" style="font-size:13px"><span>Techniciens : ${ent.techniciens} (${req} conseillé${req > 1 ? 's' : ''})</span>
        <span style="display:flex;gap:6px"><button class="puce" data-action="ent-tech" data-v="-1">−</button><button class="puce" data-action="ent-tech" data-v="1">+</button></span></div>
      <p class="discret" style="font-size:12px">Un technicien pour ${250} machines (${nb(TECHNICIEN.coutMois)} € par mois chacun, ${nb(TECHNICIEN.recrutement)} € de recrutement). Sans eux, les pannes s'accumulent.</p>
      <div class="segment"><button data-action="ent-vendre-btc-auto" data-v="1" aria-pressed="${ent.vendreBTC}">Vendre les BTC minés</button><button data-action="ent-vendre-btc-auto" data-v="0" aria-pressed="${!ent.vendreBTC}">Les garder</button></div>
      ${ent.btc ? `<button class="bouton secondaire petit" data-action="ent-vendre-btc">Vendre les ${ent.btc.toFixed(4).replace('.', ',')} BTC gardés</button>` : ''}
    </section>
    ${ent.sites.map(s => {
      const S = site(s.type), kw = puissanceSite(s);
      return `<section class="carte" style="gap:6px">
        <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${e(s.nom)}</span>${s.ouvert ? '<span class="badge ok"><span class="pt"></span>En service</span>' : `<span class="badge attente"><span class="pt"></span>Chantier</span>`}</div>
        <span class="discret" style="font-size:12px">${e(S.lieu)} · électricité ${String(S.kwh).replace('.', ',')} ${S.devise === 'USD' ? '$' : '€'}/kWh · loyer ${nb(S.loyer)} € par mois${s.ouvert ? '' : ' · prêt le ' + date(s.pretLe)}</span>
        ${kv('Puissance utilisée', `${nb(kw)} / ${nb(S.kw)} kW`)}
        <div style="height:6px;border-radius:3px;background:var(--ligne)"><div style="height:6px;border-radius:3px;width:${Math.min(100, kw / S.kw * 100)}%;background:var(--ambre)"></div></div>
        ${s.lots.map((l, i) => `<div class="ligne-kv" style="font-size:13px"><span>${l.n} × ${e(modele(l.modele).nom)}</span><span>${l.livre ? `<button class="lien" data-action="ent-vendre-lot" data-v="${s.id}|${i}">Revendre ${eur(valeurLot(l, eurUsd, t))}</button>` : 'livraison le ' + date(l.livreLe)}</span></div>`).join('')}
      </section>`;
    }).join('')}
    ${sitesOk.length ? `<section class="carte" style="gap:8px">
      <div class="carte-titre">Acheter des machines</div>
      <label class="champ">Site<select id="f-ent-site">${sitesOk.map(s => `<option value="${s.id}">${e(s.nom)}</option>`).join('')}</select></label>
      <label class="champ">Modèle<select id="f-ent-modele">${choix.map(m => `<option value="${m.id}">${e(m.nom)} · ${nb(m.th)} TH/s · ${eurUsd ? nb(prixLot(m, 1, eurUsd).unitaire) + ' € HT' : ''}</option>`).join('')}</select></label>
      <label class="champ">Nombre<input id="f-ent-n" class="num" inputmode="numeric" placeholder="100" autocomplete="off"></label>
      <p class="discret" style="font-size:12px">Prix hors taxes (la société récupère la TVA), 300 € de transport par lot, remise de 5 % dès 100 machines et 10 % dès 500. Livraison en 3 semaines après l'ouverture du site. Amorties sur 3 ans.</p>
      <button class="bouton" data-action="ent-acheter">Commander</button>
    </section>` : ''}
    <section class="section"><div class="section-titre"><h2>Construire un site</h2></div>
      ${SITES.map(S => `<div class="carte" style="gap:6px">
        <div class="ligne-kv"><span style="font-weight:700">${e(S.nom)}</span><span class="num">${nb(S.kw >= 1000 ? S.kw / 1000 : S.kw)} ${S.kw >= 1000 ? 'MW' : 'kW'}</span></div>
        <span class="discret" style="font-size:12px">${e(S.lieu)} · électricité ${String(S.kwh).replace('.', ',')} ${S.devise === 'USD' ? '$' : '€'}/kWh · loyer ${nb(S.loyer)} € par mois · chantier de ${S.delai} jours · environ ${nb(S.kw * 1000 / (3645 * PUE))} machines</span>
        <button class="bouton secondaire petit" data-action="ent-site" data-v="${S.id}">Construire · ${eur(S.travaux)}</button>
      </div>`).join('')}
    </section>`;
}

const styleRisque = r => (r < 0.45 ? 'Prudent' : r < 0.75 ? 'Modéré' : 'Agressif');
function traders(ctx, ent, t) {
  const seed = graine(ctx.partie), mois = moisDe(t);
  const cands = candidats(seed, mois).filter(c => !(ent.embauches || {})[c.id]);
  const equipe = ent.traders;
  return `<section class="carte" style="gap:8px">
      <label class="champ">Montant (€) pour confier, reprendre ou doter une recrue<input id="f-ent-alloc" class="num" inputmode="decimal" placeholder="0" autocomplete="off"></label>
      <p class="discret" style="font-size:12px">Les traders font travailler l'argent de la société. La plupart ne battent pas le marché ; les bons coûtent cher. Ils touchent un bonus sur leurs gains de l'année. Des références floues doivent t'alerter.</p>
    </section>
    ${equipe.length ? equipe.map((tr, i) => `<section class="carte" style="gap:6px">
      <div class="ligne-kv"><span style="font-weight:700">${e(tr.nom)}</span><span class="badge neutre">${PROFILS_TRADER[tr.type].nom} · ${styleRisque(tr.risque)}</span></div>
      ${kv('Capital géré', eur(tr.capitalAffiche))}
      ${kv('Résultat de l\'année', signe(tr.fraude ? tr.capitalAffiche - tr.capital + tr.pnlAn : tr.pnlAn))}
      ${kv('Depuis son arrivée', signe(tr.fraude ? tr.capitalAffiche - tr.capital + tr.pnlCumul : tr.pnlCumul))}
      ${kv('Salaire', `${nb(tr.salaire)} € brut par an + ${Math.round(tr.bonus * 100)} % des gains`)}
      <div class="grille-2"><button class="bouton secondaire petit" data-action="ent-allouer" data-v="${i}|1">Confier</button><button class="bouton secondaire petit" data-action="ent-allouer" data-v="${i}|-1">Reprendre</button></div>
      <button class="lien" style="align-self:flex-start" data-action="ent-licencier" data-v="${i}">Licencier</button>
    </section>`).join('') : '<div class="carte info" style="font-size:13px;color:var(--texte-2)">Aucun trader pour l\'instant.</div>'}
    <section class="section"><div class="section-titre"><h2>Candidats du mois</h2></div>
      ${cands.length ? cands.map(c => `<div class="carte" style="gap:6px">
        <div class="ligne-kv"><span style="font-weight:700">${e(c.nom)}</span><span class="badge neutre">${PROFILS_TRADER[c.type].nom}</span></div>
        ${kv('Entretien', c.note + '/10')}
        ${kv('Références', `<span style="color:${c.references === 'Floues' ? 'var(--baisse)' : 'inherit'}">${c.references}</span>`)}
        ${kv('Style', styleRisque(c.risque))}
        ${kv('Salaire demandé', `${nb(c.salaire)} € brut par an (coût ${nb(c.salaire * (1 + CHARGES_PATRONALES))} €)`)}
        <button class="bouton secondaire petit" data-action="ent-embaucher" data-v="${c.id}">Embaucher · cabinet ${eur(c.salaire * FRAIS_RECRUTEMENT)}</button>
      </div>`).join('') : '<div class="carte info" style="font-size:13px;color:var(--texte-2)">Nouveaux candidats le mois prochain.</div>'}
    </section>`;
}

function comptes(ent) {
  const x = ent.exercice, res = resultat(x);
  const lignes = [['Ventes de bitcoins minés', x.ca], ['Résultat du trading', x.trading], ['Plus-values de cession', x.plusValues], ['Électricité', -x.elec], ['Loyers des sites', -x.loyers],
    ['Frais de gestion du fonds', x.gestion || 0], ['Commissions de la plateforme', x.plateforme || 0],
    ['Salaires et charges', -x.salaires], ['Fonds, plateforme et Bourse (fonctionnement)', -(x.activites || 0)], ['Pertes exceptionnelles', -(x.pertes || 0)], ['Frais fixes (comptable, banque, assurance)', -x.fixes], ['Amortissements', -x.amort], ['Agios', -x.agios]].filter(([, v]) => Math.abs(v) >= 0.5);
  return `<section class="carte" style="gap:6px">
      <div class="carte-titre">Exercice ${x.an} en cours</div>
      ${lignes.map(([k, v]) => kv(k, signe(v))).join('')}
      ${kv('<b>Résultat</b>', signe(res), 'border-top:1px solid var(--ligne);padding-top:6px')}
      ${kv('Impôt sur les sociétés estimé', eur(impotSocietes(Math.max(0, res - ent.deficit))))}
      ${ent.deficit ? kv('Déficits reportables', eur(ent.deficit)) : ''}
      ${kv('Frais fixes', `${nb(chargesFixesMois(ent))} € par mois`)}
      <p class="discret" style="font-size:12px">Clôture au 31 décembre : l'impôt est payé, les bonus des traders versés, le bénéfice net devient distribuable (5 % en réserve légale).</p>
    </section>
    ${ent.exercices.length ? `<section class="carte" style="gap:6px"><div class="carte-titre">Années clôturées</div>
      ${ent.exercices.map(y => kv(String(y.an), `${signe(y.resultat)} · IS ${eur(y.is)}`)).join('')}
      ${kv('Dividendes versés', eur(ent.dividendes))}</section>` : ''}`;
}

const pc = x => (x >= 0 ? '+' : '') + (x * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';
const millions = x => x >= 1e6 ? (x / 1e6).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' M€' : eur(x);
const puces = (action, liste, actuel) => `<div class="puces">${liste.map(([v, nom]) => `<button class="puce" data-action="${action}" data-v="${v}" aria-pressed="${String(actuel) === String(v)}">${nom}</button>`).join('')}</div>`;
const marketing = action => (actuel) => puces(action, MARKETING.map(m => [m, m ? nb(m / 1000) + ' k€/mois' : 'Aucune pub']), actuel);

function croissance(ctx, ent, t, prixBTC, eurUsd) {
  const f = ent.fonds, p = ent.plateforme, b = ent.bourse;
  const vn = valeurEntreprise(ent, prixBTC, eurUsd, t) - ent.compteCourant;
  const agrement = type => {
    const A = AGREMENTS[type];
    return `<p class="discret" style="font-size:12px">${e(A.nom)} : dossier ${nb(A.dossier)} € (avocats, conformité, audits), instruction ${Math.round(A.delai / 30)} mois, au moins ${nb(A.fondsPropres)} € de fonds propres.</p>
      <button class="bouton secondaire petit" data-action="ent-agrement" data-v="${type}">Demander l'agrément</button>`;
  };
  // Fonds
  let fonds = `<div class="carte-titre">Fonds d'investissement</div>`;
  if (!f) fonds += `<p style="font-size:14px;color:var(--texte-2)">Gère l'argent de clients : ${Math.round(FRAIS_FONDS.gestion * 100)} % de frais de gestion par an et ${Math.round(FRAIS_FONDS.performance * 100)} % de commission sur les gains au-dessus du plus haut. Les clients arrivent avec la publicité, ta réputation et les performances, et repartent si ça va mal.</p>${agrement('fonds')}`;
  else if (f.statut === 'instruction') fonds += `<span style="font-size:14px">Dossier en instruction à l'AMF, réponse le ${date(f.pretLe)}.</span>`;
  else {
    const gerant = ent.traders.find(x => x.id === f.gerant);
    fonds += `${kv('Valeur liquidative', f.vl.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
      ${kv('Performance sur un an', pc(perf12(f)))}
      ${kv('Encours total', millions(encours(f)))}
      ${kv('dont clients', millions(f.partsClients * f.vl))}
      ${kv('dont ta société (amorçage)', millions(valeurAmorcage(ent)))}
      <span class="discret" style="font-size:12px">Stratégie</span>${puces('ent-strategie', Object.entries(STRATEGIES).map(([id, S]) => [id, S.nom]), f.strategie)}
      <span class="discret" style="font-size:12px">${e(STRATEGIES[f.strategie].desc)}</span>
      <label class="champ">Gérant${ent.traders.length ? '' : ' (embauche un trader)'}<select data-input="ent-gerant"><option value="">Aucun (gestion passive, moins bonne)</option>${ent.traders.map(x => `<option value="${x.id}" ${x.id === f.gerant ? 'selected' : ''}>${e(x.nom)}</option>`).join('')}</select></label>
      <span class="discret" style="font-size:12px">Publicité</span>${marketing('ent-pub-fonds')(f.marketing)}
      <span class="discret" style="font-size:12px">Amorçage : la trésorerie de la société investit dans son propre fonds.</span>
      <label class="champ">Montant (€)<input id="f-ent-amorce" class="num" inputmode="decimal" placeholder="0" autocomplete="off"></label>
      <div class="grille-2"><button class="bouton secondaire petit" data-action="ent-amorcer" data-v="1">Placer</button><button class="bouton secondaire petit" data-action="ent-amorcer" data-v="-1">Retirer</button></div>`;
    if (!gerant && f.gerant) fonds += '<p style="font-size:13px;color:var(--baisse)">Ton gérant a quitté la société : choisis-en un autre.</p>';
  }
  // Plateforme
  let pf = `<div class="carte-titre">Plateforme d'échange</div>`;
  if (!p) pf += `<p style="font-size:14px;color:var(--texte-2)">Ouvre ta propre plateforme, comme Kryptal. Chaque client rapporte des commissions (environ ${PLATEFORME.revenuClientMois} € par mois, plus quand le marché s'agite), mais il faut une équipe, des serveurs, de la publicité et une vraie sécurité : en cas de piratage, tu rembourses les clients.</p>${agrement('plateforme')}`;
  else if (p.statut === 'instruction') pf += `<span style="font-size:14px">Dossier MiCA en instruction à l'AMF, réponse le ${date(p.pretLe)}.</span>`;
  else pf += `${kv('Clients', nb(p.clients))}
    ${kv('Salariés', nb(salariesPlateforme(p)))}
    ${kv('Commissions (mois calme)', eur(p.clients * PLATEFORME.revenuClientMois))}
    ${p.piratages ? kv('Piratages subis', p.piratages) : ''}
    <span class="discret" style="font-size:12px">Sécurité</span>${puces('ent-securite', Object.entries(SECURITE).map(([id, S]) => [id, `${S.nom} · ${nb(S.cout / 1000)} k€`]), p.securite)}
    <span class="discret" style="font-size:12px">Publicité (environ ${PLATEFORME.cac} € par nouveau client au début, plus cher ensuite)</span>${marketing('ent-pub-pf')(p.marketing)}`;
  // Bourse
  let bourse = `<div class="carte-titre">Introduction en Bourse</div>`;
  if (!b) {
    const c = conditionsBourse(ent, vn);
    bourse += `<p style="font-size:14px;color:var(--texte-2)">Sur Euronext Growth : ${Math.round(BOURSE.flottant * 100)} % d'actions nouvelles vendues au public, l'argent levé va à la société. Ensuite, le cours bouge avec le bitcoin et tes résultats, et tu peux vendre des actions.</p>
      <p class="discret" style="font-size:12px">Conditions : ${BOURSE.exercicesMin} années de comptes, valeur d'au moins ${nb(BOURSE.valeurMin / 1e6)} M€ (actif net ou ${BOURSE.per} fois le dernier bénéfice). Coût : ${nb(BOURSE.fixe)} € plus ${Math.round(BOURSE.commission * 100)} % des sommes levées. Préparation de ${Math.round(BOURSE.delai / 30)} mois.</p>
      ${c ? `<p style="font-size:13px;color:var(--texte-2)">${e(c)}</p>` : '<button class="bouton secondaire petit" data-action="ent-bourse">Préparer l\'introduction</button>'}`;
  } else if (!b.cotee) bourse += `<span style="font-size:14px">Introduction en préparation : première cotation le ${date(b.pretLe)}.</span>`;
  else bourse += `${kv('Cours', eur(cours(ent)))}
    ${kv('Depuis l\'introduction', pc(cours(ent) / b.prixIntro - 1))}
    ${kv('Capitalisation', millions(b.capi))}
    ${kv('Tes actions', `${((ent.parts ?? 1) * 100).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % · ${millions(b.capi * (ent.parts ?? 1))}`)}
    <span class="discret" style="font-size:12px">Vendre une partie du capital (${Math.round(BOURSE.decote * 100)} % de décote, flat tax sur la plus-value) :</span>
    ${puces('ent-vendre-actions', [[0.01, '1 %'], [0.05, '5 %'], [0.1, '10 %']], null)}`;
  return `<section class="carte" style="gap:8px">${fonds}</section><section class="carte" style="gap:8px">${pf}</section><section class="carte" style="gap:8px">${bourse}</section>`;
}
