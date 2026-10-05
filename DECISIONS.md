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
