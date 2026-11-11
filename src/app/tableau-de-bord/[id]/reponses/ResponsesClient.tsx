'use client'

import { useState, useTransition } from 'react'
import { Card, inputClass } from '@/components/ui'
import { formatFr } from '@/lib/dates'
import { deleteRsvp, moderateGuestbook } from './actions'

type Row = {
  id: string
  name: string
  phone: string | null
  attendance: 'yes' | 'no' | 'maybe'
  partySize: number
  message: string | null
  group: string | null
  personal: boolean
  updatedAt: string
  checkedIn: boolean
}

const label = { yes: 'Présent', maybe: 'Peut-être', no: 'Absent' } as const
const tone = {
  yes: 'bg-emerald-100 text-emerald-900',
  maybe: 'bg-amber-100 text-amber-900',
  no: 'bg-stone-200 text-stone-700',
} as const

export function ResponsesTable({ invitationId, rows }: { invitationId: string; rows: Row[] }) {
  const [filter, setFilter] = useState<'all' | Row['attendance']>('all')
  const [query, setQuery] = useState('')
  const [, startTransition] = useTransition()
  const visible = rows.filter(
    (r) => (filter === 'all' || r.attendance === filter) && r.name.toLowerCase().includes(query.toLowerCase()),
  )

  return (
    <Card>
      <div className="mb-4 flex flex-wrap gap-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher"
          aria-label="Rechercher une réponse"
          className={`${inputClass} max-w-xs`}
        />
        <div role="group" aria-label="Filtrer par réponse" className="flex flex-wrap gap-1">
          {(['all', 'yes', 'maybe', 'no'] as const).map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
              className={`min-h-11 rounded-xl px-4 text-sm font-medium ${
                filter === value ? 'bg-cocoa-700 text-white' : 'bg-sand-50 text-cocoa-900/75 hover:bg-cocoa-900/5'
              }`}
            >
              {value === 'all' ? `Toutes (${rows.length})` : `${label[value]} (${rows.filter((r) => r.attendance === value).length})`}
            </button>
          ))}
        </div>
      </div>
      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-cocoa-900/60">
          {rows.length ? 'Aucune réponse ne correspond.' : 'Pas encore de réponse. Partagez votre invitation !'}
        </p>
      ) : (
        <ul className="divide-y divide-cocoa-900/8">
          {visible.map((row) => (
            <li key={row.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {row.name}{' '}
                  {row.personal && <span className="ml-1 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] text-sky-900">lien perso</span>}
                  {row.checkedIn && (
                    <span className="ml-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">arrivé</span>
                  )}
                </p>
                <p className="text-xs text-cocoa-900/55">{[row.group, row.phone, row.updatedAt].filter(Boolean).join(' · ')}</p>
                {row.message && <p className="mt-2 rounded-xl bg-sand-50 px-3 py-2 text-sm italic">« {row.message} »</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${tone[row.attendance]}`}>
                  {label[row.attendance]}
                  {row.attendance !== 'no' && ` · ${row.partySize} pers.`}
                </span>
                <button
                  type="button"
                  aria-label={`Supprimer la réponse de ${row.name}`}
                  onClick={() => {
                    if (window.confirm(`Supprimer la réponse de ${row.name} ? Son billet ne sera plus valable.`)) {
                      startTransition(async () => {
                        await deleteRsvp(invitationId, row.id)
                      })
                    }
                  }}
                  className="grid size-10 place-items-center rounded-lg text-red-700 hover:bg-red-50"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

export function GuestbookModeration({
  invitationId,
  entries,
}: {
  invitationId: string
  entries: { id: string; author: string; message: string; createdAt: string }[]
}) {
  const [pending, startTransition] = useTransition()
  return (
    <Card>
      <h2 className="font-(family-name:--font-serif) text-xl">Livre d’or à valider</h2>
      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-cocoa-900/60">Aucun message en attente.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-cocoa-900/10 bg-sand-50 p-4">
              <p className="text-sm">« {entry.message} »</p>
              <p className="mt-1 text-xs text-cocoa-900/60">
                {entry.author} · {formatFr(entry.createdAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </p>
              <div className="mt-3 flex gap-2">
                {(['approved', 'rejected'] as const).map((decision) => (
                  <button
                    key={decision}
                    type="button"
                    disabled={pending}
                    onClick={() => startTransition(async () => void (await moderateGuestbook(invitationId, entry.id, decision)))}
                    className={`min-h-10 rounded-lg px-4 text-sm font-semibold ${
                      decision === 'approved' ? 'bg-emerald-700 text-white' : 'border border-cocoa-900/15 bg-white'
                    }`}
                  >
                    {decision === 'approved' ? 'Publier' : 'Refuser'}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
