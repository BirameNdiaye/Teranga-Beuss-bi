import 'server-only'
import { notFound } from 'next/navigation'
import { db } from './db'
import { requireUser } from './auth'

/** Filtre Prisma : invitations que l'utilisateur possède ou co-organise. */
export const managedBy = (userId: string) => ({
  OR: [{ ownerId: userId }, { coOrganizers: { some: { userId } } }],
})

/**
 * Charge une invitation que l'utilisateur connecté peut gérer.
 * Répond 404 dans tous les autres cas, pour ne pas révéler son existence.
 */
export async function requireManagedInvitation(invitationId: string) {
  const user = await requireUser()
  const invitation = await db.invitation.findFirst({
    where: { id: invitationId, ...managedBy(user.id) },
  })
  if (!invitation) notFound()
  return { user, invitation }
}

export async function canManage(userId: string, invitationId: string) {
  const count = await db.invitation.count({ where: { id: invitationId, ...managedBy(userId) } })
  return count > 0
}
