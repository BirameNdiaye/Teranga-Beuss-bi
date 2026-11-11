import type { CSSProperties } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import QRCode from 'qrcode'
import { db } from '@/lib/db'
import { themeStyle } from '@/lib/invitation-view'
import { TicketView } from './TicketView'

export const metadata: Metadata = { title: 'Billet d’entrée', robots: { index: false, follow: false } }

type Props = { params: Promise<{ slug: string }>; searchParams: Promise<{ t?: string }> }

export default async function TicketPage({ params, searchParams }: Props) {
  const [{ slug }, { t: token }] = await Promise.all([params, searchParams])
  if (!token || !/^[\w-]{16,64}$/.test(token)) notFound()

  const rsvp = await db.rsvp.findFirst({
    where: { ticketToken: token, attendance: { not: 'no' }, invitation: { slug, status: 'published' } },
    include: {
      checkIn: true,
      invitation: {
        select: {
          slug: true,
          partnerOne: true,
          partnerTwo: true,
          theme: true,
          accentColor: true,
          fontPair: true,
          showLanguageSwitcher: true,
          events: { orderBy: { startsAt: 'asc' }, take: 1 },
        },
      },
    },
  })
  if (!rsvp) notFound()

  // Le QR contient seulement le jeton du billet ; le scanner le vérifie côté serveur.
  const qr = await QRCode.toString(`TI:${rsvp.ticketToken}`, {
    type: 'svg',
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#2B1A10', light: '#FFFFFF' },
  })
  const { invitation } = rsvp
  const first = invitation.events[0]

  return (
    <div
      style={themeStyle(invitation) as CSSProperties}
      className={`font-pair-${invitation.fontPair} min-h-screen bg-(--inv-bg) text-(--inv-ink)`}
    >
      <TicketView
        slug={invitation.slug}
        names={`${invitation.partnerOne} & ${invitation.partnerTwo}`}
        guestName={rsvp.name}
        partySize={rsvp.partySize}
        qrSvg={qr}
        startsAt={first?.startsAt.toISOString() ?? null}
        place={[first?.venue, first?.address].filter(Boolean).join(' · ')}
        checkedInAt={rsvp.checkIn?.createdAt.toISOString() ?? null}
        showLanguageSwitcher={invitation.showLanguageSwitcher}
      />
    </div>
  )
}
