// Horloge du jeu. En direct, c'est l'heure réelle. Pour une partie commencée à une date passée,
// le temps du jeu avance au même rythme que le temps réel, décalé jusqu'à la date de départ choisie.
let decalage = 0; // ms : heure réelle − heure du jeu

export function maintenant() { return Date.now() - decalage; }

/** Règle l'horloge pour une partie (ou l'heure réelle si aucune partie). */
export function reglerHorloge(partie) {
  const d = partie && partie.depart;
  decalage = d && d.type === 'passe' && d.reelLe ? Math.max(0, d.reelLe - d.date) : 0;
}

export function enRejeu() { return decalage > 0; }
export function decalageMs() { return decalage; }
