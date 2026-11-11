import { db } from '@/lib/db'
import { getObject } from '@/lib/storage'

// Les clés sont uniques et jamais réécrites : les fichiers peuvent être mis en cache longtemps.
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/')
  if (!/^[\w-]+\/[\w.-]+$/.test(key)) return new Response('Introuvable', { status: 404 })

  const media = await db.media.findUnique({ where: { key }, select: { mimeType: true } })
  if (!media) return new Response('Introuvable', { status: 404 })

  const range = request.headers.get('range') ?? undefined
  try {
    const object = await getObject(key, range)
    const body = object.Body?.transformToWebStream()
    if (!body) return new Response('Introuvable', { status: 404 })
    const headers = new Headers({
      'Content-Type': media.mimeType,
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Accept-Ranges': 'bytes',
    })
    if (object.ContentLength != null) headers.set('Content-Length', String(object.ContentLength))
    if (object.ContentRange) headers.set('Content-Range', object.ContentRange)
    return new Response(body, { status: object.ContentRange ? 206 : 200, headers })
  } catch {
    return new Response('Introuvable', { status: 404 })
  }
}
