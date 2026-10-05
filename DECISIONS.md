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
| Non simulé pour l'instant | Impôt sur le revenu du salaire, transports, inflation, aides (APL, prime d'activité), allocations chômage | Prochaines étapes de la vie quotidienne. |
