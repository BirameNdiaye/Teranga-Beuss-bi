import type { Metadata, Viewport } from 'next'
import { Great_Vibes, Inter, Montserrat, Playfair_Display } from 'next/font/google'
import type { ReactNode } from 'react'
import { ServiceWorker } from '@/components/ServiceWorker'
import './globals.css'

// Inter sert surtout au tableau de bord : pas de préchargement sur la page invité.
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', preload: false })
const montserrat = Montserrat({ subsets: ['latin'], weight: ['300', '500', '600'], variable: '--font-montserrat' })
const greatVibes = Great_Vibes({ subsets: ['latin'], weight: '400', variable: '--font-great-vibes' })
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Teranga Invit — Faire-part de mariage numériques', template: '%s | Teranga Invit' },
  description:
    'Créez un faire-part de mariage numérique inoubliable : enveloppe animée, programme, cartes, réponses des invités et billets QR.',
  applicationName: 'Teranga Invit',
  manifest: '/manifest.webmanifest',
  icons: { icon: '/icon.svg', apple: '/icon-192.png' },
}

export const viewport: Viewport = {
  themeColor: '#6B3F28',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // Des extensions (LanguageTool, Grammarly…) ajoutent des attributs à <html> avant React :
    // on ignore ces écarts sur cette balise seulement. Le sélecteur de langue y change aussi `lang`.
    <html
      lang="fr"
      suppressHydrationWarning
      className={`${inter.variable} ${montserrat.variable} ${greatVibes.variable} ${playfair.variable}`}
    >
      <body className="min-h-screen bg-sand-100 text-cocoa-900 antialiased">
        {children}
        <ServiceWorker />
      </body>
    </html>
  )
}
