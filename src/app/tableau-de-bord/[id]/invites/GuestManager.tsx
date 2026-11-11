'use client'

import { useMemo, useState, useTransition, useActionState, type ChangeEvent } from 'react'
import { buttonClass, Card, Field, FormMessage, ghostButtonClass, inputClass } from '@/components/ui'
import { parseGuestCsv } from '@/lib/csv'
import { addGuest, deleteGuest, importGuests, markSent, updateGuestSeats, type GuestFormState } from './actions'

export type GuestRow = {
  id: string
  name: string
  phone: string | null
  seats: number
  group: string | null
  token: string
  sentAt: string | null
  openedAt: string | null
  rsvp: { attendance: 'yes' | 'no' | 'maybe'; partySize: number } | null
}

type Filter = 'all' | 'unsent' | 'sent' | 'opened' | 'answered' | 'waiting'

const attendanceLabel = { yes: 'Présent', maybe: 'Peut-être', no: 'Absent' } as const
const attendanceClass = {
  yes: 'bg-emerald-100 text-emerald-900',
  maybe: 'bg-amber-100 text-amber-900',
  no: 'bg-stone-200 text-stone-700',
} as const

const waNumber = (phone: string) => {
  const digits = phone.replace(/[^\d]/g, '')
  // Numéro sénégalais saisi sans indicatif (9 chiffres commençant par 7 ou 3).
  return /^[73]\d{8}$/.test(digits) ? `221${digits}` : digits
}

export function GuestManager({
  invitationId,
  slug,
  published,
  shareMessage,
  guests,
}: {
  invitationId: string
  slug: string
  published: boolean
  shareMessage: string
  guests: GuestRow[]
}) {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('')
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()
  const [state, formAction, adding] = useActionState<GuestFormState, FormData>(addGuest.bind(null, invitationId), {})
  // File figée au démarrage : les invités marqués « envoyés » ne décalent pas l'ordre.
  const [bulk, setBulk] = useState<{ queue: GuestRow[]; index: number } | null>(null)

  const origin = typeof window === 'undefined' ? '' : window.location.origin
  const personalLink = (guest: GuestRow) => `${origin}/i/${slug}?g=${guest.token}`
  const whatsappLink = (guest: GuestRow) => {
    const first = guest.name.split(' ')[0]
    const text = `Bonjour ${first} ! ${shareMessage}\n${personalLink(guest)}`
    return guest.phone ? `https://wa.me/${waNumber(guest.phone)}?text=${encodeURIComponent(text)}` : null
  }

  const groups = useMemo(() => [...new Set(guests.map((g) => g.group).filter(Boolean))] as string[], [guests])
  const stats = {
    total: guests.length,
    seats: guests.reduce((sum, g) => sum + g.seats, 0),
    sent: guests.filter((g) => g.sentAt).length,
    opened: guests.filter((g) => g.openedAt).length,
    answered: guests.filter((g) => g.rsvp).length,
  }

  const visible = guests.filter((guest) => {
    if (group && guest.group !== group) return false
    if (query && !`${guest.name} ${guest.phone ?? ''}`.toLowerCase().includes(query.toLowerCase())) return false
    switch (filter) {
      case 'unsent':
        return !guest.sentAt
      case 'sent':
        return Boolean(guest.sentAt)
      case 'opened':
        return Boolean(guest.openedAt)
      case 'answered':
        return Boolean(guest.rsvp)
      case 'waiting':
        return !guest.rsvp
      default:
        return true
    }
  })

  const bulkQueue = guests.filter((g) => !g.sentAt && g.phone)

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (file.size > 500_000) return setNotice({ ok: false, text: 'Fichier trop lourd (500 Ko maximum).' })
    const rows = parseGuestCsv(await file.text())
    startTransition(async () => {
      const result = await importGuests(invitationId, rows)
      if (!result.ok) return setNotice({ ok: false, text: result.message })
      const rejected = result.rejected.length
        ? ` ${result.rejected.length} ligne(s) ignorée(s) : ${result.rejected
            .slice(0, 5)
            .map((r) => `ligne ${r.line} (${r.reason})`)
            .join(', ')}${result.rejected.length > 5 ? '…' : ''}`
        : ''
      setNotice({ ok: result.rejected.length === 0, text: `${result.imported} invité(s) importé(s).${rejected}` })
    })
  }

  const openWhatsApp = (guest: GuestRow) => {
    const link = whatsappLink(guest)
    if (!link) return
    window.open(link, '_blank', 'noopener')
    startTransition(async () => {
      await markSent(invitationId, [guest.id])
    })
  }

  return (
    <div className="space-y-6">
      {!published && (
        <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          L’invitation est en brouillon : les liens fonctionneront dès sa publication.
        </p>
      )}

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ['Invités', stats.total],
          ['Places prévues', stats.seats],
          ['Envoyées', stats.sent],
          ['Ouvertes', stats.opened],
          ['Ont répondu', stats.answered],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl bg-white p-4 shadow-sm">
            <dt className="text-xs tracking-wide text-cocoa-900/60 uppercase">{label}</dt>
            <dd className="mt-1 font-(family-name:--font-serif) text-3xl">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0">
          <div className="mb-4 flex flex-wrap gap-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher un invité"
              aria-label="Rechercher un invité"
              className={`${inputClass} sm:max-w-xs`}
            />
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Filtrer" className={`${inputClass} sm:max-w-52`}>
              <option value="all">Tous</option>
              <option value="unsent">Pas encore envoyés</option>
              <option value="sent">Envoyés</option>
              <option value="opened">Ont ouvert</option>
              <option value="answered">Ont répondu</option>
              <option value="waiting">Sans réponse</option>
            </select>
            {groups.length > 0 && (
              <select value={group} onChange={(e) => setGroup(e.target.value)} aria-label="Groupe" className={`${inputClass} sm:max-w-52`}>
                <option value="">Tous les groupes</option>
                {groups.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            )}
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-cocoa-900/60">
              {guests.length ? 'Aucun invité ne correspond.' : 'Ajoutez vos premiers invités à droite, ou importez un fichier CSV.'}
            </p>
          ) : (
            <div className="-mx-5 overflow-x-auto sm:mx-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-cocoa-900/10 text-left text-xs tracking-wide text-cocoa-900/60 uppercase">
                    <th className="px-3 py-2 font-medium">Invité</th>
                    <th className="px-3 py-2 font-medium">Places</th>
                    <th className="px-3 py-2 font-medium">Suivi</th>
                    <th className="px-3 py-2 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((guest) => (
                    <tr key={guest.id} className="border-b border-cocoa-900/6 align-middle">
                      <td className="px-3 py-3">
                        <p className="font-medium">{guest.name}</p>
                        <p className="text-xs text-cocoa-900/55">{[guest.group, guest.phone].filter(Boolean).join(' · ')}</p>
                      </td>
                      <td className="px-3 py-3">
                        <select
                          value={guest.seats}
                          aria-label={`Places pour ${guest.name}`}
                          onChange={(e) =>
                            startTransition(async () => {
                              const result = await updateGuestSeats(invitationId, guest.id, Number(e.target.value))
                              if (!result.ok) setNotice({ ok: false, text: result.message })
                            })
                          }
                          className="min-h-10 rounded-lg border border-cocoa-900/15 bg-white px-2"
                        >
                          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                            <option key={n}>{n}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1 text-xs">
                          <Chip on={Boolean(guest.sentAt)}>Envoyé</Chip>
                          <Chip on={Boolean(guest.openedAt)}>Ouvert</Chip>
                          {guest.rsvp && (
                            <span className={`rounded-full px-2 py-0.5 font-medium ${attendanceClass[guest.rsvp.attendance]}`}>
                              {attendanceLabel[guest.rsvp.attendance]}
                              {guest.rsvp.attendance !== 'no' && ` · ${guest.rsvp.partySize}`}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex justify-end gap-1">
                          {guest.phone && (
                            <button type="button" onClick={() => openWhatsApp(guest)} className="min-h-10 rounded-lg bg-emerald-700 px-3 text-xs font-semibold text-white">
                              WhatsApp
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => navigator.clipboard.writeText(personalLink(guest)).then(() => setNotice({ ok: true, text: `Lien de ${guest.name} copié.` }))}
                            className="min-h-10 rounded-lg border border-cocoa-900/15 px-3 text-xs font-medium"
                          >
                            Copier le lien
                          </button>
                          <button
                            type="button"
                            aria-label={`Supprimer ${guest.name}`}
                            onClick={() => {
                              if (window.confirm(`Supprimer ${guest.name} et sa réponse éventuelle ?`)) {
                                startTransition(async () => {
                                  await deleteGuest(invitationId, guest.id)
                                })
                              }
                            }}
                            className="grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <FormMessage message={notice?.text} ok={notice?.ok} />
        </Card>

        <div className="space-y-6">
          <Card>
            <h2 className="font-(family-name:--font-serif) text-xl">Ajouter un invité</h2>
            <form action={formAction} className="mt-4 space-y-3" noValidate>
              <Field label="Nom" error={state.errors?.name}>
                <input name="name" required className={inputClass} aria-invalid={Boolean(state.errors?.name)} />
              </Field>
              <Field label="Téléphone (WhatsApp)" error={state.errors?.phone}>
                <input name="phone" type="tel" className={inputClass} placeholder="+221 77 …" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Places" error={state.errors?.seats}>
                  <input name="seats" type="number" min={1} max={10} defaultValue={1} className={inputClass} />
                </Field>
                <Field label="Groupe">
                  <input name="group" list="guest-groups" className={inputClass} placeholder="Amis" />
                </Field>
              </div>
              <datalist id="guest-groups">
                {[...new Set(['Famille de la mariée', 'Famille du marié', 'Amis', 'Collègues', ...groups])].map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
              <FormMessage message={state.message} ok={state.ok} />
              <button type="submit" disabled={adding} className={`${buttonClass} w-full`}>
                Ajouter
              </button>
            </form>
          </Card>

          <Card>
            <h2 className="font-(family-name:--font-serif) text-xl">Importer un fichier</h2>
            <p className="mt-1 text-sm text-cocoa-900/65">
              CSV avec les colonnes <strong>nom ; téléphone ; places ; groupe</strong> (export Excel ou Google Sheets).
            </p>
            <label className={`${ghostButtonClass} mt-4 w-full cursor-pointer`}>
              {pending ? 'Import…' : 'Choisir un fichier CSV'}
              <input type="file" accept=".csv,text/csv" onChange={onImport} className="sr-only" />
            </label>
          </Card>

          <Card>
            <h2 className="font-(family-name:--font-serif) text-xl">Envoi groupé WhatsApp</h2>
            <p className="mt-1 text-sm text-cocoa-900/65">
              {bulkQueue.length} invité(s) avec un numéro n’ont pas encore reçu leur lien. Chaque message est pré-rempli avec son lien
              personnel : il suffit d’appuyer sur « Envoyer » dans WhatsApp.
            </p>
            {bulkQueue.length > 0 && !bulk && (
              <button type="button" onClick={() => setBulk({ queue: bulkQueue, index: 0 })} className={`${buttonClass} mt-4 w-full`}>
                Commencer l’envoi
              </button>
            )}
            {bulk && (
              <div className="mt-4 space-y-2">
                {bulk.queue[bulk.index] ? (
                  <>
                    <p className="text-sm">
                      Prochain : <strong>{bulk.queue[bulk.index]!.name}</strong>
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        openWhatsApp(bulk.queue[bulk.index]!)
                        setBulk({ ...bulk, index: bulk.index + 1 })
                      }}
                      className={`${buttonClass} w-full bg-emerald-700 hover:bg-emerald-800`}
                    >
                      Ouvrir WhatsApp ({bulk.index + 1}/{bulk.queue.length})
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-emerald-800">Tous les liens ont été ouverts. 🎉</p>
                )}
                <button type="button" onClick={() => setBulk(null)} className="min-h-10 w-full text-sm underline">
                  {bulk.queue[bulk.index] ? 'Arrêter' : 'Fermer'}
                </button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Chip({ on, children }: { on: boolean; children: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ${on ? 'bg-sky-100 text-sky-900' : 'bg-cocoa-900/5 text-cocoa-900/40 line-through'}`}>
      {children}
    </span>
  )
}
