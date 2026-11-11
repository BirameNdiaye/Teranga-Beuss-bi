import { formatFr } from '@/lib/dates'
import { db } from '@/lib/db'
import { renderShareCard } from '@/lib/share-card'
import { readLocalObject } from '@/lib/storage'

async function loadPhoto(url: string) {
  try {
    if (url.startsWith('/media/')) {
      const object = await readLocalObject(url.slice('/media/'.length))
      return object ? await object.read() : null
    }
    const response = await fetch(url)
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null
  } catch {
    return null
  }
}

/** Vignette de partage (WhatsApp, réseaux sociaux) d'une invitation publiée. */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const invitation = await db.invitation.findUnique({
    where: { slug },
    include: { cover: true, events: { orderBy: { startsAt: 'asc' }, take: 1 } },
  })
  if (!invitation || invitation.status !== 'published') return new Response('Introuvable', { status: 404 })

  // Une invitation protégée ne dévoile ni sa photo ni ses détails dans l'aperçu du lien.
  const isPublic = invitation.visibility === 'public'
  const first = invitation.events[0]
  const details =
    isPublic && first
      ? [formatFr(first.startsAt.toISOString(), { day: 'numeric', month: 'long', year: 'numeric' }), first.address || first.venue]
          .filter(Boolean)
          .join(' · ')
      : null

  const jpeg = await renderShareCard({
    partnerOne: invitation.partnerOne,
    partnerTwo: invitation.partnerTwo,
    eyebrow: isPublic ? 'Nous nous marions' : 'Vous êtes invité(e)',
    details,
    theme: invitation.theme,
    accentColor: invitation.accentColor,
    photo: isPublic && invitation.cover?.kind === 'image' ? await loadPhoto(invitation.cover.url) : null,
  })

  return new Response(new Uint8Array(jpeg), {
    headers: {
      'Content-Type': 'image/jpeg',
      'Content-Length': String(jpeg.length),
      // L'adresse de la vignette change à chaque modification (?v=…) : cache long sans risque.
      'Cache-Control': 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
    },
  })
}
