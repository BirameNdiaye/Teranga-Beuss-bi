'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/client'
import type { DictionaryKey } from '@/lib/i18n/dictionaries'

const UNITS: [DictionaryKey, number][] = [
  ['countdown.days', 86_400_000],
  ['countdown.hours', 3_600_000],
  ['countdown.minutes', 60_000],
  ['countdown.seconds', 1_000],
]

const split = (remaining: number) => {
  let rest = Math.max(remaining, 0)
  return UNITS.map(([label, size]) => {
    const value = Math.floor(rest / size)
    rest -= value * size
    return { label, value: String(value).padStart(2, '0') }
  })
}

export function Countdown({ target, initials }: { target: string; initials: string }) {
  const { t } = useLanguage()
  // Tirets au rendu serveur, pour que le HTML du serveur et du client soit identique.
  const [now, setNow] = useState<number | null>(null)

  useEffect(() => {
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const remaining = now === null ? null : new Date(target).getTime() - now
  const units = remaining === null ? UNITS.map(([label]) => ({ label, value: '--' })) : split(remaining)
  const done = remaining !== null && remaining <= 0

  return (
    <section className="inv-reveal relative overflow-hidden px-4 py-14 text-center sm:py-20">
      <span
        className="pointer-events-none absolute inset-0 grid place-items-center font-(family-name:--font-script) text-[9rem] leading-none text-(--inv-accent)/15 select-none sm:text-[12rem]"
        aria-hidden
      >
        {initials}
      </span>
      <div className="relative">
        <p className="mb-6 font-(family-name:--font-caps) text-xs font-semibold tracking-[0.32em] text-(--inv-muted) uppercase">
          {t(done ? 'countdown.today' : 'countdown.label')}
        </p>
        <div className="flex justify-center gap-3 sm:gap-5" role="timer" aria-live="off">
          {units.map(({ label, value }) => (
            <div
              key={label}
              className="w-16 rounded-xl bg-[linear-gradient(160deg,color-mix(in_srgb,var(--inv-primary),white_14%),var(--inv-primary))] py-3 text-white shadow-[0_14px_30px_-14px_rgb(0_0_0/0.5)] sm:w-20 sm:py-4"
            >
              <p className="font-(family-name:--font-text) text-2xl tabular-nums sm:text-3xl">{value}</p>
              <p className="mt-1 font-(family-name:--font-caps) text-xs tracking-[0.2em] uppercase opacity-85">{t(label)}</p>
            </div>
          ))}
        </div>
        {/* Annonce accessible, mise à jour à la minute seulement. */}
        <p className="sr-only" aria-live="polite">
          {remaining !== null && !done && units.slice(0, 3).map((u) => `${u.value} ${t(u.label)}`).join(', ')}
        </p>
      </div>
    </section>
  )
}
