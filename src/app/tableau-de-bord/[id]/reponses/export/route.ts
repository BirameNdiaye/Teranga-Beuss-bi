import { currentUser } from '@/lib/auth'
import { canManage } from '@/lib/access'
import { toCsv } from '@/lib/csv'
import { formatFr } from '@/lib/dates'
import { db } from '@/lib/db'

const attendance = { yes: 'Présent', maybe: 'Peut-être', no: 'Absent' } as const

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const userId = (await currentUser())?.id
  if (!userId || !(await canManage(userId, id))) return new Response('Introuvable', { status: 404 })

  const invitation = await db.invitation.findUnique({ where: { id }, select: { slug: true } })
  const rsvps = await db.rsvp.findMany({
    where: { invitationId: id },
    orderBy: { name: 'asc' },
    include: { guest: { select: { group: true, seats: true } }, checkIn: true },
  })

  const csv = toCsv([
    ['Nom', 'Téléphone', 'Réponse', 'Personnes', 'Places prévues', 'Groupe', 'Message', 'Arrivé', 'Date de réponse'],
    ...rsvps.map((r) => [
      r.name,
      r.phone ?? '',
      attendance[r.attendance],
      r.attendance === 'no' ? 0 : r.partySize,
      r.guest?.seats ?? '',
      r.guest?.group ?? '',
      r.message ?? '',
      r.checkIn ? formatFr(r.checkIn.createdAt.toISOString(), { dateStyle: 'short', timeStyle: 'short' }) : '',
      formatFr(r.updatedAt.toISOString(), { dateStyle: 'short', timeStyle: 'short' }),
    ]),
  ])

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="reponses-${invitation?.slug ?? id}.csv"`,
      'Cache-Control': 'no-store',
    },
  })
}
