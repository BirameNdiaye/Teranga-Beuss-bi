'use server'

import { z } from 'zod'
import { db } from '@/lib/db'
import { grantCodeAccess, hasCodeAccess } from '@/lib/guest-access'
import { getPublishedInvitation, toInvitationView } from '@/lib/invitation-data'
import type { InvitationView } from '@/lib/invitation-view'
import { verifySecret } from '@/lib/passwords'
import { allow } from '@/lib/rate-limit'
import { newToken } from '@/lib/tokens'
import type { DictionaryKey } from '@/lib/i18n/dictionaries'
import type { PersonalGuest } from '@/components/invitation/guest-context'

type Fail<F extends string = string> = {
  ok: false
  error: DictionaryKey | string
  fields?: Partial<Record<F, string>>
}

const tokenSchema = z.string().regex(/^[\w-]{16,64}$/)

async function guestByToken(invitationId: string, token: string | null | undefined) {
  if (!token || !tokenSchema.safeParse(token).success) return null
  return db.guest.findFirst({ where: { invitationId, token }, include: { rsvp: true } })
}

/** Vérifie qu'un visiteur peut voir une invitation, selon sa visibilité. */
async function resolveAccess(slug: string, token?: string | null, code?: string | null) {
  const invitation = await getPublishedInvitation(slug)
  if (!invitation) return null
  const guest = await guestByToken(invitation.id, token)
  let allowed = invitation.visibility === 'public' || Boolean(guest)
  let codeOk = false
  if (invitation.accessCodeHash) {
    if (code) codeOk = await verifySecret(invitation.accessCodeHash, code.trim())
    codeOk ||= await hasCodeAccess(invitation.id)
  }
  if (invitation.visibility === 'code') allowed ||= codeOk
  return { invitation, guest, allowed, codeOk }
}

const toPersonal = (guest: NonNullable<Awaited<ReturnType<typeof guestByToken>>>): PersonalGuest => ({
  name: guest.name,
  seats: guest.seats,
  rsvp: guest.rsvp
    ? {
        attendance: guest.rsvp.attendance,
        partySize: guest.rsvp.partySize,
        message: guest.rsvp.message ?? '',
        ticketToken: guest.rsvp.ticketToken,
      }
    : null,
})

/** Lien personnel : renvoie l'invité et note la première ouverture. */
export async function loadGuest(slug: string, token: string) {
  const access = await resolveAccess(slug, token)
  if (!access?.guest) return null
  if (!access.guest.openedAt) {
    await db.guest.update({ where: { id: access.guest.id }, data: { openedAt: new Date() } })
  }
  return toPersonal(access.guest)
}

/** Ouvre une invitation protégée (code ou lien personnel). */
export async function unlockInvitation(
  slug: string,
  input: { token?: string | null; code?: string | null },
): Promise<{ ok: true; view: InvitationView; guest: PersonalGuest | null } | Fail> {
  if (input.code && !(await allow(`code:${slug}`, 10, 15 * 60_000))) return { ok: false, error: 'error.rate' }
  const access = await resolveAccess(slug, input.token, input.code)
  if (!access) return { ok: false, error: 'error.generic' }
  if (!access.allowed) return { ok: false, error: input.code ? 'error.code' : 'gate.text' }
  if (input.code && access.codeOk) await grantCodeAccess(access.invitation.id)
  if (access.guest && !access.guest.openedAt) {
    await db.guest.update({ where: { id: access.guest.id }, data: { openedAt: new Date() } })
  }
  return { ok: true, view: toInvitationView(access.invitation), guest: access.guest ? toPersonal(access.guest) : null }
}

/** Numéros des contacts : réservés aux liens personnels et aux détenteurs du code. */
export async function revealContacts(
  slug: string,
  input: { token?: string | null; code?: string | null },
): Promise<{ ok: true; phones: Record<string, string> } | Fail> {
  if (input.code && !(await allow(`code:${slug}`, 10, 15 * 60_000))) return { ok: false, error: 'error.rate' }
  const access = await resolveAccess(slug, input.token, input.code)
  if (!access) return { ok: false, error: 'error.generic' }
  const open = !access.invitation.accessCodeHash || access.guest || access.codeOk
  if (!open) return { ok: false, error: input.code ? 'error.code' : 'contacts.locked' }
  if (input.code && access.codeOk) await grantCodeAccess(access.invitation.id)
  const contacts = await db.contact.findMany({
    where: { invitationId: access.invitation.id },
    select: { id: true, phone: true },
  })
  return { ok: true, phones: Object.fromEntries(contacts.map((c) => [c.id, c.phone])) }
}

const rsvpSchema = z.object({
  name: z.string().trim().min(2, 'rsvp.name').max(120),
  phone: z
    .string()
    .trim()
    .max(30)
    .regex(/^$|^[+\d][\d\s().-]{5,29}$/, 'rsvp.phone'),
  attendance: z.enum(['yes', 'no', 'maybe']),
  partySize: z.coerce.number().int().min(1).max(10),
  message: z.string().trim().max(500),
})

export type RsvpField = keyof z.infer<typeof rsvpSchema>

export async function submitRsvp(
  slug: string,
  input: { token?: string | null; code?: string | null; values: Record<RsvpField, unknown> },
): Promise<{ ok: true; ticketToken: string | null } | Fail<RsvpField>> {
  if (!(await allow(`rsvp:${slug}`, 20, 10 * 60_000))) return { ok: false, error: 'error.rate' }

  const parsed = rsvpSchema.safeParse(input.values)
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], 'error.fix'])) as Partial<
      Record<RsvpField, string>
    >
    return { ok: false, error: 'error.fix', fields }
  }

  const access = await resolveAccess(slug, input.token, input.code)
  if (!access || !access.allowed) return { ok: false, error: 'error.generic' }
  const { invitation, guest } = access
  if (invitation.rsvpDeadline && invitation.rsvpDeadline < new Date()) return { ok: false, error: 'rsvp.closed' }

  const data = parsed.data
  const partySize = data.attendance === 'no' ? 1 : data.partySize
  if (guest && partySize > guest.seats) {
    return { ok: false, error: 'error.fix', fields: { partySize: 'rsvp.seats' } }
  }

  const fields = {
    name: data.name,
    phone: data.phone || null,
    attendance: data.attendance,
    partySize,
    message: data.message || null,
  }
  // Un invité nommé n'a qu'une réponse : la nouvelle remplace l'ancienne.
  const rsvp = guest
    ? await db.rsvp.upsert({
        where: { guestId: guest.id },
        update: fields,
        create: { ...fields, invitationId: invitation.id, guestId: guest.id, source: 'personal', ticketToken: newToken() },
      })
    : await db.rsvp.create({ data: { ...fields, invitationId: invitation.id, source: 'link', ticketToken: newToken() } })

  return { ok: true, ticketToken: data.attendance === 'no' ? null : rsvp.ticketToken }
}

const guestbookSchema = z.object({
  author: z.string().trim().min(2).max(100),
  message: z.string().trim().min(3).max(600),
})

export async function signGuestbook(
  slug: string,
  input: { token?: string | null; code?: string | null; values: { author: unknown; message: unknown } },
): Promise<{ ok: true } | Fail<'author' | 'message'>> {
  if (!(await allow(`guestbook:${slug}`, 5, 10 * 60_000))) return { ok: false, error: 'error.rate' }
  const parsed = guestbookSchema.safeParse(input.values)
  if (!parsed.success) {
    const fields = Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], 'error.fix']))
    return { ok: false, error: 'error.fix', fields }
  }
  const access = await resolveAccess(slug, input.token, input.code)
  if (!access || !access.allowed) return { ok: false, error: 'error.generic' }
  await db.guestbookEntry.create({ data: { ...parsed.data, invitationId: access.invitation.id } })
  // Le message n'apparaît qu'après validation : la page publique ne change pas encore.
  return { ok: true }
}
