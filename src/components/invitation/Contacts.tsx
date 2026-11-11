'use client'

import { useEffect, useState, useTransition, type FormEvent } from 'react'
import { revealContacts } from '@/app/i/[slug]/actions'
import { useLanguage } from '@/lib/i18n/client'
import type { ContactView } from '@/lib/invitation-view'
import { useGuest } from './guest-context'
import { guestInputClass, isKey } from './RsvpForm'
import { Section } from './sections'
import { WhatsAppIcon } from './ShareSection'

const digits = (phone: string) => phone.replace(/[^\d]/g, '')

export function Contacts({ contacts }: { contacts: ContactView[] }) {
  const { t } = useLanguage()
  const { slug, token, accessCode, preview } = useGuest()
  const [phones, setPhones] = useState<Record<string, string> | null>(null)
  const [locked, setLocked] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (preview || !contacts.length) return
    revealContacts(slug, { token, code: accessCode }).then((result) => {
      if (result.ok) setPhones(result.phones)
      else setLocked(true)
    })
  }, [slug, token, accessCode, preview, contacts.length])

  if (!contacts.length) return null

  const unlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '')
    startTransition(async () => {
      const result = await revealContacts(slug, { token, code })
      if (result.ok) {
        setPhones(result.phones)
        setLocked(false)
        setError(null)
      } else setError(isKey(result.error) ? t(result.error) : result.error)
    })
  }

  return (
    <Section className="pt-0 pb-40 sm:pt-0 sm:pb-44">
      <div className="mx-auto max-w-md text-center">
        <p className="font-(family-name:--font-caps) text-xs font-semibold tracking-[0.32em] text-(--inv-accent) uppercase">
          {t('contacts.eyebrow')}
        </p>
        <p className="mt-2 mb-8 text-sm text-(--inv-muted)">{t('contacts.subtitle')}</p>
        <ul className="space-y-4">
          {contacts.map((contact) => {
            const phone = phones?.[contact.id]
            return (
              <li key={contact.id} className="rounded-2xl bg-(--inv-surface) p-5 shadow-sm">
                <p className="font-(family-name:--font-text) text-xl">{contact.name}</p>
                <p className="font-(family-name:--font-caps) text-xs tracking-[0.25em] text-(--inv-accent) uppercase">
                  {contact.role}
                </p>
                {phone && (
                  <>
                    <p className="mt-2 text-sm tabular-nums">{phone}</p>
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <a
                        href={`tel:${phone.replace(/\s/g, '')}`}
                        className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-(--inv-primary) text-sm font-semibold text-white"
                      >
                        ✆ {t('contacts.call')}
                      </a>
                      {contact.whatsapp && (
                        <a
                          href={`https://wa.me/${digits(phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-(--inv-primary) text-sm font-semibold text-(--inv-primary)"
                        >
                          <WhatsAppIcon /> {t('contacts.whatsapp')}
                        </a>
                      )}
                    </div>
                  </>
                )}
              </li>
            )
          })}
        </ul>
        {locked && !phones && (
          <form onSubmit={unlock} className="mt-6 space-y-3 rounded-2xl border border-dashed border-(--inv-accent)/50 p-5">
            <p className="text-sm text-(--inv-muted)">{t('contacts.locked')}</p>
            <input
              name="code"
              autoComplete="off"
              aria-label={t('contacts.code')}
              placeholder={t('contacts.code')}
              className={guestInputClass}
            />
            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="min-h-11 w-full rounded-xl bg-(--inv-primary) text-sm font-semibold text-white disabled:opacity-60"
            >
              {t('contacts.unlock')}
            </button>
          </form>
        )}
      </div>
    </Section>
  )
}
