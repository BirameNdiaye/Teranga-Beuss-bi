# Teranga Invit v2

Faire-part de mariage numériques pour le Sénégal et sa diaspora : une invitation qui s’ouvre comme une
enveloppe, et l’outil qui gère les invités (réponses, places, WhatsApp, billets QR à l’entrée).

**Stack** : Next.js 16 (React 19, App Router) · TypeScript strict · Tailwind CSS v4 · MySQL 8.4 + Prisma 7 ·
Auth.js (e-mail + mot de passe, argon2id) · stockage S3 (SeaweedFS en local) · Zod · Vitest · Playwright.

## Lancer le projet

Seul Docker est nécessaire (ni Node ni MySQL sur la machine).

```bash
cp .env.example .env        # puis remplacez chaque « changez-moi »
docker compose up --build   # développement : rechargement à chaud + Adminer
```

- Application : http://localhost:3000
- Adminer (consultation de la base) : http://localhost:8080, serveur `db`

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

### Production

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
| `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_ROOT_PASSWORD` | Base MySQL |
| `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION` | Stockage des médias (le bucket est créé automatiquement) |
| `AUTH_SECRET` | Signature des sessions et des cookies d’accès (`openssl rand -base64 32`) |
| `AUTH_TRUST_HOST` | `true` derrière un proxy |
| `NEXT_PUBLIC_SITE_URL` | Adresse publique du site |
| `SEED_USER_EMAIL`, `SEED_USER_PASSWORD` | Compte créé par le seed |
| `WEB_PORT`, `ADMINER_PORT` | Ports exposés |

`DATABASE_URL` et `S3_ENDPOINT` sont construits par `docker-compose.yml`. Aucune valeur secrète
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
- **Médias** : images réduites à 2000 px et converties en WebP (`sharp`), servies par `/media/...` avec un
  cache d’un an (clés jamais réécrites). Vidéo 60 Mo et son 15 Mo maximum.
- **Hors connexion** : un service worker garde la page invité, ses médias et le billet une fois ouverts.
- **Limitation des requêtes** : connexion, inscription, réponses, livre d’or, codes d’accès et envois de
  fichiers. Le compteur est en mémoire : avec plusieurs instances, remplacez-le par Redis.
- **Stockage S3** : les images MinIO ne sont plus publiées sur Docker Hub ; SeaweedFS est utilisé en local.
  En production, n’importe quel service S3 convient (variables `S3_*`).

## Limites connues

- Les textes du wolof doivent être relus par une personne de langue maternelle.
- Le tableau de bord des mariés est en français seulement ; la page invité, le billet et l’enveloppe
  existent en français, wolof et anglais.
- Après un seed lancé alors que l’application tourne, le cache est vidé via `/api/revalidate`
  (jeton dérivé de `AUTH_SECRET`). Si l’application n’est pas joignable, le seed le signale.
