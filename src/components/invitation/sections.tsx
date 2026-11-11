import Image from 'next/image'
import type { ReactNode } from 'react'
import { dayKey } from '@/lib/dates'
import { LocalDate, T } from '@/lib/i18n/client'
import type { DictionaryKey } from '@/lib/i18n/dictionaries'
import type { EventView, InvitationView } from '@/lib/invitation-view'
import { AddToCalendar } from './AddToCalendar'

export function SectionHeading({
  eyebrow,
  title,
  script = false,
}: {
  eyebrow?: DictionaryKey
  title: DictionaryKey
  script?: boolean
}) {
  return (
    <header className="mb-10 text-center sm:mb-14">
      {eyebrow && (
        <p className="mb-3 font-(family-name:--font-caps) text-xs font-semibold tracking-[0.32em] text-(--inv-accent) uppercase">
          <T k={eyebrow} />
        </p>
      )}
      <h2
        className={
          script
            ? 'names font-(family-name:--font-names) text-5xl leading-tight text-(--inv-primary) sm:text-6xl'
            : 'font-(family-name:--font-text) text-3xl text-(--inv-primary) sm:text-4xl'
        }
      >
        <T k={title} />
      </h2>
      {!script && <span className="mx-auto mt-5 block h-px w-12 bg-(--inv-accent)" />}
    </header>
  )
}

export function Section({ id, children, className = '' }: { id?: string; children: ReactNode; className?: string }) {
  return (
    <section id={id} className={`inv-reveal scroll-mt-6 px-4 py-20 sm:px-6 sm:py-28 ${className}`}>
      {children}
    </section>
  )
}

const heroAlign = {
  centered: 'justify-center pb-24',
  bottom: 'justify-end pb-36',
  editorial: 'justify-end items-start text-left pb-36 sm:pl-16',
} as const

export function HeroSection({ view }: { view: InvitationView }) {
  const { cover, videoUrl } = view
  const editorial = view.heroLayout === 'editorial'
  return (
    <section
      className={`relative flex min-h-svh flex-col overflow-hidden px-4 text-white ${heroAlign[view.heroLayout]} ${
        editorial ? '' : 'items-center text-center'
      }`}
    >
      {videoUrl ? (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={videoUrl}
          poster={cover?.url}
          autoPlay
          muted
          loop
          playsInline
          aria-hidden
        />
      ) : cover ? (
        <Image src={cover.url} alt={cover.alt} fill loading="eager" sizes="100vw" className="inv-ken-burns object-cover" />
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,var(--inv-accent),var(--inv-primary)_70%)]" />
      )}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/5 via-black/30 to-black"
        style={{ opacity: view.overlay / 100 }}
      />

      <div className="relative z-10 max-w-4xl">
        <p className="inv-rise mb-4 font-(family-name:--font-caps) text-xs font-semibold tracking-[0.4em] uppercase opacity-90">
          <T k="hero.eyebrow" />
        </p>
        <h1 className="names inv-rise font-(family-name:--font-names) text-[clamp(2.6rem,12.5vw,6rem)] leading-[1.05] [overflow-wrap:anywhere] drop-shadow-lg [animation-delay:150ms]">
          {view.partnerOne}
          <span className="mx-3 text-(--inv-accent)">&amp;</span>
          {view.partnerTwo}
        </h1>
        <p className="inv-rise mt-6 font-(family-name:--font-caps) text-sm tracking-[0.2em] uppercase [animation-delay:300ms]">
          <LocalDate iso={view.firstDate} options={{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }} />
          {view.events[0] && ` · ${view.events[0].time}`}
        </p>
      </div>
    </section>
  )
}

export function StorySection({ story }: { story: string }) {
  if (!story) return null
  return (
    <Section id="histoire" className="pb-0 sm:pb-0">
      <p className="mx-auto max-w-xl text-center font-(family-name:--font-text) text-xl leading-relaxed whitespace-pre-line sm:text-2xl">
        {story}
      </p>
    </Section>
  )
}

const WEEKDAYS = ['2024-01-01', '2024-01-02', '2024-01-03', '2024-01-04', '2024-01-05', '2024-01-06', '2024-01-07']
const pad = (value: number) => String(value).padStart(2, '0')

export function CalendarSection({ view }: { view: InvitationView }) {
  if (!view.events.length) return null
  const [year = 2026, month = 1] = dayKey(view.firstDate).split('-').map(Number)
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
  const highlighted = new Set(view.highlightedDates)
  const cells = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]

  return (
    <Section className="pb-0 sm:pb-0">
      <SectionHeading eyebrow="dates.eyebrow" title="dates.title" script />
      <p className="-mt-6 mb-10 text-center text-sm text-(--inv-muted)">
        {view.highlightedDates.map((day, index) => (
          <span key={day} className="inline-block first-letter:uppercase">
            {index > 0 && <>,&nbsp;</>}
            <LocalDate iso={`${day}T12:00:00Z`} options={{ weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }} />
          </span>
        ))}
      </p>
      <div className="mx-auto max-w-md">
        <p className="mb-8 text-center font-(family-name:--font-text) text-2xl tracking-[0.18em] text-(--inv-primary) uppercase">
          <LocalDate iso={`${year}-${pad(month)}-15T12:00:00Z`} options={{ month: 'long', year: 'numeric' }} />
        </p>
        <div className="grid grid-cols-7 gap-y-3 text-center text-sm">
          {WEEKDAYS.map((day) => (
            <span key={day} className="font-(family-name:--font-caps) text-xs font-semibold tracking-widest text-(--inv-muted) uppercase">
              <LocalDate iso={`${day}T12:00:00Z`} options={{ weekday: 'short' }} />
            </span>
          ))}
          {cells.map((day, index) =>
            day === null ? (
              <span key={`empty-${index}`} />
            ) : highlighted.has(`${year}-${pad(month)}-${pad(day)}`) ? (
              <span key={day} className="relative mx-auto grid size-11 place-items-center font-semibold text-(--inv-accent)">
                <svg viewBox="0 0 24 24" className="inv-heartbeat absolute inset-0 size-11" aria-hidden>
                  <path
                    d="M12 21s-7.5-4.6-9.6-9.3C1 8.4 3 5 6.4 5c2.1 0 3.6 1.2 4.6 2.7C12 6.2 13.5 5 15.6 5 19 5 21 8.4 19.6 11.7 17.5 16.4 12 21 12 21z"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                  />
                </svg>
                <span className="relative">{day}</span>
              </span>
            ) : (
              <span key={day} className="grid h-11 place-items-center">
                {day}
              </span>
            ),
          )}
        </div>
      </div>
    </Section>
  )
}

function ItineraryLink({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex min-h-11 items-center gap-2 rounded-full border border-(--inv-accent)/40 bg-(--inv-surface) px-4 text-xs font-medium text-(--inv-primary) transition hover:border-(--inv-accent) hover:bg-(--inv-accent)/10"
    >
      <T k="program.route" /> <span aria-hidden>→</span>
    </a>
  )
}

export function ProgramSection({ view }: { view: InvitationView }) {
  if (!view.events.length) return null
  const firstDay = dayKey(view.events[0]!.startsAt)
  return (
    <Section id="programme">
      <SectionHeading eyebrow="program.eyebrow" title="program.title" />
      <ol className="relative mx-auto max-w-xl border-l border-(--inv-accent)/40 pl-8 sm:pl-0">
        {view.events.map((event: EventView) => (
          <li key={event.id} className="relative pb-12 last:pb-0 sm:grid sm:grid-cols-[7rem_1fr] sm:gap-8 sm:pl-8">
            <span className="absolute top-2 -left-[37px] size-2.5 rounded-full bg-(--inv-primary) ring-4 ring-(--inv-bg) sm:-left-[5px]" />
            <div className="mb-2 sm:mb-0">
              <p className="font-(family-name:--font-text) text-xl text-(--inv-primary)">{event.time}</p>
              {dayKey(event.startsAt) !== firstDay && (
                <p className="text-xs text-(--inv-muted)">
                  <LocalDate iso={event.startsAt} options={{ day: 'numeric', month: 'long' }} />
                </p>
              )}
            </div>
            <div>
              <p className="font-(family-name:--font-caps) text-xs font-semibold tracking-[0.3em] text-(--inv-accent) uppercase">
                {event.category}
              </p>
              <h3 className="mt-1 font-(family-name:--font-text) text-2xl">{event.title}</h3>
              {event.venue && <p className="mt-2 text-sm font-medium">{event.venue}</p>}
              {event.address && <p className="text-xs text-(--inv-muted)">{event.address}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {event.mapsUrl && <ItineraryLink href={event.mapsUrl} />}
                <AddToCalendar slug={view.slug} event={event} names={`${view.partnerOne} & ${view.partnerTwo}`} />
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Section>
  )
}

export function VenuesSection({ view }: { view: InvitationView }) {
  const venues = view.events.filter((event) => event.mapQuery)
  if (!venues.length) return null
  return (
    <Section id="lieux" className="pt-0 sm:pt-0">
      <SectionHeading title="venues.title" script />
      <div className="mx-auto flex max-w-2xl flex-col gap-16">
        {venues.map((event) => (
          <article key={event.id} className="text-center">
            <h3 className="font-(family-name:--font-text) text-2xl text-(--inv-primary) sm:text-3xl">{event.title}</h3>
            <p className="mt-2 mb-6 font-(family-name:--font-caps) text-xs tracking-[0.2em] text-(--inv-muted) uppercase">
              <LocalDate iso={event.startsAt} options={{ weekday: 'long', day: 'numeric', month: 'long' }} />
              {[event.venue, event.address].filter(Boolean).map((part) => ` · ${part}`)}
            </p>
            <div className="overflow-hidden rounded-2xl bg-(--inv-surface) shadow-[0_20px_50px_-25px_rgb(0_0_0/0.35)]">
              <iframe
                title={`${event.title} — Google Maps`}
                src={`https://www.google.com/maps?q=${encodeURIComponent(event.mapQuery)}&z=16&output=embed`}
                className="block h-64 w-full border-0 sm:h-80"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a
                href={event.mapsUrl}
                target="_blank"
                rel="noreferrer"
                className="block bg-(--inv-primary) py-4 font-(family-name:--font-caps) text-xs font-semibold tracking-[0.25em] text-white uppercase transition hover:brightness-110"
              >
                <T k="venues.open" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </Section>
  )
}

export function ThanksSection({ view }: { view: InvitationView }) {
  return (
    <Section id="merci" className="pt-0 sm:pt-0">
      <div className="mx-auto max-w-xl text-center">
        <SectionHeading eyebrow="thanks.eyebrow" title="thanks.title" script />
        <p className="-mt-4 font-(family-name:--font-text) text-lg leading-relaxed">
          {view.thankYouMessage || <T k="thanks.default" />}
        </p>
        <p className="mt-8 text-(--inv-accent)" aria-hidden>
          ❦
        </p>
        <p className="names mt-4 font-(family-name:--font-names) text-3xl text-(--inv-accent)">
          {view.partnerOne} &amp; {view.partnerTwo}
        </p>
      </div>
    </Section>
  )
}
