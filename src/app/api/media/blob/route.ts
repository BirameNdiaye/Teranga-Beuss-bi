import { handleUpload, type HandleUploadBody } from '@vercel/blob/client'
import { currentUser } from '@/lib/auth'
import { isMediaKind, MEDIA_LIMITS } from '@/lib/media'
import { usesBlob } from '@/lib/storage'

/**
 * Délivre au navigateur un jeton d'envoi direct vers Vercel Blob, limité au type,
 * à la taille et au dossier de l'utilisateur connecté.
 */
export async function POST(request: Request) {
  if (!usesBlob()) return Response.json({ error: 'Stockage Blob non configuré.' }, { status: 404 })
  const body = (await request.json().catch(() => null)) as HandleUploadBody | null
  if (!body) return Response.json({ error: 'Requête invalide.' }, { status: 400 })

  try {
    const result = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        const userId = (await currentUser())?.id
        if (!userId) throw new Error('Connexion requise.')
        if (!pathname.startsWith(`${userId}/`) || pathname.includes('..')) throw new Error('Chemin refusé.')
        if (!isMediaKind(clientPayload)) throw new Error('Type de média invalide.')
        const limit = MEDIA_LIMITS[clientPayload]
        return {
          allowedContentTypes: [...limit.types],
          maximumSizeInBytes: limit.maxMb * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ userId, kind: clientPayload }),
        }
      },
      // L'enregistrement en base se fait ensuite via POST /api/media (JSON) : il fonctionne
      // aussi quand Vercel ne peut pas joindre ce serveur (aperçus protégés, local).
      onUploadCompleted: async () => undefined,
    })
    return Response.json(result)
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 400 })
  }
}
