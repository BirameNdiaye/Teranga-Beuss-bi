import type { InvitationView } from '@/lib/invitation-view'
import { Contacts } from './Contacts'
import { Countdown } from './Countdown'
import { Gallery } from './Gallery'
import { Guestbook } from './Guestbook'
import { RsvpForm } from './RsvpForm'
import {
  CalendarSection,
  HeroSection,
  ProgramSection,
  StorySection,
  ThanksSection,
  VenuesSection,
} from './sections'
import { ShareSection } from './ShareSection'

/** Toutes les sections, dans l'ordre. Utilisé par la page invité et par l'aperçu du constructeur. */
export function InvitationBody({ view }: { view: InvitationView }) {
  return (
    <>
      <HeroSection view={view} />
      <StorySection story={view.story} />
      <CalendarSection view={view} />
      <ProgramSection view={view} />
      <VenuesSection view={view} />
      {view.events.length > 0 && <Countdown target={view.firstDate} initials={view.initials} />}
      <Gallery images={view.gallery} />
      <RsvpForm view={view} />
      <Guestbook entries={view.guestbook} />
      <ShareSection slug={view.slug} message={view.shareMessage} />
      <ThanksSection view={view} />
      <Contacts contacts={view.contacts} />
    </>
  )
}
