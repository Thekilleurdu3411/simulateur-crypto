// Logement (achat avec crédit immobilier, déménagement) et voiture. Calculs purs et testés.

// Crédit immobilier : taux moyen 2026 sur 20 ans (hors assurance) et assurance emprunteur, à vérifier.
export const CREDIT_IMMO = { taux: 0.033, assurance: 0.003, duree: 20, apportMin: 0.1, effortMax: 0.35 };
export const FRAIS_NOTAIRE = 0.075;   // logement ancien
export const FRAIS_AGENCE_VENTE = 0.05;
// Prix d'achat d'un logement : environ 20 ans de loyer (rendement locatif brut de 5 %), à vérifier par ville.
export const ANNEES_DE_LOYER = 20;
export const DEMENAGEMENT = { appart: 600, maison: 1200, parents: 200 };

export const VOITURES = [
  { id: 'occasion', nom: "Voiture d'occasion (citadine, 5 ans)", prix: 9000, decote: 0.1 },
  { id: 'neuve', nom: 'Voiture neuve (compacte)', prix: 27000, decote: 0.15, decote1: 0.2 }
];
export const CREDIT_AUTO = { taux: 0.06, mois: 48 };

/** Mensualité d'un prêt (capital, taux annuel, nombre de mois). */
export function mensualite(capital, taux, mois) {
  const r = taux / 12;
  return r === 0 ? capital / mois : capital * r / (1 - (1 + r) ** -mois);
}
/** Capital restant dû après n mensualités. */
export function capitalRestant(capital, taux, mois, n) {
  if (n >= mois) return 0;
  const r = taux / 12, m = mensualite(capital, taux, mois);
  return capital * (1 + r) ** n - m * ((1 + r) ** n - 1) / r;
}

/** Simulation d'achat : prix, frais, apport, prêt, mensualité, taux d'effort. */
export function simulerAchat({ prix, apport, revenusMensuels, taux = CREDIT_IMMO.taux, duree = CREDIT_IMMO.duree }) {
  const frais = prix * FRAIS_NOTAIRE;
  const emprunt = Math.max(0, prix + frais - apport);
  const mois = duree * 12;
  const m = mensualite(emprunt, taux, mois) + emprunt * CREDIT_IMMO.assurance / 12;
  const effort = revenusMensuels > 0 ? m / revenusMensuels : Infinity;
  let refus = null;
  if (apport < prix * CREDIT_IMMO.apportMin + frais) refus = `Apport insuffisant : il faut au moins ${Math.round(prix * CREDIT_IMMO.apportMin + frais).toLocaleString('fr-FR')} € (10 % du prix + frais de notaire).`;
  else if (emprunt > 0 && effort > CREDIT_IMMO.effortMax) refus = `La banque refuse : la mensualité ferait ${Math.round(effort * 100)} % de tes revenus (35 % au maximum).`;
  return { prix, frais, emprunt, mensualite: m, effort, refus, taux, mois };
}

/** Valeur d'une voiture après un certain nombre d'années. */
export function valeurVoiture(v, annees) {
  const d = VOITURES.find(x => x.id === v.type) || VOITURES[0];
  if (annees <= 0) return v.prix;
  const premiere = d.decote1 != null ? d.decote1 : d.decote;
  if (annees < 1) return v.prix * (1 - premiere * annees);
  return v.prix * (1 - premiere) * (1 - d.decote) ** (annees - 1);
}
