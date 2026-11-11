import 'server-only'
import { head } from '@vercel/blob'
import sharp from 'sharp'
import { db } from './db'
import { deleteObject, saveObject } from './storage'
import { newToken } from './tokens'

export const MEDIA_LIMITS = {
  image: { types: ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif'], maxMb: 15 },
  video: { types: ['video/mp4', 'video/webm', 'video/quicktime'], maxMb: 60 },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/wav', 'audio/x-m4a'], maxMb: 15 },
} as const

export type MediaKind = keyof typeof MEDIA_LIMITS

export const isMediaKind = (value: unknown): value is MediaKind =>
  typeof value === 'string' && value in MEDIA_LIMITS

export class MediaError extends Error {}

function checkFile(kind: MediaKind, contentType: string, size: number) {
  const limit = MEDIA_LIMITS[kind]
  if (!(limit.types as readonly string[]).includes(contentType)) throw new MediaError('Format de fichier non pris en charge.')
  if (size > limit.maxMb * 1024 * 1024) throw new MediaError(`Fichier trop lourd (${limit.maxMb} Mo maximum).`)
}

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

/** Réduit une image à 2000 px et la convertit en WebP. */
async function toWebp(input: Buffer) {
  try {
    return await sharp(input)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
  } catch {
    throw new MediaError('Image illisible.')
  }
}

/** Envoi classique (stockage local) : le fichier passe par le serveur. */
export async function storeUpload(ownerId: string, kind: MediaKind, file: File, alt = '') {
  checkFile(kind, file.type, file.size)
  return storeBuffer(ownerId, kind, Buffer.from(await file.arrayBuffer()), file.type, alt)
}

export async function storeBuffer(ownerId: string, kind: MediaKind, input: Buffer, mimeType: string, alt = '') {
  let body = input
  let contentType = mimeType
  let width: number | null = null
  let height: number | null = null
  let extension = extensionFor[mimeType] ?? 'bin'

  if (kind === 'image') {
    const { data, info } = await toWebp(input)
    body = data
    width = info.width
    height = info.height
    contentType = 'image/webp'
    extension = 'webp'
  }

  const key = `${ownerId}/${newToken()}.${extension}`
  const url = await saveObject(key, body, contentType)
  return db.media.create({
    data: { ownerId, key, url, kind, mimeType: contentType, width, height, alt: alt.slice(0, 200) },
  })
}

const BLOB_HOST = /^[a-z0-9]+\.public\.blob\.vercel-storage\.com$/

/**
 * Envoi direct (Vercel Blob) : le navigateur a déposé le fichier dans le stockage,
 * le serveur le vérifie puis l'enregistre. Les images sont converties en WebP.
 */
export async function finalizeBlobUpload(ownerId: string, kind: MediaKind, rawUrl: string, alt = '') {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    throw new MediaError('Adresse de fichier invalide.')
  }
  if (url.protocol !== 'https:' || !BLOB_HOST.test(url.hostname)) throw new MediaError('Adresse de fichier invalide.')

  const blob = await head(url.toString()).catch(() => null)
  if (!blob || !blob.pathname.startsWith(`${ownerId}/`)) throw new MediaError('Fichier introuvable.')
  try {
    checkFile(kind, blob.contentType, blob.size)
  } catch (error) {
    await deleteObject(blob.url)
    throw error
  }

  if (kind === 'image') {
    const response = await fetch(blob.url)
    if (!response.ok) throw new MediaError('Fichier introuvable.')
    const media = await storeBuffer(ownerId, 'image', Buffer.from(await response.arrayBuffer()), blob.contentType, alt)
    await deleteObject(blob.url)
    return media
  }

  return db.media.create({
    data: { ownerId, key: blob.pathname, url: blob.url, kind, mimeType: blob.contentType, alt: alt.slice(0, 200) },
  })
}
