import { createReadStream } from 'node:fs'
import { Readable } from 'node:stream'
import { db } from '@/lib/db'
import { readLocalObject } from '@/lib/storage'

// Médias du stockage local (Docker). En ligne, les médias sont servis directement par Vercel Blob.
// Les clés ne sont jamais réécrites : les fichiers peuvent être mis en cache longtemps.
export async function GET(request: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join('/')
  const media = await db.media.findUnique({ where: { key }, select: { mimeType: true } })
  const object = media ? await readLocalObject(key) : null
  if (!media || !object) return new Response('Introuvable', { status: 404 })

  const headers = new Headers({
    'Content-Type': media.mimeType,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'Accept-Ranges': 'bytes',
  })

  // Lecture partielle pour l'audio et la vidéo (Safari l'exige).
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '')
  if (range && (range[1] || range[2])) {
    const start = range[1] ? Number(range[1]) : Math.max(0, object.size - Number(range[2]))
    const end = range[1] && range[2] ? Math.min(Number(range[2]), object.size - 1) : object.size - 1
    if (start >= object.size || start > end) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${object.size}` } })
    }
    headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`)
    headers.set('Content-Length', String(end - start + 1))
    const stream = Readable.toWeb(createReadStream(object.file, { start, end })) as ReadableStream
    return new Response(stream, { status: 206, headers })
  }

  headers.set('Content-Length', String(object.size))
  return new Response(Readable.toWeb(createReadStream(object.file)) as ReadableStream, { headers })
}
