import { db } from '@/lib/db'

const icsDate = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
const escape = (text: string) => text.replace(/[\\;,]/g, (c) => `\\${c}`).replace(/\n/g, '\\n')

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string; eventId: string }> }) {
  const { slug, eventId } = await params
  const event = await db.event.findFirst({
    where: { id: eventId, invitation: { slug, status: 'published' } },
    include: { invitation: { select: { partnerOne: true, partnerTwo: true } } },
  })
  if (!event) return new Response('Introuvable', { status: 404 })

  const end = new Date(event.startsAt.getTime() + 3 * 60 * 60_000)
  const names = `${event.invitation.partnerOne} & ${event.invitation.partnerTwo}`
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const body = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Teranga Invit//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@teranga-invit`,
    `DTSTAMP:${icsDate(new Date())}`,
    `DTSTART:${icsDate(event.startsAt)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${escape(`${event.title} — ${names}`)}`,
    `LOCATION:${escape([event.venue, event.address].filter(Boolean).join(', '))}`,
    `DESCRIPTION:${escape(`${event.category} · ${site}/i/${slug}`)}`,
    `URL:${site}/i/${slug}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${slug}-${event.id}.ics"`,
    },
  })
}
