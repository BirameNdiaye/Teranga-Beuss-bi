import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AuthForm } from '../AuthForm'

export const metadata: Metadata = { title: 'Créer un compte' }

export default async function SignupPage() {
  if ((await auth())?.user?.id) redirect('/tableau-de-bord')
  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-3xl">Créons votre faire-part</h1>
      <p className="mt-2 mb-8 text-sm text-cocoa-900/70">Gratuit, en quelques minutes, depuis votre téléphone.</p>
      <AuthForm mode="signup" />
    </>
  )
}
