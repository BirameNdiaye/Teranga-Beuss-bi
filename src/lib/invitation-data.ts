import 'server-only'
import { cache } from 'react'
import { db } from './db'
import { buildView, type ImageView, type InvitationView } from './invitation-view'

export const mediaUrl = (key: string) => `/media/${key}`

type MediaRow = { key: string; kind: string; alt: string; width: number | null; height: number | null }

const toImage = (media: MediaRow | null | undefined, fallbackAlt: string): ImageView | null =>
  media && media.kind === 'image'
    ? {
        url: mediaUrl(media.key),
        alt: media.alt || fallbackAlt,
        width: media.width ?? 1200,
        height: media.height ?? 1500,
      }
    : null

const invitationInclude = {
  cover: true,
  video: true,
  music: true,
  events: { orderBy: { position: 'asc' as const } },
  gallery: { orderBy: { position: 'asc' as const }, include: { media: true } },
  contacts: { orderBy: { position: 'asc' as const } },
  guestbook: {
    where: { status: 'approved' as const },
    orderBy: { createdAt: 'desc' as const },
    take: 30,
  },
}

type LoadedInvitation = NonNullable<Awaited<ReturnType<typeof loadInvitationRow>>>

const loadInvitationRow = (where: { slug: string } | { id: string }) =>
  db.invitation.findUnique({ where: where as { slug: string }, include: invitationInclude })

export function toInvitationView(row: LoadedInvitation): InvitationView {
  const names = `${row.partnerOne} & ${row.partnerTwo}`
  return buildView({
    id: row.id,
    slug: row.slug,
    partnerOne: row.partnerOne,
    partnerTwo: row.partnerTwo,
    story: row.story ?? '',
    thankYouMessage: row.thankYouMessage ?? '',
    shareMessage: row.shareMessage ?? '',
    events: row.events.map((event) => ({
      id: event.id,
      startsAt: event.startsAt.toISOString(),
      category: event.category,
      title: event.title,
      venue: event.venue ?? '',
      address: event.address ?? '',
      mapsUrl: event.mapsUrl,
      latitude: event.latitude == null ? null : Number(event.latitude),
      longitude: event.longitude == null ? null : Number(event.longitude),
    })),
    cover: toImage(row.cover, names),
    gallery: row.gallery
      .map((item, index) => toImage(item.media, `${names} — photo ${index + 1}`))
      .filter((image): image is ImageView => image !== null),
    musicUrl: row.music?.kind === 'audio' ? mediaUrl(row.music.key) : null,
    videoUrl: row.video?.kind === 'video' ? mediaUrl(row.video.key) : null,
    theme: row.theme,
    fontPair: row.fontPair,
    heroLayout: row.heroLayout,
    overlay: row.overlay,
    accentColor: row.accentColor,
    animations: row.animations,
    rsvpDeadline: row.rsvpDeadline?.toISOString() ?? null,
    visibility: row.visibility,
    contacts: row.contacts.map(({ id, name, role, whatsapp }) => ({ id, name, role, whatsapp })),
    guestbook: row.guestbook.map((entry) => ({
      id: entry.id,
      author: entry.author,
      message: entry.message,
      createdAt: entry.createdAt.toISOString(),
    })),
  })
}

/** Invitation publiée, quelle que soit sa visibilité (le contenu protégé est filtré par l'appelant). */
export const getPublishedInvitation = cache(async (slug: string) => {
  const row = await loadInvitationRow({ slug })
  return row && row.status === 'published' ? row : null
})

/** Invitation pour l'aperçu du constructeur (tous statuts). */
export const getInvitationById = (id: string) => loadInvitationRow({ id })
