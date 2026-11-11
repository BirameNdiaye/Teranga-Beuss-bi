import { ghostButtonClass } from '@/components/ui'
import { requireManagedInvitation } from '@/lib/access'
import { formatFr } from '@/lib/dates'
import { db } from '@/lib/db'
import { AutoRefresh } from './AutoRefresh'
import { GuestbookModeration, ResponsesTable } from './ResponsesClient'

export default async function ResponsesPage({ params }: { params: Promise<{ id: string }> }) {
  const { invitation } = await requireManagedInvitation((await params).id)
  const [rsvps, guestCount, seatTotal, pending, checkIns] = await Promise.all([
    db.rsvp.findMany({
      where: { invitationId: invitation.id },
      orderBy: { updatedAt: 'desc' },
      include: { guest: { select: { group: true, seats: true } }, checkIn: { select: { createdAt: true } } },
    }),
    db.guest.count({ where: { invitationId: invitation.id } }),
    db.guest.aggregate({ where: { invitationId: invitation.id }, _sum: { seats: true } }),
    db.guestbookEntry.findMany({ where: { invitationId: invitation.id, status: 'pending' }, orderBy: { createdAt: 'desc' } }),
    db.checkIn.count({ where: { rsvp: { invitationId: invitation.id } } }),
  ])

  const by = (a: 'yes' | 'no' | 'maybe') => rsvps.filter((r) => r.attendance === a)
  const covers = by('yes').reduce((sum, r) => sum + r.partySize, 0)
  const maybeCovers = by('maybe').reduce((sum, r) => sum + r.partySize, 0)
  const answeredGuests = rsvps.filter((r) => r.guestId).length
  const rate = guestCount ? Math.round((answeredGuests / guestCount) * 100) : null

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <AutoRefresh seconds={20} />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-(family-name:--font-serif) text-2xl">Réponses</h2>
          <p className="text-sm text-cocoa-900/60">Mise à jour automatique toutes les 20 secondes.</p>
        </div>
        <a href={`/tableau-de-bord/${invitation.id}/reponses/export`} className={ghostButtonClass} download>
          ⬇ Exporter en CSV
        </a>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Stat label="Couverts confirmés" value={covers} accent />
        <Stat label="Présents" value={by('yes').length} />
        <Stat label="Peut-être" value={by('maybe').length} hint={`${maybeCovers} pers.`} />
        <Stat label="Absents" value={by('no').length} />
        <Stat
          label="Taux de réponse"
          value={rate === null ? "—" : `${rate}\u00a0%`}
          hint={guestCount ? `${answeredGuests}/${guestCount} invités nommés` : 'Aucun invité nommé'}
        />
        <Stat label="Arrivés (jour J)" value={checkIns} hint={`sur ${covers} couverts · ${seatTotal._sum.seats ?? 0} places prévues`} />
      </dl>

      <ResponsesTable
        invitationId={invitation.id}
        rows={rsvps.map((r) => ({
          id: r.id,
          name: r.name,
          phone: r.phone,
          attendance: r.attendance,
          partySize: r.partySize,
          message: r.message,
          group: r.guest?.group ?? null,
          personal: Boolean(r.guestId),
          updatedAt: formatFr(r.updatedAt.toISOString(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
          checkedIn: Boolean(r.checkIn),
        }))}
      />

      <GuestbookModeration
        invitationId={invitation.id}
        entries={pending.map((e) => ({ id: e.id, author: e.author, message: e.message, createdAt: e.createdAt.toISOString() }))}
      />
    </main>
  )
}

function Stat({ label, value, hint, accent }: { label: string; value: number | string; hint?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm ${accent ? 'bg-cocoa-700 text-white' : 'bg-white'}`}>
      <dt className={`text-xs tracking-wide uppercase ${accent ? 'text-white/80' : 'text-cocoa-900/60'}`}>{label}</dt>
      <dd className="mt-1 font-(family-name:--font-serif) text-3xl">{value}</dd>
      {hint && <dd className={`text-xs ${accent ? 'text-white/75' : 'text-cocoa-900/55'}`}>{hint}</dd>}
    </div>
  )
}
