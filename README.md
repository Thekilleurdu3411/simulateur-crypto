# Simulateur crypto — V0.11

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
- Autres cryptos (V0.5) : rigs de cartes graphiques à monter soi-même (RTX 3060 Ti à RTX 4090, RX 7900 XTX) sur Ravencoin, Ethereum Classic ou Ergo, Antminer L9 en minage fusionné Litecoin + Dogecoin, échange des cryptos minées contre du BTC.
- Installations (V0.6) : puissance du compteur (6, 9, 12 kVA, abonnement réel, prestation Enedis), hébergeurs réels (SAZ Mining, Compass, EZ Blockchain, Terra Hosting) avec envoi, engagement et facture mensuelle, machines à eau chez l'hébergeur.
- Perpétuels avec levier (V0.7) : BTC, ETH et SOL, marge en USDT, levier selon la difficulté, prix de liquidation, financement toutes les 8 h au taux réel, liquidation possible pendant l'absence (sauf en Investisseur).
- Fiscalité (V0.8) : méthode française du portefeuille global, seuil de 305 €, flat tax de 31,4 %, minage en micro-BNC, déclaration au printemps et paiement en septembre ; prélevée, automatique ou à remplir soi-même selon la difficulté.
- Vie quotidienne (V0.9) : salaire selon le métier et l'expérience, grille des apprentis, job étudiant, loyer selon la ville et le logement, courses, forfaits et loisirs selon le mode de vie, découvert avec agios, changement de situation avec un mois de délai.
- Réglages avancés (V0.10) : douze réglages libres avant de lancer la partie (vitesse du temps, minage, électricité, frais, pannes, levier, impôts…) ; au moindre changement, la partie devient « Personnalisée » avec son propre classement.
- Date de départ libre (V0.11) : la partie peut commencer n'importe quel jour depuis le 5 janvier 2020 ; le marché rejoue les vraies bougies minute par minute, avec le réseau Bitcoin, la météo, l'euro-dollar et les jours Tempo de l'époque, et seules les machines déjà sorties.
- Rattrapage hors ligne (V0.2) : à la réouverture, l'appli rejoue les vraies bougies de la période d'absence et exécute les ordres qui auraient dû l'être. Résumé « Pendant ton absence ».

## Données réelles utilisées

Points d'accès publics de Binance réservés aux données de marché, sans compte ni clé :

- Flux en direct : `wss://data-stream.binance.vision` (mini-tickers).
- Requêtes ponctuelles : `https://data-api.binance.vision` (prix 24 h, bougies, carnet d'ordres, règles de chaque paire, taux EUR/USDT).
- Réseau Bitcoin : `https://mempool.space/api` (difficulté, hauteur, frais).
- Calendrier Tempo : `https://www.api-couleur-tempo.fr`.
- Météo : `https://api.open-meteo.com`.
- Autres cryptos minables : WhatToMine, recopié dans `data/altcoins.json`.
- Perpétuels : `https://fapi.binance.com` et `wss://fstream.binance.com`.

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
| `js/altcoins.js` | Cartes graphiques, rigs, autres cryptos minables (testé) |
| `js/views-minage.js` | Écrans du minage |
| `js/futures.js`, `js/jeufutures.js`, `js/marchefutures.js`, `js/views-futures.js` | Perpétuels : calculs (testés), règles, données, écran |
| `data/altcoins.json`, `scripts/maj-altcoins.mjs` | Données réseau des autres cryptos, mises à jour chaque heure par GitHub Actions |
| `js/fiscalite.js`, `js/jeufisc.js`, `js/views-fisc.js` | Fiscalité : calculs (testés), déclarations, écran |
| `js/state.js` | Sauvegarde locale et règles de la partie |
| `js/vie.js`, `js/jeuvie.js`, `js/views-vie.js` | Vie quotidienne : salaires, loyers, dépenses (testés), écran |
| `js/views-reglages.js` | Écran des réglages avancés |
| `js/horloge.js` | Horloge du jeu (direct ou date passée) |
| `js/views.js` | Écrans |
| `js/chart.js` | Graphique en chandeliers |
| `js/main.js` | Actions du joueur et mises à jour en direct |
| `sw.js`, `manifest.webmanifest`, `icons/` | Installation sur téléphone |

## Prochaines versions

1. Mode rejeu accéléré, perpétuels et autres cryptos en rejeu, métiers complets.
2. V1.0 Notifications et synchro entre appareils.

## Décisions

Les choix faits pendant le développement sont listés dans `DECISIONS.md`.
