import { currentUser } from '@/lib/auth'
import { finalizeBlobUpload, isMediaKind, MediaError, storeUpload } from '@/lib/media'
import { hit } from '@/lib/rate-limit'
import { BLOB_MISSING_MESSAGE, storageMisconfigured, usesBlob } from '@/lib/storage'

const toJson = (media: Awaited<ReturnType<typeof storeUpload>>) => ({
  id: media.id,
  url: media.url,
  kind: media.kind,
  width: media.width,
  height: media.height,
  alt: media.alt,
})

/**
 * Deux usages :
 * - multipart/form-data : envoi classique, stockage local uniquement ;
 * - JSON { url, kind, alt } : enregistrement d'un fichier déjà déposé dans Vercel Blob.
 */
export async function POST(request: Request) {
  const userId = (await currentUser())?.id
  if (!userId) return Response.json({ error: 'Connexion requise.' }, { status: 401 })
  if (storageMisconfigured()) {
    console.error(BLOB_MISSING_MESSAGE)
    return Response.json({ error: BLOB_MISSING_MESSAGE }, { status: 503 })
  }
  if (!(await hit(`upload:${userId}`, 60, 60 * 60_000))) {
    return Response.json({ error: "Trop d'envois. Réessayez plus tard." }, { status: 429 })
  }

  try {
    if (request.headers.get('content-type')?.includes('application/json')) {
      const body = (await request.json().catch(() => null)) as { url?: unknown; kind?: unknown; alt?: unknown } | null
      if (!usesBlob() || !body || typeof body.url !== 'string' || !isMediaKind(body.kind)) {
        return Response.json({ error: 'Requête invalide.' }, { status: 400 })
      }
      return Response.json(toJson(await finalizeBlobUpload(userId, body.kind, body.url, String(body.alt ?? ''))))
    }

    // Sur Vercel, un corps de requête est limité à ~4,5 Mo : l'envoi doit passer par Blob.
    if (usesBlob()) return Response.json({ error: 'Utilisez l’envoi direct.' }, { status: 400 })
    const form = await request.formData().catch(() => null)
    const file = form?.get('file')
    const kind = form?.get('kind')
    if (!(file instanceof File) || !isMediaKind(kind)) {
      return Response.json({ error: 'Fichier manquant.' }, { status: 400 })
    }
    return Response.json(toJson(await storeUpload(userId, kind, file, String(form?.get('alt') ?? ''))))
  } catch (error) {
    if (error instanceof MediaError) return Response.json({ error: error.message }, { status: 400 })
    // Cause visible dans les journaux Vercel (Logs) ; le message reste générique pour l'utilisateur.
    console.error('Envoi de média échoué', error)
    return Response.json({ error: "L'envoi a échoué. Réessayez." }, { status: 500 })
  }
}
