import 'server-only'
import sharp from 'sharp'
import { db } from './db'
import { putObject } from './storage'
import { newToken } from './tokens'

const LIMITS = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif'], max: 15 },
  video: { types: ['video/mp4', 'video/webm', 'video/quicktime'], max: 60 },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-m4a'], max: 15 },
} as const

export type MediaKind = keyof typeof LIMITS

export class MediaError extends Error {}

const extensionFor: Record<string, string> = {
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/quicktime': 'mov',
  'audio/mpeg': 'mp3',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
  'audio/ogg': 'ogg',
  'audio/wav': 'wav',
}

/**
 * Enregistre un fichier envoyé par un utilisateur. Les images sont réduites
 * (2000 px max) et converties en WebP ; les sons et vidéos sont stockés tels quels.
 */
export async function storeUpload(ownerId: string, kind: MediaKind, file: File, alt = '') {
  const limit = LIMITS[kind]
  if (!(limit.types as readonly string[]).includes(file.type)) {
    throw new MediaError('Format de fichier non pris en charge.')
  }
  if (file.size > limit.max * 1024 * 1024) {
    throw new MediaError(`Fichier trop lourd (${limit.max} Mo maximum).`)
  }
  const input = Buffer.from(await file.arrayBuffer())
  return storeBuffer(ownerId, kind, input, file.type, alt)
}

export async function storeBuffer(ownerId: string, kind: MediaKind, input: Buffer, mimeType: string, alt = '') {
  let body = input
  let contentType = mimeType
  let width: number | null = null
  let height: number | null = null
  let extension = extensionFor[mimeType] ?? 'bin'

  if (kind === 'image') {
    try {
      const { data, info } = await sharp(input)
        .rotate()
        .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer({ resolveWithObject: true })
      body = data
      width = info.width
      height = info.height
      contentType = 'image/webp'
      extension = 'webp'
    } catch {
      throw new MediaError('Image illisible.')
    }
  }

  const key = `${ownerId}/${newToken()}.${extension}`
  await putObject(key, body, contentType)
  return db.media.create({
    data: { ownerId, key, kind, mimeType: contentType, width, height, alt: alt.slice(0, 200) },
  })
}
