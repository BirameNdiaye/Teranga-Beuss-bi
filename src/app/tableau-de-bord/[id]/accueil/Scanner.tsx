'use client'

import jsQR from 'jsqr'
import { useCallback, useEffect, useRef, useState } from 'react'
import { buttonClass, Card, inputClass } from '@/components/ui'
import { arrivals, checkInManually, scanTicket, type CheckInResult } from './actions'

type Arrival = Awaited<ReturnType<typeof arrivals>>[number]

type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> }
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorLike
  }
}

const time = (iso: string) => new Date(iso).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })

export function Scanner({ invitationId, initialArrivals }: { invitationId: string; initialArrivals: Arrival[] }) {
  const [list, setList] = useState(initialArrivals)
  const [running, setRunning] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [result, setResult] = useState<CheckInResult | null>(null)
  const [query, setQuery] = useState('')
  const video = useRef<HTMLVideoElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const stream = useRef<MediaStream | null>(null)
  const busy = useRef(false)
  const lastPayload = useRef<{ value: string; at: number } | null>(null)

  const refresh = useCallback(() => arrivals(invitationId).then(setList), [invitationId])

  const handle = useCallback(
    async (promise: Promise<CheckInResult>) => {
      const outcome = await promise
      setResult(outcome)
      if ('vibrate' in navigator) navigator.vibrate(outcome.status === 'ok' ? 120 : [60, 60, 60])
      if (outcome.status === 'ok') refresh()
    },
    [refresh],
  )

  const stop = useCallback(() => {
    stream.current?.getTracks().forEach((track) => track.stop())
    stream.current = null
    setRunning(false)
  }, [])

  const start = async () => {
    setCameraError(null)
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      if (video.current) {
        video.current.srcObject = stream.current
        await video.current.play()
      }
      setRunning(true)
    } catch {
      setCameraError('Caméra indisponible. Autorisez l’accès à la caméra (HTTPS requis sur téléphone), ou utilisez la recherche par nom.')
    }
  }

  useEffect(() => stop, [stop])

  useEffect(() => {
    if (!running) return
    const detector = window.BarcodeDetector ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null
    let frame = 0
    const tick = async () => {
      const v = video.current
      const c = canvas.current
      if (v && c && v.readyState >= 2 && !busy.current) {
        busy.current = true
        try {
          let value: string | undefined
          if (detector) value = (await detector.detect(v))[0]?.rawValue
          else {
            c.width = v.videoWidth
            c.height = v.videoHeight
            const ctx = c.getContext('2d', { willReadFrequently: true })
            if (ctx) {
              ctx.drawImage(v, 0, 0)
              value = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height)?.data
            }
          }
          const now = Date.now()
          // Ignore le même QR pendant 4 s pour éviter les doubles lectures.
          if (value && !(lastPayload.current?.value === value && now - lastPayload.current.at < 4000)) {
            lastPayload.current = { value, at: now }
            await handle(scanTicket(invitationId, value))
          }
        } finally {
          busy.current = false
        }
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [running, invitationId, handle])

  const arrived = list.filter((a) => a.arrivedAt)
  const people = arrived.reduce((sum, a) => sum + a.partySize, 0)
  const expected = list.reduce((sum, a) => sum + a.partySize, 0)
  const matches = query.trim()
    ? list.filter((a) => a.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 8)
    : []

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl bg-cocoa-700 p-4 text-white">
          <p className="text-xs tracking-wide text-white/75 uppercase">Personnes arrivées</p>
          <p className="font-(family-name:--font-serif) text-4xl" aria-live="polite">
            {people}
            <span className="text-lg text-white/70"> / {expected}</span>
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-xs tracking-wide text-cocoa-900/60 uppercase">Billets scannés</p>
          <p className="font-(family-name:--font-serif) text-4xl">
            {arrived.length}
            <span className="text-lg text-cocoa-900/50"> / {list.length}</span>
          </p>
        </div>
      </div>

      <Card>
        <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-2xl bg-cocoa-900">
          <video ref={video} muted playsInline className={`h-full w-full object-cover ${running ? '' : 'hidden'}`} />
          <canvas ref={canvas} className="hidden" />
          {running ? (
            <span className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" aria-hidden />
          ) : (
            <div className="absolute inset-0 grid place-items-center p-6 text-center text-white/80">
              <p className="text-sm">Scannez le QR code du billet de chaque invité.</p>
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-center">
          {running ? (
            <button type="button" onClick={stop} className="min-h-12 rounded-xl border border-cocoa-900/15 px-6 text-sm font-semibold">
              Arrêter la caméra
            </button>
          ) : (
            <button type="button" onClick={start} className={`${buttonClass} min-h-12 px-8`}>
              📷 Démarrer le scanner
            </button>
          )}
        </div>
        {cameraError && (
          <p role="alert" className="mt-3 text-center text-sm text-red-700">
            {cameraError}
          </p>
        )}
        <ResultBanner result={result} />
        <form
          className="mt-4 flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            const input = event.currentTarget.elements.namedItem('ticket') as HTMLInputElement
            if (input.value.trim()) handle(scanTicket(invitationId, input.value))
            input.value = ''
          }}
        >
          <input
            name="ticket"
            autoComplete="off"
            placeholder="Ou collez le code du billet"
            aria-label="Code du billet"
            className={inputClass}
          />
          <button type="submit" className="min-h-11 rounded-xl border border-cocoa-900/15 px-4 text-sm font-semibold">
            Valider
          </button>
        </form>
      </Card>

      <Card>
        <h2 className="font-(family-name:--font-serif) text-xl">Recherche par nom</h2>
        <p className="mt-1 text-sm text-cocoa-900/60">Si un invité n’a pas son billet sur lui.</p>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom de l’invité"
          aria-label="Nom de l'invité"
          className={`${inputClass} mt-3`}
        />
        {matches.length > 0 && (
          <ul className="mt-3 divide-y divide-cocoa-900/8">
            {matches.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                <span>
                  <span className="font-medium">{a.name}</span>{' '}
                  <span className="text-sm text-cocoa-900/60">
                    · {a.partySize} pers.{a.maybe && ' · peut-être'}
                  </span>
                </span>
                {a.arrivedAt ? (
                  <span className="text-sm text-emerald-700">Arrivé à {time(a.arrivedAt)}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => handle(checkInManually(invitationId, a.id))}
                    className="min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white"
                  >
                    Marquer arrivé
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}

function ResultBanner({ result }: { result: CheckInResult | null }) {
  if (!result) return null
  const content = {
    ok: { tone: 'bg-emerald-600 text-white', text: result.status === 'ok' ? `Bienvenue ${result.name} ! (${result.partySize} pers.)` : '' },
    already: {
      tone: 'bg-amber-500 text-white',
      text: result.status === 'already' ? `${result.name} est déjà entré(e) à ${time(result.at)}.` : '',
    },
    declined: { tone: 'bg-red-600 text-white', text: result.status === 'declined' ? `${result.name} avait répondu absent.` : '' },
    unknown: { tone: 'bg-red-600 text-white', text: 'Billet inconnu pour cette invitation.' },
  }[result.status]
  return (
    <p role="status" aria-live="assertive" className={`mt-4 rounded-2xl px-4 py-4 text-center text-lg font-semibold ${content.tone}`}>
      {content.text}
    </p>
  )
}
