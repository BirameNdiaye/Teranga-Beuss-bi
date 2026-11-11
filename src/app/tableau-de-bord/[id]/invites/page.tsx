import { requireManagedInvitation } from '@/lib/access'
import { db } from '@/lib/db'
import { DEFAULT_SHARE } from '@/lib/invitation-view'
import { GuestManager, type GuestRow } from './GuestManager'

export default async function GuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { invitation } = await requireManagedInvitation((await params).id)
  const guests = await db.guest.findMany({
    where: { invitationId: invitation.id },
    orderBy: [{ group: 'asc' }, { name: 'asc' }],
    include: { rsvp: { select: { attendance: true, partySize: true } } },
  })

  const rows: GuestRow[] = guests.map((guest) => ({
    id: guest.id,
    name: guest.name,
    phone: guest.phone,
    seats: guest.seats,
    group: guest.group,
    token: guest.token,
    sentAt: guest.sentAt?.toISOString() ?? null,
    openedAt: guest.openedAt?.toISOString() ?? null,
    rsvp: guest.rsvp,
  }))

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <GuestManager
        invitationId={invitation.id}
        slug={invitation.slug}
        published={invitation.status === 'published'}
        shareMessage={invitation.shareMessage || DEFAULT_SHARE(invitation.partnerOne, invitation.partnerTwo)}
        guests={rows}
      />
    </main>
  )
}
