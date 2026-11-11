import { notFound } from 'next/navigation'
import { requireManagedInvitation } from '@/lib/access'
import { toDakarInput } from '@/lib/dates'
import { db } from '@/lib/db'
import { getInvitationById } from '@/lib/invitation-data'
import { usesBlob } from '@/lib/storage'
import type { InvitationInput } from '@/lib/invitation-schema'
import { Builder, type LibraryMedia } from './Builder'

export default async function EditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, invitation } = await requireManagedInvitation((await params).id)
  const row = await getInvitationById(invitation.id)
  if (!row) notFound()

  const [media, coOrganizers] = await Promise.all([
    db.media.findMany({
      where: { ownerId: { in: [row.ownerId, user.id] } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    db.coOrganizer.findMany({
      where: { invitationId: row.id },
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ])

  const initial: InvitationInput = {
    partnerOne: row.partnerOne,
    partnerTwo: row.partnerTwo,
    slug: row.slug,
    story: row.story ?? '',
    thankYouMessage: row.thankYouMessage ?? '',
    shareMessage: row.shareMessage ?? '',
    theme: row.theme,
    fontPair: row.fontPair,
    heroLayout: row.heroLayout,
    overlay: row.overlay,
    accentColor: row.accentColor ?? '',
    animations: row.animations,
    visibility: row.visibility,
    accessCode: '',
    clearAccessCode: false,
    rsvpDeadline: row.rsvpDeadline ? toDakarInput(row.rsvpDeadline) : '',
    coverId: row.coverId,
    videoId: row.videoId,
    musicId: row.musicId,
    gallery: row.gallery.map((item) => item.mediaId),
    events: row.events.map((event) => ({
      id: event.id,
      startsAt: toDakarInput(event.startsAt),
      category: event.category,
      title: event.title,
      venue: event.venue ?? '',
      address: event.address ?? '',
      latitude: event.latitude == null ? null : Number(event.latitude),
      longitude: event.longitude == null ? null : Number(event.longitude),
      mapsUrl: event.mapsUrl ?? '',
    })),
    contacts: row.contacts.map(({ id, name, role, phone, whatsapp }) => ({ id, name, role, phone, whatsapp })),
  }

  const library: LibraryMedia[] = media.map((item) => ({
    id: item.id,
    url: item.url,
    kind: item.kind,
    width: item.width,
    height: item.height,
    alt: item.alt,
  }))

  return (
    <Builder
      invitationId={row.id}
      initial={initial}
      library={library}
      status={row.status}
      hasAccessCode={Boolean(row.accessCodeHash)}
      isOwner={row.ownerId === user.id}
      upload={{ mode: usesBlob() ? 'blob' : 'local', userId: user.id }}
      coOrganizers={coOrganizers.map((c) => c.user)}
      guestbook={row.guestbook.map((entry) => ({
        id: entry.id,
        author: entry.author,
        message: entry.message,
        createdAt: entry.createdAt.toISOString(),
      }))}
    />
  )
}
