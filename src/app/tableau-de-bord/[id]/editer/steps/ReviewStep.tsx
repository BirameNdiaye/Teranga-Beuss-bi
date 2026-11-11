'use client'

import { useState, useTransition, type FormEvent } from 'react'
import { Field, FormMessage, ghostButtonClass, inputClass } from '@/components/ui'
import { addCoOrganizer, removeCoOrganizer } from '../../../actions'
import type { StepProps } from '../Builder'
import { Choice, StepCard } from './shared'

type CoOrganizer = { id: string; name: string; email: string }

export function ReviewStep({
  form,
  update,
  errors,
  invitationId,
  checklist,
  hasAccessCode,
  isOwner,
  coOrganizers: initialCoOrganizers,
}: StepProps & {
  invitationId: string
  checklist: { ok: boolean; label: string }[]
  hasAccessCode: boolean
  isOwner: boolean
  coOrganizers: CoOrganizer[]
}) {
  const [coOrganizers, setCoOrganizers] = useState(initialCoOrganizers)
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const invite = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formElement = event.currentTarget
    const email = String(new FormData(formElement).get('email') ?? '')
    startTransition(async () => {
      const result = await addCoOrganizer(invitationId, email)
      if (result.ok) {
        setCoOrganizers((list) => [...list.filter((c) => c.id !== result.coOrganizer.id), result.coOrganizer])
        setMessage({ ok: true, text: `${result.coOrganizer.name} peut maintenant gérer l’invitation.` })
        formElement.reset()
      } else setMessage({ ok: false, text: result.message })
    })
  }

  return (
    <>
      <StepCard title="Prête à être publiée ?">
        <ul className="space-y-2">
          {checklist.map((item) => (
            <li key={item.label} className="flex items-center gap-3 text-sm">
              <span
                aria-hidden
                className={`grid size-6 place-items-center rounded-full text-xs ${
                  item.ok ? 'bg-emerald-600 text-white' : 'bg-cocoa-900/10 text-cocoa-900/50'
                }`}
              >
                {item.ok ? '✓' : '·'}
              </span>
              <span className={item.ok ? '' : 'text-cocoa-900/70'}>
                {item.label}
                <span className="sr-only">{item.ok ? ' : fait' : ' : à compléter'}</span>
              </span>
            </li>
          ))}
        </ul>
      </StepCard>

      <StepCard title="Qui peut ouvrir l’invitation ?">
        <Choice
          label="Visibilité"
          value={form.visibility}
          onChange={(visibility) => update({ visibility })}
          options={[
            { value: 'public', label: 'Publique par lien', hint: 'Toute personne qui a le lien' },
            { value: 'code', label: 'Protégée par code', hint: 'Le code est demandé à l’ouverture' },
            { value: 'private', label: 'Invités nommés', hint: 'Seulement les liens personnels' },
          ]}
        />
        <Field
          label={hasAccessCode ? 'Nouveau code d’accès' : 'Code d’accès'}
          error={errors.accessCode}
          hint={
            hasAccessCode
              ? 'Un code est déjà défini. Laissez vide pour le conserver.'
              : 'Sert aussi à afficher les numéros des contacts aux invités sans lien personnel.'
          }
        >
          <input
            value={form.accessCode}
            onChange={(e) => update({ accessCode: e.target.value, clearAccessCode: false })}
            autoComplete="off"
            maxLength={40}
            className={inputClass}
            placeholder="ex. TERANGA2027"
          />
        </Field>
        {hasAccessCode && form.visibility !== 'code' && (
          <button
            type="button"
            onClick={() => update({ clearAccessCode: true, accessCode: '' })}
            className="text-sm text-red-700 underline"
          >
            Supprimer le code actuel
          </button>
        )}
        <Field label="Date limite de réponse (facultatif)" error={errors.rsvpDeadline}>
          <input
            type="datetime-local"
            value={form.rsvpDeadline}
            onChange={(e) => update({ rsvpDeadline: e.target.value })}
            className={inputClass}
          />
        </Field>
      </StepCard>

      <StepCard title="Co-organisateurs" subtitle="Ils peuvent modifier l’invitation, gérer les invités et scanner les billets.">
        {coOrganizers.length > 0 && (
          <ul className="divide-y divide-cocoa-900/8 rounded-xl border border-cocoa-900/10">
            {coOrganizers.map((co) => (
              <li key={co.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <span>
                  <span className="font-medium">{co.name}</span>{' '}
                  <span className="text-cocoa-900/60">{co.email}</span>
                </span>
                {isOwner && (
                  <button
                    type="button"
                    onClick={() =>
                      startTransition(async () => {
                        const result = await removeCoOrganizer(invitationId, co.id)
                        if (result.ok) setCoOrganizers((list) => list.filter((c) => c.id !== co.id))
                      })
                    }
                    className="min-h-10 text-red-700 underline"
                  >
                    Retirer
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {isOwner ? (
          <form onSubmit={invite} className="flex flex-col gap-3 sm:flex-row">
            <input
              name="email"
              type="email"
              required
              placeholder="email@exemple.com"
              aria-label="E-mail du co-organisateur"
              className={inputClass}
            />
            <button type="submit" disabled={pending} className={ghostButtonClass}>
              Ajouter
            </button>
          </form>
        ) : (
          <p className="text-sm text-cocoa-900/65">Seul le propriétaire peut ajouter des co-organisateurs.</p>
        )}
        <FormMessage message={message?.text} ok={message?.ok} />
      </StepCard>
    </>
  )
}
