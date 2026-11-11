import { createHmac, timingSafeEqual } from 'node:crypto'
import { revalidateInvitation } from '@/lib/revalidate'

// Invalidation déclenchée hors de l'application (script de seed, opérations).
// Le jeton est dérivé de AUTH_SECRET : il n'est jamais exposé au navigateur.
const expected = () => createHmac('sha256', process.env.AUTH_SECRET ?? '').update('revalidate').digest('base64url')

export async function POST(request: Request) {
  const given = Buffer.from(request.headers.get('x-revalidate-token') ?? '')
  const wanted = Buffer.from(expected())
  if (!process.env.AUTH_SECRET || given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
    return Response.json({ error: 'Non autorisé.' }, { status: 401 })
  }
  const body = (await request.json().catch(() => null)) as { slugs?: unknown } | null
  const slugs = Array.isArray(body?.slugs) ? body.slugs.filter((s): s is string => typeof s === 'string').slice(0, 50) : []
  revalidateInvitation(...slugs)
  return Response.json({ ok: true, revalidated: slugs.length })
}
