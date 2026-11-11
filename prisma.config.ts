import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  // Les migrations passent par la connexion directe de Neon (sans pooler) quand elle existe.
  datasource: {
    url: process.env.DATABASE_URL_UNPOOLED || env('DATABASE_URL'),
  },
})
