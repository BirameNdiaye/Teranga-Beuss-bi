import type { Metadata } from 'next'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { Logo } from '@/components/ui'
import { requireUser } from '@/lib/auth'
import { logout } from './actions'

export const metadata: Metadata = { title: 'Tableau de bord', robots: { index: false } }

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser()
  return (
    <div className="min-h-screen bg-sand-100">
      <header className="sticky top-0 z-30 border-b border-cocoa-900/8 bg-sand-50/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo href="/tableau-de-bord" />
          <div className="flex items-center gap-3">
            <Link
              href="/tableau-de-bord"
              className="hidden text-sm font-medium text-cocoa-900/75 hover:text-cocoa-900 sm:block"
            >
              Mes invitations
            </Link>
            <span className="hidden max-w-40 truncate text-sm text-cocoa-900/60 md:block">{user.name}</span>
            <form action={logout}>
              <button
                type="submit"
                className="min-h-10 rounded-lg px-3 text-sm font-medium text-cocoa-700 hover:bg-cocoa-900/5"
              >
                Déconnexion
              </button>
            </form>
          </div>
        </div>
      </header>
      {children}
    </div>
  )
}
