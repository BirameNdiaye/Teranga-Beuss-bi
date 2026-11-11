# Teranga Invit v2

Faire-part de mariage numériques pour le Sénégal et sa diaspora : une invitation qui s’ouvre comme une
enveloppe, et l’outil qui gère les invités (réponses, places, WhatsApp, billets QR à l’entrée).

**Stack** : Next.js 16 (React 19, App Router) · TypeScript strict · Tailwind CSS v4 · PostgreSQL + Prisma 7 ·
Auth.js (e-mail + mot de passe, argon2id) · Vercel Blob (dossier local en développement) · Zod · Vitest · Playwright.

Déploiement prévu : **Vercel + Neon** (voir plus bas). Docker sert au développement local et reste
utilisable pour un hébergement sur serveur.

## Lancer le projet

Seul Docker est nécessaire (ni Node ni PostgreSQL sur la machine).

```bash
cp .env.example .env        # puis remplacez chaque « changez-moi »
docker compose up --build   # développement : rechargement à chaud + Adminer
```

- Application : http://localhost:3000
- Adminer (consultation de la base) : http://localhost:8080, système « PostgreSQL », serveur `db`

Au démarrage, `web` applique les migrations (`prisma migrate deploy`).

Pour arrêter, utilisez `docker compose down --remove-orphans` : sans cette option, passer du mode
production au mode développement peut laisser un conteneur Adminer rattaché à un réseau supprimé
(erreur « network … not found »). Les données sont conservées dans les volumes.

### Données de démonstration

```bash
docker compose run --rm web npm run seed
```

Crée le compte `SEED_USER_EMAIL` / `SEED_USER_PASSWORD` (définis dans `.env`) et l’invitation publiée
`/i/awa-et-junior` : deux jours de programme, galerie, contacts, six invités nommés, réponses et livre d’or.
Les images sont des illustrations générées, aucune vraie photo. Le code d’accès de démonstration est
`TERANGA2026` (il sert à afficher les numéros des contacts).

## Déployer sur Vercel avec Neon

1. **Importer le dépôt GitHub** dans Vercel (« Add New… → Project »). Le framework Next.js est détecté ;
   Vercel lance automatiquement le script `vercel-build` : `prisma generate`, `prisma migrate deploy`
   (création des tables) puis `next build`.
2. **Ajouter Neon** depuis l’onglet *Storage* du projet (*Create Database → Neon*), en le reliant à tous les
   environnements. L’intégration ajoute `DATABASE_URL` (avec pooler, utilisée par l’application) et
   `DATABASE_URL_UNPOOLED` (connexion directe, utilisée par les migrations).
3. **Ajouter Vercel Blob** depuis le même onglet (*Create Database → Blob*). L’intégration ajoute
   `BLOB_READ_WRITE_TOKEN` : les photos, vidéos et musiques partent alors directement du navigateur vers
   le stockage, sans passer par les fonctions (limitées à ~4,5 Mo par requête).
4. **Variables à ajouter vous-même** (*Settings → Environment Variables*) :
   - `AUTH_SECRET` : une valeur aléatoire (`openssl rand -base64 32`) ;
   - `NEXT_PUBLIC_SITE_URL` : l’adresse publique, par exemple `https://teranga-invit.vercel.app`.
     Elle est lue au moment du build : redéployez si vous la changez.
5. **Déployer**, puis créer votre compte sur `/inscription`.

Données de démonstration sur Neon (facultatif), depuis votre machine :

```bash
docker compose run --rm -e DATABASE_URL="<DATABASE_URL de Neon>" -e BLOB_READ_WRITE_TOKEN="<jeton Blob>" \
  -e REVALIDATE_URL="https://votre-site.vercel.app" web npm run seed
```

Les aperçus de déploiement (*Preview*) partagent la même base Neon que la production, sauf si vous
activez les branches de base de données de Neon pour les aperçus.

### Hébergement sur serveur (Docker)

```bash
docker compose -f docker-compose.yml up --build -d
```

Image Next.js `standalone`, utilisateur non root, migrations au démarrage. Placez un reverse proxy HTTPS
devant le port 3000 et mettez `NEXT_PUBLIC_SITE_URL` à l’adresse publique : les liens de partage,
les QR codes et les cookies en dépendent. **Le scanner de billets a besoin de HTTPS sur téléphone**
(accès à la caméra).

## Variables d’environnement

| Variable | Rôle |
| --- | --- |
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Base PostgreSQL locale (Docker) |
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Connexions Neon (ajoutées par l’intégration Vercel) |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob ; sans elle, les médias vont dans le dossier `MEDIA_DIR` |
| `DB_POOL_MAX` | Connexions par instance (5 par défaut) |
| `AUTH_SECRET` | Signature des sessions et des cookies d’accès (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | `true` derrière un proxy |
| `NEXT_PUBLIC_SITE_URL` | Adresse publique du site |
| `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` | Compte créé par le seed |
| `WEB_PORT`, `ADMINER_PORT` | Ports exposés |

En local, `DATABASE_URL` et `MEDIA_DIR` sont fixés par `docker-compose.yml`. Aucune valeur secrète
n’est envoyée au navigateur.

## Tests

```bash
# Tests unitaires (CSV, modèle d'affichage, validation, traductions)
docker compose exec web npx vitest run

# Parcours de bout en bout, contre l'application lancée
docker run --rm --network container:teranga-invit-web-1 \
  -v "$PWD":/app -v teranga-invit_web-node-modules:/app/node_modules -w /app \
  mcr.microsoft.com/playwright:v1.65.0-noble npx playwright test
```

Le parcours Playwright crée un compte, construit et publie une invitation, y répond en tant qu’invité,
scanne le billet deux fois (le second passage est refusé) puis vérifie qu’une invitation protégée
n’affiche rien sans le bon code.

## Pages

| Route | Rôle |
| --- | --- |
| `/` | Présentation du produit |
| `/connexion`, `/inscription` | Comptes des mariés |
| `/tableau-de-bord` | Invitations du compte (propriétaire ou co-organisateur) |
| `/tableau-de-bord/[id]/editer` | Constructeur en 5 étapes, sauvegarde automatique, aperçu en direct (iframe `/apercu/[id]`) |
| `/tableau-de-bord/[id]/invites` | Invités nommés, import CSV, liens personnels, envoi groupé WhatsApp |
| `/tableau-de-bord/[id]/reponses` | Statistiques en direct, export CSV, validation du livre d’or |
| `/tableau-de-bord/[id]/accueil` | Scanner de billets du jour J (caméra, code saisi ou recherche par nom) |
| `/i/[slug]` | Page invité ; `?g=<jeton>` pour un lien personnel |
| `/i/[slug]/billet?t=<jeton>` | Billet QR |
| `/i/[slug]/calendrier/[eventId]` | Fichier `.ics` |

## Choix techniques

- **Cache de la page invité** : `/i/[slug]` est générée à la première visite puis servie depuis le cache.
  Chaque écriture (constructeur, médias, livre d’or, statut, seed) appelle `revalidatePath` sur l’ancien
  et le nouveau slug. Les parties propres à un invité (prénom, réponse pré-remplie, numéros des contacts)
  sont chargées ensuite par des Server Actions, pour que la page commune reste en cache.
- **Invitations protégées** : rien du contenu n’est envoyé au navigateur avant la saisie du code ou un
  lien personnel valide. Un code juste pose un cookie `httpOnly` signé.
- **Règles côté serveur** : réponse acceptée seulement si l’invitation est publiée et avant la date limite ;
  places limitées pour un invité nommé ; une réponse par invité nommé (la nouvelle remplace l’ancienne) ;
  un billet ne passe qu’une fois (contrainte unique en base) ; seuls le propriétaire et les co-organisateurs
  voient réponses, invités et numéros.
- **Médias** : images réduites à 2000 px et converties en WebP (`sharp`), vidéo 60 Mo et son 15 Mo
  maximum. En ligne, le navigateur dépose le fichier dans Vercel Blob avec un jeton limité à son dossier,
  à ce type et à cette taille (`/api/media/blob`), puis le serveur le vérifie, convertit les images et
  l’enregistre (`/api/media`). En local, l’envoi passe par le serveur et `/media/...` sert les fichiers.
- **Hors connexion** : un service worker garde la page invité, ses médias et le billet une fois ouverts.
- **Limitation des requêtes** : connexion, inscription, réponses, livre d’or, codes d’accès et envois de
  fichiers. Les compteurs sont dans la table `RateLimit` (mise à jour atomique), donc partagés entre toutes
  les instances Vercel. Si la base ne répond pas, la requête est laissée passer plutôt que bloquée.
- **Connexion à la base** : `@prisma/adapter-pg` partout (PostgreSQL local et Neon), avec un petit pool par
  instance ; Neon mutualise les connexions via son pooler.

## Limites connues

- Les textes du wolof doivent être relus par une personne de langue maternelle.
- Le tableau de bord des mariés est en français seulement ; la page invité, le billet et l’enveloppe
  existent en français, wolof et anglais.
- L’envoi direct vers Vercel Blob n’a pas pu être testé ici (il faut un jeton Blob réel) : le parcours
  local est testé, le parcours Blob est à vérifier après le premier déploiement en ajoutant une photo.
- Après un seed lancé alors que l’application tourne, le cache est vidé via `/api/revalidate`
  (jeton dérivé de `AUTH_SECRET`). Si l’application n’est pas joignable, le seed le signale.
