'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { requireManagedInvitation } from '@/lib/access'
import { db } from '@/lib/db'
import { newToken } from '@/lib/tokens'

const guestSchema = z.object({
  name: z.string().trim().min(2, 'Nom requis (2 caractères minimum).').max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .refine((v) => !v || /^[+\d][\d\s().-]{5,29}$/.test(v), 'Numéro invalide.'),
  seats: z.coerce.number().int().min(1, '1 place minimum.').max(10, '10 places maximum.'),
  group: z.string().trim().max(80),
})

export type GuestFormState = { ok?: boolean; message?: string; errors?: Record<string, string> }

const page = (id: string) => `/tableau-de-bord/${id}/invites`

export async function addGuest(invitationId: string, _prev: GuestFormState, form: FormData): Promise<GuestFormState> {
  await requireManagedInvitation(invitationId)
  const parsed = guestSchema.safeParse(Object.fromEntries(form))
  if (!parsed.success) {
    return { errors: Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])) }
  }
  const count = await db.guest.count({ where: { invitationId } })
  if (count >= 2000) return { message: 'Limite de 2 000 invités atteinte.' }
  await db.guest.create({
    data: {
      invitationId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      seats: parsed.data.seats,
      group: parsed.data.group || null,
      token: newToken(),
    },
  })
  revalidatePath(page(invitationId))
  return { ok: true, message: `${parsed.data.name} a été ajouté(e).` }
}

/** Import CSV : lignes déjà découpées côté client, revalidées ici une par une. */
export async function importGuests(invitationId: string, rows: unknown[]) {
  await requireManagedInvitation(invitationId)
  if (!Array.isArray(rows) || rows.length === 0) return { ok: false as const, message: 'Aucune ligne à importer.' }
  if (rows.length > 500) return { ok: false as const, message: '500 lignes maximum par import.' }

  const valid: z.infer<typeof guestSchema>[] = []
  const rejected: { line: number; reason: string }[] = []
  rows.forEach((row, index) => {
    const parsed = guestSchema.safeParse(row)
    if (parsed.success) valid.push(parsed.data)
    else rejected.push({ line: index + 1, reason: parsed.error.issues[0]?.message ?? 'Ligne invalide.' })
  })
  const count = await db.guest.count({ where: { invitationId } })
  if (count + valid.length > 2000) return { ok: false as const, message: 'Limite de 2 000 invités dépassée.' }

  if (valid.length) {
    await db.guest.createMany({
      data: valid.map((guest) => ({
        invitationId,
        name: guest.name,
        phone: guest.phone || null,
        seats: guest.seats,
        group: guest.group || null,
        token: newToken(),
      })),
    })
  }
  revalidatePath(page(invitationId))
  return { ok: true as const, imported: valid.length, rejected }
}

export async function updateGuestSeats(invitationId: string, guestId: string, seats: number) {
  await requireManagedInvitation(invitationId)
  const parsed = z.number().int().min(1).max(10).safeParse(seats)
  if (!parsed.success) return { ok: false as const, message: 'Entre 1 et 10 places.' }
  const guest = await db.guest.findFirst({ where: { id: guestId, invitationId }, include: { rsvp: true } })
  if (!guest) return { ok: false as const, message: 'Invité introuvable.' }
  if (guest.rsvp && guest.rsvp.attendance !== 'no' && guest.rsvp.partySize > parsed.data) {
    return { ok: false as const, message: `${guest.name} a déjà répondu pour ${guest.rsvp.partySize} personne(s).` }
  }
  await db.guest.update({ where: { id: guestId }, data: { seats: parsed.data } })
  revalidatePath(page(invitationId))
  return { ok: true as const }
}

export async function deleteGuest(invitationId: string, guestId: string) {
  await requireManagedInvitation(invitationId)
  await db.guest.deleteMany({ where: { id: guestId, invitationId } })
  revalidatePath(page(invitationId))
  return { ok: true as const }
}

/** Appelé quand l'organisateur ouvre le lien WhatsApp d'un invité. */
export async function markSent(invitationId: string, guestIds: string[]) {
  await requireManagedInvitation(invitationId)
  const ids = z.array(z.string().max(32)).max(500).parse(guestIds)
  await db.guest.updateMany({ where: { invitationId, id: { in: ids }, sentAt: null }, data: { sentAt: new Date() } })
  revalidatePath(page(invitationId))
  return { ok: true as const }
}
