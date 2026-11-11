import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { InvitationBody } from '@/components/invitation/InvitationBody'
import { ProtectedInvitation, PublicInvitation } from '@/components/invitation/InvitationShell'
import { getPublishedInvitation, toInvitationView } from '@/lib/invitation-data'

type Params = { params: Promise<{ slug: string }> }

// Les pages sont produites à la première visite puis gardées en cache.
// Chaque modification de l'invitation appelle revalidatePath (voir lib/revalidate.ts).
export const dynamicParams = true
export async function generateStaticParams() {
  return []
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const row = await getPublishedInvitation((await params).slug)
  if (!row) return { title: 'Invitation introuvable', robots: { index: false } }
  const title = `${row.partnerOne} & ${row.partnerTwo} — Notre mariage`
  const isPublic = row.visibility === 'public'
  const view = isPublic ? toInvitationView(row) : null
  return {
    title,
    description: view?.shareMessage ?? 'Vous êtes invité(e). Ouvrez votre faire-part.',
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description: view?.shareMessage,
      images: view?.cover ? [view.cover.url] : undefined,
      type: 'website',
    },
    twitter: { card: view?.cover ? 'summary_large_image' : 'summary', title },
  }
}

export default async function InvitationPage({ params }: Params) {
  const row = await getPublishedInvitation((await params).slug)
  if (!row) notFound()

  if (row.visibility !== 'public') {
    return (
      <ProtectedInvitation
        teaser={{
          slug: row.slug,
          partnerOne: row.partnerOne,
          partnerTwo: row.partnerTwo,
          theme: row.theme,
          accentColor: row.accentColor,
          fontPair: row.fontPair,
          animations: row.animations,
          visibility: row.visibility,
        }}
      />
    )
  }

  const view = toInvitationView(row)
  return (
    <PublicInvitation view={view}>
      <InvitationBody view={view} />
    </PublicInvitation>
  )
}
