# syntax=docker/dockerfile:1.7
FROM node:24-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates fontconfig fonts-dejavu-core \
  && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

# Image de développement : le code est monté par docker-compose.override.yml.
FROM deps AS dev
ENV NODE_ENV=development
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && npm run dev"]

FROM deps AS builder
COPY . .
# La génération de pages ne doit pas dépendre de la base : les pages invité
# sont produites à la première visite puis mises en cache.
# `prisma generate` lit prisma.config.ts : une adresse factice suffit, aucune connexion n'est ouverte.
RUN DATABASE_URL=postgresql://build:build@localhost:5432/build npx prisma generate \
  && DATABASE_URL=postgresql://build:build@localhost:5432/build npx next build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
# Outils pour appliquer les migrations et lancer le seed dans le conteneur.
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/src/generated ./src/generated
# Médias du stockage local (volume Docker).
RUN mkdir -p /app/storage && chown nextjs:nodejs /app/storage
USER nextjs
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]
