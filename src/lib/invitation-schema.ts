import { z } from 'zod'

// Schéma partagé par le constructeur (validation immédiate) et le serveur (validation finale).

const id = z.string().regex(/^[a-z0-9]{20,32}$/)
const optionalText = (max: number) => z.string().trim().max(max, `${max} caractères maximum.`)

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const eventSchema = z.object({
  id: id.optional(),
  startsAt: z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Date et heure requises.'),
  category: z.string().trim().min(1, 'Catégorie requise.').max(40),
  title: z.string().trim().min(1, 'Titre requis.').max(120),
  venue: optionalText(160),
  address: optionalText(200),
  latitude: z.number().min(-90).max(90).nullable(),
  longitude: z.number().min(-180).max(180).nullable(),
  mapsUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => !value || /^https:\/\//.test(value), 'Lien https:// attendu.'),
})

export const contactSchema = z.object({
  id: id.optional(),
  name: z.string().trim().min(2, 'Nom requis.').max(100),
  role: z.string().trim().min(1, 'Rôle requis.').max(60),
  phone: z.string().trim().regex(/^[+\d][\d\s().-]{5,29}$/, 'Numéro invalide.'),
  whatsapp: z.boolean(),
})

export const invitationSchema = z.object({
  partnerOne: z.string().trim().min(1, 'Prénom requis.').max(80),
  partnerTwo: z.string().trim().min(1, 'Prénom requis.').max(80),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, '3 caractères minimum.')
    .max(100)
    .regex(SLUG_PATTERN, 'Lettres minuscules, chiffres et tirets uniquement.'),
  story: optionalText(3000),
  thankYouMessage: optionalText(600),
  shareMessage: optionalText(240),
  theme: z.enum(['dore', 'sauge', 'bordeaux', 'minimal']),
  fontPair: z.enum(['script', 'classic', 'modern']),
  heroLayout: z.enum(['centered', 'bottom', 'editorial']),
  overlay: z.number().int().min(20).max(85),
  accentColor: z
    .string()
    .trim()
    .refine((value) => !value || /^#(?:[0-9a-f]{3}){1,2}$/i.test(value), 'Couleur hexadécimale attendue (#B07A4A).'),
  animations: z.boolean(),
  visibility: z.enum(['public', 'code', 'private']),
  /** Nouveau code d'accès ; vide = conserver l'actuel. */
  accessCode: z
    .string()
    .trim()
    .refine((value) => !value || (value.length >= 4 && value.length <= 40), '4 à 40 caractères.'),
  clearAccessCode: z.boolean(),
  rsvpDeadline: z.string().refine((value) => !value || /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value), 'Date invalide.'),
  coverId: id.nullable(),
  videoId: id.nullable(),
  musicId: id.nullable(),
  gallery: z.array(id).max(24, '24 photos maximum.'),
  events: z.array(eventSchema).max(12, '12 étapes maximum.'),
  contacts: z.array(contactSchema).max(6, '6 contacts maximum.'),
})

export type InvitationInput = z.input<typeof invitationSchema>
export type EventInput = z.input<typeof eventSchema>
export type ContactInput = z.input<typeof contactSchema>

/** Erreurs à plat : « events.0.title » → message. */
export function flattenErrors(error: z.ZodError) {
  const errors: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.')
    errors[key] ??= issue.message
  }
  return errors
}

/** Conditions pour publier, affichées dans l'étape « Vérification ». */
export function publishChecklist(input: Pick<InvitationInput, 'partnerOne' | 'partnerTwo' | 'slug' | 'events' | 'visibility'> & {
  hasAccessCode: boolean
}) {
  return [
    { ok: Boolean(input.partnerOne?.trim() && input.partnerTwo?.trim()), label: 'Les prénoms des mariés' },
    { ok: SLUG_PATTERN.test(input.slug ?? ''), label: 'Une adresse de page valide' },
    { ok: (input.events?.length ?? 0) > 0, label: 'Au moins une étape au programme' },
    {
      ok: input.visibility !== 'code' || input.hasAccessCode,
      label: 'Un code d’accès (invitation protégée par code)',
    },
  ]
}
