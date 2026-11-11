'use server'

import { revalidatePath } from 'next/cache'
import { requireManagedInvitation } from '@/lib/access'
import { db } from '@/lib/db'
import { revalidateInvitation } from '@/lib/revalidate'

export async function moderateGuestbook(invitationId: string, entryId: string, decision: 'approved' | 'rejected') {
  const { invitation } = await requireManagedInvitation(invitationId)
  if (decision !== 'approved' && decision !== 'rejected') return { ok: false as const }
  await db.guestbookEntry.updateMany({ where: { id: entryId, invitationId }, data: { status: decision } })
  revalidateInvitation(invitation.slug)
  revalidatePath(`/tableau-de-bord/${invitationId}/reponses`)
  return { ok: true as const }
}

export async function deleteRsvp(invitationId: string, rsvpId: string) {
  await requireManagedInvitation(invitationId)
  await db.rsvp.deleteMany({ where: { id: rsvpId, invitationId } })
  revalidatePath(`/tableau-de-bord/${invitationId}/reponses`)
  return { ok: true as const }
}
