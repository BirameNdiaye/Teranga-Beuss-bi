'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/lib/i18n/client'
import { Section, SectionHeading } from './sections'

export function ShareSection({ slug, message }: { slug: string; message: string }) {
  const { t } = useLanguage()
  const path = `/i/${slug}`
  // Chemin seul au rendu serveur, adresse complète après le montage (évite un écart d'hydratation).
  const [url, setUrl] = useState(path)
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState<string | null>(null)
  const [showQr, setShowQr] = useState(false)

  useEffect(() => setUrl(`${window.location.origin}${path}`), [path])

  useEffect(() => {
    if (!showQr) return
    // QR généré dans le navigateur : l'adresse n'est envoyée à aucun service tiers.
    import('qrcode')
      .then((QRCode) => QRCode.toDataURL(url, { width: 440, margin: 1, color: { dark: '#3E2A1F', light: '#FFFFFF' } }))
      .then(setQr)
      .catch(() => setQr(null))
  }, [showQr, url])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Section className="pt-0 sm:pt-0">
      <div className="mx-auto max-w-md text-center">
        <SectionHeading eyebrow="share.eyebrow" title="share.title" />
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${message}\n${url}`)}`}
          target="_blank"
          rel="noreferrer"
          className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-(--inv-primary) text-sm font-semibold text-white shadow-lg transition hover:brightness-110"
        >
          <WhatsAppIcon />
          {t('share.whatsapp')}
        </a>
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-(--inv-accent)/30 bg-(--inv-surface) p-1.5 pl-4">
          <p className="min-w-0 flex-1 truncate text-left text-sm text-(--inv-muted)">{url.replace(/^https?:\/\//, '')}</p>
          <button
            type="button"
            onClick={copy}
            className="min-h-10 rounded-lg px-4 text-sm font-semibold text-(--inv-primary) transition hover:bg-(--inv-accent)/10"
          >
            <span aria-live="polite">{t(copied ? 'share.copied' : 'share.copy')}</span>
          </button>
        </div>
        <button
          type="button"
          onClick={() => setShowQr((value) => !value)}
          aria-expanded={showQr}
          className="mt-4 min-h-11 text-xs font-medium text-(--inv-primary) underline underline-offset-4"
        >
          {t(showQr ? 'share.hideQr' : 'share.showQr')}
        </button>
        {showQr && qr && (
          // eslint-disable-next-line @next/next/no-img-element -- image générée en data URL
          <img src={qr} alt={t('share.qrAlt')} width={220} height={220} className="mx-auto mt-4 rounded-xl bg-white p-2 shadow-md" />
        )}
      </div>
    </Section>
  )
}

export function WhatsAppIcon({ className = 'size-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.1 5.1 0 0 0 1.1 2.7 11.7 11.7 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3z" />
    </svg>
  )
}
