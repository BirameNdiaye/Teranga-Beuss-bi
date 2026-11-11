import { redirect } from 'next/navigation'

export default async function InvitationIndex({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/tableau-de-bord/${(await params).id}/editer`)
}
