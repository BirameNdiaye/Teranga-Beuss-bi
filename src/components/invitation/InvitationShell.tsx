'use client'

import { useEffect, useState, useTransition, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import { loadGuest, unlockInvitation } from '@/app/i/[slug]/actions'
import { LanguageProvider, LanguageSwitcher, useLanguage } from '@/lib/i18n/client'
import { themeStyle, type InvitationView } from '@/lib/invitation-view'
import { GuestContextProvider, type PersonalGuest } from './guest-context'
import { GuestExperience } from './GuestExperience'
import { InvitationBody } from './InvitationBody'
import { guestInputClass, isKey } from './RsvpForm'

const readToken = () => {
  const token = new URLSearchParams(window.location.search).get('g')
  return token && /^[\w-]{16,64}$/.test(token) ? token : null
}

export function ThemeFrame({
  view,
  children,
  className = '',
}: {
  view: Pick<InvitationView, 'theme' | 'accentColor' | 'fontPair' | 'animations'>
  children: ReactNode
  className?: string
}) {
  return (
    <div
      style={themeStyle(view) as CSSProperties}
      data-animations={view.animations ? 'on' : 'off'}
      className={`font-pair-${view.fontPair} relative min-h-screen overflow-x-clip bg-(--inv-bg) font-(family-name:--font-sans) text-(--inv-ink) ${className}`}
    >
      {children}
    </div>
  )
}

/** Invitation publique : le contenu est rendu (et mis en cache) côté serveur. */
export function PublicInvitation({ view, children }: { view: InvitationView; children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [guest, setGuest] = useState<PersonalGuest | null>(null)

  useEffect(() => {
    const found = readToken()
    if (!found) return
    setToken(found)
    loadGuest(view.slug, found).then(setGuest).catch(() => setGuest(null))
  }, [view.slug])

  return (
    <LanguageProvider>
      <GuestContextProvider
        value={{ slug: view.slug, invitationId: view.id, token, guest, accessCode: null, preview: false }}
      >
        <ThemeFrame view={view}>
          {/* La clé force une nouvelle enveloppe personnalisée une fois l'invité chargé. */}
          <GuestExperience key={guest ? 'guest' : 'anon'} view={view}>
            {children}
          </GuestExperience>
        </ThemeFrame>
      </GuestContextProvider>
    </LanguageProvider>
  )
}

type Teaser = Pick<
  InvitationView,
  'slug' | 'partnerOne' | 'partnerTwo' | 'theme' | 'accentColor' | 'fontPair' | 'animations' | 'visibility'
>

/** Invitation protégée : rien n'est envoyé au navigateur avant le code ou le lien personnel. */
export function ProtectedInvitation({ teaser }: { teaser: Teaser }) {
  return (
    <LanguageProvider>
      <ProtectedInner teaser={teaser} />
    </LanguageProvider>
  )
}

function ProtectedInner({ teaser }: { teaser: Teaser }) {
  const { t } = useLanguage()
  const [state, setState] = useState<{
    view: InvitationView
    guest: PersonalGuest | null
    token: string | null
    code: string | null
  } | null>(null)
  const [checking, setChecking] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const token = readToken()
    unlockInvitation(teaser.slug, { token })
      .then((result) => {
        if (result.ok) setState({ view: result.view, guest: result.guest, token, code: null })
      })
      .finally(() => setChecking(false))
  }, [teaser.slug])

  if (state) {
    return (
      <GuestContextProvider
        value={{
          slug: state.view.slug,
          invitationId: state.view.id,
          token: state.token,
          guest: state.guest,
          accessCode: state.code,
          preview: false,
        }}
      >
        <ThemeFrame view={state.view}>
          <GuestExperience view={state.view}>
            <InvitationBody view={state.view} />
          </GuestExperience>
        </ThemeFrame>
      </GuestContextProvider>
    )
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const code = String(new FormData(event.currentTarget).get('code') ?? '').trim()
    if (!code) return
    startTransition(async () => {
      const result = await unlockInvitation(teaser.slug, { code })
      if (result.ok) setState({ view: result.view, guest: result.guest, token: null, code })
      else setError(isKey(result.error) ? t(result.error) : result.error)
    })
  }

  return (
    <ThemeFrame view={teaser} className="grid place-items-center px-4">
      <div className="absolute top-4 right-4 rounded-full bg-(--inv-primary)/85 p-1">
        <LanguageSwitcher />
      </div>
      <div className="w-full max-w-sm py-16 text-center">
        <p className="font-(family-name:--font-caps) text-xs font-semibold tracking-[0.4em] text-(--inv-accent) uppercase">
          {t('gate.title')}
        </p>
        <h1 className="names mt-4 font-(family-name:--font-names) text-5xl text-(--inv-primary)">
          {teaser.partnerOne} <span className="text-(--inv-accent)">&amp;</span> {teaser.partnerTwo}
        </h1>
        {checking ? (
          <p className="mt-8 text-sm text-(--inv-muted)" aria-live="polite">
            …
          </p>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-3">
            <p className="text-sm text-(--inv-muted)">{t('gate.text')}</p>
            {teaser.visibility === 'code' && (
              <>
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
                  className="min-h-12 w-full rounded-xl bg-(--inv-primary) text-sm font-semibold text-white disabled:opacity-60"
                >
                  {t('gate.submit')}
                </button>
              </>
            )}
          </form>
        )}
      </div>
    </ThemeFrame>
  )
}
