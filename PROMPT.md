# Prompt — Teranga Invit v2

> Copie tout ce qui suit dans ton assistant de code (Claude Code ou autre), lancé dans le dossier
> `/home/noone/Desktop/Bureau/teranga-invit-v2`.

---

Tu es un développeur full-stack senior spécialisé en React et MySQL, et un designer d'interfaces exigeant.
Tu construis **Teranga Invit v2** : une plateforme de faire-part de mariage numériques pour le Sénégal
et sa diaspora. Elle fusionne deux produits existants et va plus loin que chacun d'eux.

## 1. Les deux sources à fusionner

**A. Teranga Invit (v1)** — l'outil des mariés :
- un constructeur d'invitation en 5 étapes : informations, médias, design, vérification, partage ;
- un aperçu en direct, sur téléphone, pendant l'édition ;
- des comptes mariés, avec des co-organisateurs ;
- 4 thèmes (sauge, bordeaux, doré, minimal), 3 paires de polices, 3 mises en page de l'accueil,
  l'intensité du voile sur la photo, une couleur d'accent et un interrupteur pour les animations ;
- la visibilité : publique par lien, protégée par code, ou invités nommés ;
- les statuts : brouillon, publiée, archivée ;
- les réponses des invités (RSVP) : présent / absent / peut-être, nombre de personnes, téléphone, message,
  avec une date limite de réponse.

**B. Le faire-part de référence** (https://2a-deco.vercel.app/event/junior-awa) — l'expérience invité :
- une **enveloppe** d'ouverture avec fleurs, cachet de cire aux initiales et deux étiquettes (lieu · heure,
  adresse · date) ; on la touche pour l'ouvrir et la musique démarre ;
- un **accueil plein écran** en vidéo (ou photo), avec les noms en écriture manuscrite ;
- une barre de navigation en bas qui suit le défilement (Histoire, Programme, Lieux, Galerie, Merci),
  et un bouton musique en haut à droite ;
- **Histoire** : un texte personnel ou religieux ;
- **Dates à retenir** : le calendrier du mois, avec chaque jour d'événement entouré d'un cœur ;
- **Le jour J** : un déroulé sur plusieurs jours et plusieurs villes, chaque étape avec son bouton d'itinéraire ;
- **Les lieux** : une carte Google Maps intégrée par lieu (à partir des coordonnées GPS),
  avec le bouton « Ouvrir dans Google Maps » ;
- un **compte à rebours** (jours, heures, minutes, secondes) avec les initiales en grand en fond ;
- une **galerie** de photos empilées comme des tirages, avec un compteur « Photo 1 sur N »
  et le glissement au doigt ;
- **Partager** : WhatsApp, copier le lien, QR code ;
- **Merci** : le message de remerciement et les noms ;
- **Personnes à contacter** : nom, rôle, numéro, boutons « Appeler » et « WhatsApp ».

Les deux produits ont des manques : la référence n'a **pas de formulaire de réponse**, n'est pas mise en cache
et affiche les numéros à tout le monde. La v1 n'a **pas de vraie page invité** et son constructeur
ne sauvegarde rien.

## 2. Ce qui rend la v2 extraordinaire

À livrer en plus de la fusion, par ordre de priorité :

1. **Invitation personnalisée par invité** : chaque invité reçoit un lien unique (`/i/<slug>?g=<jeton>`).
   L'enveloppe affiche « Cher·e Awa », le formulaire de réponse est pré-rempli, et le nombre de places
   est limité à ce que les mariés ont prévu pour cet invité.
2. **Tableau de bord des mariés** : liste des invités, envois, ouvertures et réponses en temps réel ;
   total des présents et des couverts ; filtres ; export CSV ; envoi groupé par WhatsApp (liens `wa.me`
   pré-remplis, un par invité).
3. **Billet d'entrée QR** : quand un invité confirme, il reçoit un QR personnel. Le jour J, une page
   « Accueil » sur téléphone scanne les QR et marque les arrivées.
4. **Livre d'or** : les invités laissent un message, que les mariés valident avant qu'il s'affiche
   sur la page.
5. **Trois langues** : français (par défaut), wolof et anglais, avec un sélecteur sur la page invité.
6. **Ajouter au calendrier** : un fichier `.ics` par événement, et un lien Google Agenda.
7. **Application installable (PWA)** : la page invité reste lisible hors connexion une fois ouverte
   (programme, lieux, billet QR).
8. **Contacts protégés** : les numéros des organisateurs ne s'affichent qu'aux invités qui ont un
   lien personnel valide, ou après la saisie du code d'accès.

## 3. Stack technique (imposée)

- **React** côté interface. Le navigateur ne peut pas se connecter directement à MySQL : utilise
  **Next.js (App Router, React 19)** pour avoir le front et l'API dans le même projet JavaScript.
  Les lectures se font dans des composants serveur, les écritures dans des Server Actions ou des
  route handlers.
- **TypeScript** en mode strict, **Tailwind CSS v4**, et `next/font` pour les polices.
- **MySQL 8.4**, accédé avec **Prisma**. Le schéma et les migrations sont gérés par Prisma Migrate,
  et un script de seed crée des données de démonstration (un mariage « Junior & Awa » complet, sur deux jours).
- **Authentification** des mariés : Auth.js (email et mot de passe, mots de passe hachés avec argon2),
  sessions en cookie httpOnly. Pas de gestion de session faite maison.
- **Médias** : téléversement vers un stockage compatible S3. En local, utilise **MinIO** dans Docker.
  Redimensionne les images avec `sharp` et sers-les avec `next/image`.
- **Validation** : un schéma **Zod** pour chaque entrée (formulaires, API), avec des erreurs par champ
  affichées dans l'interface.
- **Tests** : Vitest pour la logique, Playwright pour les parcours (créer une invitation, l'ouvrir
  en tant qu'invité, répondre, scanner un billet).

## 4. Docker

Tout se lance avec une seule commande : `docker compose up --build`. Aucune installation de Node
ni de MySQL n'est nécessaire sur la machine.

- `web` : l'application Next.js (Dockerfile en plusieurs étapes, `output: 'standalone'`, utilisateur
  non root). En développement, un `docker-compose.override.yml` monte le code et active le rechargement à chaud.
- `db` : `mysql:8.4`, avec un volume nommé, un healthcheck, `utf8mb4` et le fuseau `Africa/Dakar`.
  `web` attend que `db` soit prête.
- `minio` : le stockage des médias, avec un bucket créé au démarrage.
- `adminer` : une interface de consultation de la base, uniquement en développement.
- Au démarrage, `web` applique les migrations (`prisma migrate deploy`). Le seed s'exécute avec
  `docker compose run --rm web npm run seed`.
- Un fichier `.env.example` liste toutes les variables, sans aucune vraie valeur secrète.
  Le fichier `.env` est ignoré par Git.

## 5. Modèle de données (MySQL)

Identifiants en `CUID` ou `UUID`. Dates stockées en UTC et affichées en `Africa/Dakar`.

- `User` : les mariés et co-organisateurs (email unique, nom, téléphone, langue préférée).
- `Invitation` : propriétaire, co-organisateurs (table de liaison), `slug` unique, `partnerOne`, `partnerTwo`,
  texte de l'histoire, message de remerciement, message de partage, statut, visibilité, code d'accès haché,
  date limite de réponse, réglages d'apparence (thème, polices, mise en page, voile, accent, animations),
  médias de couverture, vidéo et musique.
- `Event` : les étapes du programme (invitation, date et heure, catégorie, titre, lieu, adresse,
  latitude, longitude, lien Maps, ordre d'affichage).
- `Media` : fichier, type, largeur, hauteur, texte alternatif, ordre dans la galerie.
- `Contact` : nom, rôle, téléphone, WhatsApp oui/non.
- `Guest` : invité nommé (nom, téléphone, places prévues, jeton unique, groupe « famille de la mariée »,
  dates d'envoi et d'ouverture).
- `Rsvp` : réponse (invité ou anonyme, présence, nombre de personnes, message, source) et jeton de billet.
- `CheckIn` : arrivée scannée le jour J.
- `GuestbookEntry` : message, auteur, statut de validation.

Règles à faire respecter côté serveur, pas seulement dans le formulaire :
- une réponse n'est acceptée que si l'invitation est publiée et que la date limite n'est pas passée ;
- un invité nommé ne peut pas dépasser le nombre de places prévu ;
- une seule réponse par invité nommé (une nouvelle réponse remplace l'ancienne) ;
- seuls le propriétaire et les co-organisateurs peuvent lire les réponses, les invités et les contacts ;
- un billet ne peut être scanné qu'une fois.

## 6. Pages

- `/` : la page d'accueil du produit (présentation, exemples, bouton « Créer mon invitation »).
- `/connexion`, `/inscription`.
- `/tableau-de-bord` : la liste des invitations des mariés.
- `/tableau-de-bord/[id]/editer` : le constructeur en 5 étapes de la v1, avec l'aperçu en direct
  qui affiche **exactement** les composants de la page invité. Sauvegarde automatique.
- `/tableau-de-bord/[id]/invites` : la gestion des invités, l'import CSV et l'envoi WhatsApp.
- `/tableau-de-bord/[id]/reponses` : les statistiques, la liste et l'export.
- `/tableau-de-bord/[id]/accueil` : le scanner de billets du jour J.
- `/i/[slug]` : la page invité, avec les sections de la référence dans cet ordre : enveloppe, accueil,
  histoire, dates, déroulé, lieux, compte à rebours, galerie, **réponse**, livre d'or, partage, merci, contacts.
- `/i/[slug]/billet` : le billet QR de l'invité.

La page invité est générée à l'avance et régénérée (`revalidatePath`) à chaque modification de l'invitation,
de ses étapes ou de ses médias, en couvrant l'ancien et le nouveau slug. Les parties propres à un invité
(prénom, formulaire pré-rempli) se chargent ensuite côté client avec le jeton, pour que la page commune
reste en cache.

## 7. Design

- Thème par défaut « doré », celui de la référence : fond `#F6EEE3`, surfaces `#FBF7F1`, texte `#3E2A1F`,
  couleur principale `#6B3F28`, accent `#B07A4A`, texte secondaire `#9A7A62`. Les 4 thèmes de la v1
  sont définis en variables CSS, et la couleur d'accent personnalisée les remplace.
- Polices : Great Vibes (noms, titres manuscrits), Playfair Display ou Fraunces (textes),
  Montserrat (petits titres en majuscules avec un large espacement), Inter (interface).
- Mouvements : ouverture de l'enveloppe en 3D, points lumineux qui flottent, sections qui apparaissent
  au défilement, léger zoom lent sur la photo d'accueil, cœurs qui battent sur le calendrier.
  Tout est désactivé si l'utilisateur a choisi de réduire les animations, ou si les mariés les ont coupées.
- Conçu d'abord pour le téléphone (375 px) : aucun défilement horizontal, zones tactiles d'au moins
  44 px, et une barre de navigation du bas qui défile si elle déborde.
- Accessibilité : contraste AA, navigation au clavier, textes alternatifs, `aria-live` sur le compte
  à rebours et sur la confirmation de réponse.

## 8. Qualité attendue

- Lighthouse sur téléphone, page invité : performance ≥ 90, accessibilité ≥ 95.
- Pas de clé ni de secret dans le code client. Seules les valeurs publiques utilisent le préfixe `NEXT_PUBLIC_`.
- Limitation du nombre de requêtes sur les réponses, le livre d'or et la connexion.
- Tous les textes visibles passent par les fichiers de traduction (fr, wo, en).
- Un `README.md` explique le lancement, les variables, le seed, les tests et la mise en production.

## 9. Méthode de travail

1. Commence par un plan court : arborescence, schéma Prisma, liste des routes. Puis code par lots :
   - **Lot 1** : Docker, base, authentification, schéma et seed ;
   - **Lot 2** : la page invité complète (toutes les sections de la référence et la réponse) ;
   - **Lot 3** : le constructeur avec l'aperçu en direct ;
   - **Lot 4** : les invités nommés, le tableau de bord, l'export et WhatsApp ;
   - **Lot 5** : les billets QR et le scanner ;
   - **Lot 6** : le livre d'or, les 3 langues, l'ajout au calendrier, la PWA.
2. À la fin de chaque lot : `docker compose up --build`, ouvre l'application dans un navigateur,
   vérifie les pages concernées sur ordinateur **et** en 375 px, lance les tests, puis corrige
   avant de passer au lot suivant.
3. Ne te contente pas de dire que ça marche : montre les commandes lancées et leur résultat.
   Si une étape n'a pas pu être vérifiée, dis-le clairement.
