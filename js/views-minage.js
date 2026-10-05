// Onglet Minage : parc, pool, contrat électrique, réseau réel, boutique.
import { CATALOGUE, POOLS, TARIFS, LIVRAISON, MODES, VENTILATION, modele, pool, puissanceDispo, prixMachineEUR, estimationJour, btcParSeconde, facteurChaleur } from './minage.js';
import { DIFFICULTES } from './config.js';
import { minageDe, kwEnMarche, thEnMarche, devisReparation, valeurReventeEUR } from './jeuminage.js';
import { eur, prix, qte, dateHeure, echapper as e } from './format.js';

const LOGEMENT = { parents: 'Chez tes parents', appart: 'Appartement', maison: 'Maison avec garage' };
const COULEUR_TXT = { bleu: 'Jour bleu', blanc: 'Jour blanc', rouge: 'Jour rouge' };
const COULEUR_CLS = { bleu: 'badge neutre', blanc: 'badge attente', rouge: 'badge ko' };
const n1 = v => v.toFixed(1).replace('.', ',');
const pc = v => (v * 100).toLocaleString('fr-FR', { maximumFractionDigits: 2 }) + ' %';

export function ongletMinage(ctx, live) {
  const { app, partie, D } = ctx;
  const mn = minageDe(partie);
  const sous = app.sousMinage || 'parc';
  return `<h1 style="font-size:24px;font-weight:800">Minage</h1>
    <div class="segment sur-fond">
      <button data-action="sous-minage" data-v="parc" aria-pressed="${sous === 'parc'}">Mon parc</button>
      <button data-action="sous-minage" data-v="boutique" aria-pressed="${sous === 'boutique'}">Boutique</button>
      <button data-action="sous-minage" data-v="reseau" aria-pressed="${sous === 'reseau'}">Réseau</button>
    </div>
    ${sous === 'parc' ? parc(ctx, mn, live) : sous === 'boutique' ? boutique(ctx, mn) : reseau(ctx, mn)}`;
}

function parc(ctx, mn, live) {
  const { partie, D, M } = ctx;
  const d = DIFFICULTES[partie.difficulte];
  const dispo = puissanceDispo(partie.profil.logement, mn.contrat.kva);
  const kw = kwEnMarche(mn), th = thEnMarche(mn);
  const p = pool(mn.pool);
  const r = D.etat.reseau || mn.reseau;
  const prixBTC = M.prixDeBase('BTC');
  const gainJour = r ? btcParSeconde(th, r.difficulte, r.recompense, p.frais, d.minage) * 86400 : 0;
  const parents = partie.profil.logement === 'parents';
  const usage = dispo ? Math.min(100, kw / dispo * 100) : 0;
  const couleurJ = mn.contrat.type === 'tempo' ? ctx.couleurAujourdhui : null;
  return `${parents ? `<div class="carte alerte" style="font-size:13px">Chez tes parents, pas question d'un ASIC : bruit, chaleur et compteur partagé. Pour miner, il faudra passer par un hébergeur (version 0.6) ou déménager (version 0.9).</div>` : ''}
    <section class="carte">
      <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${e(LOGEMENT[partie.profil.logement])}</span><span class="badge neutre">Compteur ${mn.contrat.kva} kVA</span></div>
      <div class="ligne-kv"><span>Puissance pour les machines</span><span class="num">${n1(kw)} / ${dispo} kW</span></div>
      <div style="height:6px;border-radius:3px;background:var(--fond);overflow:hidden"><div style="width:${usage}%;height:6px;background:${usage > 90 ? 'var(--baisse)' : 'var(--ambre)'}"></div></div>
      <p class="discret" style="font-size:12px">2 kVA restent réservés au logement. Changer de compteur : version 0.6.</p>
    </section>
    ${parents ? '' : salle(ctx, mn)}
    <section class="carte" style="border-radius:20px">
      <div class="repartition" style="grid-template-columns:repeat(2,minmax(0,1fr))">
        <div><span class="l">Puissance</span><span class="v">${th.toLocaleString('fr-FR')} TH/s</span></div>
        <div><span class="l">Consommation</span><span class="v">${n1(kw)} kW</span></div>
        <div><span class="l">Solde au pool</span>${live('pool', ctx, 'v')}</div>
        <div><span class="l">Facture en cours</span>${live('facture', ctx, 'v')}</div>
      </div>
      ${d.aides && th ? `<div class="ligne-kv" style="font-size:13px"><span>Gains attendus</span><span class="num">${qte(gainJour)} BTC/jour${prixBTC ? ' ≈ ' + eur(gainJour * prixBTC) : ''}</span></div>
        <div class="ligne-kv" style="font-size:13px"><span>Électricité</span><span class="num">≈ ${eur(kw * 24 * (mn.contrat.type === 'tempo' ? 0.155 : TARIFS.base[mn.contrat.kva >= 9 ? 9 : 6]) * d.elec)}/jour</span></div>` : ''}
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
          ? `<div class="ligne-kv"><span>Prix du kWh</span><span class="num">${String(TARIFS.base[mn.contrat.kva >= 9 ? 9 : 6]).replace('.', ',')} €</span></div>`
          : `<div class="ligne-kv"><span>Aujourd'hui</span>${couleurJ ? `<span class="${COULEUR_CLS[couleurJ]}">${COULEUR_TXT[couleurJ]}</span>` : '<span class="discret">Couleur inconnue</span>'}</div>
             ${ctx.couleurDemain ? `<div class="ligne-kv"><span>Demain</span><span class="${COULEUR_CLS[ctx.couleurDemain]}">${COULEUR_TXT[ctx.couleurDemain]}</span></div>` : ''}
             <div class="ligne-kv" style="font-size:13px"><span>Bleu HP / HC</span><span class="num">${TARIFS.tempo.bleu.map(v => String(v).replace('.', ',')).join(' / ')} €</span></div>
             <div class="ligne-kv" style="font-size:13px"><span>Blanc HP / HC</span><span class="num">${TARIFS.tempo.blanc.map(v => String(v).replace('.', ',')).join(' / ')} €</span></div>
             <div class="ligne-kv" style="font-size:13px"><span>Rouge HP / HC</span><span class="num">${TARIFS.tempo.rouge.map(v => String(v).replace('.', ',')).join(' / ')} €</span></div>
             <p class="discret" style="font-size:12px">Heures creuses de 22 h à 6 h. Couleurs du vrai calendrier Tempo ; si elle est inconnue, le prix Base s'applique.</p>`}
        <p class="discret" style="font-size:12px">Tarif Bleu EDF au 1er août 2026${d.elec !== 1 ? ` · ta difficulté applique ${d.elec < 1 ? '−' + Math.round((1 - d.elec) * 100) + ' %' : ''}` : ''}.</p>
      </div>
    </section>`;
}

function salle(ctx, mn) {
  const { partie, D } = ctx;
  const garage = partie.profil.logement === 'maison';
  const T = mn.temperature;
  const ext = D.temperatureExterieure(Date.now());
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
  const md = modele(m.modele);
  const badge = m.statut === 'marche' ? '<span class="badge ok"><span class="pt"></span>En marche</span>'
    : m.statut === 'livraison' ? '<span class="badge attente">En livraison</span>'
    : m.statut === 'panne' ? '<span class="badge ko">En panne</span>'
    : m.statut === 'reparation' ? '<span class="badge attente">En réparation</span>' : '<span class="badge neutre">Arrêtée</span>';
  const devis = m.panne ? devisReparation(ctx.partie, m) : null;
  const eurUsd = ctx.D.etat.eurUsd;
  const mode = m.mode || 'normal';
  const reglable = ['marche', 'arret'].includes(m.statut);
  return `<article class="carte" style="gap:10px">
    <div class="ligne-kv"><span class="g" style="display:flex;flex-direction:column;gap:2px"><span class="carte-titre" style="color:var(--texte)">${e(md.nom)}</span><span style="font-size:12px">${md.etat === 'neuf' ? 'Neuve' : 'Occasion reconditionnée'} · achetée ${e(dateHeure(m.acheteLe))}</span></span>${badge}</div>
    <div class="grille-3" style="font-size:12px">
      <div><span class="discret" style="display:block;font-size:11px">Puissance</span><span class="num">${md.th} TH/s</span></div>
      <div><span class="discret" style="display:block;font-size:11px">Conso</span><span class="num">${md.w.toLocaleString('fr-FR')} W</span></div>
      <div><span class="discret" style="display:block;font-size:11px">Efficacité</span><span class="num">${n1(md.w / md.th)} J/TH</span></div>
    </div>
    ${m.statut === 'livraison' ? `<div class="ligne-kv" style="font-size:13px"><span>Arrive dans</span>${live('liv:' + m.id, ctx, 'num')}</div>` : `
    <div class="ligne-kv" style="font-size:12px"><span>Fonctionnement</span><span class="num">${Math.round(m.heures || 0).toLocaleString('fr-FR')} h · nettoyée il y a ${Math.round(m.heuresDepuisNettoyage || 0)} h</span></div>
    ${(m.santeHash ?? 1) < 1 ? `<div class="ligne-kv" style="font-size:12px"><span>Cartes de hachage</span><span class="baisse">${Math.round((m.santeHash) * 3)} sur 3 en service</span></div>` : ''}
    <div class="ligne-kv" style="font-size:12px"><span>Garantie</span><span>${m.garantieFin && Date.now() < m.garantieFin ? 'jusqu\'au ' + new Date(m.garantieFin).toLocaleDateString('fr-FR') : 'aucune'}</span></div>
    ${reglable ? `<div class="segment">${Object.entries(MODES).map(([id, x]) => `<button data-action="mode" data-v="${m.id}:${id}" aria-pressed="${mode === id}">${x.nom}</button>`).join('')}</div>` : ''}
    ${devis && m.statut !== 'reparation' ? `<div class="carte alerte" style="font-size:13px;padding:10px 12px;gap:6px"><strong>${e(devis.panne.nom)}</strong>
        <span>Réparation : ${eur(devis.cout)}${devis.garantie ? ' (garantie, frais d\'envoi seulement)' : ''}, ${Math.max(1, Math.round(devis.delai / 864e5 * 10) / 10).toString().replace('.', ',')} j sans la machine.</span>
        <button class="bouton petit" data-action="reparer" data-v="${m.id}">Faire réparer</button></div>` : ''}
    ${m.statut === 'reparation' ? `<div class="ligne-kv" style="font-size:13px"><span>Retour prévu</span><span>${e(dateHeure(m.reparationFin))}</span></div>` : ''}
    <div class="grille-2">
      ${m.statut === 'marche' ? `<button class="bouton secondaire petit" data-action="arreter" data-v="${m.id}">Arrêter</button>`
        : m.statut === 'arret' ? `<button class="bouton petit" data-action="demarrer" data-v="${m.id}">Mettre en marche</button>` : '<span></span>'}
      ${['marche', 'arret'].includes(m.statut) ? `<button class="bouton secondaire petit" data-action="depoussierer" data-v="${m.id}">Dépoussiérer</button>` : ''}
    </div>
    ${['arret', 'panne'].includes(m.statut) && eurUsd ? `<button class="lien" style="align-self:flex-start" data-action="vendre" data-v="${m.id}">Vendre d'occasion (≈ ${eur(valeurReventeEUR(m, eurUsd))})</button>` : ''}`}
  </article>`;
}

function boutique(ctx, mn) {
  const { partie, D, M } = ctx;
  const d = DIFFICULTES[partie.difficulte];
  const eurUsd = D.etat.eurUsd;
  const r = D.etat.reseau || mn.reseau;
  const prixBTC = M.prixDeBase('BTC');
  const p = pool(mn.pool);
  return `<div class="ligne-kv" style="font-size:13px"><span>Compte bancaire</span><span class="num">${eur(partie.banque.solde)}</span></div>
    ${CATALOGUE.map(m => {
      const px = eurUsd ? prixMachineEUR(m, eurUsd) : null;
      const est = r && d.aides ? estimationJour(m, r, mn.contrat, p.frais, d.minage, d.elec, prixBTC) : null;
      const bloque = m.refroidissement === 'hydro';
      const jours = LIVRAISON[m.etat].jours / d.temps;
      return `<article class="carte" style="gap:10px">
        <div class="ligne-kv"><span class="carte-titre" style="color:var(--texte)">${e(m.nom)}</span><span class="badge ${m.etat === 'neuf' ? 'ok' : 'neutre'}">${m.etat === 'neuf' ? 'Neuf' : 'Occasion'}</span></div>
        <div class="grille-3" style="font-size:12px">
          <div><span class="discret" style="display:block;font-size:11px">Puissance</span><span class="num">${m.th} TH/s</span></div>
          <div><span class="discret" style="display:block;font-size:11px">Conso</span><span class="num">${m.w.toLocaleString('fr-FR')} W</span></div>
          <div><span class="discret" style="display:block;font-size:11px">Efficacité</span><span class="num">${n1(m.w / m.th)} J/TH</span></div>
        </div>
        <div class="ligne-kv"><span>Prix TTC + livraison</span><span class="num" style="color:var(--texte)">${px ? eur(px.total) : '—'}</span></div>
        <div class="ligne-kv" style="font-size:12px"><span>Délai de livraison</span><span>${jours >= 1 ? n1(jours) + ' j' : Math.round(jours * 24) + ' h'}</span></div>
        ${est ? `<div class="ligne-kv" style="font-size:12px"><span>Estimation par jour</span><span class="num ${est.net >= 0 ? 'hausse' : 'baisse'}">${est.eur != null ? eur(est.eur) : '—'} − ${eur(est.cout)} = ${est.net != null ? (est.net >= 0 ? '+' : '') + eur(est.net) : '—'}</span></div>` : ''}
        ${bloque ? '<span class="verrou" style="align-self:flex-start">Refroidissement à eau : version 0.6</span>'
          : `<button class="bouton petit" data-action="acheter-machine" data-v="${m.id}" ${partie.profil.logement === 'parents' ? 'disabled' : ''}>Acheter</button>`}
      </article>`;
    }).join('')}
    <p class="discret" style="font-size:12px">Prix publics relevés début octobre 2026, convertis au taux euro-dollar du jour, TVA 20 % incluse. Paiement depuis ton compte bancaire.${d.aides ? '' : ' En Réalité, aucune estimation de rentabilité : à toi de calculer.'}</p>`;
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
