# Simulateur crypto — V0.1

Jeu mobile de trading (et bientôt de minage) crypto branché sur le vrai marché, en temps réel.
Application web installable (PWA) : elle s'ouvre dans le navigateur du téléphone et s'ajoute à l'écran d'accueil comme une vraie appli.

## Contenu de la V0.1

- Écran de lancement : continuer la partie ou en commencer une nouvelle (une seule sauvegarde).
- Création du profil : prénom, nom, âge, ville, situation (sans emploi, étudiant, alternant, salarié), métier, logement, mode de vie.
- Nouvelle partie : capital de départ libre et quatre difficultés (Découverte, Investisseur, Expert, Réalité).
- Finances : compte bancaire, ouverture d'un compte plateforme avec vérification d'identité (délai réel divisé par la vitesse du temps), virements SEPA instantanés.
- Marché : 11 à 12 cryptos en euros avec prix et variation 24 h en direct, graphique en chandeliers (15 min à 1 semaine).
- Ordres au marché : exécutés sur le vrai carnet d'ordres en Expert et Réalité (glissement réel), au meilleur prix en Investisseur, au prix moyen en Découverte. Frais réels (0,1 %), pas de quantité et montant minimum réels de chaque paire.
- Suivi : patrimoine total, position par crypto, prix de revient moyen, plus-value latente, journal.
- Sauvegarde locale sur le téléphone, export de la sauvegarde.

## Données réelles utilisées

Points d'accès publics de Binance réservés aux données de marché, sans compte ni clé :

- Flux en direct : `wss://data-stream.binance.vision` (mini-tickers).
- Requêtes ponctuelles : `https://data-api.binance.vision` (prix 24 h, bougies, carnet d'ordres, règles de chaque paire).

Une paire absente du marché réel est masquée automatiquement.

## Lancer en local

Aucun outil de compilation : ce sont des fichiers statiques.

```bash
python3 -m http.server 8000
# puis ouvrir http://localhost:8000
```

Tests du moteur d'ordres :

```bash
npm test
```

## Mettre en ligne (pour jouer sur téléphone)

N'importe quel hébergement de fichiers statiques en HTTPS convient :

- **GitHub Pages** : pousser le dossier dans un dépôt, puis Settings › Pages › Deploy from a branch › `main` / racine.
- **Netlify Drop** : glisser le dossier sur app.netlify.com/drop.

Sur le téléphone, ouvrir le lien puis « Ajouter à l'écran d'accueil ».

## Structure

| Fichier | Rôle |
| --- | --- |
| `index.html` | Page unique de l'appli |
| `css/app.css` | Style (thème sombre des maquettes) |
| `js/config.js` | Difficultés, cryptos, profils, métiers |
| `js/market.js` | Connexion au marché réel (WebSocket et REST) |
| `js/engine.js` | Exécution des ordres (fonctions pures, testées) |
| `js/state.js` | Sauvegarde locale et règles de la partie |
| `js/views.js` | Écrans |
| `js/chart.js` | Graphique en chandeliers |
| `js/main.js` | Actions du joueur et mises à jour en direct |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation sur téléphone |

## Prochaines versions

1. V0.2 Ordres limite, stop et OCO, rattrapage hors ligne.
2. V0.3 Minage Bitcoin : ASIC, pools, gains bloc par bloc, électricité.
3. V0.4 Gestion du parc : chaleur, bruit, pannes, entretien.
4. V0.5 Rigs GPU et autres cryptos minables.
5. V0.6 Installations : hébergeurs, local pro, triphasé.
6. V0.7 Dérivés avec levier.
7. V0.8 Fiscalité.
8. V0.9 Vie quotidienne, métiers complets et date de départ libre.
9. V1.0 Notifications et synchro entre appareils.
