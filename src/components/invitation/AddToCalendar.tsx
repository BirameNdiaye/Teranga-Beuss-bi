'use client'

import { useState } from 'react'
import { useLanguage } from '@/lib/i18n/client'
import type { EventView } from '@/lib/invitation-view'

const googleDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')

export function AddToCalendar({ slug, event, names }: { slug: string; event: EventView; names: string }) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const start = new Date(event.startsAt)
  const end = new Date(start.getTime() + 3 * 60 * 60_000)
  const google = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    `${event.title} — ${names}`,
  )}&dates=${googleDate(start)}/${googleDate(end)}&location=${encodeURIComponent(
    [event.venue, event.address].filter(Boolean).join(', '),
  )}&ctz=Africa/Dakar`

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-(--inv-accent)/40 bg-(--inv-surface) px-4 text-xs font-medium text-(--inv-primary) transition hover:border-(--inv-accent)"
      >
        <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
        {t('program.calendar')}
      </button>
      {open && (
        <div className="absolute left-0 z-20 mt-2 w-48 overflow-hidden rounded-xl border border-(--inv-accent)/20 bg-(--inv-surface) shadow-lg">
          <a href={google} target="_blank" rel="noreferrer" className="block px-4 py-3 text-sm hover:bg-(--inv-accent)/10">
            {t('program.google')}
          </a>
          <a
            href={`/i/${slug}/calendrier/${event.id}`}
            download
            className="block px-4 py-3 text-sm hover:bg-(--inv-accent)/10"
          >
            {t('program.ics')}
          </a>
        </div>
      )}
    </div>
  )
}
