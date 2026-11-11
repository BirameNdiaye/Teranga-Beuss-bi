import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { AuthForm } from '../AuthForm'

export const metadata: Metadata = { title: 'Connexion' }

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if ((await auth())?.user?.id) redirect('/tableau-de-bord')
  const { next } = await searchParams
  return (
    <>
      <h1 className="font-(family-name:--font-serif) text-3xl">Bon retour parmi nous</h1>
      <p className="mt-2 mb-8 text-sm text-cocoa-900/70">Connectez-vous pour gérer vos invitations.</p>
      <AuthForm mode="login" next={next?.startsWith('/') ? next : undefined} />
    </>
  )
}
