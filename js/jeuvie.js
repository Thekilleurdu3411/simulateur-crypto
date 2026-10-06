// Vie quotidienne dans la partie : échéances mensuelles, changements d'emploi.
import { DIFFICULTES, reglesDe } from './config.js';
import { avancerVie, MOIS, trouverMetier, salaireNet } from './vie.js';
import * as C from './carriere.js';
import * as B from './bienetre.js';
import * as I from './biens.js';
import { loyerMarche } from './vie.js';
import { COMPTEUR } from './minage.js';
import { journal } from './state.js';
import { maintenant as tJeu } from './horloge.js';
import { indiceVie } from './economie.js';

export const graine = partie => (partie.simulation ? partie.simulation.seed : 0);
/** Indice des prix de la vie à une date (1 = 2026). */
export function indice(partie, t = tJeu()) { return indiceVie(t, graine(partie)); }

export function periode(partie) { return MOIS / reglesDe(partie).temps; }

export function vieDe(partie) {
  if (!partie.vie) partie.vie = { prochaineEcheance: tJeu() + periode(partie) };
  if (!partie.vie.dernierCalcul) partie.vie.dernierCalcul = tJeu();
  return partie.vie;
}

export function avancerViePartie(partie, maintenant = tJeu()) {
  const v = vieDe(partie);
  const kva = partie.minage ? partie.minage.contrat.kva : (COMPTEUR[partie.profil.logement] || 6);
  carriereDe(partie);
  const evts = avancerVie(v, partie.banque, partie.profil, v.dernierCalcul, maintenant, periode(partie), kva, { impot: reglesDe(partie).impots !== 'off', indice: t => indice(partie, t), mois: e => moisCarriere(partie, e) });
  v.dernierCalcul = maintenant;
  for (const e of evts) partie.historique.unshift({ t: e.t, type: 'vie', texte: e.texte });
  if (evts.length) partie.historique.sort((a, b) => b.t - a.t);
  return evts.map(e => e.texte);
}

/** Change de situation : préavis ou recherche d'un mois (raccourci par la vitesse du temps). */
export function changerSituation(partie, situation, metier, experience, anneeApprentissage) {
  const v = vieDe(partie);
  const p = partie.profil;
  if (situation === p.situation && metier === p.metier && experience === p.experience) return { erreur: 'C\'est déjà ta situation.' };
  if ((situation === 'salarie' || situation === 'alternant') && !trouverMetier(metier) && situation === 'salarie') return { erreur: 'Choisis un métier.' };
  carriereDe(partie);
  if (situation === 'salarie') {
    const ex = C.exigence(metier);
    if (!C.possede(p.diplomes, ex)) {
      const f = C.formationPour(metier);
      return { erreur: `Pour être ${metier.toLowerCase()}, il faut ${[].concat(ex).map(C.nomDiplome).join(' ou ')}${f ? ' (formation : ' + f.nom + ')' : ''}.` };
    }
    // Expérience : on la garde dans le même métier, sinon on repart débutant
    experience = metier === p.metier && p.situation === 'salarie' ? p.experience : 'debutant';
  }
  if (situation === 'alternant' && ['specialiste', 'medecin', 'pharmacien', 'dentiste', 'veterinaire', 'sagefemme', 'kine', 'avocat', 'notaire', 'pilote', 'controleur', 'insp', 'sport_pro'].includes([].concat(C.exigence(metier))[0])) return { erreur: "Ce métier ne s'apprend pas en alternance : regarde les formations." };
  const delai = periode(partie);
  const libelle = situation === 'salarie' ? `${metier} (${experience === 'experimente' ? 'expérimenté' : experience === 'confirme' ? 'confirmé' : 'débutant'})`
    : situation === 'alternant' ? `alternance${metier ? ' (' + metier + ')' : ''}` : situation === 'etudiant' ? 'études' : 'sans emploi';
  v.changement = { le: tJeu() + delai, profil: { situation, metier, experience, anneeApprentissage }, texte: situation === 'sans' ? 'Fin de ton préavis : tu es sans emploi.' : `Tu commences : ${libelle}.` };
  journal(partie, 'vie', situation === 'sans' ? 'Démission envoyée : préavis d\'un mois.' : `Nouvelle situation trouvée : ${libelle}, début dans un mois.`);
  return { le: v.changement.le };
}

export function annulerChangement(partie) {
  const v = vieDe(partie);
  if (!v.changement) return;
  v.changement = null;
  journal(partie, 'vie', 'Changement de situation annulé.');
}


// ---------- Carrière ----------
const ANS_EXPERIENCE = { debutant: 0, confirme: 5, experimente: 10 };
const posteDe = p => p.situation + '|' + (p.situation === 'salarie' || p.situation === 'alternant' ? p.metier : '');

/** État de carrière de la partie (créé au besoin, avec les diplômes que suppose le métier de départ). */
export function carriereDe(partie) {
  const p = partie.profil;
  if (!p.diplomes) p.diplomes = C.diplomesDeDepart(p);
  if (!partie.carriere) {
    const t = partie.creeLe || tJeu();
    if (p.transport === 'voiture' && !p.voiture) p.voiture = { type: 'occasion', prix: I.VOITURES[0].prix, achatLe: t };
    partie.carriere = { poste: posteDe(p), debutPoste: t, anneesAvant: ANS_EXPERIENCE[p.experience || 'debutant'] || 0, prochaineRevue: t + C.ANS, derniereDemande: 0, cpf: 1500, formation: null };
  }
  return partie.carriere;
}

function nouveauPoste(c, p, t) {
  c.poste = posteDe(p); c.debutPoste = t; c.prochaineRevue = t + C.ANS;
  c.anneesAvant = ANS_EXPERIENCE[p.experience || 'debutant'] || 0;
  p.majoration = 1; p.heuresSup = 0;
}

/** Ancienneté dans le métier actuel (années, expérience d'avant comprise). */
export function anneesMetier(partie, t = tJeu()) {
  const c = carriereDe(partie);
  return c.anneesAvant + Math.max(0, t - c.debutPoste) / C.ANS;
}

/** Un mois de carrière (appelé à chaque échéance de la vie). */
export function moisCarriere(partie, e, rnd = Math.random) {
  const c = carriereDe(partie), p = partie.profil;
  const evts = [];
  let ajustement = 0;
  if (posteDe(p) !== c.poste) nouveauPoste(c, p, e);
  // Fin des droits au chômage
  if (p.are && e >= p.are.fin) { delete p.are; evts.push('Fin de tes droits au chômage.'); }
  // Formation terminée
  const f = c.formation;
  if (f && e >= f.fin) {
    const def = C.formation(f.id);
    for (const d of def.donne) if (!p.diplomes.includes(d)) p.diplomes.push(d);
    evts.push(`Formation terminée : ${def.nom}. Diplôme obtenu !`);
    delete p.remuneration;
    if ((f.mode === 'plein' || f.mode === 'alternance') && f.metierVise && C.possede(p.diplomes, C.exigence(f.metierVise))) {
      Object.assign(p, { situation: 'salarie', metier: f.metierVise, experience: 'debutant' });
      evts.push(`Tu es embauché comme ${f.metierVise.toLowerCase()} (débutant).`);
    } else if (f.mode === 'plein') { p.situation = 'sans'; evts.push('Tu cherches maintenant un emploi.'); }
    c.formation = null;
    nouveauPoste(c, p, e);
  }
  // Apprentissage classique (sans formation suivie dans le jeu) : diplôme et embauche au bout de 2 ans
  if (p.situation === 'alternant') {
    const moisEcoules = (e - c.debutPoste) / MOIS;
    p.anneeApprentissage = Math.min(3, 1 + Math.floor(moisEcoules / 12));
    if (!c.formation && moisEcoules >= 24 && p.metier) {
      const ex = [].concat(C.exigence(p.metier))[0];
      if (ex && ex !== 'aucun' && !p.diplomes.includes(ex)) p.diplomes.push(ex);
      Object.assign(p, { situation: 'salarie', experience: 'debutant' });
      nouveauPoste(c, p, e);
      c.anneesAvant = 2;
      evts.push(`Alternance terminée, diplôme en poche : ton entreprise t'embauche comme ${p.metier.toLowerCase()}.`);
    }
  }
  // Droits CPF : 500 € par an travaillé (plafond 5 000 €)
  if (p.situation === 'salarie' || p.situation === 'alternant') {
    c.cpf = Math.min(C.CPF.plafond, (c.cpf || 0) + C.CPF.parAn / 12);
    c.conges = Math.min(50, (c.conges ?? 10) + B.CONGES_PAR_MOIS); // 25 jours de congés payés par an
  }
  if (p.situation === 'salarie') {
    // Expérience qui progresse
    const ans = anneesMetier(partie, e);
    if (p.experience === 'debutant' && ans >= C.PASSAGE_CONFIRME) { p.experience = 'confirme'; evts.push('Avec l\'expérience, tu passes au niveau confirmé : ton salaire augmente.'); }
    else if (p.experience === 'confirme' && ans >= C.PASSAGE_EXPERIMENTE) { p.experience = 'experimente'; evts.push('Tu es maintenant expérimenté dans ton métier : ton salaire augmente.'); }
    // Entretien annuel
    if (e >= c.prochaineRevue) {
      const r = C.entretienAnnuel(p, rnd);
      if (partie.jauges && partie.jauges.moral < 30) r.pct = Math.round(r.pct * 5) / 10; // moral en berne : entretien décevant
      p.majoration = (p.majoration || 1) * (1 + r.pct / 100);
      c.prochaineRevue += C.ANS;
      evts.push(r.promotion ? `Entretien annuel : promotion ! +${String(r.pct).replace('.', ',')} % de salaire.` : `Entretien annuel : augmentation de ${String(r.pct).replace('.', ',')} %.`);
    }
    // Événements du métier
    const mois = new Date(e).getMonth() + 1;
    for (const x of C.evenementsDuMois(p, c, mois, rnd)) {
      if (x.prime) { ajustement += x.prime; evts.push(`${x.texte} : ${x.prime > 0 ? '+' : ''}${x.prime.toLocaleString('fr-FR')} €`); }
      else if (x.perte) { ajustement -= x.perte; evts.push(`${x.texte} (−${x.perte.toLocaleString('fr-FR')} € sur ton salaire)`); }
      else if (x.augmentation) { p.majoration = (p.majoration || 1) * (1 + x.augmentation / 100); evts.push(`${x.texte} : +${String(x.augmentation).replace('.', ',')} %`); }
      else if (x.licenciement) {
        const sal = salaireNet(p), ans2 = (e - c.debutPoste) / C.ANS;
        const ind = Math.round(C.indemniteLicenciement(sal, ans2));
        ajustement += ind;
        p.are = { montant: C.allocationChomage(sal), fin: e + C.ARE.dureeMois * MOIS };
        p.situation = 'sans';
        nouveauPoste(c, p, e);
        evts.push(`${x.texte}. Indemnité de licenciement : ${ind.toLocaleString('fr-FR')} €. Tu touches le chômage pendant ${C.ARE.dureeMois} mois.`);
      } else evts.push(x.texte);
    }
  }
  return { evts, ajustement };
}

/** Commence une formation : temps plein, cours du soir ou alternance. */
export function commencerFormation(partie, id, mode, metierVise) {
  const c = carriereDe(partie), p = partie.profil;
  const f = C.formation(id);
  if (!f) return { erreur: 'Formation inconnue.' };
  if (c.formation) return { erreur: 'Tu suis déjà une formation.' };
  if (!C.possede(p.diplomes, f.requis)) return { erreur: `Il faut d'abord : ${C.nomDiplome(f.requis)}.` };
  if (mode === 'soir' && !f.soir) return { erreur: 'Pas possible en cours du soir.' };
  if (mode === 'alternance' && !f.alternance) return { erreur: 'Pas possible en alternance.' };
  if (mode === 'alternance' && !metierVise) return { erreur: "Choisis le métier de l'alternance." };
  const reste = mode === 'alternance' ? 0 : Math.max(0, f.cout - (f.cpf ? c.cpf : 0));
  const cpfUtilise = mode === 'alternance' ? 0 : f.cout - reste;
  if (reste > partie.banque.solde) return { erreur: `Il te faut ${reste.toLocaleString('fr-FR')} € sur ton compte.` };
  partie.banque.solde -= reste;
  c.cpf -= cpfUtilise;
  const duree = f.mois * MOIS * (mode === 'soir' ? 1.5 : 1) / reglesDe(partie).temps;
  c.formation = { id, mode, debut: tJeu(), fin: tJeu() + duree, metierVise: metierVise || null };
  if (mode === 'plein') { p.situation = 'etudiant'; if (f.paye != null) p.remuneration = f.paye; else delete p.remuneration; }
  if (mode === 'alternance') Object.assign(p, { situation: 'alternant', metier: metierVise, anneeApprentissage: 1 });
  nouveauPoste(c, p, tJeu());
  journal(partie, 'carriere', `Début de formation : ${f.nom} (${mode === 'plein' ? 'temps plein' : mode === 'soir' ? 'cours du soir' : 'alternance'}), ${reste ? reste.toLocaleString('fr-FR') + ' € payés' : 'sans frais'}${cpfUtilise ? ', ' + Math.round(cpfUtilise).toLocaleString('fr-FR') + ' € de CPF' : ''}.`);
  return { ok: true };
}

export function abandonnerFormation(partie) {
  const c = carriereDe(partie), p = partie.profil;
  if (!c.formation) return;
  const f = C.formation(c.formation.id);
  if (c.formation.mode !== 'soir') { p.situation = 'sans'; delete p.remuneration; nouveauPoste(c, p, tJeu()); }
  c.formation = null;
  journal(partie, 'carriere', `Formation abandonnée : ${f.nom}.`);
}

/** Demander une augmentation : une fois par an. */
export function demanderAugmentation(partie, rnd = Math.random) {
  const c = carriereDe(partie), p = partie.profil;
  if (p.situation !== 'salarie') return { erreur: 'Il faut être salarié.' };
  if (tJeu() - (c.derniereDemande || 0) < C.ANS) return { erreur: 'Tu as déjà demandé il y a moins d\'un an.' };
  c.derniereDemande = tJeu();
  const r = C.demandeAugmentation(rnd, B.bonusAugmentation(partie.jauges));
  if (r.ok) { p.majoration = (p.majoration || 1) * (1 + r.pct / 100); journal(partie, 'carriere', `Augmentation obtenue : +${String(r.pct).replace('.', ',')} %.`); }
  else journal(partie, 'carriere', 'Demande d\'augmentation refusée : « pas cette année ».');
  return r;
}

export function changerHeuresSup(partie, h) {
  if (partie.profil.situation !== 'salarie') return { erreur: 'Il faut être salarié.' };
  partie.profil.heuresSup = h;
  journal(partie, 'carriere', h ? `Tu fais maintenant ${h} h supplémentaires par semaine.` : 'Plus d\'heures supplémentaires.');
  return { ok: true };
}


// ---------- Jauges de vie et activités ----------
export function jaugesDe(partie) { return partie.jauges || (partie.jauges = B.nouvellesJauges(tJeu())); }

/**
 * Fait avancer les jauges jour par jour jusqu'à maintenant. infos : { patrimoine (€ actuel) }.
 * Renvoie les textes d'événements.
 */
export function avancerJauges(partie, maintenant = tJeu(), infos = {}) {
  const j = jaugesDe(partie), p = partie.profil, c = carriereDe(partie);
  const evts = [];
  let n = 0;
  while (maintenant - j.maj >= B.JOUR && n++ < 400) {
    const t = j.maj + B.JOUR;
    const jourSemaine = new Date(t).getDay();
    const dernierJour = maintenant - t < B.JOUR;
    const trades = dernierJour ? partie.historique.filter(h => h.t > t - B.JOUR && h.t <= t && ['achat', 'vente', 'derive', 'ordre'].includes(h.type)).length : 0;
    let variation = 0;
    if (dernierJour && infos.patrimoine != null) {
      if (j.patrimoineVeille > 0) variation = (infos.patrimoine - j.patrimoineVeille) / j.patrimoineVeille;
      j.patrimoineVeille = infos.patrimoine;
    }
    const enArret = c.arretJusqua && t < c.arretJusqua;
    const r = B.unJour(j, {
      t, travaille: p.situation === 'salarie' || p.situation === 'alternant', secteur: C.secteurDe(p.metier), heuresSup: p.heuresSup || 0,
      etudiant: p.situation === 'etudiant', chomage: p.situation === 'sans', decouvert: partie.banque.solde < 0, modeVie: p.modeVie,
      trades, variation, sport: !!p.abonnementSport, weekend: jourSemaine === 0 || jourSemaine === 6, enArret
    });
    j.maj = t;
    for (const x of r.evts) { evts.push(x); partie.historique.unshift({ t, type: 'vie', texte: x }); }
    if (r.arret) {
      c.arretJusqua = t + r.arret * B.JOUR;
      if (p.situation === 'salarie') {
        const perte = Math.round(salaireNet(p) * indice(partie, t) * Math.min(r.arret, 90) / 30.44 * 0.35);
        partie.banque.solde -= perte;
        const x = `Arrêt de travail : −${perte.toLocaleString('fr-FR')} € sur ton salaire (indemnités journalières).`;
        evts.push(x); partie.historique.unshift({ t, type: 'vie', texte: x });
      }
    }
  }
  if (n > 400) j.maj = maintenant;
  return evts;
}

export function faireActivite(partie, id) {
  const j = jaugesDe(partie), p = partie.profil, c = carriereDe(partie);
  const a = B.ACTIVITES.find(x => x.id === id);
  if (!a) return { erreur: 'Activité inconnue.' };
  const salarie = p.situation === 'salarie' || p.situation === 'alternant';
  const k = indice(partie);
  const cout = Math.round(a.cout * k * 100) / 100;
  const r = B.faireActivite(j, { ...a, cout }, tJeu(), { solde: partie.banque.solde, abonnementSport: !!p.abonnementSport, conges: salarie ? c.conges ?? 10 : Infinity });
  if (r.erreur) return r;
  partie.banque.solde -= cout;
  if (salarie && a.conges) c.conges -= a.conges;
  journal(partie, 'vie', `${a.nom}${cout ? ' (' + cout.toLocaleString('fr-FR') + ' €)' : ''}${r.moitie ? ' : effet réduit, déjà fait récemment' : ''}.`);
  return r;
}

export function abonnementSport(partie, oui) {
  partie.profil.abonnementSport = !!oui;
  journal(partie, 'vie', oui ? 'Abonnement à la salle de sport (35 € par mois).' : 'Abonnement à la salle de sport résilié.');
}

// ---------- Logement et voiture ----------
const ANS = C.ANS;
/** Prix d'achat du logement d'un type dans ta ville, à la date du jeu. */
export function prixLogement(partie, type, t = tJeu()) {
  const loyerMois = loyerMarche({ ...partie.profil, logement: type });
  return Math.round(loyerMois * 12 * I.ANNEES_DE_LOYER * indice(partie, t));
}
/** Valeur actuelle du logement possédé : suit les prix, +1 % par an au-dessus de l'inflation. */
export function valeurLogement(partie, t = tJeu()) {
  const pr = partie.profil.proprietaire;
  if (!pr) return 0;
  return pr.prix * indice(partie, t) / indice(partie, pr.achatLe) * 1.01 ** ((t - pr.achatLe) / ANS);
}
export function resteCreditImmo(partie, t = tJeu()) {
  const pr = partie.profil.proprietaire;
  if (!pr || !pr.emprunt) return 0;
  return I.capitalRestant(pr.emprunt, pr.taux, pr.mois, Math.floor((t - pr.achatLe) / MOIS));
}
export function valeurVoitureActuelle(partie, t = tJeu()) {
  const v = partie.profil.voiture;
  return v ? I.valeurVoiture(v, (t - v.achatLe) / ANS) : 0;
}
function resteCreditAuto(partie, t = tJeu()) {
  const cr = partie.profil.voiture && partie.profil.voiture.credit;
  return cr ? I.capitalRestant(cr.capital, I.CREDIT_AUTO.taux, I.CREDIT_AUTO.mois, Math.floor((t - cr.debut) / MOIS)) : 0;
}
/** Patrimoine en biens : logement et voiture, crédits déduits. */
export function valeurBiens(partie, t = tJeu()) {
  return valeurLogement(partie, t) - resteCreditImmo(partie, t) + valeurVoitureActuelle(partie, t) - resteCreditAuto(partie, t);
}

export function simulationAchat(partie, type, apport) {
  const k = indice(partie);
  return I.simulerAchat({ prix: prixLogement(partie, type), apport, revenusMensuels: salaireNet(partie.profil) * k });
}
export function acheterLogement(partie, type, apport) {
  const p = partie.profil;
  if (p.proprietaire) return { erreur: 'Tu es déjà propriétaire.' };
  if (type === 'parents') return { erreur: 'Choisis un appartement ou une maison.' };
  if (apport > partie.banque.solde) return { erreur: "Tu n'as pas cet apport sur ton compte." };
  const s = simulationAchat(partie, type, apport);
  if (s.refus) return { erreur: s.refus };
  const t = tJeu(), loyerMois = loyerMarche({ ...p, logement: type }) * indice(partie);
  partie.banque.solde -= apport;
  p.logement = type;
  p.proprietaire = { prix: s.prix, achatLe: t, emprunt: s.emprunt, taux: s.taux, mois: s.mois, mensualite: s.mensualite, fin: t + s.mois * MOIS,
    taxeMois: loyerMois / 12, chargesMois: type === 'appart' ? loyerMois * 0.1 : 0 };
  journal(partie, 'vie', `Achat ${type === 'maison' ? "d'une maison" : "d'un appartement"} à ${p.ville || 'ta ville'} : ${s.prix.toLocaleString('fr-FR')} € (frais de notaire ${Math.round(s.frais).toLocaleString('fr-FR')} €), prêt de ${Math.round(s.emprunt).toLocaleString('fr-FR')} € sur 20 ans, ${Math.round(s.mensualite).toLocaleString('fr-FR')} € par mois.`);
  return { ok: true };
}
export function vendreLogement(partie) {
  const p = partie.profil;
  if (!p.proprietaire) return { erreur: "Tu n'es pas propriétaire." };
  const brut = valeurLogement(partie), reste = resteCreditImmo(partie);
  const net = Math.round(brut * (1 - I.FRAIS_AGENCE_VENTE) - reste);
  partie.banque.solde += net;
  delete p.proprietaire;
  journal(partie, 'vie', `Logement vendu ${Math.round(brut).toLocaleString('fr-FR')} € (agence 5 %, prêt remboursé) : ${net.toLocaleString('fr-FR')} € pour toi. Tu redeviens locataire.`);
  return { ok: true, net };
}
export function demenager(partie, ville, logement) {
  const p = partie.profil;
  if (p.proprietaire) return { erreur: "Vends d'abord ton logement." };
  const k = indice(partie);
  const cout = Math.round(((I.DEMENAGEMENT[logement] || 600) + loyerMarche({ ...p, ville, logement })) * k);
  if (cout > partie.banque.solde) return { erreur: `Il te faut ${cout.toLocaleString('fr-FR')} € (déménagement et frais d'agence).` };
  partie.banque.solde -= cout;
  p.ville = ville || p.ville; p.logement = logement;
  if (partie.minage) partie.minage.lieu = null; // la météo suivra la nouvelle ville
  journal(partie, 'vie', `Déménagement : ${logement === 'parents' ? 'retour chez tes parents' : logement === 'maison' ? 'maison' : 'appartement'} à ${p.ville} (${cout.toLocaleString('fr-FR')} € de frais).`);
  return { ok: true };
}
export function acheterVoiture(partie, id, credit) {
  const p = partie.profil;
  if (p.voiture) return { erreur: 'Tu as déjà une voiture.' };
  const v = I.VOITURES.find(x => x.id === id);
  const prix = Math.round(v.prix * indice(partie));
  const t = tJeu();
  if (credit) {
    const capital = Math.round(prix * 0.9), apport = prix - capital;
    if (apport > partie.banque.solde) return { erreur: `Il faut ${apport.toLocaleString('fr-FR')} € d'apport.` };
    partie.banque.solde -= apport;
    const m = I.mensualite(capital, I.CREDIT_AUTO.taux, I.CREDIT_AUTO.mois);
    p.voiture = { type: id, prix, achatLe: t, credit: { capital, mensualite: m, debut: t, fin: t + I.CREDIT_AUTO.mois * MOIS } };
    journal(partie, 'vie', `Achat d'une voiture (${v.nom.toLowerCase()}) à crédit : ${prix.toLocaleString('fr-FR')} €, ${Math.round(m)} € par mois pendant 4 ans.`);
  } else {
    if (prix > partie.banque.solde) return { erreur: `Il faut ${prix.toLocaleString('fr-FR')} €.` };
    partie.banque.solde -= prix;
    p.voiture = { type: id, prix, achatLe: t };
    journal(partie, 'vie', `Achat d'une voiture (${v.nom.toLowerCase()}) : ${prix.toLocaleString('fr-FR')} €.`);
  }
  p.transport = 'voiture';
  return { ok: true };
}
export function vendreVoiture(partie) {
  const p = partie.profil;
  if (!p.voiture) return { erreur: "Tu n'as pas de voiture." };
  const net = Math.round(valeurVoitureActuelle(partie) - resteCreditAuto(partie));
  partie.banque.solde += net;
  delete p.voiture;
  if (p.transport === 'voiture') p.transport = 'commun';
  journal(partie, 'vie', `Voiture vendue : ${net.toLocaleString('fr-FR')} € (crédit remboursé). Tu passes aux transports en commun.`);
  return { ok: true };
}
