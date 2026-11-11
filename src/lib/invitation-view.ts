// Modèle d'affichage de la page invité. Pur et sérialisable : il est construit
// côté serveur depuis MySQL, et côté client par l'aperçu du constructeur.
import { dayKey, timeOf } from './dates'

export type ThemeName = 'dore' | 'sauge' | 'bordeaux' | 'minimal'
export type FontPairName = 'script' | 'classic' | 'modern'
export type HeroLayoutName = 'centered' | 'bottom' | 'editorial'
export type VisibilityName = 'public' | 'code' | 'private'

export type ImageView = { url: string; alt: string; width: number; height: number }

export type EventView = {
  id: string
  startsAt: string
  time: string
  category: string
  title: string
  venue: string
  address: string
  mapsUrl: string
  mapQuery: string
}

export type ContactView = { id: string; name: string; role: string; whatsapp: boolean }

export type GuestbookView = { id: string; author: string; message: string; createdAt: string }

export type InvitationView = {
  id: string
  slug: string
  partnerOne: string
  partnerTwo: string
  initials: string
  story: string
  thankYouMessage: string
  shareMessage: string
  firstDate: string
  events: EventView[]
  highlightedDates: string[]
  cover: ImageView | null
  gallery: ImageView[]
  musicUrl: string | null
  videoUrl: string | null
  theme: ThemeName
  fontPair: FontPairName
  heroLayout: HeroLayoutName
  overlay: number
  accentColor: string | null
  animations: boolean
  rsvpOpen: boolean
  rsvpDeadline: string | null
  visibility: VisibilityName
  contacts: ContactView[]
  guestbook: GuestbookView[]
}

export type InvitationViewInput = Omit<
  InvitationView,
  'initials' | 'firstDate' | 'highlightedDates' | 'rsvpOpen' | 'events'
> & {
  events: (Omit<EventView, 'time' | 'mapsUrl' | 'mapQuery'> & {
    mapsUrl?: string | null
    latitude?: number | null
    longitude?: number | null
  })[]
}

export const themes: Record<ThemeName, { label: string; vars: Record<string, string> }> = {
  dore: {
    label: 'Doré',
    vars: {
      '--inv-bg': '#F6EEE3',
      '--inv-surface': '#FBF7F1',
      '--inv-ink': '#3E2A1F',
      '--inv-primary': '#6B3F28',
      '--inv-accent': '#B07A4A',
      '--inv-muted': '#8A6A52',
    },
  },
  sauge: {
    label: 'Sauge',
    vars: {
      '--inv-bg': '#EFF1EA',
      '--inv-surface': '#F8F9F5',
      '--inv-ink': '#24372C',
      '--inv-primary': '#3F5F4C',
      '--inv-accent': '#9A7B45',
      '--inv-muted': '#5F6F63',
    },
  },
  bordeaux: {
    label: 'Bordeaux',
    vars: {
      '--inv-bg': '#F6ECEA',
      '--inv-surface': '#FBF6F5',
      '--inv-ink': '#3E1820',
      '--inv-primary': '#6E1E2E',
      '--inv-accent': '#A87A4E',
      '--inv-muted': '#7E5A5E',
    },
  },
  minimal: {
    label: 'Minimal',
    vars: {
      '--inv-bg': '#F6F5F2',
      '--inv-surface': '#FFFFFF',
      '--inv-ink': '#1F1F1F',
      '--inv-primary': '#2E2E2E',
      '--inv-accent': '#8C7A5C',
      '--inv-muted': '#666660',
    },
  },
}

export const HEX_COLOR = /^#(?:[0-9a-f]{3}){1,2}$/i

export const DEFAULT_SHARE = (one: string, two: string) =>
  `Vous êtes invité(e) au mariage de ${one} & ${two} !`

const initialOf = (name: string) => name.trim().charAt(0).toUpperCase() || '·'

export const mapsLink = (query: string, url?: string | null) =>
  url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`

export function buildView(input: InvitationViewInput, now = new Date()): InvitationView {
  const events: EventView[] = [...input.events]
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    .map((event) => {
      const mapQuery =
        event.latitude != null && event.longitude != null
          ? `${event.latitude},${event.longitude}`
          : [event.venue, event.address].filter(Boolean).join(', ')
      return {
        id: event.id,
        startsAt: event.startsAt,
        time: timeOf(event.startsAt),
        category: event.category,
        title: event.title,
        venue: event.venue,
        address: event.address,
        mapQuery,
        mapsUrl: mapQuery ? mapsLink(mapQuery, event.mapsUrl) : '',
      }
    })

  const firstDate = events[0]?.startsAt ?? now.toISOString()
  const deadline = input.rsvpDeadline

  return {
    ...input,
    events,
    accentColor: input.accentColor && HEX_COLOR.test(input.accentColor) ? input.accentColor : null,
    overlay: Math.min(85, Math.max(20, input.overlay)),
    initials: `${initialOf(input.partnerOne)}&${initialOf(input.partnerTwo)}`,
    firstDate,
    highlightedDates: [...new Set(events.map((event) => dayKey(event.startsAt)))].sort(),
    rsvpOpen: !deadline || new Date(deadline) >= now,
    shareMessage: input.shareMessage || DEFAULT_SHARE(input.partnerOne, input.partnerTwo),
  }
}

export const themeStyle = (view: Pick<InvitationView, 'theme' | 'accentColor'>) => ({
  ...themes[view.theme].vars,
  ...(view.accentColor ? { '--inv-accent': view.accentColor } : {}),
})
