import { auth } from '@/lib/auth'
import { MediaError, storeUpload, type MediaKind } from '@/lib/media'
import { hit } from '@/lib/rate-limit'

const kinds: MediaKind[] = ['image', 'video', 'audio']

export async function POST(request: Request) {
  const userId = (await auth())?.user?.id
  if (!userId) return Response.json({ error: 'Connexion requise.' }, { status: 401 })
  if (!hit(`upload:${userId}`, 60, 60 * 60_000)) {
    return Response.json({ error: "Trop d'envois. Réessayez plus tard." }, { status: 429 })
  }

  const form = await request.formData().catch(() => null)
  const file = form?.get('file')
  const kind = form?.get('kind') as MediaKind | null
  if (!(file instanceof File) || !kind || !kinds.includes(kind)) {
    return Response.json({ error: 'Fichier manquant.' }, { status: 400 })
  }

  try {
    const media = await storeUpload(userId, kind, file, String(form?.get('alt') ?? ''))
    return Response.json({
      id: media.id,
      url: `/media/${media.key}`,
      kind: media.kind,
      width: media.width,
      height: media.height,
      alt: media.alt,
    })
  } catch (error) {
    const message = error instanceof MediaError ? error.message : "L'envoi a échoué. Réessayez."
    return Response.json({ error: message }, { status: error instanceof MediaError ? 400 : 500 })
  }
}
