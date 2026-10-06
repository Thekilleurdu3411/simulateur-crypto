// Horloge du jeu.
// - Direct (Réalité, aujourd'hui) : l'heure réelle.
// - Rejeu en Réalité : l'heure réelle décalée jusqu'à la date de départ choisie, au même rythme.
// - Temps accéléré (toutes les autres difficultés) : le joueur règle la vitesse (pause à ×10 080) ;
//   le temps s'arrête quand l'appli est quittée et reprend au retour.
export const VITESSES = [
  [0, 'Pause'], [1, '×1'], [10, '×10'], [60, '1 min = 1 h'], [360, '1 min = 6 h'],
  [1440, '1 min = 1 jour'], [10080, '1 min = 1 sem.']
];

let mode = 'direct';          // 'direct' | 'rejeu' | 'accelere'
let decalage = 0;             // rejeu : heure réelle − heure du jeu
let ancre = { t: 0, reel: 0 }; // accéléré : heure du jeu à l'instant réel « reel »
let vitesse = 1, pause = false, cache = false, vitesseMax = Infinity;
const ecouteurs = new Set();

export function maintenant() {
  if (mode === 'accelere') return pause || cache ? ancre.t : ancre.t + (Date.now() - ancre.reel) * vitesse;
  return Date.now() - decalage;
}

/** Règle l'horloge pour une partie (ou l'heure réelle si aucune partie). */
export function reglerHorloge(partie, max) {
  const h = partie && partie.horloge;
  if (h) {
    mode = 'accelere';
    ancre = { t: h.t, reel: Date.now() };
    vitesseMax = max || Infinity;
    vitesse = Math.min(h.vitesse || 1, vitesseMax);
    pause = !!h.pause;
    cache = typeof document !== 'undefined' && document.visibilityState === 'hidden';
    decalage = 0;
  } else {
    const d = partie && partie.depart;
    decalage = d && d.type === 'passe' && d.reelLe ? Math.max(0, d.reelLe - d.date) : 0;
    mode = decalage > 0 ? 'rejeu' : 'direct';
  }
  notifier();
}

function reancrer() { ancre = { t: maintenant(), reel: Date.now() }; }
function notifier() { for (const f of ecouteurs) f(); }
export function ecouterHorloge(f) { ecouteurs.add(f); }

/** Temps accéléré : vitesse 0 = pause. */
export function changerVitesse(v) {
  if (mode !== 'accelere') return;
  reancrer();
  if (v === 0) pause = true;
  else { pause = false; vitesse = Math.min(v, vitesseMax); }
  notifier();
}
/** L'appli est quittée (cachée) ou revient : le temps accéléré s'arrête pendant l'absence. */
export function visibilite(visible) {
  if (mode !== 'accelere') return;
  if (!visible && !cache) { ancre = { t: maintenant(), reel: Date.now() }; cache = true; }
  else if (visible && cache) { ancre = { t: ancre.t, reel: Date.now() }; cache = false; }
}
/** État à enregistrer dans la sauvegarde. */
export function etatHorloge() { return { t: maintenant(), vitesse, pause }; }

export function accelere() { return mode === 'accelere'; }
/** Le jeu ne suit pas le marché en direct (rejeu ou temps accéléré). */
export function enRejeu() { return mode !== 'direct'; }
export function vitesseActuelle() { return mode === 'accelere' ? (pause ? 0 : vitesse) : 1; }
export function vitesseMaximale() { return vitesseMax; }
export function decalageMs() { return decalage; }
