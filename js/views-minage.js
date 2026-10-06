// Onglet Minage : parc, pool, contrat électrique, réseau réel, boutique.
import { HEBERGEURS, ABONNEMENTS, CHANGEMENT_PUISSANCE, ENVOI, FRAIS_ANNEXES_USD, hebergeur, prixHebergeurEUR } from './minage.js';
import { CATALOGUE, POOLS, TARIFS, LIVRAISON, MODES, VENTILATION, modele, spec, pool, puissanceDispo, prixMachineEUR, estimationJour, btcParSeconde, facteurChaleur, disponible, marcheMachines } from './minage.js';
import { enRejeu } from './horloge.js';
import { indiceElec } from './economie.js';
import { DIFFICULTES, reglesDe } from './config.js';
import { multElec, minageDe, kwEnMarche, thEnMarche, devisReparation, valeurReventeEUR } from './jeuminage.js';
import { CARTES, COINS_GPU, RIG, FRAIS_POOL_ALT, calculerRig, coinsParSeconde, prixAltEUR } from './altcoins.js';
import { eur, prix, qte, dateHeure, echapper as e } from './format.js';
import { maintenant as tJeu } from './horloge.js';

const LOGEMENT = { parents: 'Chez tes parents', appart: 'Appartement', maison: 'Maison avec garage' };
const COULEUR_TXT = { bleu: 'Jour bleu', blanc: 'Jour blanc', rouge: 'Jour rouge' };
const COULEUR_CLS = { bleu: 'badge neutre', blanc: 'badge attente', rouge: 'badge ko' };
const n1 = v => v.toFixed(1).replace('.', ',');
export function fmtHash(h) {
  if (h >= 1e12) return n1(h / 1e12) + ' TH/s';
  if (h >= 1e9) return n1(h / 1e9) + ' GH/s';
  if (h >= 1e6) return n1(h / 1e6) + ' MH/s';
  return Math.round(h).toLocaleString('fr-FR') + ' H/s';
}
// Gains (€) et électricité (€) estimés par jour pour une machine (catalogue ou rig).
function estimer(md, ctx, mn) {
  const { partie, D, M } = ctx;
  const d = reglesDe(partie);
  const r = D.etat.reseau || mn.reseau, alt = D.etat.alt, prixBTC = M.prixDeBase('BTC');
  if (!prixBTC) return null;
  let gain = 0;
  if (md.th && r) gain += btcParSeconde(md.th, r.difficulte, r.recompense, pool(mn.pool).frais, d.minage) * 86400 * prixBTC;
  for (const pr of md.production || []) {
    const p = prixAltEUR(pr.coin, alt, prixBTC);
    if (alt && p) gain += coinsParSeconde(pr.h, alt.coins[pr.coin], FRAIS_POOL_ALT, d.minage) * 86400 * p;
  }
  const prixKwh = mn.contrat.type === 'tempo' ? 0.155 : TARIFS.base[mn.contrat.kva >= 9 ? 9 : 6];
  const cout = md.w / 1000 * 24 * prixKwh * multElec(partie);
  return { eur: gain, cout, net: gain - cout };
}
function ligneEstimation(est) {
  return est ? `<div class="ligne-kv" style="font-size:12px"><span>Estimation par jour</span><span class="num ${est.net >= 0 ? 'hausse' : 'baisse'}">${eur(est.eur)} − ${eur(est.cout)} = ${(est.net >= 0 ? '+' : '') + eur(est.net)}</span></div>` : '';
}
function puissanceTxt(md) {
  if (md.th) return md.th + ' TH/s';
  return (md.production || []).slice(0, 1).map(p => fmtHash(p.h)).join('') ;
}
const pc = v => (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';

export function ongletMinage(ctx, live) {
  const { app, partie, D } = ctx;
  const mn = minageDe(partie);
  const sous = app.sousMinage || 'parc';
  return `<h1 style="font-size:24px;font-weight:800">Minage</h1>
    <div class="segment sur-fond">
      <button data-action="sous-minage" data-v="parc" aria-pressed="${sous === 'parc'}">Parc</button>
      <button data-action="sous-minage" data-v="boutique" aria-pressed="${sous === 'boutique'}">Boutique</button>
      <button data-action="sous-minage" data-v="sites" aria-pressed="${sous === 'sites'}">Sites</button>
      <button data-action="sous-minage" data-v="reseau" aria-pressed="${sous === 'reseau'}">Réseau</button>
    </div>
    ${sous === 'parc' ? parc(ctx, mn, live) : sous === 'boutique' ? boutique(ctx, mn) : sous === 'sites' ? ongletInstallations(ctx, live, true) : reseau(ctx, mn)}`;
}

function parc(ctx, mn, live) {
  const { partie, D, M } = ctx;
  const d = reglesDe(partie);
  const dispo = puissanceDispo(partie.profil.logement, mn.contrat.kva);
  const kw = kwEnMarche(mn), th = thEnMarche(mn);
  const p = pool(mn.pool);
  const r = D.etat.reseau || mn.reseau;
  const prixBTC = M.prixDeBase('BTC');
  const gainJour = r ? btcParSeconde(th, r.difficulte, r.recompense, p.frais, d.minage) * 86400 : 0;
  const parents = partie.profil.logement === 'parents';
  const usage = dispo ? Math.min(100, kw / dispo * 100) : 0;
  const couleurJ = mn.contrat.type === 'tempo' ? ctx.couleurAujourdhui : null;
  const ie = indiceElec(tJeu(), partie.simulation ? partie.simulation.seed : 0);
  const kwh = v => (Math.round(v * ie * 10000) / 10000).toString().replace('.', ',');
  return `${parents ? `<div class="carte alerte" style="font-size:13px">Chez tes parents, pas question d'un ASIC : bruit, chaleur et compteur partagé. Pour miner, fais livrer tes machines chez un hébergeur (choix de la livraison dans la boutique).</div>` : ''}
    <section class="carte">
      <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${e(LOGEMENT[partie.profil.logement])}</span><span class="badge neutre">Compteur ${mn.contrat.kva} kVA</span></div>
      <div class="ligne-kv"><span>Puissance pour les machines</span><span class="num">${n1(kw)} / ${dispo} kW</span></div>
      <div style="height:6px;border-radius:3px;background:var(--fond);overflow:hidden"><div style="width:${usage}%;height:6px;background:${usage > 90 ? 'var(--baisse)' : 'var(--ambre)'}"></div></div>
      <p class="discret" style="font-size:12px">2 kVA restent réservés au logement. Puissance du compteur : onglet Installations.</p>
    </section>
    ${parents ? '' : salle(ctx, mn)}
    <section class="carte" style="border-radius:20px">
      <div class="repartition" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div><span class="l">Puissance</span><span class="v">${th.toLocaleString('fr-FR')} TH/s</span></div>
        <div><span class="l">Consommation</span><span class="v">${n1(kw)} kW</span></div>
        <div><span class="l">Solde au pool</span>${live('pool', ctx, 'v')}</div>
        <div><span class="l">Facture en cours</span>${live('facture', ctx, 'v')}</div>
        ${mn.machines.some(m => m.lieu && m.lieu !== 'maison') ? `<div><span class="l">Hébergeurs</span>${live('factureHeb', ctx, 'v')}</div>` : ''}
      </div>
      ${Object.entries(mn.soldesAlt || {}).filter(([, q]) => q > 0).map(([tag, q]) => `<div class="ligne-kv" style="font-size:13px"><span>En attente au pool</span><span class="num">${q.toLocaleString('fr-FR', { maximumFractionDigits: 6 })} ${tag}</span></div>`).join('')}
      ${d.aides && th ? `<div class="ligne-kv" style="font-size:13px"><span>Gains attendus</span><span class="num">${qte(gainJour)} BTC/jour${prixBTC ? ' ≈ ' + eur(gainJour * prixBTC) : ''}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Électricité</span><span class="num">≈ ${eur(kw * 24 * (mn.contrat.type === 'tempo' ? 0.155 : TARIFS.base[mn.contrat.kva >= 9 ? 9 : 6]) * multElec(partie))}/jour</span></div>` : ''}
      <p class="discret" style="font-size:12px">Versement par ${e(p.nom)} chaque nuit à minuit UTC dès ${String(p.min).replace('.', ',')} BTC. Facture prélevée sur ta banque le ${e(dateHeure(mn.prochaineFacture).slice(0, 5))}.</p>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Mes machines</h2><button class="lien" data-action="sous-minage" data-v="boutique">Acheter</button></div>
      ${mn.machines.length ? mn.machines.map(m => machineCarte(m, ctx, live)).join('') : `<div class="carte vide">Aucune machine pour l'instant.${parents ? '' : '<button class="bouton petit" data-action="sous-minage" data-v="boutique">Voir la boutique</button>'}</div>`}
    </section>
    <section class="section">
      <div class="section-titre"><h2>Pool</h2></div>
      <div class="carte liste-lignes" style="padding:0 16px;gap:0">
        ${POOLS.map(x => `<button class="rangee" data-action="pool" data-v="${x.id}">
          <span class="g"><span class="t">${e(x.nom)}</span><span class="s">${x.mode} · commission ${pc(x.frais)} · versement dès ${String(x.min).replace('.', ',')} BTC</span></span>
          <span class="${x.id === mn.pool ? 'badge ok' : 'badge neutre'}">${x.id === mn.pool ? 'Actuel' : 'Choisir'}</span></button>`).join('')}
      </div>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Contrat d'électricité</h2></div>
      <div class="carte">
        <div class="segment">
          <button data-action="contrat" data-v="base" aria-pressed="${mn.contrat.type === 'base'}">Base</button>
          <button data-action="contrat" data-v="tempo" aria-pressed="${mn.contrat.type === 'tempo'}">Tempo</button>
        </div>
        ${mn.contrat.type === 'base'
          ? `<div class="ligne-kv"><span>Prix du kWh</span><span class="num">${kwh(TARIFS.base[mn.contrat.kva >= 9 ? 9 : 6])} €</span></div>`
          : `<div class="ligne-kv"><span>Aujourd'hui</span>${couleurJ ? `<span class="${COULEUR_CLS[couleurJ]}">${COULEUR_TXT[couleurJ]}</span>` : '<span class="discret">Couleur inconnue</span>'}</div>
             ${ctx.couleurDemain ? `<div class="ligne-kv"><span>Demain</span><span class="${COULEUR_CLS[ctx.couleurDemain]}">${COULEUR_TXT[ctx.couleurDemain]}</span></div>` : ''}
             <div class="ligne-kv" style="font-size:13px"><span>Bleu HP / HC</span><span class="num">${TARIFS.tempo.bleu.map(kwh).join(' / ')} €</span></div>
             <div class="ligne-kv" style="font-size:13px"><span>Blanc HP / HC</span><span class="num">${TARIFS.tempo.blanc.map(kwh).join(' / ')} €</span></div>
             <div class="ligne-kv" style="font-size:13px"><span>Rouge HP / HC</span><span class="num">${TARIFS.tempo.rouge.map(kwh).join(' / ')} €</span></div>
             <p class="discret" style="font-size:12px">Heures creuses de 22 h à 6 h. Couleurs du vrai calendrier Tempo ; si elle est inconnue, le prix Base s'applique.</p>`}
        <p class="discret" style="font-size:12px">Tarif Bleu EDF ${Math.abs(ie - 1) < 0.001 ? 'au 1er août 2026' : `à la date du jeu (${ie > 1 ? '+' : '−'}${Math.round(Math.abs(ie - 1) * 1000) / 10} % par rapport au 1er août 2026)`}${d.elec !== 1 ? ` · ta partie applique ${d.elec < 1 ? '−' : '+'}${Math.round(Math.abs(1 - d.elec) * 100)} %` : ''}.</p>
      </div>
    </section>`;
}

function salle(ctx, mn) {
  const { partie, D } = ctx;
  const garage = partie.profil.logement === 'maison';
  const T = mn.temperature;
  const ext = D.temperatureExterieure(tJeu());
  const f = T != null ? facteurChaleur(T) : 1;
  const etatT = T == null ? '' : T > 40 ? 'badge ko' : T > 35 ? 'badge attente' : 'badge ok';
  return `<section class="carte">
    <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${garage ? 'Garage' : 'Pièce des machines'}</span>${T != null ? `<span class="${etatT}">${T.toFixed(1).replace('.', ',')} °C</span>` : ''}</div>
    <div class="ligne-kv" style="font-size:13px"><span>Dehors${mn.lieu ? ' à ' + e(mn.lieu.nom) : ''}</span><span class="num">${ext != null ? ext.toFixed(1).replace('.', ',') + ' °C' : 'météo indisponible'}</span></div>
    ${f < 1 ? `<div class="carte alerte" style="font-size:13px;padding:10px 12px">${T > 40 ? 'Surchauffe : les machines coupent et redémarrent en boucle.' : 'Trop chaud : les machines réduisent leur puissance.'} Ventile, passe en mode éco ou arrête une machine.</div>` : ''}
    ${mn.ventilation ? '<div class="ligne-kv" style="font-size:13px"><span>Extraction d\'air</span><span class="badge ok">Installée</span></div>'
      : `<button class="bouton secondaire petit" data-action="ventilation">Installer un extracteur d'air (${eur(VENTILATION.prix)})</button>`}
    ${partie.profil.logement === 'appart' ? `<div class="ligne-kv" style="font-size:13px"><span>Plaintes des voisins</span><span>${mn.restrictionNuit ? '<span class="badge ko">Arrêt obligatoire 22 h à 7 h</span>' : (mn.plaintes || 0) + ' sur 3'}</span></div>` : ''}
    <p class="discret" style="font-size:12px">Un ASIC à air fonctionne bien jusqu'à 35 °C, se bride au-delà et se protège au-dessus de 40 °C. Température extérieure réelle (Open-Meteo).</p>
  </section>`;
}

function machineCarte(m, ctx, live) {
  const md = spec(m);
  const badge = m.statut === 'marche' ? '<span class="badge ok"><span class="pt"></span>En marche</span>'
    : m.statut === 'livraison' ? '<span class="badge attente">En livraison</span>'
    : m.statut === 'panne' ? '<span class="badge ko">En panne</span>'
    : m.statut === 'reparation' ? '<span class="badge attente">En réparation</span>'
    : m.statut === 'envoi' ? '<span class="badge attente">En transport</span>' : '<span class="badge neutre">Arrêtée</span>';
  const h = m.lieu && m.lieu !== 'maison' ? hebergeur(m.lieu) : null;
  const devis = m.panne ? devisReparation(ctx.partie, m) : null;
  const eurUsd = ctx.D.etat.eurUsd;
  const mode = m.mode || 'normal';
  const reglable = ['marche', 'arret'].includes(m.statut);
  return `<article class="carte" style="gap:10px">
    <div class="ligne-kv"><span class="g" style="display:flex;flex-direction:column;gap:2px"><span class="carte-titre" style="color:var(--texte)">${e(md.nom)}</span><span style="font-size:12px">${md.rig ? 'Rig monté' : md.etat === 'neuf' ? 'Neuve' : 'Occasion reconditionnée'} · achetée ${e(dateHeure(m.acheteLe))}</span></span>${badge}</div>
    <div class="grille-3" style="font-size:12px">
      <div><span class="discret" style="display:block;font-size:11px">Puissance</span><span class="num">${puissanceTxt(md)}</span></div>
      <div><span class="discret" style="display:block;font-size:11px">Conso</span><span class="num">${md.w.toLocaleString('fr-FR')} W</span></div>
      <div><span class="discret" style="display:block;font-size:11px">${md.th ? 'Efficacité' : 'Mine'}</span><span class="num">${md.th ? n1(md.w / md.th) + ' J/TH' : (md.production || []).map(p => p.coin).join(' + ')}</span></div>
    </div>
    <div class="ligne-kv" style="font-size:12px"><span>Emplacement</span><span>${h ? e(h.nom) + ' · ' + e(h.pays) : m.statut === 'envoi' && m.envoiVers !== 'maison' ? 'en route vers ' + e(hebergeur(m.envoiVers).nom) : 'Chez toi'}</span></div>
    ${m.statut === 'envoi' ? `<div class="ligne-kv" style="font-size:13px"><span>Arrivée prévue</span><span>${e(dateHeure(m.envoiFin))}</span></div>` : ''}
    ${h && m.engagementFin ? `<div class="ligne-kv" style="font-size:12px"><span>Engagement</span><span>${tJeu() < m.engagementFin ? 'jusqu\'au ' + new Date(m.engagementFin).toLocaleDateString('fr-FR') : 'terminé'}</span></div>` : ''}
    ${m.statut === 'envoi' ? '' : m.statut === 'livraison' ? `<div class="ligne-kv" style="font-size:13px"><span>Arrive dans</span>${live('liv:' + m.id, ctx, 'num')}</div>` : `
    <div class="ligne-kv" style="font-size:12px"><span>Fonctionnement</span><span class="num">${Math.round(m.heures || 0).toLocaleString('fr-FR')} h · nettoyée il y a ${Math.round(m.heuresDepuisNettoyage || 0)} h</span></div>
    ${(m.santeHash ?? 1) < 1 ? `<div class="ligne-kv" style="font-size:12px"><span>Cartes de hachage</span><span class="baisse">${Math.round((m.santeHash) * 3)} sur 3 en service</span></div>` : ''}
    <div class="ligne-kv" style="font-size:12px"><span>Garantie</span><span>${m.garantieFin && tJeu() < m.garantieFin ? 'jusqu\'au ' + new Date(m.garantieFin).toLocaleDateString('fr-FR') : 'aucune'}</span></div>
    ${md.rig && reglable ? `<div class="segment">${Object.keys(COINS_GPU).map(c => `<button data-action="rig-crypto" data-v="${m.id}:${c}" aria-pressed="${m.config.coin === c}">${c}</button>`).join('')}</div>` : ''}
    ${reglable ? `<div class="segment">${Object.entries(MODES).map(([id, x]) => `<button data-action="mode" data-v="${m.id}:${id}" aria-pressed="${mode === id}">${x.nom}</button>`).join('')}</div>` : ''}
    ${devis && m.statut !== 'reparation' ? `<div class="carte alerte" style="font-size:13px;padding:10px 12px;gap:6px"><strong>${e(devis.panne.nom)}</strong>
        <span>Réparation : ${eur(devis.cout)}${devis.garantie ? ' (garantie, frais d\'envoi seulement)' : ''}, ${Math.max(1, Math.round(devis.delai / 864e5 * 10) / 10).toString().replace('.', ',')} j sans la machine.</span>
        <button class="bouton petit" data-action="reparer" data-v="${m.id}">Faire réparer</button></div>` : ''}
    ${m.statut === 'reparation' ? `<div class="ligne-kv" style="font-size:13px"><span>Retour prévu</span><span>${e(dateHeure(m.reparationFin))}</span></div>` : ''}
    <div class="grille-2">
      ${m.statut === 'marche' ? `<button class="bouton secondaire petit" data-action="arreter" data-v="${m.id}">Arrêter</button>`
        : m.statut === 'arret' ? `<button class="bouton petit" data-action="demarrer" data-v="${m.id}">Mettre en marche</button>` : '<span></span>'}
      ${['marche', 'arret'].includes(m.statut) && !h ? `<button class="bouton secondaire petit" data-action="depoussierer" data-v="${m.id}">Dépoussiérer</button>` : ''}
    </div>
    ${m.statut === 'arret' && !h && !md.rig ? (ctx.app.envoi === m.id ? choixHebergeur(m, ctx) : `<button class="lien" style="align-self:flex-start" data-action="envoi" data-v="${m.id}">Envoyer chez un hébergeur</button>`) : ''}
    ${m.statut === 'arret' && h ? `<button class="lien" style="align-self:flex-start" data-action="rapatrier" data-v="${m.id}">Faire revenir chez toi (${eur(ENVOI.eur)})</button>` : ''}
    ${['arret', 'panne'].includes(m.statut) && eurUsd ? `<button class="lien" style="align-self:flex-start" data-action="vendre" data-v="${m.id}">Vendre d'occasion (≈ ${eur(valeurReventeEUR(m, eurUsd))})</button>` : ''}`}
  </article>`;
}

function boutique(ctx, mn) {
  const { partie, D, M } = ctx;
  const d = reglesDe(partie);
  const eurUsd = D.etat.eurUsd;
  const r = D.etat.reseau || mn.reseau;
  const prixBTC = M.prixDeBase('BTC');
  const p = pool(mn.pool);
  return `<div class="ligne-kv" style="font-size:13px"><span>Compte bancaire</span><span class="num">${eur(partie.banque.solde)}</span></div>
    ${constructeurRig(ctx, mn)}
    <div class="section-titre" style="margin-top:6px"><h2>ASIC</h2></div>
    <div class="carte" style="gap:8px"><span style="font-size:13px">Livraison</span>
      <div class="puces">${[['maison', 'Chez toi'], ...HEBERGEURS.map(h => [h.id, h.nom])].map(([id, nom]) => `<button class="puce" data-action="lieu-achat" data-v="${id}" aria-pressed="${(ctx.app.lieuAchat || 'maison') === id}">${e(nom)}</button>`).join('')}</div></div>
    ${enRejeu() ? `<p class="discret" style="font-size:12px">Rejeu : seules les machines déjà sorties à cette date sont en vente. Prix estimés d'après la rentabilité du minage de l'époque (×${n1(marcheMachines.facteur)} par rapport à aujourd'hui).</p>` : ''}
    ${CATALOGUE.filter(m => disponible(m, tJeu()) && !(m.production && enRejeu())).map(m => {
      const px = eurUsd ? prixMachineEUR(m, eurUsd) : null;
      const est = d.aides ? estimer(m, ctx, mn) : null;
      const lieu = ctx.app.lieuAchat || 'maison';
      const hl = lieu !== 'maison' ? hebergeur(lieu) : null;
      const bloque = m.refroidissement === 'hydro' && !(hl && hl.hydro);
      if (px && hl) px.total += hl.installUSD / eurUsd;
      const jours = LIVRAISON[m.etat].jours / d.temps;
      return `<article class="carte" style="gap:10px">
        <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${e(m.nom)}</span><span class="badge ${m.etat === 'neuf' ? 'ok' : 'neutre'}">${m.etat === 'neuf' ? 'Neuf' : 'Occasion'}</span></div>
        <div class="grille-3" style="font-size:12px">
          <div><span class="discret" style="display:block;font-size:11px">Puissance</span><span class="num">${puissanceTxt(m)}</span></div>
          <div><span class="discret" style="display:block;font-size:11px">Conso</span><span class="num">${m.w.toLocaleString('fr-FR')} W</span></div>
          <div><span class="discret" style="display:block;font-size:11px">${m.th ? 'Efficacité' : 'Mine'}</span><span class="num">${m.th ? n1(m.w / m.th) + ' J/TH' : 'LTC + DOGE'}</span></div>
        </div>
        <div class="ligne-kv"><span>Prix TTC + livraison</span><span class="num" style="color:var(--texte)">${px ? eur(px.total) : '—'}</span></div>
        <div class="ligne-kv" style="font-size:12px"><span>Délai de livraison</span><span>${jours >= 1 ? n1(jours) + ' j' : Math.round(jours * 24) + ' h'}</span></div>
        ${ligneEstimation(est)}
        ${bloque ? '<span class="verrou" style="align-self:flex-start">Refroidissement à eau : livraison chez EZ Blockchain</span>'
          : `<button class="bouton petit" data-action="acheter-machine" data-v="${m.id}" ${partie.profil.logement === 'parents' && !hl ? 'disabled' : ''}>Acheter${hl ? ', livrée chez ' + e(hl.nom) : ''}</button>`}
      </article>`;
    }).join('')}
    <p class="discret" style="font-size:12px">Prix publics relevés début octobre 2026, convertis au taux euro-dollar du jour, TVA 20 % incluse. Paiement depuis ton compte bancaire.${d.aides ? '' : ' En Réalité, aucune estimation de rentabilité : à toi de calculer.'}</p>`;
}

function choixHebergeur(m, ctx) {
  const eurUsd = ctx.D.etat.eurUsd;
  return `<div class="carte" style="padding:12px;gap:8px;background:var(--fond)">
    <div class="ligne-kv" style="font-size:13px"><strong style="color:var(--texte)">Choisis un hébergeur</strong><button class="lien" data-action="envoi" data-v="">Fermer</button></div>
    ${HEBERGEURS.map(h => `<div class="rangee" style="padding:8px 0">
      <span class="g"><span class="t" style="font-size:14px">${e(h.nom)} · ${e(h.pays)}</span>
        <span class="s">${eurUsd ? String(prixHebergeurEUR(h.id, eurUsd).toFixed(3)).replace('.', ',') + ' €/kWh' : '—'} · engagement ${h.engagementMois} mois · envoi ${eur(ENVOI.eur + (eurUsd ? h.installUSD / eurUsd : 0))}</span></span>
      <button class="bouton petit" style="min-height:36px;padding:0 12px;font-size:13px" data-action="envoyer" data-v="${m.id}:${h.id}">Envoyer</button></div>`).join('')}
  </div>`;
}

export function ongletInstallations(ctx, live, integre = false) {
  const { partie, D } = ctx;
  const mn = minageDe(partie);
  const eurUsd = D.etat.eurUsd;
  const parents = partie.profil.logement === 'parents';
  const tab = ABONNEMENTS[mn.contrat.type] || ABONNEMENTS.base;
  const LOG = { parents: 'Chez tes parents', appart: 'Appartement en location', maison: 'Maison avec garage' };
  return `${integre ? '' : '<h1 style="font-size:24px;font-weight:800">Installations</h1>'}
    <section class="carte">
      <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${e(LOG[partie.profil.logement])}</span><span class="badge neutre">${mn.contrat.kva} kVA · ${mn.contrat.type === 'tempo' ? 'Tempo' : 'Base'}</span></div>
      <div class="ligne-kv" style="font-size:13px"><span>Puissance pour les machines</span><span class="num">${puissanceDispo(partie.profil.logement, mn.contrat.kva)} kW</span></div>
      <div class="ligne-kv" style="font-size:13px"><span>Extraction d'air</span><span>${mn.ventilation ? 'installée' : 'aucune'}</span></div>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Puissance du compteur</h2></div>
      <div class="carte liste-lignes" style="padding:0 16px;gap:0">
        ${[6, 9, 12].map(k => `<div class="rangee">
          <span class="g"><span class="t">${k} kVA</span><span class="s">Abonnement ${eur(tab[k])}/an · kWh ${String(TARIFS.base[k >= 9 ? 9 : 6]).replace('.', ',')} € en Base</span></span>
          ${k === mn.contrat.kva ? '<span class="badge ok">Actuel</span>' : `<button class="bouton secondaire petit" style="min-height:36px;padding:0 12px;font-size:13px;white-space:nowrap" data-action="compteur" data-v="${k}" ${parents ? 'disabled' : ''}>Passer à ${k}</button>`}
        </div>`).join('')}
      </div>
      <p class="discret" style="font-size:12px">Changement à distance du compteur Linky : ${eur(CHANGEMENT_PUISSANCE)} (Enedis). La différence d'abonnement s'ajoute à ta facture de minage. Au-delà de 12 kVA, il faut du triphasé : version ultérieure.</p>
    </section>
    <section class="section">
      <div class="section-titre"><h2>Hébergeurs</h2></div>
      <div class="carte liste-lignes" style="padding:0 16px;gap:0">
        ${HEBERGEURS.map(h => {
          const n = mn.machines.filter(m => m.lieu === h.id).length;
          return `<div class="rangee" style="align-items:flex-start">
          <span class="g"><span class="t">${e(h.nom)}</span><span class="s">${e(h.pays)} · ${h.usdKwh.toString().replace('.', ',')} $/kWh annoncés + ${String(FRAIS_ANNEXES_USD).replace('.', ',')} $ de frais annexes${eurUsd ? ' ≈ ' + prixHebergeurEUR(h.id, eurUsd).toFixed(3).replace('.', ',') + ' €/kWh' : ''}</span>
            <span class="s">Engagement ${h.engagementMois} mois · installation ${h.installUSD ? h.installUSD + ' $ par machine' : 'incluse'}${h.hydro ? ' · accepte les machines à eau' : ''}</span></span>
          <span class="badge ${n ? 'ok' : 'neutre'}">${n} machine${n > 1 ? 's' : ''}</span></div>`;
        }).join('')}
      </div>
      <p class="discret" style="font-size:12px">Envoi d'une machine : ${eur(ENVOI.eur)} et ${ENVOI.jours} jours (divisés par la vitesse du temps). Chez l'hébergeur : pas de bruit, pas de chaleur, entretien compris, réparations un peu plus longues. Facture mensuelle sur ta banque. Tarifs relevés sur spark.money.</p>
    </section>
    <section class="carte info"><div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">Local professionnel et triphasé</span><span class="verrou">Version ultérieure</span></div>
      <p style="font-size:13px;color:var(--texte-2)">Bail, raccordement triphasé et contrat professionnel pour un vrai parc chez toi.</p></section>`;
}

function constructeurRig(ctx, mn) {
  const { app, partie } = ctx;
  if (enRejeu()) return `<div class="section-titre"><h2>Rig de cartes graphiques</h2></div><div class="carte info" style="font-size:13px;color:var(--texte-2)">Indisponible en rejeu : pas d'historique public des réseaux Ravencoin, Ethereum Classic et Ergo.</div>`;
  const d = reglesDe(partie);
  const b = app.rig;
  const r = calculerRig(b.carte, b.nb, b.coin);
  const md = { th: 0, w: r.w, production: [{ coin: b.coin, h: r.h }] };
  const est = d.aides ? estimer(md, ctx, mn) : null;
  const jours = RIG.livraisonJours / d.temps;
  return `<section class="carte" style="gap:12px">
    <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">Monter un rig de cartes graphiques</span><span class="badge ok">Neuf</span></div>
    <div class="puces">${CARTES.map(c => `<button class="puce" data-action="rig-carte" data-v="${c.id}" aria-pressed="${b.carte === c.id}">${e(c.nom)} · ${eur(c.prixEUR).replace(',00', '')}</button>`).join('')}</div>
    <label class="champ">Nombre de cartes : <strong style="color:var(--texte)" data-rig-nb>${b.nb}</strong>
      <input id="f-rig-nb" type="range" min="1" max="${RIG.maxCartes}" step="1" value="${b.nb}" data-input="rig-nb"></label>
    <div class="segment">${Object.keys(COINS_GPU).map(c => `<button data-action="rig-coin" data-v="${c}" aria-pressed="${b.coin === c}">${c}</button>`).join('')}</div>
    <div class="grille-3" style="font-size:12px">
      <div><span class="discret" style="display:block;font-size:11px">Puissance</span><span class="num">${fmtHash(r.h)}</span></div>
      <div><span class="discret" style="display:block;font-size:11px">Conso au mur</span><span class="num">${r.w.toLocaleString('fr-FR')} W</span></div>
      <div><span class="discret" style="display:block;font-size:11px">Alimentations</span><span class="num">${r.alims} × ${RIG.alim.watts} W</span></div>
    </div>
    <div class="ligne-kv" style="font-size:12px"><span>Cartes + châssis, kit, risers, alimentations</span><span class="num">${eur(r.carte.prixEUR * r.nb)} + ${eur(r.prix - r.carte.prixEUR * r.nb)}</span></div>
    <div class="ligne-kv"><span>Prix total TTC</span><span class="num" style="color:var(--texte)">${eur(r.prix)}</span></div>
    <div class="ligne-kv" style="font-size:12px"><span>Livraison et montage</span><span>${jours >= 1 ? n1(jours) + ' j' : Math.round(jours * 24) + ' h'}</span></div>
    ${ligneEstimation(est)}
    <button class="bouton petit" data-action="acheter-rig" ${partie.profil.logement === 'parents' ? 'disabled' : ''}>Commander le rig</button>
    <p class="discret" style="font-size:12px">Performances WhatToMine, prix des cartes neuves en France (août 2026). Le rig peut changer de crypto à tout moment.</p>
  </section>`;
}

function reseau(ctx, mn) {
  const r = ctx.D.etat.reseau || mn.reseau;
  if (!r) return '<div class="carte vide">Données du réseau Bitcoin en cours de chargement…</div>';
  const hashprice = btcParSeconde(1000, r.difficulte, r.recompense, 0) * 86400;
  return `<section class="carte" style="gap:8px">
    <div class="carte-titre">Réseau Bitcoin en direct</div>
    <div class="ligne-kv"><span>Hauteur de bloc</span><span class="num">${r.hauteur.toLocaleString('fr-FR')}</span></div>
    <div class="ligne-kv"><span>Difficulté</span><span class="num">${n1(r.difficulte / 1e12)} T</span></div>
    <div class="ligne-kv"><span>Puissance du réseau</span><span class="num">${Math.round(r.hashrate / 1e18).toLocaleString('fr-FR')} EH/s</span></div>
    <div class="ligne-kv"><span>Récompense de bloc</span><span class="num">${String(r.subvention).replace('.', ',')} BTC</span></div>
    <div class="ligne-kv"><span>Frais moyens par bloc</span><span class="num">${qte(r.fraisMoyens)} BTC</span></div>
    <div class="ligne-kv"><span>Gain brut par PH/s et par jour</span><span class="num">${qte(hashprice)} BTC</span></div>
    <div class="ligne-kv"><span>Prochain halving</span><span class="num">bloc ${(Math.floor(r.hauteur / 210000) + 1) * 210000 > 0 ? ((Math.floor(r.hauteur / 210000) + 1) * 210000).toLocaleString('fr-FR') : ''}</span></div>
    <p class="discret" style="font-size:12px">Source : mempool.space, mis à jour toutes les 10 minutes (${e(dateHeure(r.maj))}).</p>
  </section>`;
}
