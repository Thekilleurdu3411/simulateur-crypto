// Onglet « Vie » : carrière, formations, vie quotidienne.
import { METIERS } from './config.js';
import * as C from './carriere.js';
import { carriereDe, anneesMetier, indice, jaugesDe, prixLogement, valeurLogement, resteCreditImmo, valeurVoitureActuelle, simulationAchat } from './jeuvie.js';
import { JAUGES, ACTIVITES, ABONNEMENT_SPORT } from './bienetre.js';
import { VOITURES, CREDIT_IMMO, CREDIT_AUTO } from './biens.js';
import { LOGEMENTS } from './config.js';
import { salaireNet, EXPERIENCES, MOIS } from './vie.js';
import { sectionVie } from './views-vie.js';
import { eur, echapper as e } from './format.js';
import { maintenant as tJeu } from './horloge.js';

const dateFr = t => new Date(t).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
function duree(ans) {
  const a = Math.floor(ans), m = Math.floor((ans - a) * 12);
  return a ? `${a} an${a > 1 ? 's' : ''}${m ? ' et ' + m + ' mois' : ''}` : `${m} mois`;
}
const dureeMois = m => (m >= 12 ? (m % 12 ? `${(m / 12).toLocaleString('fr-FR', { maximumFractionDigits: 1 })} ans` : `${m / 12} an${m >= 24 ? 's' : ''}`) : `${m} mois`);

export function ongletVie(ctx) {
  return `<h1 style="font-size:24px;font-weight:800">Ma vie</h1>
    ${sectionEtat(ctx)}
    ${sectionActivites(ctx)}
    ${carteCarriere(ctx)}
    ${sectionFormations(ctx)}
    ${sectionBiens(ctx)}
    ${sectionVie(ctx)}`;
}

function carteCarriere(ctx) {
  const { partie } = ctx;
  const p = partie.profil, c = carriereDe(partie), k = indice(partie);
  const t = tJeu();
  const salarie = p.situation === 'salarie';
  const exp = EXPERIENCES.find(x => x[0] === (p.experience || 'debutant'))[1];
  const titre = salarie ? p.metier : p.situation === 'alternant' ? `Alternance · ${p.metier}` : p.situation === 'etudiant' ? (c.formation ? 'En formation' : 'Étudiant') : 'Sans emploi';
  const augm = ((p.majoration || 1) - 1) * 100;
  const peutDemander = salarie && t - (c.derniereDemande || 0) >= C.ANS;
  const diplomes = (p.diplomes || []).filter(d => !(d in { bac: 1 }) || p.diplomes.length === 1);
  return `<section class="section"><div class="section-titre"><h2>Carrière</h2>${salarie ? `<span class="badge neutre">${e(exp)}</span>` : ''}</div>
    <div class="carte" style="gap:8px">
      <div class="carte-titre" style="color:var(--texte)">${e(titre)}</div>
      ${salarie ? `<div class="ligne-kv" style="font-size:13px"><span>Dans le métier</span><span>${duree(anneesMetier(partie))}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Salaire net</span><span class="num">${eur(salaireNet(p) * k)}</span></div>
        ${augm > 0.05 ? `<div class="ligne-kv" style="font-size:13px"><span>Augmentations obtenues</span><span class="num hausse">+${augm.toFixed(1).replace('.', ',')} %</span></div>` : ''}
        <div class="ligne-kv" style="font-size:13px"><span>Prochain entretien annuel</span><span>${e(dateFr(c.prochaineRevue))}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Prochain niveau</span><span>${p.experience === 'debutant' ? 'confirmé dans ' + duree(Math.max(0, C.PASSAGE_CONFIRME - anneesMetier(partie))) : p.experience === 'confirme' ? 'expérimenté dans ' + duree(Math.max(0, C.PASSAGE_EXPERIMENTE - anneesMetier(partie))) : 'au maximum'}</span></div>
        <span style="font-size:13px;margin-top:4px">Heures supplémentaires</span>
        <div class="segment">${C.HEURES_SUP.map(([h, nom]) => `<button data-action="heures-sup" data-v="${h}" aria-pressed="${(p.heuresSup || 0) === h}">${nom}</button>`).join('')}</div>
        <button class="bouton secondaire petit" data-action="augmentation" ${peutDemander ? '' : 'disabled'}>${peutDemander ? 'Demander une augmentation' : 'Augmentation demandée il y a moins d\'un an'}</button>` : ''}
      ${p.are ? `<div class="ligne-kv" style="font-size:13px"><span>Chômage (ARE)</span><span class="num">${eur(p.are.montant * k)} / mois jusqu'au ${e(dateFr(p.are.fin))}</span></div>` : ''}
      <div class="ligne-kv" style="font-size:13px;align-items:flex-start"><span>Diplômes</span><span style="text-align:right">${diplomes.map(d => e(C.nomDiplome(d))).join('<br>') || 'aucun'}</span></div>
      <div class="ligne-kv" style="font-size:13px"><span>Compte formation (CPF)</span><span class="num">${eur(c.cpf || 0)}</span></div>
      <p class="discret" style="font-size:12px">Chaque mois, ton métier peut t'apporter primes, heures sup, arrêts ou un licenciement (avec indemnité et chômage). Tu passes confirmé au bout de ${C.PASSAGE_CONFIRME} ans dans le métier, expérimenté au bout de ${C.PASSAGE_EXPERIMENTE} ans.</p>
    </div></section>`;
}

function sectionFormations(ctx) {
  const { partie, app } = ctx;
  const p = partie.profil, c = carriereDe(partie);
  const f = c.formation;
  let enCours = '';
  if (f) {
    const def = C.formation(f.id);
    const pct = Math.min(100, Math.max(0, (tJeu() - f.debut) / (f.fin - f.debut) * 100));
    enCours = `<div class="carte info" style="gap:8px">
      <div class="carte-titre" style="color:var(--texte)">${e(def.nom)}</div>
      <div class="ligne-kv" style="font-size:13px"><span>${f.mode === 'plein' ? 'Temps plein' : f.mode === 'soir' ? 'Cours du soir' : 'Alternance'}${f.metierVise ? ' · vers ' + e(f.metierVise.toLowerCase()) : ''}</span><span>fin le ${e(dateFr(f.fin))}</span></div>
      <div style="height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden"><div style="height:100%;width:${pct.toFixed(1)}%;background:var(--ambre)"></div></div>
      <button class="lien" style="align-self:flex-start" data-action="formation-abandonner">Abandonner</button>
    </div>`;
  }
  const ouverte = app.formationOuverte;
  const liste = C.FORMATIONS.map(x => ({ x, ok: C.possede(p.diplomes, x.requis), deja: x.donne.every(d => (p.diplomes || []).includes(d)) }))
    .filter(o => !o.deja).sort((a, b) => (b.ok - a.ok));
  return `<section class="section"><div class="section-titre"><h2>Formations</h2><span class="discret" style="font-size:12px">${liste.filter(o => o.ok).length} accessibles</span></div>
    ${enCours}
    <div class="carte" style="gap:0;padding:4px 16px">
      ${liste.map(({ x, ok }) => {
        const ouvert = ouverte === x.id;
        const cout = Math.max(0, x.cout - (x.cpf ? c.cpf || 0 : 0));
        return `<div style="border-bottom:1px solid var(--ligne);padding:10px 0">
          <button class="rangee" style="width:100%;background:none;border:0;color:inherit;font:inherit;text-align:left;min-height:0;padding:0;gap:10px" data-action="formation-ouvrir" data-v="${x.id}">
            <span style="display:flex;flex-direction:column;gap:2px;flex:1"><span style="font-weight:700;color:${ok ? 'var(--texte)' : 'var(--discret)'};font-size:14px">${e(x.nom)}</span>
            <span class="discret" style="font-size:12px">${dureeMois(x.mois)} · ${x.paye ? 'rémunérée ' + eur(x.paye) + '/mois' : cout ? eur(cout) + (x.cpf && c.cpf ? ' après CPF' : '') : 'gratuite'}${ok ? '' : ' · il faut ' + e(C.nomDiplome(x.requis))}</span></span>
            <span class="discret">${ouvert ? '▴' : '▾'}</span></button>
          ${ouvert ? detailFormation(ctx, x, ok) : ''}
        </div>`;
      }).join('')}
    </div>
    <p class="discret" style="font-size:12px">Coûts et durées : ordres de grandeur 2026 (frais publics d'inscription, écoles privées, permis…). Temps plein : tu quittes ton emploi (job étudiant ou formation payée). Cours du soir : tu gardes ton travail, la formation dure 50 % de plus. Alternance : payé comme apprenti, puis embauché.</p>
  </section>`;
}

function detailFormation(ctx, x, ok) {
  const { partie, app } = ctx;
  const p = partie.profil, c = carriereDe(partie);
  const deb = C.debouches(x, p.diplomes || []);
  const modes = [['plein', 'Temps plein'], ...(x.soir ? [['soir', 'Cours du soir']] : []), ...(x.alternance ? [['alternance', 'Alternance']] : [])];
  const choix = app.formationChoix && app.formationChoix.id === x.id ? app.formationChoix : { id: x.id, mode: 'plein', metier: deb[0] || '' };
  return `<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">
    <span style="font-size:12px;color:var(--texte-2)">Débouchés : ${deb.length ? deb.slice(0, 8).map(e).join(', ') + (deb.length > 8 ? ` et ${deb.length - 8} autres` : '') : 'surtout un niveau d\'études plus élevé'}</span>
    ${ok && !c.formation ? `<div class="segment">${modes.map(([id, nom]) => `<button data-action="formation-mode" data-v="${id}" aria-pressed="${choix.mode === id}">${nom}</button>`).join('')}</div>
      ${deb.length ? `<label class="champ">Métier visé<select data-input="formation-metier"><option value="">Aucun pour l'instant</option>${deb.map(m => `<option ${m === choix.metier ? 'selected' : ''}>${e(m)}</option>`).join('')}</select></label>` : ''}
      <button class="bouton petit" data-action="formation-commencer" data-v="${x.id}">Commencer</button>`
    : `<span class="verrou" style="align-self:flex-start">${c.formation ? 'Une formation est déjà en cours' : 'Il faut d\'abord : ' + e(C.nomDiplome(x.requis))}</span>`}
  </div>`;
}

// ---------- Jauges ----------
function couleurJauge(cle, v) {
  const bon = cle === 'stress' ? 100 - v : v;
  return bon >= 60 ? 'var(--hausse)' : bon >= 30 ? 'var(--ambre)' : 'var(--baisse)';
}
function sectionEtat(ctx) {
  const { partie } = ctx;
  const j = jaugesDe(partie), c = carriereDe(partie), t = tJeu();
  const vac = j.vacancesJusqua && t < j.vacancesJusqua;
  const arret = c.arretJusqua && t < c.arretJusqua;
  const conseils = [];
  if (j.energie < 25) conseils.push('épuisé : tes trades te coûtent plus cher (erreurs)');
  if (j.stress > 75) conseils.push('stress très haut : risque de burn-out');
  if (j.sante < 35) conseils.push('santé fragile : risque de tomber malade');
  if (j.moral < 25) conseils.push('moral en berne : entretiens annuels décevants');
  return `<section class="section"><div class="section-titre"><h2>Mon état</h2>${vac ? '<span class="badge ok">En vacances</span>' : arret ? '<span class="badge ko">En arrêt</span>' : ''}</div>
    <div class="carte" style="gap:10px">
      ${JAUGES.map(([k, nom]) => `<div style="display:flex;flex-direction:column;gap:4px">
        <div class="ligne-kv" style="font-size:13px"><span>${nom}</span><span class="num">${Math.round(j[k])}</span></div>
        <div style="height:8px;border-radius:4px;background:var(--surface-2);overflow:hidden"><div style="height:100%;width:${Math.round(j[k])}%;background:${couleurJauge(k, j[k])}"></div></div></div>`).join('')}
      ${conseils.length ? `<div class="carte alerte" style="font-size:12px;padding:8px 10px">Attention : ${conseils.join(' ; ')}.</div>` : ''}
      <p class="discret" style="font-size:12px">Le travail, les heures sup, le trading, le découvert et les grosses pertes fatiguent et stressent ; le sommeil, les week-ends et les activités font remonter.</p>
    </div></section>`;
}

function sectionActivites(ctx) {
  const { partie } = ctx;
  const p = partie.profil, c = carriereDe(partie), j = jaugesDe(partie), k = indice(partie), t = tJeu();
  const salarie = p.situation === 'salarie' || p.situation === 'alternant';
  const fx = eff => Object.entries(eff).map(([cle, v]) => `${{ sante: 'santé', energie: 'énergie', moral: 'moral', stress: 'stress' }[cle]} ${v > 0 ? '+' : ''}${v}`).join(', ');
  return `<section class="section"><div class="section-titre"><h2>Activités</h2>${salarie ? `<span class="discret" style="font-size:12px">${Math.floor(c.conges ?? 10)} jours de congés</span>` : ''}</div>
    <div class="carte" style="gap:8px">
      <div class="ligne-kv" style="font-size:13px"><span>Abonnement salle de sport (${eur(ABONNEMENT_SPORT * k)} / mois)</span>
        <button class="puce" data-action="abonnement-sport" aria-pressed="${!!p.abonnementSport}">${p.abonnementSport ? 'Abonné' : "S'abonner"}</button></div>
    </div>
    <div class="carte" style="gap:0;padding:4px 16px">
      ${ACTIVITES.map(a => {
        const recent = j.faites && j.faites[a.id] != null && t - j.faites[a.id] < a.delai * 864e5;
        const bloque = (a.abonnement && !p.abonnementSport) || (a.conges && salarie && (c.conges ?? 10) < a.conges);
        return `<div class="rangee" style="min-height:0;padding:10px 0;gap:10px;border-bottom:1px solid var(--ligne)">
          <span style="display:flex;flex-direction:column;gap:2px;flex:1"><span style="font-weight:700;color:var(--texte);font-size:14px">${e(a.nom)}</span>
          <span class="discret" style="font-size:12px">${a.cout ? eur(a.cout * k) : 'gratuit'}${a.duree ? ` · ${a.duree} jours` : ''}${a.conges && salarie ? ` · ${a.conges} jours de congés` : ''} · ${fx(a.effets)}${recent ? ' · effet réduit (récent)' : ''}</span></span>
          <button class="bouton secondaire petit" style="width:auto;padding:0 14px" data-action="activite" data-v="${a.id}" ${bloque ? 'disabled' : ''}>Faire</button></div>`;
      }).join('')}
    </div></section>`;
}

// ---------- Logement et voiture ----------
function sectionBiens(ctx) {
  const { partie, app } = ctx;
  const p = partie.profil, k = indice(partie);
  const pr = p.proprietaire;
  const typeLog = LOGEMENTS.find(l => l.id === p.logement)?.nom || p.logement;
  const achat = app.achatLogement || { type: p.logement === 'maison' ? 'maison' : 'appart', apport: '' };
  const apport = Number(String(achat.apport).replace(/\s/g, '').replace(',', '.')) || 0;
  const sim = !pr ? simulationAchat(partie, achat.type, apport) : null;
  const dem = app.demenagement || { ville: p.ville || '', logement: p.logement };
  const v = p.voiture;
  return `<section class="section"><div class="section-titre"><h2>Logement et voiture</h2></div>
    <div class="carte" style="gap:8px">
      <div class="carte-titre" style="color:var(--texte)">${e(typeLog)}${p.ville ? ' · ' + e(p.ville) : ''}</div>
      ${pr ? `<div class="ligne-kv" style="font-size:13px"><span>Propriétaire depuis</span><span>${e(dateFr(pr.achatLe))}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Valeur estimée</span><span class="num">${eur(valeurLogement(partie))}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Reste à rembourser</span><span class="num">${eur(resteCreditImmo(partie))}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Mensualité (assurance comprise)</span><span class="num">${eur(pr.mensualite)}</span></div>
        <button class="bouton secondaire petit" data-action="vendre-logement">Vendre (5 % d'agence)</button>`
      : p.logement !== 'parents' ? `<span style="font-size:13px;margin-top:4px">Acheter ${p.logement === 'maison' ? 'une maison' : 'un logement'} à ${e(p.ville || 'ta ville')}</span>
        <div class="segment">${[['appart', 'Appartement'], ['maison', 'Maison']].map(([id, nom]) => `<button data-action="achat-type" data-v="${id}" aria-pressed="${achat.type === id}">${nom}</button>`).join('')}</div>
        <div class="ligne-kv" style="font-size:13px"><span>Prix</span><span class="num">${eur(sim.prix)}</span></div>
        <label class="champ">Apport (au moins 10 % + frais de notaire de 7,5 %)<input class="num" inputmode="decimal" data-input="achat-apport" value="${e(achat.apport)}" placeholder="${Math.round(sim.prix * 0.175).toLocaleString('fr-FR')}"></label>
        ${apport ? `<div class="ligne-kv" style="font-size:13px"><span>Prêt sur ${CREDIT_IMMO.duree} ans à ${String(CREDIT_IMMO.taux * 100).replace('.', ',')} %</span><span class="num">${eur(sim.emprunt)}</span></div>
          <div class="ligne-kv" style="font-size:13px"><span>Mensualité</span><span class="num">${eur(sim.mensualite)} (${Math.round(sim.effort * 100)} % de ton salaire)</span></div>
          ${sim.refus ? `<div class="carte alerte" style="font-size:12px;padding:8px 10px">${e(sim.refus)}</div>` : '<button class="bouton petit" data-action="acheter-logement">Acheter</button>'}` : ''}`
      : '<p class="discret" style="font-size:13px">Tu vis chez tes parents : déménage d\'abord pour acheter.</p>'}
      ${!pr ? `<details style="margin-top:6px"><summary style="font-size:13px;font-weight:700;color:var(--ambre)">Déménager</summary>
        <div style="display:flex;flex-direction:column;gap:8px;margin-top:8px">
          <label class="champ">Ville<input data-input="dem-ville" value="${e(dem.ville)}" maxlength="40"></label>
          <div class="segment">${[['appart', 'Appartement'], ['maison', 'Maison'], ['parents', 'Parents']].map(([id, nom]) => `<button data-action="dem-type" data-v="${id}" aria-pressed="${dem.logement === id}">${nom}</button>`).join('')}</div>
          <button class="bouton secondaire petit" data-action="demenager">Déménager (frais + 1 mois de loyer d'agence)</button>
        </div></details>` : ''}
    </div>
    <div class="carte" style="gap:8px">
      <div class="carte-titre" style="color:var(--texte)">Voiture</div>
      ${v ? `<div class="ligne-kv" style="font-size:13px"><span>${e((VOITURES.find(x => x.id === v.type) || VOITURES[0]).nom)}</span><span class="num">${eur(valeurVoitureActuelle(partie))}</span></div>
        ${v.credit ? `<div class="ligne-kv" style="font-size:13px"><span>Crédit auto</span><span class="num">${eur(v.credit.mensualite)} / mois jusqu'au ${e(dateFr(v.credit.fin))}</span></div>` : ''}
        <button class="bouton secondaire petit" data-action="vendre-voiture">Vendre la voiture</button>`
      : VOITURES.map(x => `<div class="ligne-kv" style="font-size:13px"><span>${e(x.nom)}</span><span class="num">${eur(x.prix * k)}</span></div>
        <div class="grille-2"><button class="bouton secondaire petit" data-action="acheter-voiture" data-v="${x.id}:comptant">Comptant</button><button class="bouton secondaire petit" data-action="acheter-voiture" data-v="${x.id}:credit">À crédit (${String(CREDIT_AUTO.taux * 100).replace('.', ',')} %, 4 ans)</button></div>`).join('')}
      <p class="discret" style="font-size:12px">Voiture : 208 € par mois de carburant, assurance et entretien en plus. Logement : environ 20 ans de loyer, taux moyen 2026, la banque refuse au-delà de 35 % de tes revenus.</p>
    </div></section>`;
}
