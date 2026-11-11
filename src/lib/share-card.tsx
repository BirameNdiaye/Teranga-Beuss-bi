import 'server-only'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import sharp from 'sharp'
import { themes, type ThemeName } from './invitation-view'

// Vignette 1200 × 630 affichée par WhatsApp, Facebook, X… quand le lien est partagé.
// Rendue en PNG par next/og puis convertie en JPEG : WhatsApp ignore les images trop lourdes
// (au-delà d'environ 300 Ko) et n'affiche pas toujours le WebP.

export const SHARE_CARD_SIZE = { width: 1200, height: 630 }

const fontDir = path.join(/*turbopackIgnore: true*/ process.cwd(), 'src/assets/fonts')

let fonts: Promise<{ name: string; data: Buffer; weight: 400 | 500 | 600; style: 'normal' }[]> | null = null

function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(fontDir, 'GreatVibes-Regular.ttf')).then((data) => ({ name: 'Script', data, weight: 400 as const, style: 'normal' as const })),
    readFile(path.join(fontDir, 'PlayfairDisplay-Medium.ttf')).then((data) => ({ name: 'Serif', data, weight: 500 as const, style: 'normal' as const })),
    readFile(path.join(fontDir, 'Montserrat-SemiBold.ttf')).then((data) => ({ name: 'Caps', data, weight: 600 as const, style: 'normal' as const })),
  ])
  return fonts
}

export type ShareCardInput = {
  partnerOne: string
  partnerTwo: string
  /** Ligne sous les noms (date et lieu), ou null pour une invitation protégée. */
  details: string | null
  eyebrow: string
  theme: ThemeName
  accentColor: string | null
  /** Photo de couverture, déjà lue en mémoire. */
  photo: Buffer | null
}

export async function renderShareCard(input: ShareCardInput) {
  const vars = themes[input.theme].vars
  const primary = vars['--inv-primary']!
  const accent = input.accentColor ?? vars['--inv-accent']!
  const initials = `${input.partnerOne.trim()[0] ?? ''}&${input.partnerTwo.trim()[0] ?? ''}`.toUpperCase()

  // Photo recadrée au format de la vignette, en JPEG léger pour le moteur de rendu.
  const photo = input.photo
    ? await sharp(input.photo)
        .resize(SHARE_CARD_SIZE.width, SHARE_CARD_SIZE.height, { fit: 'cover', position: 'attention' })
        .jpeg({ quality: 80 })
        .toBuffer()
        .then((buffer) => `data:image/jpeg;base64,${buffer.toString('base64')}`)
        .catch(() => null)
    : null

  const longNames = `${input.partnerOne} & ${input.partnerTwo}`.length > 22

  const png = new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          alignItems: 'center',
          justifyContent: 'center',
          background: `radial-gradient(circle at 30% 20%, ${accent}, ${primary} 72%)`,
          color: 'white',
        }}
      >
        {photo && (
          // eslint-disable-next-line @next/next/no-img-element -- rendu Satori, pas une page
          <img src={photo} alt="" width={1200} height={630} style={{ position: 'absolute', top: 0, left: 0, width: 1200, height: 630, objectFit: 'cover' }} />
        )}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1200,
            height: 630,
            display: 'flex',
            background: photo
              ? 'linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.78) 100%)'
              : 'transparent',
          }}
        />
        <div
          style={{
            // Satori ne gère pas `inset` : positions explicites.
            position: 'absolute',
            top: 28,
            left: 28,
            width: 1144,
            height: 574,
            display: 'flex',
            border: '2px solid rgba(255,255,255,0.45)',
            borderRadius: 28,
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '0 90px' }}>
          <div style={{ fontFamily: 'Caps', fontSize: 24, letterSpacing: 10, textTransform: 'uppercase', opacity: 0.9 }}>
            {input.eyebrow}
          </div>
          <div
            style={{
              fontFamily: 'Script',
              fontSize: longNames ? 108 : 138,
              lineHeight: 1.1,
              marginTop: 18,
              display: 'flex',
              alignItems: 'baseline',
              textShadow: '0 4px 18px rgba(0,0,0,0.35)',
            }}
          >
            {input.partnerOne}
            <span style={{ color: accent, margin: '0 22px' }}>&amp;</span>
            {input.partnerTwo}
          </div>
          {input.details && (
            <div style={{ fontFamily: 'Serif', fontSize: 34, marginTop: 26, opacity: 0.95 }}>{input.details}</div>
          )}
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: 52,
            right: 64,
            width: 92,
            height: 92,
            borderRadius: 92,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: accent,
            border: '3px solid rgba(255,255,255,0.35)',
            fontFamily: 'Script',
            fontSize: 40,
          }}
        >
          {initials}
        </div>
        <div style={{ position: 'absolute', bottom: 64, left: 64, fontFamily: 'Caps', fontSize: 20, letterSpacing: 4, opacity: 0.85 }}>
          TERANGA INVIT
        </div>
      </div>
    ),
    { ...SHARE_CARD_SIZE, fonts: await loadFonts() },
  )

  return sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 80, mozjpeg: true }).toBuffer()
}
