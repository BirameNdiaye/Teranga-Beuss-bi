'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { buttonClass, Field, FormMessage, inputClass } from '@/components/ui'
import { login, signup, type AuthFormState } from './actions'

export function AuthForm({ mode, next }: { mode: 'login' | 'signup'; next?: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    mode === 'login' ? login : signup,
    {},
  )
  const errors = state.errors ?? {}

  return (
    <form action={action} noValidate className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}
      {mode === 'signup' && (
        <Field label="Vos prénoms" error={errors.name}>
          <input
            name="name"
            autoComplete="name"
            required
            defaultValue={state.values?.name}
            aria-invalid={Boolean(errors.name)}
            className={inputClass}
            placeholder="Awa & Junior"
          />
        </Field>
      )}
      <Field label="E-mail" error={errors.email}>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={state.values?.email}
          aria-invalid={Boolean(errors.email)}
          className={inputClass}
        />
      </Field>
      <Field
        label="Mot de passe"
        error={errors.password}
        hint={mode === 'signup' ? '10 caractères minimum, avec au moins une lettre et un chiffre.' : undefined}
      >
        <input
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          aria-invalid={Boolean(errors.password)}
          className={inputClass}
        />
      </Field>
      <FormMessage message={state.message} />
      <button type="submit" disabled={pending} className={`${buttonClass} w-full`}>
        {pending ? 'Un instant…' : mode === 'login' ? 'Se connecter' : 'Créer mon compte'}
      </button>
      <p className="text-center text-sm text-cocoa-900/70">
        {mode === 'login' ? (
          <>
            Pas encore de compte ?{' '}
            <Link href="/inscription" className="font-semibold text-cocoa-700 underline underline-offset-4">
              Créer un compte
            </Link>
          </>
        ) : (
          <>
            Déjà inscrits ?{' '}
            <Link href="/connexion" className="font-semibold text-cocoa-700 underline underline-offset-4">
              Se connecter
            </Link>
          </>
        )}
      </p>
    </form>
  )
}
