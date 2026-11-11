import 'server-only'
import { revalidatePath } from 'next/cache'

export const guestPath = (slug: string) => `/i/${slug}`

/**
 * Invalide la page invité après une écriture. Passez l'ancien et le nouveau
 * slug pour qu'un changement d'adresse ne laisse pas l'ancienne en cache.
 */
export function revalidateInvitation(...slugs: (string | null | undefined)[]) {
  for (const slug of new Set(slugs.filter((s): s is string => Boolean(s)))) {
    revalidatePath(guestPath(slug))
    revalidatePath(`${guestPath(slug)}/billet`)
  }
}
