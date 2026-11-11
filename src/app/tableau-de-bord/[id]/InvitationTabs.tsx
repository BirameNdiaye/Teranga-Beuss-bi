'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: 'editer', label: 'Constructeur' },
  { href: 'invites', label: 'Invités' },
  { href: 'reponses', label: 'Réponses' },
  { href: 'accueil', label: 'Accueil jour J' },
]

export function InvitationTabs({ id, slug, published }: { id: string; slug: string; published: boolean }) {
  const pathname = usePathname()
  return (
    <nav aria-label="Gestion de l'invitation" className="-mb-px flex w-full gap-1 overflow-x-auto sm:w-auto">
      {tabs.map((tab) => {
        const href = `/tableau-de-bord/${id}/${tab.href}`
        const active = pathname.startsWith(href)
        return (
          <Link
            key={tab.href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-11 items-center border-b-2 px-3 text-sm font-medium whitespace-nowrap transition ${
              active ? 'border-caramel text-cocoa-900' : 'border-transparent text-cocoa-900/60 hover:text-cocoa-900'
            }`}
          >
            {tab.label}
          </Link>
        )
      })}
      {published && (
        <a
          href={`/i/${slug}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-11 items-center px-3 text-sm font-medium whitespace-nowrap text-caramel hover:text-cocoa-700"
        >
          Voir la page ↗
        </a>
      )}
    </nav>
  )
}
