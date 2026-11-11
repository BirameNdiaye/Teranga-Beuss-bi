'use server'

import { AuthError } from 'next-auth'
import { unstable_rethrow } from 'next/navigation'
import { z } from 'zod'
import { signIn } from '@/lib/auth'
import { db } from '@/lib/db'
import { hashSecret } from '@/lib/passwords'
import { allow } from '@/lib/rate-limit'

export type AuthFormState = {
  message?: string
  errors?: Partial<Record<'name' | 'email' | 'password', string>>
  values?: { name?: string; email?: string }
}

const signupSchema = z.object({
  name: z.string().trim().min(2, 'Indiquez votre nom (2 caractères minimum).').max(100),
  email: z.string().trim().toLowerCase().email('Adresse e-mail invalide.').max(191),
  password: z
    .string()
    .min(10, 'Au moins 10 caractères.')
    .max(200)
    .regex(/[a-zA-Z]/, 'Ajoutez au moins une lettre.')
    .regex(/\d/, 'Ajoutez au moins un chiffre.'),
})

const fieldErrors = (error: z.ZodError) =>
  Object.fromEntries(error.issues.map((issue) => [issue.path[0], issue.message])) as AuthFormState['errors']

export async function signup(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const raw = { name: form.get('name'), email: form.get('email'), password: form.get('password') }
  const values = { name: String(raw.name ?? ''), email: String(raw.email ?? '') }
  if (!(await allow('signup', 5, 60 * 60_000))) {
    return { message: 'Trop de comptes créés depuis cette connexion. Réessayez plus tard.', values }
  }
  const parsed = signupSchema.safeParse(raw)
  if (!parsed.success) return { errors: fieldErrors(parsed.error), values }

  const exists = await db.user.findUnique({ where: { email: parsed.data.email }, select: { id: true } })
  if (exists) return { errors: { email: 'Un compte existe déjà avec cette adresse.' }, values }

  await db.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashSecret(parsed.data.password),
    },
  })

  try {
    await signIn('credentials', {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: '/tableau-de-bord',
    })
  } catch (error) {
    unstable_rethrow(error)
    return { message: 'Compte créé. Connectez-vous pour continuer.', values }
  }
  return {}
}

export async function login(_prev: AuthFormState, form: FormData): Promise<AuthFormState> {
  const email = String(form.get('email') ?? '')
  if (!(await allow('login', 20, 15 * 60_000))) {
    return { message: 'Trop de tentatives. Patientez quelques minutes.', values: { email } }
  }
  try {
    await signIn('credentials', {
      email,
      password: String(form.get('password') ?? ''),
      redirectTo: String(form.get('next') || '/tableau-de-bord').startsWith('/')
        ? String(form.get('next') || '/tableau-de-bord')
        : '/tableau-de-bord',
    })
  } catch (error) {
    unstable_rethrow(error)
    if (error instanceof AuthError) {
      const code = 'code' in error ? (error as { code?: string }).code : undefined
      return {
        message:
          code === 'trop-de-tentatives'
            ? 'Trop de tentatives. Patientez quelques minutes.'
            : 'E-mail ou mot de passe incorrect.',
        values: { email },
      }
    }
    throw error
  }
  return {}
}
