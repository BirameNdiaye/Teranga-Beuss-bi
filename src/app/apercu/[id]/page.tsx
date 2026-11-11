import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { requireManagedInvitation } from '@/lib/access'
import { getInvitationById, toInvitationView } from '@/lib/invitation-data'
import { PreviewClient } from './PreviewClient'

export const metadata: Metadata = { title: 'Aperçu', robots: { index: false } }

/** Rendu de l'aperçu, chargé dans une iframe par le constructeur. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { invitation } = await requireManagedInvitation((await params).id)
  const row = await getInvitationById(invitation.id)
  if (!row) notFound()
  return <PreviewClient initialView={toInvitationView(row)} />
}
