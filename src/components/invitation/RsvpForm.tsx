'use client'

import Link from 'next/link'
import { useState, useTransition, type FormEvent } from 'react'
import { submitRsvp, type RsvpField } from '@/app/i/[slug]/actions'
import { useLanguage } from '@/lib/i18n/client'
import { dictionaries, type DictionaryKey } from '@/lib/i18n/dictionaries'
import type { InvitationView } from '@/lib/invitation-view'
import { useGuest } from './guest-context'
import { Section, SectionHeading } from './sections'

const CHOICES = [
  { value: 'yes', label: 'rsvp.yes' },
  { value: 'maybe', label: 'rsvp.maybe' },
  { value: 'no', label: 'rsvp.no' },
] as const

export const guestInputClass =
  'w-full min-h-11 rounded-xl border border-(--inv-accent)/35 bg-(--inv-surface) px-4 py-3 text-sm text-(--inv-ink) outline-none transition placeholder:text-(--inv-muted) focus:border-(--inv-accent) focus:ring-3 focus:ring-(--inv-accent)/20 aria-invalid:border-red-600'

export const isKey = (value: string): value is DictionaryKey => value in dictionaries.fr

export function RsvpForm({ view }: { view: InvitationView }) {
  const { t, formatDate } = useLanguage()
  const { slug, token, guest, accessCode, preview } = useGuest()
  const existing = guest?.rsvp
  const [attendance, setAttendance] = useState<'yes' | 'no' | 'maybe'>(existing?.attendance ?? 'yes')
  const [errors, setErrors] = useState<Partial<Record<RsvpField, string>>>({})
  const [result, setResult] = useState<{ ok: boolean; message: string; ticket?: string | null } | null>(null)
  const [pending, startTransition] = useTransition()
  const maxSeats = guest?.seats ?? 10
  const label = (value: string) => (isKey(value) ? t(value, { count: maxSeats }) : value)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (preview) return
    const form = new FormData(event.currentTarget)
    startTransition(async () => {
      const response = await submitRsvp(slug, {
        token,
        code: accessCode,
        values: {
          name: form.get('name'),
          phone: form.get('phone') ?? '',
          attendance,
          partySize: form.get('partySize') ?? 1,
          message: form.get('message') ?? '',
        },
      })
      if (response.ok) {
        setErrors({})
        setResult({
          ok: true,
          message: t(attendance === 'no' ? 'rsvp.thanksNo' : 'rsvp.thanks'),
          ticket: response.ticketToken,
        })
      } else {
        setErrors(response.fields ?? {})
        setResult({ ok: false, message: label(response.error) })
      }
    })
  }

  return (
    <Section id="rsvp" className="pt-0 sm:pt-0">
      <div className="mx-auto max-w-md">
        <SectionHeading eyebrow="rsvp.eyebrow" title="rsvp.title" />
        {view.rsvpDeadline && view.rsvpOpen && (
          <p className="-mt-6 mb-8 text-center text-sm text-(--inv-muted)">
            {t('rsvp.before', { date: formatDate(view.rsvpDeadline, { day: 'numeric', month: 'long', year: 'numeric' }) })}
          </p>
        )}

        {!view.rsvpOpen ? (
          <p className="rounded-2xl bg-(--inv-surface) p-6 text-center text-sm text-(--inv-muted)">{t('rsvp.closed')}</p>
        ) : result?.ok ? (
          <div role="status" aria-live="polite" className="rounded-2xl bg-(--inv-surface) p-8 text-center shadow-sm">
            <p className="font-(family-name:--font-text) text-xl text-(--inv-primary)">{result.message}</p>
            <div className="mt-6 flex flex-col items-center gap-3">
              {result.ticket && (
                <Link
                  href={`/i/${slug}/billet?t=${result.ticket}`}
                  className="inline-flex min-h-11 items-center rounded-xl bg-(--inv-primary) px-6 text-sm font-semibold text-white"
                >
                  {t('rsvp.ticket')}
                </Link>
              )}
              <button type="button" onClick={() => setResult(null)} className="text-sm text-(--inv-primary) underline underline-offset-4">
                {t('rsvp.update')}
              </button>
            </div>
          </div>
        ) : (
          <form
            onSubmit={onSubmit}
            noValidate
            className="space-y-5 rounded-2xl bg-(--inv-surface)/85 p-5 shadow-[0_20px_50px_-30px_rgb(0_0_0/0.4)] sm:p-8"
          >
            {existing && <p className="rounded-xl bg-(--inv-accent)/10 px-4 py-3 text-sm">{t('rsvp.already')}</p>}
            <fieldset>
              <legend className="mb-3 font-(family-name:--font-caps) text-xs font-semibold tracking-wider text-(--inv-muted) uppercase">
                {t('rsvp.answer')}
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {CHOICES.map((choice) => (
                  <label
                    key={choice.value}
                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-1 text-center text-xs font-semibold transition has-focus-visible:ring-3 has-focus-visible:ring-(--inv-accent)/40 ${
                      attendance === choice.value
                        ? 'border-(--inv-primary) bg-(--inv-primary) text-white'
                        : 'border-(--inv-accent)/35 hover:border-(--inv-accent)'
                    }`}
                  >
                    <input
                      type="radio"
                      name="attendance"
                      value={choice.value}
                      checked={attendance === choice.value}
                      onChange={() => setAttendance(choice.value)}
                      className="sr-only"
                    />
                    {t(choice.label)}
                  </label>
                ))}
              </div>
            </fieldset>

            <GuestField label={t('rsvp.name')} error={errors.name && label(errors.name)}>
              <input
                name="name"
                required
                maxLength={120}
                autoComplete="name"
                defaultValue={guest?.name}
                aria-invalid={Boolean(errors.name)}
                className={guestInputClass}
                placeholder={t('rsvp.namePlaceholder')}
              />
            </GuestField>

            <div className="grid grid-cols-[1fr_6.5rem] gap-3">
              <GuestField label={t('rsvp.phone')} error={errors.phone && label(errors.phone)}>
                <input
                  name="phone"
                  type="tel"
                  maxLength={30}
                  autoComplete="tel"
                  aria-invalid={Boolean(errors.phone)}
                  className={guestInputClass}
                  placeholder="+221 …"
                />
              </GuestField>
              {attendance !== 'no' && (
                <GuestField label={t('rsvp.party')} error={errors.partySize && label(errors.partySize)}>
                  <input
                    name="partySize"
                    type="number"
                    min={1}
                    max={maxSeats}
                    defaultValue={existing?.partySize ?? 1}
                    aria-invalid={Boolean(errors.partySize)}
                    className={guestInputClass}
                  />
                </GuestField>
              )}
            </div>
            {guest && attendance !== 'no' && (
              <p className="-mt-2 text-xs text-(--inv-muted)">{t('rsvp.seats', { count: guest.seats })}</p>
            )}

            <GuestField label={t('rsvp.message')} error={errors.message && label(errors.message)}>
              <textarea name="message" rows={3} maxLength={500} defaultValue={existing?.message} className={guestInputClass} />
            </GuestField>

            {result && !result.ok && (
              <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
                {result.message}
              </p>
            )}

            <button
              type="submit"
              disabled={pending || preview}
              className="min-h-12 w-full rounded-xl bg-(--inv-primary) font-(family-name:--font-caps) text-sm font-semibold tracking-wider text-white uppercase shadow-lg transition hover:brightness-110 disabled:opacity-60"
            >
              {t(pending ? 'rsvp.sending' : 'rsvp.send')}
            </button>
          </form>
        )}
      </div>
    </Section>
  )
}

export function GuestField({ label, error, children }: { label: string; error?: string | false; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-(family-name:--font-caps) text-xs font-semibold tracking-wider text-(--inv-muted) uppercase">
        {label}
      </span>
      {children}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  )
}
