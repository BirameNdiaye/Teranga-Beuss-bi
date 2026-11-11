import 'server-only'
import { headers } from 'next/headers'
import { db } from './db'

// Compteurs stockés en base : partagés par toutes les instances (Vercel en lance plusieurs).

export async function clientKey(scope: string) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
  return `${scope}:${ip}`
}

/** Retourne true si l'appel est autorisé, false si la limite est atteinte. */
export async function hit(key: string, limit: number, windowMs: number) {
  const now = BigInt(Date.now())
  const resetAt = now + BigInt(windowMs)
  try {
    // Opération atomique : la fenêtre repart à zéro quand elle a expiré.
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key.slice(0, 191)}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN 1 ELSE "RateLimit"."count" + 1 END,
        "resetAt" = CASE WHEN "RateLimit"."resetAt" < ${now} THEN EXCLUDED."resetAt" ELSE "RateLimit"."resetAt" END
      RETURNING "count"`
    if (Math.random() < 0.01) {
      await db.$executeRaw`DELETE FROM "RateLimit" WHERE "resetAt" < ${now - 86_400_000n}`
    }
    return Number(rows[0]?.count ?? 1) <= limit
  } catch (error) {
    // Une panne du compteur ne doit pas bloquer les mariés ni leurs invités.
    console.error('Limiteur indisponible', error)
    return true
  }
}

export async function allow(scope: string, limit: number, windowMs: number) {
  return hit(await clientKey(scope), limit, windowMs)
}
