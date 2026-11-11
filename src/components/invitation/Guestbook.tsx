'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { signGuestbook } from '@/app/i/[slug]/actions'
import { useLanguage } from '@/lib/i18n/client'
import type { GuestbookView } from '@/lib/invitation-view'
import { useGuest } from './guest-context'
import { GuestField, guestInputClass, isKey } from './RsvpForm'
import { Section, SectionHeading } from './sections'

export function Guestbook({ entries }: { entries: GuestbookView[] }) {
  const { t, formatDate } = useLanguage()
  const { slug, token, accessCode, guest, preview } = useGuest()
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null)
  const [errors, setErrors] = useState<Partial<Record<'author' | 'message', string>>>({})
  const [pending, startTransition] = useTransition()

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (preview) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    startTransition(async () => {
      const result = await signGuestbook(slug, {
        token,
        code: accessCode,
        values: { author: form.get('author'), message: form.get('message') },
      })
      if (result.ok) {
        formElement.reset()
        setErrors({})
        setStatus({ ok: true, message: t('guestbook.thanks') })
      } else {
        setErrors(result.fields ?? {})
        setStatus({ ok: false, message: isKey(result.error) ? t(result.error) : result.error })
      }
    })
  }

  return (
    <Section id="livre" className="pt-0 sm:pt-0">
      <div className="mx-auto max-w-2xl">
        <SectionHeading eyebrow="guestbook.eyebrow" title="guestbook.title" script />
        {entries.length ? (
          <ul className="mb-10 grid gap-4 sm:grid-cols-2">
            {entries.map((entry, index) => (
              <li
                key={entry.id}
                className={`rounded-2xl bg-(--inv-surface) p-5 shadow-[0_14px_30px_-22px_rgb(0_0_0/0.4)] ${
                  index % 2 ? 'sm:translate-y-4 sm:rotate-1' : 'sm:-rotate-1'
                }`}
              >
                <p className="font-(family-name:--font-text) leading-relaxed">« {entry.message} »</p>
                <p className="mt-3 text-xs text-(--inv-muted)">
                  <span className="font-semibold text-(--inv-accent)">{entry.author}</span> ·{' '}
                  {formatDate(entry.createdAt, { day: 'numeric', month: 'long' })}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-8 text-center text-sm text-(--inv-muted)">{t('guestbook.empty')}</p>
        )}

        <form onSubmit={onSubmit} noValidate className="mx-auto max-w-md space-y-4">
          <GuestField label={t('guestbook.author')} error={errors.author && t('error.fix')}>
            <input
              name="author"
              required
              maxLength={100}
              defaultValue={guest?.name}
              aria-invalid={Boolean(errors.author)}
              className={guestInputClass}
            />
          </GuestField>
          <GuestField label={t('guestbook.message')} error={errors.message && t('error.fix')}>
            <textarea
              name="message"
              required
              rows={3}
              maxLength={600}
              aria-invalid={Boolean(errors.message)}
              className={guestInputClass}
            />
          </GuestField>
          {status && (
            <p
              role={status.ok ? 'status' : 'alert'}
              className={`rounded-xl px-4 py-3 text-sm ${status.ok ? 'bg-(--inv-accent)/10' : 'bg-red-50 text-red-800'}`}
            >
              {status.message}
            </p>
          )}
          <button
            type="submit"
            disabled={pending || preview}
            className="min-h-12 w-full rounded-xl border border-(--inv-primary) font-(family-name:--font-caps) text-sm font-semibold tracking-wider text-(--inv-primary) uppercase transition hover:bg-(--inv-primary) hover:text-white disabled:opacity-60"
          >
            {t('guestbook.send')}
          </button>
        </form>
      </div>
    </Section>
  )
}
