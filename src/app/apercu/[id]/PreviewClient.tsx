'use client'

import { useEffect, useState } from 'react'
import { GuestContextProvider } from '@/components/invitation/guest-context'
import { GuestExperience } from '@/components/invitation/GuestExperience'
import { InvitationBody } from '@/components/invitation/InvitationBody'
import { ThemeFrame } from '@/components/invitation/InvitationShell'
import { LanguageProvider } from '@/lib/i18n/client'
import type { InvitationView } from '@/lib/invitation-view'

export type PreviewMessage = { type: 'teranga-preview'; view: InvitationView; envelope: boolean; nonce: number }

export function PreviewClient({ initialView }: { initialView: InvitationView }) {
  const [view, setView] = useState(initialView)
  const [envelope, setEnvelope] = useState({ show: false, nonce: 0 })

  useEffect(() => {
    const onMessage = (event: MessageEvent<PreviewMessage>) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'teranga-preview') return
      setView(event.data.view)
      setEnvelope({ show: event.data.envelope, nonce: event.data.nonce })
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'teranga-preview-ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  return (
    <LanguageProvider>
      <GuestContextProvider
        value={{ slug: view.slug, invitationId: view.id, token: null, guest: null, accessCode: null, preview: true }}
      >
        <ThemeFrame view={view}>
          <GuestExperience key={envelope.nonce} view={view} skipEnvelope={!envelope.show}>
            <InvitationBody view={view} />
          </GuestExperience>
        </ThemeFrame>
      </GuestContextProvider>
    </LanguageProvider>
  )
}
