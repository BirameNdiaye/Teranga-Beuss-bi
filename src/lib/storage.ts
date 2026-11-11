// Stockage des médias : Vercel Blob quand BLOB_READ_WRITE_TOKEN est défini (en ligne),
// sinon un dossier local (Docker, développement). Utilisé aussi par le script de seed.
import { mkdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { del, put } from '@vercel/blob'

export const usesBlob = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

const KEY_PATTERN = /^[\w-]+\/[\w.-]+$/

// Chemins calculés à l'exécution : on demande au bundler de ne pas les tracer.
const mediaDir = () => process.env.MEDIA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), 'storage')

/** Chemin du fichier local pour une clé, ou null si la clé est invalide. */
export function localPath(key: string) {
  return KEY_PATTERN.test(key) ? path.join(/*turbopackIgnore: true*/ mediaDir(), key) : null
}

/** Enregistre un fichier et renvoie son adresse publique. */
export async function saveObject(key: string, body: Buffer, contentType: string) {
  if (usesBlob()) {
    const blob = await put(key, body, {
      access: 'public',
      contentType,
      addRandomSuffix: false,
      cacheControlMaxAge: 60 * 60 * 24 * 365,
    })
    return blob.url
  }
  const file = localPath(key)
  if (!file) throw new Error('Clé de média invalide')
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, body)
  return `/media/${key}`
}

export async function deleteObject(url: string) {
  if (/^https:\/\//.test(url)) {
    if (usesBlob()) await del(url)
    return
  }
  const file = localPath(url.replace(/^\/media\//, ''))
  if (file) await unlink(file).catch(() => undefined)
}

export async function readLocalObject(key: string) {
  const file = localPath(key)
  if (!file) return null
  try {
    const info = await stat(file)
    return { size: info.size, read: () => readFile(file), file }
  } catch {
    return null
  }
}
