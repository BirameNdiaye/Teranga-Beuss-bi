import { describe, expect, it } from 'vitest'
import { fromDakarInput, toDakarInput } from '@/lib/dates'
import { dictionaries } from '@/lib/i18n/dictionaries'
import { invitationSchema, publishChecklist } from '@/lib/invitation-schema'
import { buildView, type InvitationViewInput } from '@/lib/invitation-view'

const base: InvitationViewInput = {
  id: 'inv',
  slug: 'awa-et-junior',
  partnerOne: 'Awa',
  partnerTwo: 'Junior',
  story: '',
  thankYouMessage: '',
  shareMessage: '',
  events: [
    { id: 'e2', startsAt: '2027-01-10T13:00:00.000Z', category: 'Réception', title: 'Accueil', venue: 'Cité', address: 'Keur Massar' },
    { id: 'e1', startsAt: '2027-01-09T17:00:00.000Z', category: 'Cérémonie', title: 'Takk', venue: '', address: '', latitude: 14.7, longitude: -17.2 },
  ],
  cover: null,
  gallery: [],
  musicUrl: null,
  videoUrl: null,
  theme: 'dore',
  fontPair: 'script',
  heroLayout: 'centered',
  overlay: 120,
  accentColor: 'pas-une-couleur',
  animations: true,
  rsvpDeadline: null,
  visibility: 'public',
  contacts: [],
  guestbook: [],
}

describe('buildView', () => {
  it('trie le programme, calcule les initiales et les jours à entourer', () => {
    const view = buildView(base)
    expect(view.events.map((e) => e.id)).toEqual(['e1', 'e2'])
    expect(view.initials).toBe('A&J')
    expect(view.firstDate).toBe('2027-01-09T17:00:00.000Z')
    expect(view.highlightedDates).toEqual(['2027-01-09', '2027-01-10'])
    expect(view.events[0]!.time).toBe('17:00')
  })

  it('préfère les coordonnées GPS pour la carte', () => {
    const [takk, accueil] = buildView(base).events
    expect(takk!.mapQuery).toBe('14.7,-17.2')
    expect(accueil!.mapQuery).toBe('Cité, Keur Massar')
    expect(accueil!.mapsUrl).toContain(encodeURIComponent('Cité, Keur Massar'))
  })

  it('borne le voile, ignore une couleur invalide et fournit un message de partage', () => {
    const view = buildView(base)
    expect(view.overlay).toBe(85)
    expect(view.accentColor).toBeNull()
    expect(view.shareMessage).toContain('Awa & Junior')
  })

  it('ferme les réponses après la date limite', () => {
    const now = new Date('2027-01-01T00:00:00Z')
    expect(buildView({ ...base, rsvpDeadline: '2026-12-31T23:59:00.000Z' }, now).rsvpOpen).toBe(false)
    expect(buildView({ ...base, rsvpDeadline: '2027-01-05T00:00:00.000Z' }, now).rsvpOpen).toBe(true)
  })
})

describe('dates (Africa/Dakar, UTC+0)', () => {
  it('convertit les saisies datetime-local aller-retour', () => {
    const date = fromDakarInput('2027-01-09T17:00')
    expect(date.toISOString()).toBe('2027-01-09T17:00:00.000Z')
    expect(toDakarInput(date)).toBe('2027-01-09T17:00')
  })
})

describe('invitationSchema', () => {
  const valid = {
    partnerOne: 'Awa',
    partnerTwo: 'Junior',
    slug: 'awa-et-junior',
    story: '',
    thankYouMessage: '',
    shareMessage: '',
    theme: 'dore',
    fontPair: 'script',
    heroLayout: 'centered',
    overlay: 55,
    accentColor: '',
    animations: true,
    visibility: 'public',
    accessCode: '',
    clearAccessCode: false,
    rsvpDeadline: '',
    coverId: null,
    videoId: null,
    musicId: null,
    gallery: [],
    events: [],
    contacts: [],
  }

  it('accepte une invitation minimale', () => {
    expect(invitationSchema.safeParse(valid).success).toBe(true)
  })

  it('refuse un slug avec espaces ou majuscules', () => {
    const result = invitationSchema.safeParse({ ...valid, slug: 'Awa et Junior' })
    expect(result.success).toBe(false)
  })

  it('refuse un lien Maps non https et un téléphone invalide', () => {
    const result = invitationSchema.safeParse({
      ...valid,
      events: [{ startsAt: '2027-01-09T17:00', category: 'Takk', title: 'Takk', venue: '', address: '', latitude: null, longitude: null, mapsUrl: 'javascript:alert(1)' }],
      contacts: [{ name: 'Moussa', role: 'Organisateur', phone: 'abc', whatsapp: true }],
    })
    expect(result.success).toBe(false)
    const paths = result.error!.issues.map((issue) => issue.path.join('.'))
    expect(paths).toEqual(expect.arrayContaining(['events.0.mapsUrl', 'contacts.0.phone']))
  })

  it('exige un code pour publier une invitation protégée', () => {
    const missing = publishChecklist({ ...valid, visibility: 'code', events: [{} as never], hasAccessCode: false })
    expect(missing.filter((item) => !item.ok).map((item) => item.label)).toEqual([
      'Un code d’accès (invitation protégée par code)',
    ])
  })
})

describe('traductions', () => {
  it('le wolof et l’anglais couvrent toutes les clés du français', () => {
    const keys = Object.keys(dictionaries.fr).sort()
    expect(Object.keys(dictionaries.wo).sort()).toEqual(keys)
    expect(Object.keys(dictionaries.en).sort()).toEqual(keys)
  })
})
