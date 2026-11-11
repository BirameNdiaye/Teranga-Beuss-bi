// Données de démonstration : un mariage complet sur deux jours.
// Lancement : docker compose run --rm web npm run seed
import { createHmac, randomBytes } from 'node:crypto'
import { CreateBucketCommand, HeadBucketCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { hash } from '@node-rs/argon2'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import sharp from 'sharp'
import { PrismaClient } from '../src/generated/prisma/client'

const env = (name: string) => {
  const value = process.env[name]
  if (!value) throw new Error(`Variable ${name} manquante (voir .env.example)`)
  return value
}

const db = new PrismaClient({ adapter: new PrismaMariaDb(env('DATABASE_URL')) })
const bucket = process.env.S3_BUCKET ?? 'teranga-media'
const s3 = new S3Client({
  endpoint: env('S3_ENDPOINT'),
  region: process.env.S3_REGION ?? 'us-east-1',
  forcePathStyle: true,
  credentials: { accessKeyId: env('S3_ACCESS_KEY'), secretAccessKey: env('S3_SECRET_KEY') },
})

const token = () => randomBytes(24).toString('base64url')
const argon = { memoryCost: 19456, timeCost: 2, parallelism: 1 }

const palettes = [
  ['#6B3F28', '#C9A77C', '#F6EEE3'],
  ['#3E2A1F', '#B07A4A', '#E0C9A6'],
  ['#7A4B2E', '#E8D3B5', '#FBF7F1'],
  ['#5A3A26', '#D9B48A', '#F3E6D3'],
  ['#4A2C1E', '#A07C55', '#EADBC4'],
  ['#8A5634', '#F1DEC2', '#FFF9F1'],
] as const

/** Illustration générée (aucune photo réelle) : dégradé, arches et feuillages. */
function artwork(index: number, label: string) {
  const [dark, mid, light] = palettes[index % palettes.length]!
  const leaves = Array.from({ length: 14 }, (_, i) => {
    const x = 120 + ((i * 97) % 760)
    const y = 980 + ((i * 53) % 260)
    const r = (i * 37) % 360
    return `<ellipse cx="${x}" cy="${y}" rx="26" ry="70" fill="${mid}" opacity="0.35" transform="rotate(${r} ${x} ${y})"/>`
  }).join('')
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250">
    <defs>
      <radialGradient id="g" cx="${30 + (index * 13) % 40}%" cy="25%" r="90%">
        <stop offset="0" stop-color="${light}"/><stop offset="0.55" stop-color="${mid}"/><stop offset="1" stop-color="${dark}"/>
      </radialGradient>
    </defs>
    <rect width="1000" height="1250" fill="url(#g)"/>
    <path d="M220 1250 V560 a280 280 0 0 1 560 0 V1250" fill="none" stroke="${light}" stroke-width="6" opacity="0.55"/>
    <path d="M280 1250 V600 a220 220 0 0 1 440 0 V1250" fill="none" stroke="${light}" stroke-width="2" opacity="0.4"/>
    ${leaves}
    <circle cx="500" cy="430" r="120" fill="${light}" opacity="0.18"/>
  </svg>`)
}

async function upload(ownerId: string, index: number, label: string, alt: string) {
  const { data, info } = await sharp(artwork(index, label)).webp({ quality: 82 }).toBuffer({ resolveWithObject: true })
  const key = `${ownerId}/${token()}.webp`
  await s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: data, ContentType: 'image/webp' }))
  return db.media.create({
    data: { ownerId, key, kind: 'image', mimeType: 'image/webp', width: info.width, height: info.height, alt },
  })
}

/** Demande à l'application lancée de vider le cache de la page (sinon l'ancienne version reste servie). */
async function revalidate(slugs: string[]) {
  const url = process.env.REVALIDATE_URL ?? 'http://web:3000'
  const token = createHmac('sha256', env('AUTH_SECRET')).update('revalidate').digest('base64url')
  try {
    const response = await fetch(`${url}/api/revalidate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-revalidate-token': token },
      body: JSON.stringify({ slugs }),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
  } catch (error) {
    console.warn(`Cache non vidé (${(error as Error).message}) : l'application est-elle lancée ?`)
  }
}

async function main() {
  await s3.send(new HeadBucketCommand({ Bucket: bucket })).catch(() => s3.send(new CreateBucketCommand({ Bucket: bucket })))

  const email = env('SEED_USER_EMAIL').toLowerCase()
  const password = env('SEED_USER_PASSWORD')

  await db.invitation.deleteMany({ where: { slug: 'awa-et-junior' } })
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash: await hash(password, argon) },
    create: { email, name: 'Awa & Junior', passwordHash: await hash(password, argon) },
  })

  const cover = await upload(user.id, 0, 'A & J', 'Awa et Junior')
  const gallery = await Promise.all(
    ['Bargny', 'Teranga', 'Yaay', 'Dakar', 'Nopp', 'Jamm'].map((label, i) =>
      upload(user.id, i + 1, label, `Souvenir ${i + 1} d'Awa et Junior`),
    ),
  )

  const invitation = await db.invitation.create({
    data: {
      ownerId: user.id,
      slug: 'awa-et-junior',
      partnerOne: 'Awa',
      partnerTwo: 'Junior',
      status: 'published',
      visibility: 'public',
      accessCodeHash: await hash('TERANGA2026', argon),
      theme: 'dore',
      story:
        "Alhamdoulillah…\nNous avons dit oui à une vie à deux, sous la bénédiction d'Allah.\nQu'Allah facilite notre union et fasse de nous une source de paix.\nAmine.",
      thankYouMessage:
        'Votre présence est le plus beau des cadeaux. Merci de partager ce moment avec nous.',
      shareMessage: 'Vous êtes invité(e) au mariage d’Awa & Junior !',
      rsvpDeadline: new Date('2026-12-20T23:59:00Z'),
      coverId: cover.id,
      events: {
        create: [
          {
            startsAt: new Date('2027-01-09T17:00:00Z'),
            category: 'Cérémonie',
            title: 'Takk',
            venue: 'Grande mosquée de Bargny',
            address: 'Bargny',
            latitude: 14.7020655,
            longitude: -17.23283,
            position: 0,
          },
          {
            startsAt: new Date('2027-01-10T13:00:00Z'),
            category: 'Réception',
            title: 'Accueil de la mariée',
            venue: 'Cité Gendarmerie 1',
            address: 'Keur Massar',
            latitude: 14.7602444,
            longitude: -17.2830982,
            position: 1,
          },
        ],
      },
      gallery: { create: gallery.map((media, position) => ({ mediaId: media.id, position })) },
      contacts: {
        create: [
          { name: 'Moussa Diop', role: 'Organisateur', phone: '+221 77 000 00 01', position: 0 },
          { name: 'Fatou Ndiaye', role: 'Organisatrice', phone: '+221 78 000 00 02', position: 1 },
        ],
      },
      guestbook: {
        create: [
          { author: 'Tata Khady', message: 'Qu’Allah bénisse votre foyer. Je suis si fière de vous !', status: 'approved' },
          { author: 'Ibou', message: 'Félicitations les amoureux, on sera là pour danser !', status: 'approved' },
          { author: 'Anonyme', message: 'Message en attente de validation.', status: 'pending' },
        ],
      },
    },
  })

  const guests = [
    { name: 'Aminata Sow', phone: '+221770000011', seats: 2, group: 'Famille de la mariée' },
    { name: 'Cheikh Fall', phone: '+221770000012', seats: 1, group: 'Amis' },
    { name: 'Mariama Ba', phone: '+221770000013', seats: 4, group: 'Famille du marié' },
    { name: 'Ousmane Kane', phone: '+221770000014', seats: 2, group: 'Collègues' },
    { name: 'Ndeye Gaye', phone: '+221770000015', seats: 1, group: 'Amis' },
    { name: 'Pape Diallo', phone: '+221770000016', seats: 3, group: 'Famille de la mariée' },
  ]
  for (const [index, guest] of guests.entries()) {
    const created = await db.guest.create({
      data: {
        ...guest,
        invitationId: invitation.id,
        token: token(),
        sentAt: index < 5 ? new Date() : null,
        openedAt: index < 4 ? new Date() : null,
      },
    })
    if (index < 3) {
      await db.rsvp.create({
        data: {
          invitationId: invitation.id,
          guestId: created.id,
          name: guest.name,
          phone: guest.phone,
          attendance: index === 2 ? 'maybe' : 'yes',
          partySize: Math.min(guest.seats, 2),
          source: 'personal',
          ticketToken: token(),
          message: index === 0 ? 'Nous serons là avec joie !' : null,
        },
      })
    }
  }

  await revalidate([invitation.slug])
  console.log(`Seed terminé : invitation /i/${invitation.slug}, compte ${email}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => db.$disconnect())
