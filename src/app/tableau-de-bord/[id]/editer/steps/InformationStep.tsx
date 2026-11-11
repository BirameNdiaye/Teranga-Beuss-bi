'use client'

import { Field, inputClass } from '@/components/ui'
import type { ContactInput, EventInput } from '@/lib/invitation-schema'
import type { StepProps } from '../Builder'
import { StepCard, Toggle } from './shared'

const CATEGORIES = ['Cérémonie', 'Réception', 'Takk', 'Mariage civil', 'Dot', 'Ndaje', 'Soirée']

export function InformationStep({ form, update, errors }: StepProps) {
  const setEvent = (index: number, patch: Partial<EventInput>) =>
    update({ events: form.events.map((event, i) => (i === index ? { ...event, ...patch } : event)) })
  const setContact = (index: number, patch: Partial<ContactInput>) =>
    update({ contacts: form.contacts.map((contact, i) => (i === index ? { ...contact, ...patch } : contact)) })
  const move = <T,>(list: T[], from: number, to: number) => {
    const next = [...list]
    const [item] = next.splice(from, 1)
    if (item !== undefined) next.splice(to, 0, item)
    return next
  }

  return (
    <>
      <StepCard title="Les mariés" subtitle="Leurs prénoms apparaissent sur l’enveloppe et en grand sur l’accueil.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom de la mariée" error={errors.partnerOne}>
            <input
              value={form.partnerOne}
              onChange={(e) => update({ partnerOne: e.target.value })}
              maxLength={80}
              aria-invalid={Boolean(errors.partnerOne)}
              className={inputClass}
            />
          </Field>
          <Field label="Prénom du marié" error={errors.partnerTwo}>
            <input
              value={form.partnerTwo}
              onChange={(e) => update({ partnerTwo: e.target.value })}
              maxLength={80}
              aria-invalid={Boolean(errors.partnerTwo)}
              className={inputClass}
            />
          </Field>
        </div>
        <Field label="Adresse de la page" error={errors.slug} hint="Lettres minuscules, chiffres et tirets.">
          <div className="flex items-center overflow-hidden rounded-xl border border-cocoa-900/15 bg-white focus-within:border-caramel">
            <span className="hidden border-r border-cocoa-900/10 px-3 text-sm text-cocoa-900/50 sm:block">/i/</span>
            <input
              value={form.slug}
              onChange={(e) => update({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })}
              maxLength={100}
              aria-invalid={Boolean(errors.slug)}
              className="min-h-11 min-w-0 flex-1 px-3 text-sm outline-none"
            />
          </div>
        </Field>
        <Field label="Votre histoire" error={errors.story} hint="Un texte personnel, une prière, une citation…">
          <textarea
            value={form.story}
            onChange={(e) => update({ story: e.target.value })}
            rows={5}
            maxLength={3000}
            className={inputClass}
          />
        </Field>
      </StepCard>

      <StepCard title="Le programme" subtitle="Chaque étape apparaît dans le déroulé, le calendrier et la carte des lieux.">
        {errors.events && <p className="text-sm text-red-700">{errors.events}</p>}
        <ol className="space-y-4">
          {form.events.map((event, index) => (
            <li key={event.id ?? `new-${index}`} className="rounded-2xl border border-cocoa-900/10 bg-sand-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold">Étape {index + 1}</p>
                <div className="flex gap-1">
                  <IconButton label="Monter" disabled={index === 0} onClick={() => update({ events: move(form.events, index, index - 1) })}>
                    ↑
                  </IconButton>
                  <IconButton
                    label="Descendre"
                    disabled={index === form.events.length - 1}
                    onClick={() => update({ events: move(form.events, index, index + 1) })}
                  >
                    ↓
                  </IconButton>
                  <IconButton label="Supprimer l'étape" onClick={() => update({ events: form.events.filter((_, i) => i !== index) })}>
                    ✕
                  </IconButton>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Titre" error={errors[`events.${index}.title`]}>
                  <input value={event.title} onChange={(e) => setEvent(index, { title: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Catégorie" error={errors[`events.${index}.category`]}>
                  <input
                    value={event.category}
                    list="event-categories"
                    onChange={(e) => setEvent(index, { category: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Date et heure (heure de Dakar)" error={errors[`events.${index}.startsAt`]}>
                  <input
                    type="datetime-local"
                    value={event.startsAt}
                    onChange={(e) => setEvent(index, { startsAt: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Lieu" error={errors[`events.${index}.venue`]}>
                  <input value={event.venue ?? ''} onChange={(e) => setEvent(index, { venue: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Ville / adresse" error={errors[`events.${index}.address`]}>
                  <input value={event.address ?? ''} onChange={(e) => setEvent(index, { address: e.target.value })} className={inputClass} />
                </Field>
                <Field label="Lien Google Maps (facultatif)" error={errors[`events.${index}.mapsUrl`]}>
                  <input
                    value={event.mapsUrl ?? ''}
                    inputMode="url"
                    placeholder="https://maps.app.goo.gl/…"
                    onChange={(e) => setEvent(index, { mapsUrl: e.target.value })}
                    className={inputClass}
                  />
                </Field>
                <Field label="Latitude (facultatif)" error={errors[`events.${index}.latitude`]}>
                  <input
                    inputMode="decimal"
                    value={event.latitude ?? ''}
                    onChange={(e) => setEvent(index, { latitude: e.target.value === '' ? null : Number(e.target.value) })}
                    className={inputClass}
                    placeholder="14.7020"
                  />
                </Field>
                <Field label="Longitude (facultatif)" error={errors[`events.${index}.longitude`]}>
                  <input
                    inputMode="decimal"
                    value={event.longitude ?? ''}
                    onChange={(e) => setEvent(index, { longitude: e.target.value === '' ? null : Number(e.target.value) })}
                    className={inputClass}
                    placeholder="-17.2328"
                  />
                </Field>
              </div>
            </li>
          ))}
        </ol>
        <datalist id="event-categories">
          {CATEGORIES.map((category) => (
            <option key={category} value={category} />
          ))}
        </datalist>
        {form.events.length < 12 && (
          <button
            type="button"
            onClick={() =>
              update({
                events: [
                  ...form.events,
                  {
                    startsAt: form.events.at(-1)?.startsAt ?? '',
                    category: 'Réception',
                    title: '',
                    venue: '',
                    address: '',
                    latitude: null,
                    longitude: null,
                    mapsUrl: '',
                  },
                ],
              })
            }
            className="min-h-11 rounded-xl border border-dashed border-caramel px-4 text-sm font-medium text-cocoa-700 hover:bg-caramel/10"
          >
            + Ajouter une étape
          </button>
        )}
      </StepCard>

      <StepCard
        title="Personnes à contacter"
        subtitle="Leurs numéros ne s’affichent qu’aux invités munis d’un lien personnel ou du code d’accès."
      >
        <ul className="space-y-3">
          {form.contacts.map((contact, index) => (
            <li key={contact.id ?? `c-${index}`} className="grid gap-3 rounded-2xl border border-cocoa-900/10 bg-sand-50 p-4 sm:grid-cols-3">
              <Field label="Nom" error={errors[`contacts.${index}.name`]}>
                <input value={contact.name} onChange={(e) => setContact(index, { name: e.target.value })} className={inputClass} />
              </Field>
              <Field label="Rôle" error={errors[`contacts.${index}.role`]}>
                <input
                  value={contact.role}
                  onChange={(e) => setContact(index, { role: e.target.value })}
                  className={inputClass}
                  placeholder="Organisateur"
                />
              </Field>
              <Field label="Téléphone" error={errors[`contacts.${index}.phone`]}>
                <input
                  type="tel"
                  value={contact.phone}
                  onChange={(e) => setContact(index, { phone: e.target.value })}
                  className={inputClass}
                  placeholder="+221 77 …"
                />
              </Field>
              <div className="flex items-center justify-between gap-3 sm:col-span-3">
                <div className="flex-1">
                  <Toggle checked={contact.whatsapp} onChange={(whatsapp) => setContact(index, { whatsapp })} label="Joignable sur WhatsApp" />
                </div>
                <IconButton label="Supprimer le contact" onClick={() => update({ contacts: form.contacts.filter((_, i) => i !== index) })}>
                  ✕
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
        {form.contacts.length < 6 && (
          <button
            type="button"
            onClick={() => update({ contacts: [...form.contacts, { name: '', role: 'Organisateur', phone: '', whatsapp: true }] })}
            className="min-h-11 rounded-xl border border-dashed border-caramel px-4 text-sm font-medium text-cocoa-700 hover:bg-caramel/10"
          >
            + Ajouter un contact
          </button>
        )}
      </StepCard>

      <StepCard title="Messages">
        <Field label="Message de remerciement" error={errors.thankYouMessage}>
          <textarea
            value={form.thankYouMessage}
            onChange={(e) => update({ thankYouMessage: e.target.value })}
            rows={3}
            maxLength={600}
            className={inputClass}
            placeholder="Votre présence est le plus beau des cadeaux…"
          />
        </Field>
        <Field label="Message de partage (WhatsApp)" error={errors.shareMessage}>
          <input
            value={form.shareMessage}
            onChange={(e) => update({ shareMessage: e.target.value })}
            maxLength={240}
            className={inputClass}
            placeholder={`Vous êtes invité(e) au mariage de ${form.partnerOne} & ${form.partnerTwo} !`}
          />
        </Field>
      </StepCard>
    </>
  )
}

export function IconButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: string
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-lg border border-cocoa-900/10 bg-white text-sm hover:border-caramel disabled:opacity-30"
    >
      {children}
    </button>
  )
}
