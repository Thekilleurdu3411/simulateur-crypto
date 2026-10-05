# Simulateur crypto — V0.4

Jeu mobile de trading (et bientôt de minage) crypto branché sur le vrai marché, en temps réel.
Application web installable (PWA) : elle s'ouvre dans le navigateur du téléphone et s'ajoute à l'écran d'accueil comme une vraie appli.

## Contenu actuel

- Écran de lancement : continuer la partie ou en commencer une nouvelle (une seule sauvegarde).
- Création du profil : prénom, nom, âge, ville, situation (sans emploi, étudiant, alternant, salarié), métier, logement, mode de vie.
- Nouvelle partie : capital de départ libre et quatre difficultés (Découverte, Investisseur, Expert, Réalité).
- Finances : compte bancaire, ouverture d'un compte plateforme avec vérification d'identité (délai réel divisé par la vitesse du temps), virements SEPA instantanés.
- Marché : 11 à 12 cryptos en euros avec prix et variation 24 h en direct, graphique en chandeliers (15 min à 1 semaine).
- Ordres au marché : exécutés sur le vrai carnet d'ordres en Expert et Réalité (glissement réel), au meilleur prix en Investisseur, au prix moyen en Découverte. Frais réels (0,1 %), pas de quantité et montant minimum réels de chaque paire.
- Suivi : patrimoine total, position par crypto, prix de revient moyen, plus-value latente, journal.
- Sauvegarde locale sur le téléphone, export de la sauvegarde.
- Ordres en attente (V0.2) : limite, stop-limit et OCO, avec fonds bloqués et annulation. Un ordre limite ne s'exécute que si le prix réel traverse son prix.
- Minage Bitcoin (V0.3) : vraies machines (S19 d'occasion à S21 XP), vrais pools (Braiins, AntPool, Luxor, F2Pool, ViaBTC), gains calculés avec la vraie difficulté du réseau (mempool.space), versements à minuit UTC, électricité au Tarif Bleu EDF (Base ou Tempo avec le vrai calendrier), facture mensuelle, limite du compteur.
- Gestion du parc (V0.4) : température de la pièce selon la météo réelle de ta ville, bridage en surchauffe, extracteur d'air, bruit et plaintes des voisins, pannes et réparations (garantie), dépoussiérage, modes éco / normal / performance, revente d'occasion.
- Rattrapage hors ligne (V0.2) : à la réouverture, l'appli rejoue les vraies bougies de la période d'absence et exécute les ordres qui auraient dû l'être. Résumé « Pendant ton absence ».

## Données réelles utilisées

Points d'accès publics de Binance réservés aux données de marché, sans compte ni clé :

- Flux en direct : `wss://data-stream.binance.vision` (mini-tickers).
- Requêtes ponctuelles : `https://data-api.binance.vision` (prix 24 h, bougies, carnet d'ordres, règles de chaque paire, taux EUR/USDT).
- Réseau Bitcoin : `https://mempool.space/api` (difficulté, hauteur, frais).
- Calendrier Tempo : `https://www.api-couleur-tempo.fr`.
- Météo : `https://api.open-meteo.com`.

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
| `js/engine.js` | Exécution des ordres au marché (fonctions pures, testées) |
| `js/orders.js` | Règles des ordres limite, stop-limit et OCO (testées) |
| `js/portefeuille.js` | Mouvements du compte : réservations, exécutions, annulations |
| `js/suivi.js` | Suivi des ordres en direct et rattrapage hors ligne |
| `js/minage.js` | Catalogue, pools, tarifs, calcul du minage, chaleur, pannes (testé) |
| `js/jeuminage.js` | Règles du minage dans la partie : achats, réparations, factures |
| `js/donnees.js` | Réseau Bitcoin, taux euro-dollar, calendrier Tempo, météo |
| `js/views-minage.js` | Écrans du minage |
| `js/state.js` | Sauvegarde locale et règles de la partie |
| `js/views.js` | Écrans |
| `js/chart.js` | Graphique en chandeliers |
| `js/main.js` | Actions du joueur et mises à jour en direct |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation sur téléphone |

## Prochaines versions

1. V0.5 Rigs GPU et autres cryptos minables.
2. V0.6 Installations : hébergeurs, local pro, triphasé.
3. V0.7 Dérivés avec levier.
4. V0.8 Fiscalité.
5. V0.9 Vie quotidienne, métiers complets et date de départ libre.
6. V1.0 Notifications et synchro entre appareils.

## Décisions

Les choix faits pendant le développement sont listés dans `DECISIONS.md`.
