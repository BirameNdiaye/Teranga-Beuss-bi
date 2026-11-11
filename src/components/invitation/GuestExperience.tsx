'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { LanguageSwitcher, useLanguage } from '@/lib/i18n/client'
import type { DictionaryKey } from '@/lib/i18n/dictionaries'
import type { InvitationView } from '@/lib/invitation-view'
import { useGuest } from './guest-context'

export type NavSection = { id: string; label: DictionaryKey }

export function navSections(view: InvitationView): NavSection[] {
  return [
    view.story && { id: 'histoire', label: 'nav.histoire' },
    view.events.length && { id: 'programme', label: 'nav.programme' },
    view.events.some((event) => event.mapQuery) && { id: 'lieux', label: 'nav.lieux' },
    view.gallery.length && { id: 'galerie', label: 'nav.galerie' },
    { id: 'rsvp', label: 'nav.rsvp' },
    { id: 'livre', label: 'nav.livre' },
    { id: 'merci', label: 'nav.merci' },
  ].filter(Boolean) as NavSection[]
}

export function GuestExperience({
  view,
  children,
  skipEnvelope = false,
  embedded = false,
}: {
  view: InvitationView
  children: ReactNode
  skipEnvelope?: boolean
  /** Aperçu du constructeur : pas de verrouillage du défilement de la page. */
  embedded?: boolean
}) {
  const { t } = useLanguage()
  const sections = navSections(view)
  const [stage, setStage] = useState<'closed' | 'opening' | 'open'>(skipEnvelope ? 'open' : 'closed')
  const [playing, setPlaying] = useState(false)
  const [active, setActive] = useState(sections[0]?.id ?? '')
  const audioRef = useRef<HTMLAudioElement>(null)

  useEffect(() => {
    if (embedded) return
    document.documentElement.style.overflow = stage === 'open' ? '' : 'hidden'
    return () => {
      document.documentElement.style.overflow = ''
    }
  }, [stage, embedded])

  useEffect(() => {
    if (stage !== 'open') return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting)
        if (visible) setActive(visible.target.id)
      },
      { rootMargin: '-45% 0px -50% 0px' },
    )
    for (const { id } of sections) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [stage, sections])

  const openEnvelope = () => {
    if (stage !== 'closed') return
    setStage('opening')
    const audio = audioRef.current
    if (audio) {
      audio.volume = 0.5
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false))
    }
    window.setTimeout(() => setStage('open'), view.animations ? 1700 : 0)
  }

  const toggleMusic = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().then(() => setPlaying(true)).catch(() => undefined)
    else {
      audio.pause()
      setPlaying(false)
    }
  }

  const fixed = embedded ? 'absolute' : 'fixed'

  return (
    <>
      {view.animations && <Bokeh position={fixed} />}

      {stage !== 'open' && (
        <Envelope view={view} opening={stage === 'opening'} onOpen={openEnvelope} position={fixed} />
      )}

      {/* Tant que l'enveloppe est fermée, la page n'est pas mise en page : ouverture plus rapide sur petit téléphone. */}
      <main aria-hidden={stage !== 'open'} inert={stage !== 'open'} className={`relative ${stage === 'closed' ? 'hidden' : ''}`}>
        {children}
      </main>

      <div className={`${fixed} top-4 right-4 z-[60] flex items-center gap-2`}>
        {view.showLanguageSwitcher && (
          <div className="liquid-glass rounded-full bg-(--inv-primary) p-1 shadow-lg">
            <LanguageSwitcher />
          </div>
        )}
        {view.musicUrl && (
          <>
            <audio ref={audioRef} src={view.musicUrl} loop preload="none" />
            <button
              type="button"
              onClick={toggleMusic}
              aria-label={t(playing ? 'music.on' : 'music.off')}
              aria-pressed={playing}
              className="grid size-11 place-items-center rounded-full bg-(--inv-primary) text-white shadow-lg transition hover:scale-105"
            >
              <SoundIcon on={playing} />
            </button>
          </>
        )}
      </div>

      {stage === 'open' && sections.length > 1 && (
        <nav
          aria-label={t('nav.label')}
          className={`${fixed} bottom-4 left-1/2 z-40 max-w-[calc(100%-2rem)] -translate-x-1/2 overflow-x-auto rounded-full bg-(--inv-primary) p-1.5 shadow-xl [scrollbar-width:none]`}
        >
          <ul className="flex gap-1">
            {sections.map(({ id, label }) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  aria-current={active === id ? 'true' : undefined}
                  className={`flex min-h-10 items-center rounded-full px-3 font-(family-name:--font-caps) text-xs font-semibold tracking-wider whitespace-nowrap uppercase transition sm:px-4 ${
                    active === id ? 'bg-white text-(--inv-primary)' : 'text-white/90 hover:text-white'
                  }`}
                >
                  {t(label)}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </>
  )
}

function Envelope({
  view,
  opening,
  onOpen,
  position,
}: {
  view: InvitationView
  opening: boolean
  onOpen: () => void
  position: string
}) {
  const { t, formatDate } = useLanguage()
  const { guest } = useGuest()
  const first = view.events[0]
  const pills = [
    first && `${first.title} · ${first.time}`,
    first && [first.venue || first.address, formatDate(first.startsAt, { day: 'numeric', month: 'short' })].filter(Boolean).join(' · '),
  ].filter(Boolean) as string[]

  return (
    <div
      className={`${position} inset-0 z-50 flex flex-col items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,var(--inv-surface),var(--inv-bg)_70%)] px-4 text-center ${
        opening ? 'inv-envelope-leave' : ''
      }`}
    >
      {pills.length > 0 && (
        <div className="mb-8 flex max-w-full flex-wrap justify-center gap-2">
          {pills.map((pill, index) => (
            <span
              key={pill}
              className={`max-w-full truncate rounded-full px-4 py-1.5 font-(family-name:--font-caps) text-xs font-semibold tracking-wider text-white uppercase ${
                index === 0 ? 'bg-[color-mix(in_srgb,var(--inv-accent),black_30%)]' : 'bg-(--inv-primary)'
              }`}
            >
              {pill}
            </span>
          ))}
        </div>
      )}
      <p className="font-(family-name:--font-caps) text-xs font-semibold tracking-[0.4em] text-(--inv-accent) uppercase">
        {guest ? t('envelope.dear', { name: guest.name.split(' ')[0] ?? guest.name }) : t('envelope.invitation')}
      </p>
      <p className="my-2 text-(--inv-accent)" aria-hidden>
        — ✦ —
      </p>
      <h1 className="names max-w-full font-(family-name:--font-names) text-[clamp(2.4rem,11vw,4.5rem)] leading-tight [overflow-wrap:anywhere] text-(--inv-primary)">
        {view.partnerOne}
        <span className="mx-2 text-(--inv-accent)">&amp;</span>
        {view.partnerTwo}
      </h1>
      {first && (
        <p className="mt-3 font-(family-name:--font-caps) text-sm tracking-[0.2em] uppercase">
          {t('envelope.the')}{' '}
          <span className="font-(family-name:--font-text) text-xl text-(--inv-accent)">
            {formatDate(first.startsAt, { day: 'numeric' })}
          </span>{' '}
          {formatDate(first.startsAt, { month: 'long', year: 'numeric' })}
        </p>
      )}

      <button
        type="button"
        onClick={onOpen}
        className={`inv-envelope group relative mt-12 h-48 w-72 cursor-pointer sm:h-56 sm:w-96 ${opening ? 'inv-envelope-open' : ''}`}
      >
        <span className="sr-only">{t('envelope.open')}</span>
        <Branch className="absolute -top-10 -left-12 z-20 w-28 -rotate-12 sm:-left-14 sm:w-40" />
        <Branch className="absolute -right-12 -bottom-10 z-20 w-28 rotate-[168deg] sm:-right-14 sm:w-40" />
        <span aria-hidden className="inv-envelope-card absolute inset-x-5 top-3 bottom-3 grid place-items-center rounded-md bg-(--inv-surface) shadow-inner">
          <span className="names font-(family-name:--font-names) text-3xl text-(--inv-primary)">{view.initials}</span>
        </span>
        <span className="absolute inset-0 rounded-lg bg-(--inv-primary) shadow-[0_30px_60px_-20px_rgb(0_0_0/0.45)] [clip-path:polygon(0_0,50%_55%,100%_0,100%_100%,0_100%)]" />
        <span className="absolute inset-0 rounded-lg bg-[linear-gradient(155deg,transparent_49.5%,rgb(0_0_0/0.18)_50%),linear-gradient(-155deg,transparent_49.5%,rgb(0_0_0/0.12)_50%)] [clip-path:polygon(0_0,50%_55%,100%_0,100%_100%,0_100%)]" />
        <span className="inv-envelope-flap absolute inset-x-0 top-0 z-10 h-[58%] origin-top bg-[linear-gradient(180deg,color-mix(in_srgb,var(--inv-primary),white_12%),var(--inv-primary))] [clip-path:polygon(0_0,100%_0,50%_100%)]" />
        <span aria-hidden className="inv-envelope-seal absolute top-[58%] left-[calc(50%-2rem)] z-20 grid size-16 -translate-y-1/2 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,color-mix(in_srgb,var(--inv-accent),white_25%),var(--inv-accent))] font-(family-name:--font-script) text-2xl text-white shadow-lg ring-2 ring-white/20 group-hover:brightness-110">
          {view.initials}
        </span>
      </button>

      <p className="mt-16 animate-pulse font-(family-name:--font-caps) text-xs tracking-[0.3em] text-(--inv-muted) uppercase">
        {t('envelope.hint')}
      </p>
    </div>
  )
}

function Branch({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 120 80" className={className} aria-hidden>
      <path d="M4 70 C40 55 70 40 116 8" fill="none" stroke="var(--inv-accent)" strokeWidth="1.5" />
      {[
        [26, 60, -30],
        [44, 50, -40],
        [62, 40, -35],
        [80, 29, -45],
        [96, 19, -40],
      ].map(([x, y, rotate], index) => (
        <g key={index} transform={`translate(${x} ${y}) rotate(${rotate})`}>
          <ellipse cx="0" cy="-9" rx="4" ry="9" fill="var(--inv-accent)" opacity="0.55" />
          <ellipse cx="0" cy="9" rx="4" ry="9" fill="var(--inv-accent)" opacity="0.35" />
        </g>
      ))}
      <circle cx="112" cy="10" r="7" fill="var(--inv-surface)" stroke="var(--inv-accent)" strokeWidth="1" />
      <circle cx="112" cy="10" r="2.5" fill="var(--inv-accent)" />
    </svg>
  )
}

const BOKEH = Array.from({ length: 22 }, (_, index) => ({
  left: (index * 37) % 100,
  size: 4 + ((index * 7) % 9),
  delay: -((index * 13) % 20),
  duration: 16 + ((index * 5) % 14),
}))

function Bokeh({ position }: { position: string }) {
  return (
    <div className={`pointer-events-none ${position} inset-0 z-30 overflow-hidden`} aria-hidden>
      {BOKEH.map((dot, index) => (
        <span
          key={index}
          className="inv-bokeh absolute bottom-[-5%] rounded-full bg-(--inv-accent)"
          style={{
            left: `${dot.left}%`,
            width: dot.size,
            height: dot.size,
            animationDelay: `${dot.delay}s`,
            animationDuration: `${dot.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

function SoundIcon({ on }: { on: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" />
      {on ? (
        <path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12" strokeLinecap="round" />
      ) : (
        <path d="M17 9l5 6M22 9l-5 6" strokeLinecap="round" />
      )}
    </svg>
  )
}
