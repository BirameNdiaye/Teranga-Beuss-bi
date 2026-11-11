import 'server-only'
import { headers } from 'next/headers'

type Bucket = { count: number; resetAt: number }

// Limiteur en mémoire : suffisant pour une instance unique. Avec plusieurs
// instances, remplacez-le par un compteur partagé (Redis, MySQL).
const buckets = new Map<string, Bucket>()

export async function clientKey(scope: string) {
  const h = await headers()
  const ip = h.get('x-forwarded-for')?.split(',')[0]?.trim() || h.get('x-real-ip') || 'local'
  return `${scope}:${ip}`
}

/** Retourne true si l'appel est autorisé, false si la limite est atteinte. */
export function hit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  const bucket = buckets.get(key)
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    if (buckets.size > 10_000) {
      for (const [k, b] of buckets) if (b.resetAt < now) buckets.delete(k)
    }
    return true
  }
  bucket.count += 1
  return bucket.count <= limit
}

export async function allow(scope: string, limit: number, windowMs: number) {
  return hit(await clientKey(scope), limit, windowMs)
}
