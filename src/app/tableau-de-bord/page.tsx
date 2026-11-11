import Image from 'next/image'
import Link from 'next/link'
import { buttonClass } from '@/components/ui'
import { managedBy } from '@/lib/access'
import { requireUser } from '@/lib/auth'
import { formatFr } from '@/lib/dates'
import { db } from '@/lib/db'
import { createInvitation } from './actions'

const statusLabel = { draft: 'Brouillon', published: 'Publiée', archived: 'Archivée' } as const
const statusClass = {
  draft: 'bg-amber-100 text-amber-900',
  published: 'bg-emerald-100 text-emerald-900',
  archived: 'bg-stone-200 text-stone-700',
} as const

export default async function DashboardPage() {
  const user = await requireUser()
  const invitations = await db.invitation.findMany({
    where: managedBy(user.id),
    orderBy: { updatedAt: 'desc' },
    include: {
      cover: true,
      events: { orderBy: { startsAt: 'asc' }, take: 1 },
      _count: { select: { guests: true, rsvps: true } },
      rsvps: { where: { attendance: 'yes' }, select: { partySize: true } },
    },
  })

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-(family-name:--font-script) text-3xl text-caramel">Bonjour {user.name.split(' ')[0]}</p>
          <h1 className="font-(family-name:--font-serif) text-3xl sm:text-4xl">Vos invitations</h1>
        </div>
        <form action={createInvitation}>
          <button type="submit" className={buttonClass}>
            + Nouvelle invitation
          </button>
        </form>
      </div>

      {invitations.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-cocoa-900/20 bg-white/60 p-10 text-center">
          <p className="font-(family-name:--font-serif) text-2xl">Votre premier faire-part vous attend</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-cocoa-900/70">
            Créez une invitation : vous pourrez la modifier tranquillement avant de la publier.
          </p>
          <form action={createInvitation} className="mt-6">
            <button type="submit" className={buttonClass}>
              Créer mon invitation
            </button>
          </form>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {invitations.map((invitation) => {
            const attending = invitation.rsvps.reduce((sum, r) => sum + r.partySize, 0)
            const first = invitation.events[0]
            return (
              <li key={invitation.id}>
                <Link
                  href={`/tableau-de-bord/${invitation.id}/editer`}
                  className="group block overflow-hidden rounded-3xl bg-white shadow-[0_18px_40px_-28px_rgb(62_42_31/0.5)] transition hover:-translate-y-0.5"
                >
                  <div className="relative aspect-[16/10] bg-cocoa-700">
                    {invitation.cover && (
                      <Image
                        src={invitation.cover.url}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                        className="object-cover opacity-85 transition group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <span
                      className={`absolute top-3 left-3 rounded-full px-3 py-1 text-xs font-semibold ${statusClass[invitation.status]}`}
                    >
                      {statusLabel[invitation.status]}
                    </span>
                    <p className="absolute bottom-3 left-4 font-(family-name:--font-script) text-4xl text-white">
                      {invitation.partnerOne} &amp; {invitation.partnerTwo}
                    </p>
                  </div>
                  <div className="grid grid-cols-3 divide-x divide-cocoa-900/8 p-4 text-center">
                    <Stat label="Invités" value={invitation._count.guests} />
                    <Stat label="Réponses" value={invitation._count.rsvps} />
                    <Stat label="Présents" value={attending} />
                  </div>
                  <p className="border-t border-cocoa-900/8 px-4 py-3 text-xs text-cocoa-900/65">
                    {first ? formatFr(first.startsAt.toISOString(), { dateStyle: 'full' }) : 'Date à définir'} ·
                    /i/{invitation.slug}
                  </p>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="font-(family-name:--font-serif) text-2xl">{value}</p>
      <p className="text-[11px] tracking-wide text-cocoa-900/60 uppercase">{label}</p>
    </div>
  )
}
