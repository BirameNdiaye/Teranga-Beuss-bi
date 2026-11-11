'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { requireManagedInvitation } from '@/lib/access'
import { requireUser, signOut } from '@/lib/auth'
import { fromDakarInput } from '@/lib/dates'
import { db } from '@/lib/db'
import { flattenErrors, invitationSchema, publishChecklist, type InvitationInput } from '@/lib/invitation-schema'
import { hashSecret } from '@/lib/passwords'
import { revalidateInvitation } from '@/lib/revalidate'
import { newToken } from '@/lib/tokens'

export type SaveResult =
  | { ok: true; savedAt: string; hasAccessCode: boolean; eventIds: string[]; contactIds: string[] }
  | { ok: false; message: string; errors: Record<string, string> }

export async function logout() {
  await signOut({ redirectTo: '/' })
}

export async function createInvitation() {
  const user = await requireUser()
  const suffix = newToken().slice(0, 6).toLowerCase().replace(/[^a-z0-9]/g, 'x')
  const sixMonths = new Date(Date.now() + 182 * 86_400_000)
  sixMonths.setUTCHours(17, 0, 0, 0)
  const invitation = await db.invitation.create({
    data: {
      ownerId: user.id,
      slug: `notre-mariage-${suffix}`,
      partnerOne: 'Awa',
      partnerTwo: 'Junior',
      story: 'Alhamdoulillah… Nous avons la joie de vous annoncer notre union.',
      events: { create: [{ startsAt: sixMonths, category: 'Cérémonie', title: 'Célébration du mariage', position: 0 }] },
    },
  })
  redirect(`/tableau-de-bord/${invitation.id}/editer`)
}

export async function saveInvitation(invitationId: string, raw: InvitationInput): Promise<SaveResult> {
  const { user, invitation } = await requireManagedInvitation(invitationId)
  const parsed = invitationSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, message: 'Certains champs sont à corriger.', errors: flattenErrors(parsed.error) }
  }
  const data = parsed.data

  if (data.slug !== invitation.slug) {
    const taken = await db.invitation.count({ where: { slug: data.slug, NOT: { id: invitation.id } } })
    if (taken) return { ok: false, message: 'Cette adresse est déjà prise.', errors: { slug: 'Adresse déjà utilisée.' } }
  }

  // Les médias doivent appartenir au propriétaire de l'invitation (ou à l'éditeur).
  const mediaIds = [data.coverId, data.videoId, data.musicId, ...data.gallery].filter((v): v is string => Boolean(v))
  const owned = await db.media.findMany({
    where: { id: { in: mediaIds }, ownerId: { in: [invitation.ownerId, user.id] } },
    select: { id: true, kind: true },
  })
  const kindOf = new Map(owned.map((m) => [m.id, m.kind]))
  const mediaErrors: Record<string, string> = {}
  if (data.coverId && kindOf.get(data.coverId) !== 'image') mediaErrors.coverId = 'Image invalide.'
  if (data.videoId && kindOf.get(data.videoId) !== 'video') mediaErrors.videoId = 'Vidéo invalide.'
  if (data.musicId && kindOf.get(data.musicId) !== 'audio') mediaErrors.musicId = 'Musique invalide.'
  if (data.gallery.some((mediaId) => kindOf.get(mediaId) !== 'image')) mediaErrors.gallery = 'Photo invalide.'
  if (Object.keys(mediaErrors).length) return { ok: false, message: 'Média invalide.', errors: mediaErrors }

  const accessCodeHash = data.accessCode
    ? await hashSecret(data.accessCode)
    : data.clearAccessCode
      ? null
      : invitation.accessCodeHash
  if (invitation.status === 'published' && data.visibility === 'code' && !accessCodeHash) {
    return { ok: false, message: 'Un code d’accès est nécessaire.', errors: { accessCode: 'Code requis.' } }
  }

  const existingEvents = new Set(
    (await db.event.findMany({ where: { invitationId }, select: { id: true } })).map((e) => e.id),
  )
  const existingContacts = new Set(
    (await db.contact.findMany({ where: { invitationId }, select: { id: true } })).map((c) => c.id),
  )

  const result = await db.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitationId },
      data: {
        partnerOne: data.partnerOne,
        partnerTwo: data.partnerTwo,
        slug: data.slug,
        story: data.story || null,
        thankYouMessage: data.thankYouMessage || null,
        shareMessage: data.shareMessage || null,
        theme: data.theme,
        fontPair: data.fontPair,
        heroLayout: data.heroLayout,
        overlay: data.overlay,
        accentColor: data.accentColor || null,
        animations: data.animations,
        visibility: data.visibility,
        accessCodeHash,
        rsvpDeadline: data.rsvpDeadline ? fromDakarInput(data.rsvpDeadline) : null,
        coverId: data.coverId,
        videoId: data.videoId,
        musicId: data.musicId,
      },
    })

    // Étapes et contacts : on conserve les identifiants connus (liens .ics stables).
    const keepEvents = data.events.map((e) => e.id).filter((v): v is string => Boolean(v && existingEvents.has(v)))
    await tx.event.deleteMany({ where: { invitationId, id: { notIn: keepEvents } } })
    const eventIds: string[] = []
    for (const [position, event] of data.events.entries()) {
      const fields = {
        startsAt: fromDakarInput(event.startsAt),
        category: event.category,
        title: event.title,
        venue: event.venue || null,
        address: event.address || null,
        latitude: event.latitude,
        longitude: event.longitude,
        mapsUrl: event.mapsUrl || null,
        position,
      }
      const saved =
        event.id && existingEvents.has(event.id)
          ? await tx.event.update({ where: { id: event.id }, data: fields })
          : await tx.event.create({ data: { ...fields, invitationId } })
      eventIds.push(saved.id)
    }

    const keepContacts = data.contacts.map((c) => c.id).filter((v): v is string => Boolean(v && existingContacts.has(v)))
    await tx.contact.deleteMany({ where: { invitationId, id: { notIn: keepContacts } } })
    const contactIds: string[] = []
    for (const [position, contact] of data.contacts.entries()) {
      const fields = { name: contact.name, role: contact.role, phone: contact.phone, whatsapp: contact.whatsapp, position }
      const saved =
        contact.id && existingContacts.has(contact.id)
          ? await tx.contact.update({ where: { id: contact.id }, data: fields })
          : await tx.contact.create({ data: { ...fields, invitationId } })
      contactIds.push(saved.id)
    }

    await tx.galleryItem.deleteMany({ where: { invitationId } })
    if (data.gallery.length) {
      await tx.galleryItem.createMany({
        data: [...new Set(data.gallery)].map((mediaId, position) => ({ invitationId, mediaId, position })),
      })
    }
    return { eventIds, contactIds }
  })

  revalidateInvitation(invitation.slug, data.slug)
  return {
    ok: true,
    savedAt: new Date().toISOString(),
    hasAccessCode: Boolean(accessCodeHash),
    ...result,
  }
}

export async function setInvitationStatus(
  invitationId: string,
  status: 'draft' | 'published' | 'archived',
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { invitation } = await requireManagedInvitation(invitationId)
  if (status === 'published') {
    const events = await db.event.findMany({ where: { invitationId }, select: { id: true } })
    const missing = publishChecklist({
      ...invitation,
      events: events.map(() => ({}) as never),
      hasAccessCode: Boolean(invitation.accessCodeHash),
    }).filter((item) => !item.ok)
    if (missing.length) {
      return { ok: false, message: `Avant de publier : ${missing.map((m) => m.label.toLowerCase()).join(', ')}.` }
    }
  }
  await db.invitation.update({ where: { id: invitationId }, data: { status } })
  revalidateInvitation(invitation.slug)
  return { ok: true }
}

export async function deleteInvitation(invitationId: string) {
  const { user, invitation } = await requireManagedInvitation(invitationId)
  if (invitation.ownerId !== user.id) return { ok: false as const, message: 'Seul le propriétaire peut supprimer.' }
  await db.invitation.delete({ where: { id: invitationId } })
  revalidateInvitation(invitation.slug)
  redirect('/tableau-de-bord')
}

const emailSchema = z.string().trim().toLowerCase().email()

export async function addCoOrganizer(invitationId: string, rawEmail: string) {
  const { user, invitation } = await requireManagedInvitation(invitationId)
  if (invitation.ownerId !== user.id) return { ok: false as const, message: 'Seul le propriétaire peut inviter.' }
  const email = emailSchema.safeParse(rawEmail)
  if (!email.success) return { ok: false as const, message: 'Adresse e-mail invalide.' }
  const target = await db.user.findUnique({ where: { email: email.data }, select: { id: true, name: true } })
  if (!target) return { ok: false as const, message: 'Aucun compte avec cette adresse. Demandez-lui de s’inscrire.' }
  if (target.id === invitation.ownerId) return { ok: false as const, message: 'C’est déjà le propriétaire.' }
  await db.coOrganizer.upsert({
    where: { invitationId_userId: { invitationId, userId: target.id } },
    update: {},
    create: { invitationId, userId: target.id },
  })
  return { ok: true as const, coOrganizer: { id: target.id, name: target.name, email: email.data } }
}

export async function removeCoOrganizer(invitationId: string, userId: string) {
  const { user, invitation } = await requireManagedInvitation(invitationId)
  if (invitation.ownerId !== user.id) return { ok: false as const, message: 'Seul le propriétaire peut retirer.' }
  await db.coOrganizer.deleteMany({ where: { invitationId, userId } })
  return { ok: true as const }
}
