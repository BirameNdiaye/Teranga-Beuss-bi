import type { ReactNode } from 'react'
import { requireManagedInvitation } from '@/lib/access'
import { InvitationTabs } from './InvitationTabs'

export default async function InvitationLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const { invitation } = await requireManagedInvitation((await params).id)
  return (
    <>
      <div className="border-b border-cocoa-900/8 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 pt-4 sm:px-6">
          <h1 className="font-(family-name:--font-script) text-3xl text-cocoa-700">
            {invitation.partnerOne} &amp; {invitation.partnerTwo}
          </h1>
          <InvitationTabs id={invitation.id} slug={invitation.slug} published={invitation.status === 'published'} />
        </div>
      </div>
      {children}
    </>
  )
}
