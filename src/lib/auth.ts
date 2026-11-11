import NextAuth, { CredentialsSignin } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from './db'
import { verifySecret } from './passwords'
import { hit } from './rate-limit'

class InvalidLogin extends CredentialsSignin {
  code = 'identifiants'
}

class TooManyAttempts extends CredentialsSignin {
  code = 'trop-de-tentatives'
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(191),
  password: z.string().min(1).max(200),
})

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/connexion' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = loginSchema.safeParse(raw)
        if (!parsed.success) throw new InvalidLogin()
        if (!(await hit(`login:${parsed.data.email}`, 8, 15 * 60_000))) throw new TooManyAttempts()
        const user = await db.user.findUnique({ where: { email: parsed.data.email } })
        if (!user || !(await verifySecret(user.passwordHash, parsed.data.password))) {
          throw new InvalidLogin()
        }
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
})

/**
 * Utilisateur connecté et toujours présent en base. Une session JWT survit à la
 * suppression du compte : on vérifie donc son existence à chaque usage.
 */
export async function currentUser() {
  const id = (await auth())?.user?.id
  if (!id) return null
  return db.user.findUnique({ where: { id }, select: { id: true, name: true, email: true } })
}

/** Utilisateur connecté, ou redirection vers la page de connexion. */
export async function requireUser() {
  const user = await currentUser()
  if (!user) redirect('/connexion')
  return user
}
