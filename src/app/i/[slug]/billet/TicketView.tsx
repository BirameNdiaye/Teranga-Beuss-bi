'use client'

import Link from 'next/link'
import { LanguageProvider, LanguageSwitcher, useLanguage } from '@/lib/i18n/client'

type Props = {
  slug: string
  names: string
  guestName: string
  partySize: number
  qrSvg: string
  startsAt: string | null
  place: string
  checkedInAt: string | null
  showLanguageSwitcher: boolean
}

export function TicketView(props: Props) {
  return (
    <LanguageProvider locked={!props.showLanguageSwitcher}>
      <Ticket {...props} />
    </LanguageProvider>
  )
}

function Ticket({ slug, names, guestName, partySize, qrSvg, startsAt, place, checkedInAt, showLanguageSwitcher }: Props) {
  const { t, formatDate } = useLanguage()
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-10">
      {showLanguageSwitcher && (
        <div className="liquid-glass mb-6 self-end rounded-full bg-(--inv-primary) p-1">
          <LanguageSwitcher />
        </div>
      )}
      <article className="w-full overflow-hidden rounded-3xl bg-(--inv-surface) text-center shadow-[0_30px_60px_-30px_rgb(0_0_0/0.45)]">
        <header className="bg-(--inv-primary) px-6 py-6 text-white">
          <p className="font-(family-name:--font-caps) text-[11px] tracking-[0.35em] uppercase opacity-85">
            {t('ticket.title')}
          </p>
          <h1 className="names mt-2 font-(family-name:--font-names) text-4xl">{names}</h1>
          {startsAt && (
            <p className="mt-2 text-sm opacity-90">
              {formatDate(startsAt, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}
          {place && <p className="text-xs opacity-80">{place}</p>}
        </header>
        <div className="relative px-6 py-8">
          <span className="absolute top-0 -left-3 size-6 -translate-y-1/2 rounded-full bg-(--inv-bg)" aria-hidden />
          <span className="absolute top-0 -right-3 size-6 -translate-y-1/2 rounded-full bg-(--inv-bg)" aria-hidden />
          <p className="font-(family-name:--font-text) text-xl">{t('ticket.for', { name: guestName })}</p>
          <p className="text-sm text-(--inv-muted)">{t('ticket.party', { count: partySize })}</p>
          <div
            role="img"
            aria-label="QR code"
            className="mx-auto mt-6 w-60 rounded-2xl bg-white p-3 shadow-inner [&_svg]:h-auto [&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <p className="mt-4 text-sm text-(--inv-muted)">
            {checkedInAt
              ? t('ticket.used', { date: formatDate(checkedInAt, { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }) })
              : t('ticket.show')}
          </p>
        </div>
      </article>
      <Link href={`/i/${slug}`} className="mt-6 min-h-11 text-sm text-(--inv-primary) underline underline-offset-4">
        {t('ticket.back')}
      </Link>
      <p className="mt-2 text-xs text-(--inv-muted)">{t('offline.ready')}</p>
    </main>
  )
}
