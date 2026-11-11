'use server'

import { requireManagedInvitation } from '@/lib/access'
import { db } from '@/lib/db'
import { Prisma } from '@/generated/prisma/client'

export type CheckInResult =
  | { status: 'ok'; name: string; partySize: number }
  | { status: 'already'; name: string; partySize: number; at: string }
  | { status: 'declined'; name: string }
  | { status: 'unknown' }

async function checkIn(invitationId: string, where: { ticketToken: string } | { id: string }, userId: string) {
  const rsvp = await db.rsvp.findFirst({ where: { ...where, invitationId }, include: { checkIn: true } })
  if (!rsvp) return { status: 'unknown' } satisfies CheckInResult
  if (rsvp.attendance === 'no') return { status: 'declined', name: rsvp.name } satisfies CheckInResult
  if (rsvp.checkIn) {
    return { status: 'already', name: rsvp.name, partySize: rsvp.partySize, at: rsvp.checkIn.createdAt.toISOString() } satisfies CheckInResult
  }
  try {
    await db.checkIn.create({ data: { rsvpId: rsvp.id, scannedById: userId } })
  } catch (error) {
    // Deux scanners en même temps : la contrainte unique garantit un seul passage.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const existing = await db.checkIn.findUnique({ where: { rsvpId: rsvp.id } })
      return { status: 'already', name: rsvp.name, partySize: rsvp.partySize, at: (existing?.createdAt ?? new Date()).toISOString() } satisfies CheckInResult
    }
    throw error
  }
  return { status: 'ok', name: rsvp.name, partySize: rsvp.partySize } satisfies CheckInResult
}

export async function scanTicket(invitationId: string, payload: string): Promise<CheckInResult> {
  const { user } = await requireManagedInvitation(invitationId)
  // Accepte le contenu du QR (« TI:jeton ») ou le jeton saisi à la main.
  const token = /^(?:TI:)?([\w-]{16,64})$/.exec(payload.trim())?.[1]
  if (!token) return { status: 'unknown' }
  return checkIn(invitationId, { ticketToken: token }, user.id)
}

export async function checkInManually(invitationId: string, rsvpId: string): Promise<CheckInResult> {
  const { user } = await requireManagedInvitation(invitationId)
  return checkIn(invitationId, { id: rsvpId }, user.id)
}

export async function arrivals(invitationId: string) {
  await requireManagedInvitation(invitationId)
  const rsvps = await db.rsvp.findMany({
    where: { invitationId, attendance: { not: 'no' } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, partySize: true, attendance: true, checkIn: { select: { createdAt: true } } },
  })
  return rsvps.map((r) => ({
    id: r.id,
    name: r.name,
    partySize: r.partySize,
    maybe: r.attendance === 'maybe',
    arrivedAt: r.checkIn?.createdAt.toISOString() ?? null,
  }))
}
