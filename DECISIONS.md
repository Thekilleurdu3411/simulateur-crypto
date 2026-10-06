# Décisions prises pendant le développement

Chaque fois que le cahier des charges laissait un choix ouvert, la décision est notée ici avec sa raison.
Tout peut être changé : il suffit de le demander.

## V0.1

| Sujet | Décision | Raison |
| --- | --- | --- |
| Hébergement | Appli web statique installable (PWA), à héberger sur GitHub Pages | Les pages publiées dans Claude ne peuvent pas se connecter à Binance (sécurité). |
| Monnaie de trading | Paires directement en euros (BTC/EUR, ETH/EUR…) | Comme un joueur français sur une vraie plateforme, sans conversion dollar. |
| Source des prix | Points d'accès publics de Binance dédiés aux données de marché | Gratuits, sans compte, en temps réel, avec carnet d'ordres et historique. |
| Vérification d'identité | 20 minutes réelles, divisées par la vitesse du temps (instantané en Découverte) | Délai réaliste d'une plateforme grand public. |
| Virements | SEPA instantané, sans frais, dans les deux sens | Le virement instantané est la norme des banques européennes. |
| Exécution au marché | Découverte : prix moyen achat/vente. Investisseur : meilleur prix. Expert et Réalité : vrai carnet avec glissement | Fidèle au tableau des difficultés. |
| Frais | 0,1 % (Expert, Réalité), 0,05 % (Investisseur), 0 (Découverte). Prélevés sur la crypto reçue à l'achat et sur les euros reçus à la vente | Barème standard d'une grande plateforme. |
| Sauvegarde | Une seule partie, stockée sur le téléphone, exportable | Le cahier prévoit une sauvegarde unique en Expert et Réalité ; plusieurs sauvegardes viendront avec les difficultés faciles. |

## V0.2

| Sujet | Décision | Raison |
| --- | --- | --- |
| Exécution d'un ordre limite | Uniquement si le prix est **traversé** (un prix seulement touché ne suffit pas) | Règle du cahier : éviter les exécutions trop faciles. |
| Déclenchement d'un stop | Dès que le prix atteint le seuil | Fonctionnement réel d'un stop. |
| Minute de création d'un ordre | Seule la clôture de cette minute compte | On ne sait pas si les prix extrêmes de la minute ont eu lieu avant ou après l'ordre. |
| OCO, les deux jambes possibles dans la même bougie | Le stop l'emporte | En cas de doute, le scénario le moins favorable (réalisme). |
| Exécution partielle | Non : un ordre en attente s'exécute en entier | Simplicité de la V0.2 ; l'exécution partielle pourra venir plus tard. |
| Frais des ordres limite | Mêmes taux que les ordres au marché | Sur la plateforme de référence, faiseur et preneur paient 0,1 % au tarif standard. |
| Fonds bloqués | Un achat bloque le montant au prix limite (la jambe la plus chère pour un OCO), une vente bloque la crypto | Comme sur une vraie plateforme. |
| Ordres trop proches du prix | Refusés s'ils s'exécuteraient immédiatement | Il faut alors un ordre au marché, comme sur une plateforme qui protège ses ordres « faiseur ». |
| Rattrapage hors ligne | Bougies d'une minute jusqu'à 3 jours d'absence, bougies d'une heure au-delà | Précision maximale sans télécharger des centaines de pages. |
| Découverte et absence | Les ordres placés par le joueur s'exécutent aussi pendant l'absence | Ce sont ses propres décisions ; la protection « aucune perte pendant l'absence » vise les pannes et les liquidations. |

## V0.3

| Sujet | Décision | Raison |
| --- | --- | --- |
| Calcul des gains | Valeur attendue FPPS : puissance ÷ (difficulté × 2³²) × (récompense + frais moyens des 144 derniers blocs) × (1 − commission) | C'est ce que verse un pool FPPS ; vérifié contre le hashprice publié par Hashrate Index le 28/09/2026 (0,000477 BTC par PH et par jour). |
| Données réseau | mempool.space : difficulté, hauteur, frais moyens, actualisés toutes les 10 minutes | Source publique, gratuite et sans compte. |
| Absence sans données réseau | Le minage n'avance pas tant que la difficulté n'est pas connue | Éviter de compter l'électricité sans les gains. Dès que les données arrivent, toute la période est rattrapée. |
| Rattrapage du minage | Difficulté actuelle appliquée à toute la période d'absence | La difficulté ne change qu'environ toutes les deux semaines ; l'écart est faible. |
| Prix des machines | Occasion : D-Central (reconditionnées, 600 à 925 dollars canadiens, convertis en dollars américains). Neuf : Viperatech (S21 Pro, 1 910 $), Million Miner (S21 XP 3 800 $, hydros) | Prix publics trouvés ; l'indice de prix ASIC de Hashrate Index est payant. |
| Conversion | Dollar → euro au cours EUR/USDT réel, TVA 20 % ajoutée | Achat par un particulier en France. |
| Livraison | Forfait 60 € (occasion, 5 jours) et 150 € (neuf, 14 jours), délais divisés par la vitesse du temps | Estimation : pas de grille publique unique. À ajuster. |
| Livraison reçue | La machine arrive arrêtée : c'est au joueur de la brancher | Éviter qu'une livraison fasse sauter le compteur pendant l'absence. |
| Compteur | 6 kVA en appartement et chez les parents, 9 kVA en maison ; 2 kVA restent au logement | Puissances courantes en France. |
| Chez les parents | Pas d'ASIC possible | Cahier des charges : « pas question d'un ASIC bruyant ». |
| Machines à eau | Visibles mais verrouillées jusqu'aux installations (V0.6) | Elles demandent un circuit d'eau, souvent du triphasé. |
| Pools | Braiins (2 %), AntPool (2,5 %), Luxor (0,7 %, seuil 0,004), F2Pool (4 %), ViaBTC (4 %, PPS+) ; versement à minuit UTC | Frais et seuils publiés (spark.money). |
| Changement de pool | Le solde en attente est conservé | Simplification ; en vrai, un petit solde peut rester bloqué chez l'ancien pool. |
| Électricité | Tarif Bleu EDF du 1er août 2026 : Base 0,2001 €/kWh (6 kVA), 0,1985 (9 kVA) ; Tempo bleu, blanc, rouge en heures pleines et creuses (22 h à 6 h) | Grille officielle de la CRE. |
| Couleurs Tempo | Vrai calendrier (api-couleur-tempo.fr) ; couleur inconnue = prix Base | Ne jamais inventer une couleur. |
| Facture | Seule la consommation des machines est facturée, chaque 1er du mois, sur le compte bancaire ; découvert possible | L'abonnement et le reste du logement arrivent avec la vie quotidienne (V0.9). |
| BTC reçus du pool | Prix de revient = valeur au moment du versement | Règle fiscale française pour les revenus de minage. |
| Machines dans le patrimoine | Pas encore comptées | Leur valeur de revente viendra avec le marché de l'occasion (V0.4). |

## V0.4

| Sujet | Décision | Raison |
| --- | --- | --- |
| Température extérieure | Météo réelle heure par heure de la ville du profil (Open-Meteo, gratuit et sans clé) | Réalisme : un ASIC ne se comporte pas pareil en août et en janvier. |
| Température de la pièce | Appartement : 20 °C minimum (ou dehors + 2 °C), + 4 °C par kW de machines (+ 1,5 °C avec extracteur). Garage : dehors + 3 °C, + 2 °C par kW (+ 0,8 °C avec extracteur) | Modèle simplifié à calibrer en jouant ; l'ordre de grandeur est celui d'une pièce fermée. |
| Seuils de chaleur | Normal jusqu'à 35 °C, bridage progressif jusqu'à −40 % à 40 °C, au-delà la machine coupe et redémarre en boucle (30 % de sa puissance, 50 % de sa consommation) | Plage de fonctionnement d'un ASIC à air (0 à 40 °C). |
| Extracteur d'air | 120 € | Prix courant d'un extracteur avec gaine. Estimation. |
| Modes | Éco : 80 % de puissance pour 70 % de consommation. Performance : 110 % pour 120 %. Usure ×0,7 et ×1,6 | Ordres de grandeur des micrologiciels de réglage. |
| Pannes | Taux annuel 6 % (neuf) et 15 % (occasion), ×1,5 au-dessus de 30 °C, ×3 au-dessus de 35 °C, + 30 % par mois sans dépoussiérage, × mode, × difficulté (0,1 / 0,5 / 1 / 1) | Ordres de grandeur ; à calibrer. |
| Types de pannes | Ventilateur 40 % (25 €, 2 j), carte de hachage 35 % (la machine continue à 2/3, 180 €, 15 j), alimentation 20 % (120 €, 3 j), carte de contrôle 5 % (80 €, 3 j) | Pannes les plus fréquentes des ASIC ; prix estimés. |
| Garantie | 1 an sur les machines neuves (réparation gratuite, 40 € d'envoi, au moins 10 jours), aucune sur l'occasion | Garantie constructeur habituelle. |
| Absence en Découverte | Aucune panne pendant l'absence | Tableau des difficultés : « aucune perte pendant ton absence ». |
| Bruit | Appartement, machine à air la nuit (22 h à 7 h) : 35 % de risque de plainte par nuit. Investisseur : simple alerte. Expert et Réalité : 3 plaintes = mise en demeure, plus de minage la nuit | Tableau des difficultés (bruit et chaleur). |
| Revente | Neuve : 70 % du prix neuf, occasion : 85 %, −15 % par an (plancher 30 %), −50 % si en panne, minimum 40 $, puis 10 % de frais de vente ; vente immédiate | Décote rapide du matériel de minage. Simplification : pas de délai d'annonce. |
| Patrimoine | Les machines comptent à leur valeur de revente (prix payé tant qu'elles sont en livraison) | Ce que tu récupérerais en vendant. |

## V0.5

| Sujet | Décision | Raison |
| --- | --- | --- |
| Cryptos minables par carte graphique | Ravencoin (KawPow), Ethereum Classic (Etchash), Ergo (Autolykos) | Les plus établies parmi les cryptos minables par carte graphique. |
| Données réseau | WhatToMine (puissance du réseau, récompense, temps de bloc, cours en BTC) ; formule vérifiée contre ses propres estimations (241,24 RVN par jour pour 3 × RTX 3070) | Source unique et cohérente pour toutes ces cryptos. |
| Accès à ces données | Fichier `data/altcoins.json` servi par le site, mis à jour chaque heure par une tâche GitHub Actions ; instantané réel du 5 octobre 2026 inclus en attendant | WhatToMine n'autorise probablement pas les appels directs depuis un navigateur. |
| Performances des cartes | WhatToMine (RTX 3060 Ti, 3070, 4070, 4090, RX 7900 XTX) | Valeurs de référence de la communauté. |
| Prix des cartes | Prix neufs en France au 15 août 2026 (dropreference.com) | Seule source datée trouvée. |
| Pièces d'un rig | Châssis 60 €, kit carte mère + processeur + mémoire + SSD 150 €, riser 10 € par carte, alimentation 1 200 W à 220 € (80 % de charge maximale, rendement 92 %), 60 W de base | Estimations courantes ; à ajuster. |
| Garantie d'un rig | 2 ans | Garantie légale de conformité en France. |
| Bruit d'un rig | Pas de plainte des voisins | Les cartes graphiques sont bien moins bruyantes qu'un ASIC. |
| Antminer L9 | 16 GH/s, 3 260 W, 6 500 $ (Kryptex) ; minage fusionné Litecoin + Dogecoin | Fonctionnement réel des ASIC Scrypt. |
| Pool des autres cryptos | 1 % de commission, versement chaque nuit à minuit UTC, sans seuil | Simplification ; ordre de grandeur des pools publics. |
| Cryptos non cotées sur la plateforme | Ravencoin, ETC, Ergo s'échangent contre du BTC (0,1 % de frais, minimum 1 €) ; le prix de revient suit | Un échange crypto contre crypto n'est pas imposable en France. |
| Minage au processeur (Monero) et Kaspa | Reportés | Données réseau prêtes, mais performances des processeurs et prix des ASIC Kaspa pas encore vérifiés. |

## V0.6

| Sujet | Décision | Raison |
| --- | --- | --- |
| Puissance du compteur | 6, 9 ou 12 kVA en monophasé ; changement à distance du Linky à 4,28 € (Enedis), immédiat | Tarif Enedis réel ; au-delà de 12 kVA, il faut du triphasé. |
| Abonnement | La différence d'abonnement avec la puissance de départ s'ajoute à la facture de minage (Base 190,32 / 238,56 / 285,12 € par an ; Tempo 189,60 / 236,40 / 282,00 €) | Grille officielle du 1er août 2026 ; l'abonnement de départ fait partie de la vie courante (V0.9). |
| Hébergeurs | SAZ Mining (Paraguay, 0,047 $/kWh, 12 mois), Compass Mining (États-Unis, 0,065 $, sans engagement), EZ Blockchain (0,075 $, 12 mois, 30 $ d'installation, accepte les machines à eau), Terra Hosting (0,075 $, 6 mois, 100 $ d'installation) | Tarifs publiés (spark.money). Valeur médiane retenue quand une fourchette est donnée. |
| Frais annexes | + 0,02 $/kWh sur tous les tarifs | La source précise que les tarifs annoncés excluent souvent 0,02 à 0,03 $/kWh de frais. |
| Envoi d'une machine | 150 € et 10 jours (divisés par la vitesse du temps), dans les deux sens | Estimation du transport international d'un ASIC. |
| Engagement | Retour impossible avant la fin de l'engagement ; vente sur place toujours possible | Simplification d'un contrat d'hébergement. |
| Chez l'hébergeur | Pas de bruit ni de chaleur (salle à 25 °C), entretien compris, réparations + 5 jours | Le service vendu par un hébergeur. |
| Rigs | Non acceptés par les hébergeurs | Les hébergeurs listés n'accueillent que des ASIC. |
| Local professionnel et triphasé | Reportés | Bail, raccordement et contrat pro demandent encore des données réelles. |

## V0.7

| Sujet | Décision | Raison |
| --- | --- | --- |
| Produits | Perpétuels BTCUSDT, ETHUSDT, SOLUSDT, marge isolée, mode à sens unique | Les contrats les plus échangés ; la marge croisée pourra venir plus tard. |
| Données | Prix de marque, taux de financement, carnet et historique publics de Binance Futures | Données réelles, en direct. |
| Monnaie de marge | USDT, obtenus en convertissant des euros au cours EUR/USDT réel (0,1 % de frais) | Les perpétuels réels sont en USDT. |
| Frais | 0,05 % preneur à l'ouverture et à la fermeture | Tarif standard (finder.com, 2026). |
| Levier maximum | Découverte : désactivé. Investisseur : ×5. Expert et Réalité : ×125 (BTC, ETH), ×75 (SOL) | Tableau des difficultés ; maximums de premier palier de la plateforme. |
| Marge de maintien | 0,4 % (BTC), 0,5 % (ETH), 0,65 % (SOL) | Valeurs de premier palier ; à vérifier, les paliers supérieurs ne sont pas encore simulés. |
| Liquidation | Dès que le prix de marque atteint le prix de liquidation ; toute la marge est perdue | Fonctionnement réel en marge isolée. |
| Financement | À 0 h, 8 h et 16 h UTC, au taux réel en cours (en direct) ou historique (rattrapage) | Échéances réelles de la plateforme. |
| Investisseur | Alerte à 80 % de marge perdue ; aucune liquidation pendant l'absence | Tableau des difficultés. |
| Expert et Réalité | Liquidation possible pendant l'absence, rejouée avec les vraies bougies de prix de marque | Réalisme. |
| Exécution | Au marché uniquement (meilleur prix), sans glissement sur le carnet | Simplification de cette première version. |
| Cadre légal | Non simulé | L'accès des particuliers européens aux dérivés crypto dépend des plateformes et de la réglementation. |

## V0.8

| Sujet | Décision | Raison |
| --- | --- | --- |
| Calcul des plus-values | Méthode du portefeuille global (article 150 VH bis, formulaire 2086) : plus-value = prix de cession − prix total d'acquisition × prix de cession ÷ valeur globale du portefeuille ; le prix d'acquisition consommé est retiré à chaque vente | Règle française ; vérifiée sur l'exemple publié (10 000 € investis, portefeuille à 50 000 €, vente de 5 000 € : 4 000 € de plus-value). |
| Valeur globale du portefeuille | Toutes les cryptos du joueur : plateforme, ordres en attente, soldes des pools, marge des perpétuels | Le fisc demande la valeur de l'ensemble des actifs numériques. |
| Ventes rejouées pendant l'absence | Valeur globale calculée aux prix du moment du rattrapage | Les prix de toutes les cryptos à l'instant passé ne sont pas tous rechargés ; approximation. |
| Frais | Déduits du prix de cession, ajoutés au prix d'acquisition | Règle de l'article 150 VH bis. |
| Taux | Flat tax de 31,4 % (12,8 % + 18,6 % de prélèvements sociaux) | Taux applicable depuis la hausse de la CSG de 2026. L'option pour le barème viendra avec les revenus (V0.9). |
| Seuil | Aucun impôt si le total des ventes de l'année ne dépasse pas 305 € | Règle française. |
| Moins-values | Compensées avec les plus-values de la même année seulement | Pas de report possible. |
| Échanges entre cryptos | Non imposables, y compris vers et depuis l'USDT ; les gains des perpétuels sont donc imposés quand l'USDT repasse en euros | Sursis d'imposition des échanges entre actifs numériques. Approximation : le régime fiscal des dérivés crypto est discuté. |
| Minage | Bénéfices non commerciaux, micro-BNC (abattement 34 %, plafond 77 700 €), prélèvements sociaux 18,6 % | Régime du minage depuis la loi de finances 2022. |
| Tranche d'imposition du minage | Supposée : 0 % (sans emploi, étudiant, alternant), 11 % (salarié) | En attendant les vrais revenus (V0.9). |
| Calendrier | Déclaration ouverte le 10 avril, limite le 4 juin (zone des départements 20 à 54), paiement le 15 septembre | Calendrier fiscal 2026 de la Dordogne. |
| Par difficulté | Découverte : aucun impôt. Investisseur : flat tax prélevée (ou rendue) à chaque vente, minage payé en septembre. Expert : déclaration remplie automatiquement. Réalité : déclaration à remplir soi-même | Tableau des difficultés. |
| Sanctions en Réalité | Rien déposé à la date limite : + 10 %. Erreur : l'impôt manquant est redressé avec 0,2 % d'intérêts par mois | Majoration de retard et intérêts de retard réels ; le manquement délibéré (40 %) n'est pas simulé. |

## V0.9

| Sujet | Décision | Raison |
| --- | --- | --- |
| Salariés | Salaire net mensuel au milieu de la fourchette 2026 du métier, selon l'expérience (débutant, confirmé, expérimenté) ; 20 métiers sourcés pour commencer | Sites de salaires (moicombien.fr, salairebrut-en-net.fr). La liste sera élargie métier par métier, avec une source pour chacun. |
| Métier inconnu | SMIC net (1 477,93 €) | Valeur plancher légale. |
| Alternants | Grille légale en % du SMIC brut selon l'âge et l'année (27 % à 100 %) ; aucune cotisation jusqu'à 50 % du SMIC, environ 22 % au-delà | Grille officielle des apprentis ; le taux de 22 % est une approximation. |
| Étudiants | Job étudiant de 10 h par semaine au SMIC, environ 420 € par mois | **Estimation à valider** : bourses et aide des parents non simulées. |
| Sans emploi | Aucun revenu | Les allocations (chômage, RSA) ne sont pas encore simulées. **À valider.** |
| Loyer | Loyer moyen d'un T2 dans la ville (Paris 1 602 €, Bordeaux 869 €, Périgueux 480 €…) ; ville absente : 12 €/m² sur 40 m² ; maison avec garage : ×1,8 ; chez les parents : 0 € | Loyers de juillet 2026 (123loger.com) ; le facteur maison est une **estimation à valider**. |
| Alimentation | 250 / 297 / 375 € par mois selon le mode de vie (économe, normal, confort) ; moitié chez les parents | Budget alimentaire d'une personne seule (Insee). |
| Autres dépenses | Loisirs 30 / 100 / 250 €, mobile et internet 40 € (15 € chez les parents), assurance habitation 15 €, abonnement électricité selon le compteur | Estimations de marché ; l'abonnement suit le tarif réglementé de la V0.3. |
| Échéance | Salaire puis dépenses tous les 30,44 jours de jeu, raccourcis par la vitesse du temps de la difficulté (7,6 jours réels en Investisseur ×4) | Cohérence avec la vitesse choisie ; rejoué pendant l'absence. |
| Découvert | Autorisé, 16 % d'agios par an | Taux courant d'un découvert non autorisé. |
| Changer de situation | Possible à tout moment depuis Finances ; effectif après un mois de jeu (préavis ou recherche) et annulable avant | Délai réaliste d'un changement d'emploi. |
| Non simulé pour l'instant | Impôt sur le revenu du salaire, transports, inflation, aides (APL, prime d'activité), allocations chômage | Prochaines étapes de la vie quotidienne (impôt, transports, RSA et prime d'activité ajoutés en V0.12). |

## V0.10

| Sujet | Décision | Raison |
| --- | --- | --- |
| Réglages avancés | 12 réglages libres avant de lancer la partie : vitesse du temps (×1 à ×20), multiplicateur de minage (×0,25 à ×10), prix de l'électricité (0 à 200 %), frais de trading (0 à 0,5 %), exécution des ordres, fréquence des pannes (×0 à ×3), voisinage, protection pendant l'absence, levier maximum (0 à ×125), liquidation pendant l'absence, mode des impôts, estimations de rentabilité | Demande : tout ce qui implique un multiplicateur est libre. Les bornes sont des choix **à valider**. |
| Partie personnalisée | Au moindre écart avec la difficulté choisie, la partie devient « Personnalisée (base X) » et a son propre classement ; revenir à la valeur de base annule l'écart | Demande. |
| Changer de difficulté de base | Les réglages déjà modifiés sont gardés s'ils diffèrent encore de la nouvelle base | Évite de perdre ses réglages en changeant de difficulté. |
| Score | Pas de coefficient de score pour une partie personnalisée : classement séparé | Un coefficient automatique serait arbitraire. **À valider.** |
| Modifiable en cours de partie | Non : les réglages sont fixés au lancement | Garde les classements comparables. |

## V0.11

| Sujet | Décision | Raison |
| --- | --- | --- |
| Date de départ libre | Le joueur choisit un jour passé ; la partie démarre ce jour-là à l'heure actuelle, puis le temps du jeu avance au rythme réel, décalé d'autant | Demande : choisir sa date de départ, le jeu charge les vraies valeurs du marché. |
| Première date jouable | 5 janvier 2020 | Premières paires en euros (BTCEUR) sur la plateforme. Avant, il faudrait convertir les paires en dollars au cours euro-dollar de l'époque : **à valider** si tu veux remonter plus loin. |
| Prix | Vraies bougies d'une minute de la date du jeu, chargées par blocs de 16 h ; prix interpolé entre l'ouverture et la clôture de la minute ; variations, haut, bas et volume sur les 24 h passées du jeu | Données réelles. L'interpolation révèle la direction de la minute en cours : avantage négligeable face aux frais. |
| Ordres en attente | Vérifiés sur chaque bougie d'une minute terminée, comme en direct | Même règle partout. |
| Carnet d'ordres | Reconstitué : écart de 0,02 % autour du prix, 100 niveaux de chaque côté, chacun du quarantième du volume de la minute (au moins 500 €) | Aucun historique public du carnet. **Estimation à valider.** |
| Réseau Bitcoin | Difficulté, hauteur de bloc et frais moyens historiques (mempool.space) ; 0,1 BTC de frais par bloc si l'historique des frais ne remonte pas assez loin | Données réelles ; repli signalé. |
| Machines | En vente seulement à partir de leur date de sortie (approximative) ; prix actuel × rapport du revenu d'un TH/s par jour en dollars entre la date du jeu et aujourd'hui, borné entre ×0,5 et ×10 | Le prix des ASIC suit la rentabilité du minage. Dates de sortie et méthode **à valider**. Les S19 restent « d'occasion » même en 2020, et aucune machine n'existe avant mai 2020 (S9 et S17 à ajouter). |
| Météo, euro-dollar, Tempo | Archives Open-Meteo (ERA5), cours EUR/USDT et couleur Tempo de la date du jeu | Données réelles. |
| Pas encore rejoués | Perpétuels, rigs de cartes graphiques, Antminer L9 (Litecoin et Dogecoin) | Pas d'historique public simple des réseaux concernés ; perpétuels à rejouer plus tard. |
| Vie et électricité en rejeu | Salaires, loyers et tarifs d'électricité de 2026 | Historiques à ajouter ; **à valider**. |
| Flat tax | 30 % pour les revenus jusqu'à 2024, 31,4 % à partir de 2025 | Hausse de la CSG sur les revenus du patrimoine. |
| Tranche d'imposition du minage | Calculée à partir du salaire (barème des revenus 2025, abattement de 10 %, apprentis et jobs étudiants exonérés jusqu'au SMIC annuel), au lieu d'une valeur supposée | Les revenus existent depuis la V0.9. |
| Mode rejeu accéléré | Pas encore : le marché rejoue au rythme réel | Le « mode bonus » accéléré viendra ensuite. **À préciser avec toi.** |

## V0.12

| Sujet | Décision | Raison |
| --- | --- | --- |
| Métiers | 132 métiers dans 15 secteurs (Transport et logistique, Hôtellerie-restauration, Agriculture, Banque-finance-assurance, Communication et arts, Droit, Sport et animation en plus) | Demande : palette très étendue. Sources ci-dessous. |
| Sources des salaires ajoutés | travail-industrie.com et salairebrut-en-net.fr (simulateurs 2026), fiche-paie.fr, grilles de la fonction publique hospitalière et territoriale, justice.gouv.fr (surveillants, janvier 2026), pass-education.fr (certifiés), conventions collectives du sport et de l'animation | Données 2026. Brut converti en net à 78 % dans le privé. |
| Limites connues | Sites agrégateurs, pas des statistiques officielles. ATSEM, militaire du rang, surveillant pénitentiaire : hors primes. Médecin généraliste : grille de praticien hospitalier. Avocat, agent immobilier, pilote de ligne : très variables (rétrocession, commissions, hors indemnités). Secrétaire et orthophoniste : fourchettes construites autour d'une valeur par niveau. Esthéticien : source sous le SMIC, ramenée à 1 480 € | **À valider** si un métier te semble faux. |
| Impôt sur le salaire | Prélevé chaque mois : barème des revenus 2025 (0 / 11 / 30 / 41 / 45 %), abattement de 10 %, une part, décote (897 € − 45,25 % de l'impôt sous 1 982 €) ; apprentis et jobs étudiants exonérés jusqu'au SMIC annuel ; supprimé si les impôts sont désactivés | Loi de finances 2026 ; seuils de la décote **à vérifier**. |
| RSA | 651,69 € par mois dès 25 ans sans salaire (décret 2026-220, 1er avril 2026), moins 12 % si logé gratuitement chez ses parents | Réalité : « sans emploi » n'est plus sans aucun revenu. |
| Prime d'activité | Forfait 638,28 € + 61 % du salaire + bonification jusqu'à 240,63 € (entre 0,5 et 1,15 SMIC, réforme d'avril 2026) − le plus grand du forfait et du salaire ; non versée sous 15 € ; apprentis et étudiants seulement au-delà de 78 % du SMIC | Barème CAF 2026 (previssima.fr, journaldeleconomie.fr). Au SMIC : environ 240 €. |
| Non simulé | APL (dépend du zonage et des loyers plafonds), allocations chômage (aucune après une démission de toute façon), bourses étudiantes | **À valider** : je peux ajouter l'APL ensuite. |
| Transports | En commun : passe Navigo 90,80 € à Paris, 50 € ailleurs (estimation), remboursé à moitié par l'employeur (ou tarif étudiant) ; voiture déjà possédée : 208 € par mois (carburant 119 €, assurance 45 €, entretien 44 €, fiches-auto.fr 2025) ; vélo 10 € ; à pied 0 € ; modifiable à tout moment | Coûts moyens réels ; achat de voiture non simulé. |

## V0.13

| Sujet | Décision | Raison |
| --- | --- | --- |
| Notifications | À activer dans Finances (réglage propre à chaque téléphone). Chaque événement du jeu (ordre exécuté, liquidation, panne, livraison, salaire, impôts…) devient une notification quand l'appli est en arrière-plan ; rien quand elle est à l'écran (le bandeau suffit) | Sans serveur. Sur iPhone, il faut d'abord ajouter l'appli à l'écran d'accueil (iOS 16.4 et plus). |
| Appli complètement fermée | Aucune notification : il faudrait un serveur d'envoi (Web Push). Les événements sont rejoués et résumés à la réouverture | **À décider avec toi** : un petit serveur gratuit (par exemple un worker Cloudflare) permettrait les vraies notifications push. |
| Synchro entre appareils | Manuelle : « Exporter » sur un téléphone, « Importer » sur l'autre (fichier de sauvegarde), avec vérification du fichier et confirmation avant de remplacer la partie | Sans compte ni serveur. **À décider** : une synchro automatique demanderait un stockage en ligne (par exemple un Gist GitHub privé avec ton accord). |
| Corrections du rejeu | Le réseau Bitcoin du jour (servant seulement à comparer les prix des machines) n'écrase plus celui de la date du jeu ; une crypto pas encore cotée à la date choisie est masquée | Trouvé en relisant la V0.11. |

## Validé par Valentin (5 octobre 2026)

| Sujet | Choix |
| --- | --- |
| Nom du jeu | Proof of Life |
| Rejeu accéléré | Vitesse au choix, de ×1 (temps réel) à ×60, classement séparé |
| Notifications appli fermée | Oui, avec un petit serveur gratuit (Cloudflare) à créer avec son compte |
| Synchro entre appareils | Export / import suffit |
| APL | À ajouter (zone, loyer plafond, revenus) |
| Étudiant | Job de 10 h par semaine + bourse CROUS selon un échelon choisi à la création |
| Rejeu avant 2020 | Oui, jusqu'à 2017 : prix en dollars convertis au cours euro-dollar de l'époque, machines S9 et S17 ajoutées |
| Vie en rejeu | SMIC, tarifs d'électricité et loyers de l'année choisie |
| Score d'une partie personnalisée | Classement à part, sans coefficient de score |

## V0.14

| Sujet | Décision | Raison |
| --- | --- | --- |
| Métiers très bien payés | 30 métiers de plus (162 au total), dont un secteur « Direction d'entreprise » : médecins spécialistes libéraux (radiothérapeute, radiologue, anesthésiste, chirurgien…), notaire et avocat associés, banquier d'affaires, trader, directeur financier, PDG de grand groupe coté, commandant de bord, contrôleur aérien, ambassadeur, préfet, footballeur de Ligue 1, joueur du Top 14… | Demande de Valentin. |
| Sources | DREES (revenus 2021 des médecins), CARMF, CARCDSF, Insee, Autorité de la concurrence (notaires), APEC 2025, Robert Walters, Michael Page et Robert Half 2026, Dogfinance, eFinancialCareers 2026, Cour des comptes 2026 (contrôleurs aériens), Sénat 2019 (ambassadeurs), DGAFP 2019 (préfets), L'Équipe et Midi Olympique (sport), Proxinvest (PDG) | Libéraux : revenus déjà nets de cotisations, CSG non déductible retirée. Privé : brut × 0,76. |
| Limites | Médecins libéraux : paliers d'expérience déduits de la moyenne. Bonus de banquier d'affaires supposé à 50 % du fixe. PDG : les paliers suivent la taille du groupe, pas l'ancienneté. Footballeur : PSG exclu. Contrôleur aérien débutant : élève de l'ENAC ramené au SMIC. Rachat de parts (notaire, pharmacien) non simulé | Ordres de grandeur réalistes, **à valider**. |
| Impôt des très hauts revenus | Barème jusqu'à 45 % ; la contribution exceptionnelle sur les hauts revenus (3 à 4 %) n'est pas encore simulée | À ajouter avec les prochaines étapes de la vie. |
| Capital de départ | Montant libre, sans limite, saisi au clavier (espaces et virgule acceptés), raccourcis de 1 000 € à 10 M€ | Demande de Valentin. |
| À venir (demande de Valentin) | Événements propres à chaque métier pendant la partie, formations pour changer de métier ou progresser | Prochaine grosse étape de la vie quotidienne. |

## Appli Android

| Sujet | Décision | Raison |
| --- | --- | --- |
| Type d'appli | Vraie appli Android (APK, Capacitor) installée hors du Play Store, pour Valentin seulement | Choix de Valentin : Android, « juste pour moi », sans frais. |
| Contenu | L'appli ouvre le jeu en ligne (GitHub Pages) : chaque nouvelle version du jeu arrive sans réinstaller l'APK | Une seule version à maintenir ; l'APK ne change que si l'appli elle-même change. |
| Construction | GitHub Actions construit l'APK à chaque changement du dossier `app-android` et le publie dans la release « appli-android » du dépôt | Aucun outil Android à installer chez toi. |
| Signature | Clé de débogage fixe enregistrée dans le dépôt, pour que les mises à jour de l'APK s'installent par-dessus sans désinstaller | Appli personnelle ; pour le Play Store, il faudrait une vraie clé privée gardée secrète. |
| Natif | Notifications Android natives, export de la sauvegarde par le partage du téléphone | Le navigateur intégré d'une appli ne gère ni les notifications web ni les téléchargements. |
| iPhone | Pas d'appli : il faudrait un compte développeur Apple (99 $ par an) et un Mac | Valentin est sur Android. |

## V0.15 — Temps accéléré et futur simulé

| Sujet | Décision | Raison |
| --- | --- | --- |
| Temps accéléré | Découverte, Investisseur et Expert : vitesse réglable en jeu (pause, ×1, ×10, 1 min = 1 h, 1 min = 6 h, 1 min = 1 jour, 1 min = 1 semaine). Maximum : 1 semaine par minute (Découverte, Investisseur), 1 jour par minute (Expert). Réalité reste en temps réel | Choix de Valentin (vitesse contrôlable en jeu). Le maximum est réglable dans les réglages avancés. |
| Appli quittée | Le temps s'arrête et reprend au retour, à la même vitesse | Choix de Valentin. |
| Départ | Date passée au choix (vrais marchés rejoués à la vitesse choisie) ou aujourd'hui | Choix de Valentin. |
| Rejeu rapide | Bougies d'une minute jusqu'à 1 min = 1 h, de 15 minutes jusqu'à 1 min = 1 jour, d'une heure au-delà ; les ordres en attente sont vérifiés sur chacune | Assez de détail sans saturer le réseau. |
| Au-delà d'aujourd'hui | Marché simulé, pas de 15 minutes, reproductible (graine propre à la partie) : phases haussières, baissières et latérales sur des mois, volatilité qui s'auto-entretient, krachs, corrélation au bitcoin (bêta) et part propre de chaque crypto | Choix de Valentin : réaliste et aléatoire. Volatilité annuelle d'environ 55 % pour le bitcoin, 70 à 110 % pour les autres. Paramètres **à valider** en jouant. |
| Tendance de fond | Neutre en moyenne (krachs et actualités compensés) ; sur 4 ans, le bitcoin peut aussi bien finir à 15 000 € qu'à 2 M€, médiane autour de ×2, avec des chutes de 50 à 90 % en route | Pas de hausse garantie : comme en vrai. |
| Actualités | Environ 12 par an : piratages, régulation, taux des banques centrales, ETF, pannes, mèmes, faillites, adoption… avec leur effet sur les prix ; halving du Bitcoin tous les 210 000 blocs, suivi plus souvent d'une phase haussière | Choix de Valentin. Visibles sur l'accueil et dans le journal, avec notification. |
| Réseau Bitcoin simulé | Puissance qui suit le cours avec retard (+25 % par an de fond), difficulté ajustée tous les 2 016 blocs, frais qui varient, récompense divisée par deux aux halvings | Choix de Valentin (minage qui évolue). |
| Nouvelles machines | Générations fictives (S25, S27, S29, S31, versions hydro) qui sortent tous les 18 mois environ dans le futur simulé, 15 à 20 % plus efficaces ; prix ajustés à la rentabilité du minage | Noms marqués « fictive ». |
| Inflation et vie | Tous les montants de la vie (salaires, SMIC, aides, loyers, dépenses) en valeurs de 2026, ramenés à la date du jeu chaque 1er janvier : inflation réelle de l'Insee dans le passé (2025 : +0,9 %, 2024 : +2,0 %…), inflation tirée au hasard ensuite (2 % en moyenne, entre −0,5 et 6 %) | Choix de Valentin (économie qui évolue) et décision « valeurs de l'époque » en rejeu. Approximation : le SMIC réel n'a pas suivi exactement l'inflation. |
| Électricité dans le temps | Vraies révisions du Tarif Bleu dans le passé (+15 % en février 2023, +10 % en août 2023, +8,6 % en février 2024, −15 % en février 2025…), révisions tirées au hasard chaque 1er février et 1er août ensuite | Valeurs de 2018 à 2022 et de 2025-2026 **à vérifier**. |
| Météo et Tempo futurs | Ceux des mêmes jours une année passée | Pas de prévisions possibles si loin. |
| Perpétuels en rejeu et en simulation | Prix de marque reconstitué à partir du prix au comptant converti en USDT, financement autour de 0,01 % toutes les 8 h, liquidation au plus haut ou au plus bas de chaque bougie | Plus de données publiques du marché à terme dans ces cas. |
| Rigs et Antminer L9 en temps accéléré | Pas encore disponibles hors direct | Pas d'historique ni de modèle pour ces réseaux pour l'instant. |
| Rejeu avant 2020 | Pas encore fait (décision validée) | Prochaine étape. |

## Validé par Valentin (6 octobre 2026) : la suite

| Sujet | Choix |
| --- | --- |
| Ordre | V0.16 métier et carrière, V0.17 vie et activités, V0.18 réseaux sociaux et personnalités, V0.19 compétition, V0.20 entreprise crypto |
| Personnalités | Fictives (pas de vraies personnes), inspirées des profils du milieu |
| Discussions | Messages avec choix de réponses (hors ligne, gratuit) |
| Compétition | Contre les personnalités du jeu |
| Jauges de vie | Santé, énergie, moral, stress, avec de vraies conséquences |

## V0.16 — Métier et carrière

| Sujet | Décision | Raison |
| --- | --- | --- |
| Nouvel onglet « Vie » | Carrière, formations et vie quotidienne (déplacée depuis Finances) | Tout ce qui touche à ta vie au même endroit. |
| Diplômes | Chaque métier exige un diplôme précis (médecine, IFSI, ATPL, école de police…) ou un niveau d'études (CAP, bac+2, bac+3, bac+5, bac+8). Au départ, tu as ceux de ton métier de départ | Réalisme : on ne devient pas pilote ou radiologue sans formation. |
| Formations | 37 formations avec un coût et une durée réalistes (frais publics 2026 : 178 € par an en licence, 254 € en master ; école de commerce 32 000 € ; ATPL 100 000 € ; bootcamp 7 000 €…), à temps plein (tu quittes ton emploi), en cours du soir (50 % plus long) ou en alternance (payé comme apprenti puis embauché). Certaines sont rémunérées (école de police, ENAC, contrat doctoral, internat de médecine) | Ordres de grandeur **à vérifier** métier par métier. |
| CPF | 1 500 € au départ, +500 € par an travaillé (plafond 5 000 €), utilisable pour les formations éligibles (CAP, permis, bootcamp, certifications, BPJEPS…) | Règle du compte personnel de formation. |
| Progression | Confirmé après 3 ans dans le métier, expérimenté après 8 ans ; entretien annuel avec 0,8 à 3,3 % d'augmentation (0,5 à 1,7 % dans la fonction publique), 10 % de chances de promotion (+6 à 12 %) ; demande d'augmentation une fois par an (35 % de réussite, +3 à 8 %) | Réalisme moyen. |
| Changer de métier | Il faut le diplôme ; dans un nouveau métier on repart débutant | Réalisme. |
| Heures supplémentaires | 0, 4 ou 8 h par semaine, payées 25 % de plus (+14 % ou +29 % de salaire) | La fatigue arrivera avec les jauges (V0.17). |
| Événements du métier | Chaque mois, selon ton secteur : primes, heures sup, bonus annuel (finance, direction), accidents du travail (BTP, industrie, transport, agriculture), gardes (santé), soldes et fêtes (commerce), point d'indice (fonction publique), transferts (sport pro), arrêts maladie, licenciement économique (pas dans la fonction publique) | Probabilités **à ajuster** en jouant. |
| Arrêt de travail | Perte de 35 % du salaire des jours d'arrêt en maladie (carence et indemnités journalières), 20 % en accident du travail | Approximation des indemnités journalières. |
| Licenciement | Indemnité légale (1/4 de mois par année jusqu'à 10 ans, 1/3 au-delà), puis chômage : 72 % du salaire net pendant 18 mois (plafond 8 600 €) | Règles France Travail simplifiées. Démission : pas de chômage. |
| Alternance | Au bout de 2 ans : diplôme et embauche comme débutant dans le métier | Réalisme. |

## V0.17 — Vie, activités, logement et voiture

| Sujet | Décision | Raison |
| --- | --- | --- |
| Jauges | Santé, énergie, moral, stress (0 à 100), mises à jour chaque jour de jeu : sommeil et week-ends reposent ; travail (selon la pénibilité et la pression du secteur), heures sup, trading, découvert, chômage, grosses pertes fatiguent ou stressent ; mode de vie et salle de sport jouent aussi | Choix de Valentin : jauges avec vraies conséquences. Valeurs **à ajuster** en jouant. |
| Conséquences | Stress ≥ 85 pendant 14 jours : burn-out (30 à 90 jours d'arrêt) ; santé < 25 : maladie (7 à 14 jours) ; énergie < 15 : trades plus chers (+0,5 % de frais, erreurs de fatigue) ; moral < 30 : entretien annuel décevant ; moral et énergie jouent sur les demandes d'augmentation | Choix de Valentin. |
| Activités | 17 activités (footing, sport, méditation, sorties, restaurant, cinéma, concert, spa, médecin, psychologue, bénévolat, week-end, vacances, voyage…) avec un coût et des effets ; effet réduit de moitié si refaite trop tôt ; vacances et voyages utilisent les congés payés (25 jours par an) ; abonnement à la salle de sport 35 € par mois | Prix courants, indexés sur l'inflation. |
| Achat du logement | Prix ≈ 20 ans de loyer de ta ville (rendement brut de 5 %), frais de notaire 7,5 %, apport d'au moins 10 % plus les frais, prêt sur 20 ans à 3,3 % + 0,3 % d'assurance, refus au-delà de 35 % de taux d'effort ; propriétaire : mensualité, taxe foncière (1 mois de loyer par an) et charges (10 % du loyer en appartement) au lieu du loyer ; valeur qui suit l'inflation +1 % par an ; revente avec 5 % d'agence | Règles bancaires françaises (HCSF) ; prix et taux **à vérifier** par ville. |
| Déménagement | Nouvelle ville et type de logement, frais de déménagement (600 à 1 200 €) et un mois de loyer d'agence ; impossible en étant propriétaire sans vendre | Réalisme. |
| Voiture | Occasion 9 000 € ou neuve 27 000 €, au comptant ou à crédit (6 %, 4 ans, 10 % d'apport) ; décote 20 % la première année puis 10 à 15 % par an ; les parties existantes en voiture en ont une d'occasion | Prix moyens 2026 **à vérifier**. |
| Patrimoine | Logement et voiture (crédits déduits) comptent dans le patrimoine total | Réalisme. |

## V0.18 — Réseau social et personnalités

| Sujet | Décision | Raison |
| --- | --- | --- |
| Personnalités | 20 personnalités **fictives** (aucune personne réelle) : mineurs, traders, influenceurs, analystes, fondateurs, arnaqueurs ; chacune a une exposition au marché, une fiabilité, un nombre d'abonnés et une humeur | Choix de Valentin : personnalités fictives. |
| Fortunes | La fortune de chaque personnalité suit le marché selon son exposition (bêta au bitcoin) avec une part de hasard propre à la partie | Classement crédible et vivant. |
| Fil d'actualité | Publications chaque jour, qui réagissent aux variations du bitcoin et aux actualités (réelles ou simulées) ; rattrapage limité aux 30 derniers jours | Réalisme et légèreté. |
| Messages | Messages privés (environ un jour sur quatre) avec choix de réponses : groupe VIP à 299 € par mois (sans effet), faux airdrop (vol de 60 % des avoirs si tu donnes ta phrase secrète), vente OTC de Viktor (arnaque : 45 % perdus), tuyaux, pump organisé (amende de 40 % du gain si l'AMF s'en mêle), rachat de machines, collaboration, fonds de Clara, pari de Zoé, interview, conseil or | Choix de Valentin : réponses à choix. Montants **à ajuster**. |
| Sécurité | Activer la double authentification protège du piratage du compte (0,04 % de risque par jour sans elle) | Bonne pratique réelle. |
| Tuyaux | Uniquement dans le futur simulé (le jeu ne connaît pas l'avenir réel) ; justes selon la fiabilité de la personnalité | Pas de triche sur l'historique réel. |
| Fonds de Clara | Investi à 50 % bitcoin, 25 % ether, 25 % or simulé, moins 2 % de frais par an ; retrait possible à tout moment | Réalisme d'un fonds géré. |
| Abonnés et réputation | Tes publications (avis, gains, conseils, mèmes, 3 par jour au maximum) et tes prédictions à 7 jours font gagner ou perdre abonnés et réputation ; une prédiction juste rapporte, une fausse coûte | Préparer la compétition (V0.19). |
| Classement | Patrimoine du joueur comparé aux fortunes des personnalités | Choix de Valentin : compétition contre les personnalités. |
| Installations | Le menu des installations passe dans l'onglet Minage (sous-onglet « Sites ») pour laisser la place à l'onglet Social | Six onglets au maximum sur téléphone. |

## V0.19 — Compétition contre les personnalités

| Sujet | Décision | Raison |
| --- | --- | --- |
| Ligue Kryptal | Une ligue par trimestre civil (du jeu) : toi contre les 20 personnalités, classés à la performance et non à la fortune ; divisions Bronze, Argent, Or, Platine, Diamant ; les 3 premiers montent et touchent une prime (300 € à 30 000 € pour le 1er selon la division, moitié pour le 2e, quart pour le 3e) ; à partir du 17e sur 21, on descend | Une compétition juste même avec peu d'argent. Primes **à ajuster**. |
| Ta performance | Indice pondéré dans le temps du portefeuille au comptant de la plateforme (ordres en attente compris) : les virements, le minage et les perpétuels ne comptent pas ; il faut au moins 100 € sur la plateforme pour être classé | Mesurer le talent de trader, pas l'argent versé. |
| Performance des personnalités | Variation de leur fortune (le marché selon leur exposition) plus un talent propre au trimestre, plus large pour les flambeurs (Max, Tom, le Renard) que pour les prudents (Paul, Elena) | Classements variés et crédibles. |
| Rival | Zoé par défaut, modifiable ; duel à chaque fin de trimestre, bilan victoires et défaites, piques sur le fil environ une fois par semaine | Choix de Valentin : compétition contre les personnalités. |
| Défis | Environ un tous les 12 jours, à accepter sous 3 jours avec une mise de 50, 250, 1 000 ou 5 000 € prise sur le compte bancaire : duel de trading sur 14 jours ou un mois (le gagnant prend la mise), pari +10 % en un mois (cote 4), pari +20 % d'abonnés (cote 2), pronostic du bitcoin à 7 jours (hausse, stable, baisse ; si les deux ont raison ou tort, mise rendue) ; l'adversaire voit juste selon sa fiabilité quand l'avenir est simulé | Enjeu réel sans casino. |
| Trophées | 19 trophées (premiers 100 000 €, millionnaire, 1 BTC, top 10, numéro un, divisions, champion, rival battu 3 fois, 5 défis, 10 pronostics justes, abonnés, 10 machines, propriétaire, réputation 90) ; chacun donne 1 point de réputation | Objectifs à long terme. |
| Dépassements | Une personnalité que tu dépasses au classement des fortunes réagit sur le fil (une seule fois par partie) ; le champion de la ligue est félicité par Kryptal | Monde vivant. |
