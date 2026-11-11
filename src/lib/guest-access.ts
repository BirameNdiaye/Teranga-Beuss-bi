import 'server-only'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'

// Cookie posé après la saisie du bon code d'accès : évite de le redemander.
const cookieName = (invitationId: string) => `ti_access_${invitationId}`

const sign = (invitationId: string) =>
  createHmac('sha256', process.env.AUTH_SECRET ?? '').update(`access:${invitationId}`).digest('base64url')

export async function grantCodeAccess(invitationId: string) {
  ;(await cookies()).set(cookieName(invitationId), sign(invitationId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production' && process.env.NEXT_PUBLIC_SITE_URL?.startsWith('https'),
    path: '/',
    maxAge: 60 * 60 * 24 * 120,
  })
}

export async function hasCodeAccess(invitationId: string) {
  const value = (await cookies()).get(cookieName(invitationId))?.value
  if (!value) return false
  const expected = Buffer.from(sign(invitationId))
  const given = Buffer.from(value)
  return given.length === expected.length && timingSafeEqual(given, expected)
}
