'use client'

import QRCode from 'qrcode'
import { useEffect, useState } from 'react'
import { buttonClass, ghostButtonClass } from '@/components/ui'
import type { Status } from '../Builder'
import { StepCard } from './shared'

export function ShareStep({
  slug,
  shareMessage,
  status,
  canPublish,
  pending,
  onStatus,
}: {
  slug: string
  shareMessage: string
  status: Status
  canPublish: boolean
  pending: boolean
  onStatus: (status: Status) => void
}) {
  const [url, setUrl] = useState(`/i/${slug}`)
  const [qr, setQr] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => setUrl(`${window.location.origin}/i/${slug}`), [slug])
  useEffect(() => {
    QRCode.toDataURL(url, { width: 480, margin: 1, color: { dark: '#3E2A1F', light: '#FFFFFF' } }).then(setQr).catch(() => setQr(null))
  }, [url])

  const published = status === 'published'

  return (
    <>
      <StepCard
        title={published ? 'Votre invitation est en ligne 🎉' : 'Publier l’invitation'}
        subtitle={
          published
            ? 'Chaque modification est visible par vos invités quelques secondes après l’enregistrement.'
            : 'Tant qu’elle est en brouillon, personne ne peut l’ouvrir.'
        }
      >
        <div className="flex flex-wrap gap-3">
          {published ? (
            <button type="button" disabled={pending} onClick={() => onStatus('draft')} className={ghostButtonClass}>
              Repasser en brouillon
            </button>
          ) : (
            <button type="button" disabled={pending || !canPublish} onClick={() => onStatus('published')} className={buttonClass}>
              {pending ? 'Publication…' : 'Publier maintenant'}
            </button>
          )}
          {status !== 'archived' ? (
            <button type="button" disabled={pending} onClick={() => onStatus('archived')} className={ghostButtonClass}>
              Archiver
            </button>
          ) : (
            <button type="button" disabled={pending} onClick={() => onStatus('draft')} className={ghostButtonClass}>
              Désarchiver
            </button>
          )}
        </div>
        {!canPublish && !published && (
          <p className="text-sm text-amber-800">Complétez la liste de l’étape « Vérification » pour publier.</p>
        )}
      </StepCard>

      <StepCard title="Partager" subtitle="Pour des liens personnalisés « Cher·e … », passez par l’onglet Invités.">
        <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
          <div className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-cocoa-900/15 bg-sand-50 p-1.5 pl-4">
              <p className="min-w-0 flex-1 truncate text-sm">{url}</p>
              <button
                type="button"
                onClick={() =>
                  navigator.clipboard.writeText(url).then(() => {
                    setCopied(true)
                    window.setTimeout(() => setCopied(false), 2000)
                  })
                }
                className="min-h-10 rounded-lg bg-white px-4 text-sm font-semibold shadow-sm"
              >
                <span aria-live="polite">{copied ? 'Copié ✓' : 'Copier'}</span>
              </button>
            </div>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`${shareMessage}\n${url}`)}`}
              target="_blank"
              rel="noreferrer"
              className={`${buttonClass} w-full`}
            >
              Envoyer sur WhatsApp
            </a>
            {published && (
              <a href={`/i/${slug}`} target="_blank" rel="noreferrer" className={`${ghostButtonClass} w-full`}>
                Ouvrir la page invité ↗
              </a>
            )}
          </div>
          {qr && (
            <figure className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element -- QR généré localement */}
              <img src={qr} alt={`QR code vers ${url}`} width={180} height={180} className="rounded-xl border border-cocoa-900/10 bg-white p-2" />
              <a href={qr} download={`qr-${slug}.png`} className="mt-2 inline-block min-h-10 text-sm underline">
                Télécharger le QR
              </a>
            </figure>
          )}
        </div>
      </StepCard>
    </>
  )
}
