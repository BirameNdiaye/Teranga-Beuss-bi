import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { InvitationBody } from '@/components/invitation/InvitationBody'
import { ProtectedInvitation, PublicInvitation } from '@/components/invitation/InvitationShell'
import { getPublishedInvitation, toInvitationView } from '@/lib/invitation-data'
import { SHARE_CARD_SIZE } from '@/lib/share-card'

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
  const description = isPublic
    ? toInvitationView(row).shareMessage
    : 'Vous êtes invité(e). Ouvrez votre faire-part.'
  // Vignette dédiée (JPEG 1200 × 630, léger) ; ?v= force WhatsApp à recharger après une modification.
  const image = {
    url: `/i/${row.slug}/vignette?v=${row.updatedAt.getTime()}`,
    ...SHARE_CARD_SIZE,
    type: 'image/jpeg',
    alt: `Faire-part de mariage de ${row.partnerOne} et ${row.partnerTwo}`,
  }
  return {
    title,
    description,
    robots: { index: false, follow: false },
    openGraph: {
      title,
      description,
      url: `/i/${row.slug}`,
      siteName: 'Teranga Invit',
      locale: 'fr_FR',
      type: 'website',
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image.url] },
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
          showLanguageSwitcher: row.showLanguageSwitcher,
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
