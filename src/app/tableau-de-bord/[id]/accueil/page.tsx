import { requireManagedInvitation } from '@/lib/access'
import { arrivals } from './actions'
import { Scanner } from './Scanner'

export default async function WelcomeDeskPage({ params }: { params: Promise<{ id: string }> }) {
  const { invitation } = await requireManagedInvitation((await params).id)
  return (
    <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Scanner invitationId={invitation.id} initialArrivals={await arrivals(invitation.id)} />
    </main>
  )
}
