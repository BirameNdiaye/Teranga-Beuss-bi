'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import type { PreviewMessage } from '@/app/apercu/[id]/PreviewClient'
import { fromDakarInput } from '@/lib/dates'
import {
  flattenErrors,
  invitationSchema,
  publishChecklist,
  type ContactInput,
  type EventInput,
  type InvitationInput,
} from '@/lib/invitation-schema'
import { buildView, themes, type GuestbookView, type ImageView, type ThemeName } from '@/lib/invitation-view'
import { saveInvitation, setInvitationStatus } from '../../actions'
import { InformationStep } from './steps/InformationStep'
import { MediaStep } from './steps/MediaStep'
import { DesignStep } from './steps/DesignStep'
import { ReviewStep } from './steps/ReviewStep'
import { ShareStep } from './steps/ShareStep'

export type LibraryMedia = {
  id: string
  url: string
  kind: 'image' | 'video' | 'audio'
  width: number | null
  height: number | null
  alt: string
}

export type BuilderForm = Required<InvitationInput> & { events: EventInput[]; contacts: ContactInput[] }
export type Status = 'draft' | 'published' | 'archived'

export type StepProps = {
  form: BuilderForm
  update: (patch: Partial<BuilderForm>) => void
  errors: Record<string, string>
  library: Map<string, LibraryMedia>
  addMedia: (media: LibraryMedia) => void
}

const STEPS = ['Informations', 'Médias', 'Design', 'Vérification', 'Partage'] as const

type SaveState = { kind: 'idle' | 'saving' | 'saved' | 'invalid' | 'error'; message?: string; at?: string }

export function Builder(props: {
  invitationId: string
  initial: InvitationInput
  library: LibraryMedia[]
  status: Status
  hasAccessCode: boolean
  isOwner: boolean
  coOrganizers: { id: string; name: string; email: string }[]
  guestbook: GuestbookView[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<BuilderForm>(props.initial as BuilderForm)
  const [library, setLibrary] = useState(() => new Map(props.library.map((m) => [m.id, m])))
  const [step, setStep] = useState(0)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [save, setSave] = useState<SaveState>({ kind: 'idle' })
  const [status, setStatus] = useState<Status>(props.status)
  const [hasAccessCode, setHasAccessCode] = useState(props.hasAccessCode)
  const [envelopeNonce, setEnvelopeNonce] = useState(0)
  const [showPreview, setShowPreview] = useState(false)
  const [statusPending, startStatus] = useTransition()
  const dirty = useRef(false)
  const saving = useRef<Promise<void> | null>(null)

  const update = useCallback((patch: Partial<BuilderForm>) => {
    dirty.current = true
    setForm((current) => ({ ...current, ...patch }))
  }, [])

  const addMedia = useCallback((media: LibraryMedia) => {
    setLibrary((current) => new Map(current).set(media.id, media))
  }, [])

  const persist = useCallback(
    async (snapshot: BuilderForm) => {
      const parsed = invitationSchema.safeParse(snapshot)
      if (!parsed.success) {
        setErrors(flattenErrors(parsed.error))
        setSave({ kind: 'invalid', message: 'Corrigez les champs signalés pour enregistrer.' })
        return
      }
      setSave({ kind: 'saving' })
      const result = await saveInvitation(props.invitationId, snapshot)
      if (!result.ok) {
        setErrors(result.errors)
        setSave({ kind: 'error', message: result.message })
        return
      }
      setErrors({})
      setHasAccessCode(result.hasAccessCode)
      setSave({ kind: 'saved', at: result.savedAt })
      // Récupère les identifiants créés sans relancer une sauvegarde.
      setForm((current) => ({
        ...current,
        accessCode: current.accessCode === snapshot.accessCode ? '' : current.accessCode,
        clearAccessCode: false,
        events: current.events.map((event, index) => ({ ...event, id: event.id ?? result.eventIds[index] })),
        contacts: current.contacts.map((contact, index) => ({ ...contact, id: contact.id ?? result.contactIds[index] })),
      }))
    },
    [props.invitationId],
  )

  // Sauvegarde automatique, 900 ms après la dernière modification.
  useEffect(() => {
    if (!dirty.current) return
    const timer = window.setTimeout(() => {
      dirty.current = false
      saving.current = persist(form).catch(() => setSave({ kind: 'error', message: 'Connexion perdue. Nouvel essai à la prochaine modification.' }))
    }, 900)
    return () => window.clearTimeout(timer)
  }, [form, persist])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty.current || save.kind === 'saving') event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [save.kind])

  const view = useMemo(() => {
    const image = (id: string | null | undefined): ImageView | null => {
      const media = id ? library.get(id) : undefined
      return media?.kind === 'image'
        ? { url: media.url, alt: media.alt, width: media.width ?? 1200, height: media.height ?? 1500 }
        : null
    }
    const validDate = (value: string) => (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? fromDakarInput(value).toISOString() : null)
    return buildView({
      id: props.invitationId,
      slug: form.slug,
      partnerOne: form.partnerOne || '…',
      partnerTwo: form.partnerTwo || '…',
      story: form.story,
      thankYouMessage: form.thankYouMessage,
      shareMessage: form.shareMessage,
      events: form.events.flatMap((event, index) => {
        const startsAt = validDate(event.startsAt)
        return startsAt
          ? [{ ...event, id: event.id ?? `new-${index}`, startsAt, venue: event.venue ?? '', address: event.address ?? '' }]
          : []
      }),
      cover: image(form.coverId),
      gallery: form.gallery.map(image).filter((img): img is ImageView => img !== null),
      musicUrl: form.musicId ? (library.get(form.musicId)?.url ?? null) : null,
      videoUrl: form.videoId ? (library.get(form.videoId)?.url ?? null) : null,
      theme: form.theme as ThemeName,
      fontPair: form.fontPair,
      heroLayout: form.heroLayout,
      overlay: form.overlay,
      accentColor: form.accentColor || null,
      animations: form.animations,
      rsvpDeadline: validDate(form.rsvpDeadline),
      visibility: form.visibility,
      contacts: form.contacts.map((c, index) => ({ id: c.id ?? `c-${index}`, name: c.name, role: c.role, whatsapp: c.whatsapp })),
      guestbook: props.guestbook,
    })
  }, [form, library, props.invitationId, props.guestbook])

  const checklist = publishChecklist({ ...form, hasAccessCode: hasAccessCode || Boolean(form.accessCode) })

  const changeStatus = (next: Status) =>
    startStatus(async () => {
      if (saving.current) await saving.current
      if (dirty.current) {
        dirty.current = false
        await persist(form)
      }
      const result = await setInvitationStatus(props.invitationId, next)
      if (result.ok) {
        setStatus(next)
        router.refresh()
      } else setSave({ kind: 'error', message: result.message })
    })

  const stepProps: StepProps = { form, update, errors, library, addMedia }

  return (
    <div className="mx-auto grid max-w-7xl gap-8 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div className="min-w-0">
        <div className="sticky top-16 z-20 -mx-4 mb-6 border-b border-cocoa-900/8 bg-sand-100/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-2xl sm:border sm:bg-white/90">
          <ol className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {STEPS.map((label, index) => (
              <li key={label} className="flex-1">
                <button
                  type="button"
                  onClick={() => setStep(index)}
                  aria-current={step === index ? 'step' : undefined}
                  className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-medium whitespace-nowrap transition ${
                    step === index ? 'bg-cocoa-700 text-white' : 'text-cocoa-900/70 hover:bg-cocoa-900/5'
                  }`}
                >
                  <span
                    className={`grid size-6 place-items-center rounded-full text-xs ${
                      step === index ? 'bg-white/20' : index < step ? 'bg-caramel text-white' : 'bg-cocoa-900/10'
                    }`}
                  >
                    {index < step ? '✓' : index + 1}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <div className="mt-2 flex items-center justify-between gap-3 text-xs">
            <SaveIndicator state={save} />
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="min-h-9 rounded-lg border border-cocoa-900/15 bg-white px-3 font-medium lg:hidden"
            >
              Aperçu
            </button>
          </div>
        </div>

        {step === 0 && <InformationStep {...stepProps} />}
        {step === 1 && <MediaStep {...stepProps} />}
        {step === 2 && <DesignStep {...stepProps} />}
        {step === 3 && (
          <ReviewStep
            {...stepProps}
            invitationId={props.invitationId}
            checklist={checklist}
            hasAccessCode={hasAccessCode}
            isOwner={props.isOwner}
            coOrganizers={props.coOrganizers}
          />
        )}
        {step === 4 && (
          <ShareStep
            slug={form.slug}
            shareMessage={view.shareMessage}
            status={status}
            canPublish={checklist.every((item) => item.ok)}
            pending={statusPending}
            onStatus={changeStatus}
          />
        )}

        <div className="mt-8 flex justify-between gap-3">
          <button
            type="button"
            disabled={step === 0}
            onClick={() => setStep((s) => s - 1)}
            className="min-h-11 rounded-xl border border-cocoa-900/15 bg-white px-5 text-sm font-medium disabled:opacity-40"
          >
            ← Précédent
          </button>
          {step < STEPS.length - 1 && (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="min-h-11 rounded-xl bg-cocoa-700 px-5 text-sm font-semibold text-white"
            >
              Suivant →
            </button>
          )}
        </div>
      </div>

      <aside
        className={`${
          showPreview ? 'fixed inset-0 z-50 flex flex-col items-center justify-center bg-cocoa-900/80 p-4' : 'hidden'
        } lg:sticky lg:top-24 lg:flex lg:h-[calc(100vh-7rem)] lg:flex-col lg:items-center lg:bg-transparent lg:p-0`}
      >
        <div className="mb-3 flex w-full max-w-[400px] items-center justify-between">
          <p className="text-sm font-semibold text-white lg:text-cocoa-900">Aperçu en direct</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setEnvelopeNonce((n) => n + 1)}
              className="min-h-9 rounded-lg bg-white px-3 text-xs font-medium shadow-sm"
            >
              ✉ Rejouer l’enveloppe
            </button>
            <button
              type="button"
              onClick={() => setShowPreview(false)}
              className="min-h-9 rounded-lg bg-white px-3 text-xs font-medium lg:hidden"
            >
              Fermer
            </button>
          </div>
        </div>
        <PhonePreview invitationId={props.invitationId} view={view} envelopeNonce={envelopeNonce} />
      </aside>
    </div>
  )
}

function SaveIndicator({ state }: { state: SaveState }) {
  const text = {
    idle: 'Les modifications sont enregistrées automatiquement.',
    saving: 'Enregistrement…',
    saved: `Enregistré à ${state.at ? new Date(state.at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}`,
    invalid: state.message,
    error: state.message,
  }[state.kind]
  const tone =
    state.kind === 'error' || state.kind === 'invalid'
      ? 'text-red-700'
      : state.kind === 'saved'
        ? 'text-emerald-700'
        : 'text-cocoa-900/60'
  return (
    <p role="status" aria-live="polite" className={`truncate ${tone}`}>
      {text}
    </p>
  )
}

function PhonePreview({
  invitationId,
  view,
  envelopeNonce,
}: {
  invitationId: string
  view: ReturnType<typeof buildView>
  envelopeNonce: number
}) {
  const frame = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin && event.data?.type === 'teranga-preview-ready') setReady(true)
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [])

  useEffect(() => {
    if (!ready) return
    const message: PreviewMessage = { type: 'teranga-preview', view, envelope: envelopeNonce > 0, nonce: envelopeNonce }
    frame.current?.contentWindow?.postMessage(message, window.location.origin)
  }, [ready, view, envelopeNonce])

  return (
    <div className="relative aspect-[375/760] w-full max-w-[340px] shrink overflow-hidden rounded-[2.6rem] border-[10px] border-cocoa-900 bg-cocoa-900 shadow-2xl lg:h-full lg:max-h-[760px] lg:w-auto">
      <span className="absolute top-1.5 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-cocoa-900" aria-hidden />
      <iframe
        ref={frame}
        src={`/apercu/${invitationId}`}
        title="Aperçu de l'invitation sur téléphone"
        className="h-full w-full rounded-[1.9rem] bg-white"
      />
    </div>
  )
}

export const themeOptions = Object.entries(themes).map(([value, theme]) => ({ value: value as ThemeName, ...theme }))
