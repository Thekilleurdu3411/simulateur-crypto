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
