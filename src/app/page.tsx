import Link from 'next/link'
import { buttonClass, Logo } from '@/components/ui'

const features = [
  {
    title: 'Une enveloppe qui s’ouvre',
    text: 'Cachet de cire à vos initiales, ouverture en 3D, musique qui démarre : l’émotion dès la première seconde.',
  },
  {
    title: '« Cher·e Awa »',
    text: 'Chaque invité reçoit son lien personnel : son prénom sur l’enveloppe, ses places réservées, sa réponse pré-remplie.',
  },
  {
    title: 'Réponses en direct',
    text: 'Présents, absents, couverts, messages : tout s’affiche en temps réel, et s’exporte en un clic pour le traiteur.',
  },
  {
    title: 'Envoi WhatsApp',
    text: 'Un message pré-rempli par invité, envoyé depuis votre téléphone. Vous savez qui l’a reçu et qui l’a ouvert.',
  },
  {
    title: 'Billet QR à l’entrée',
    text: 'Chaque invité confirmé reçoit son billet. Le jour J, scannez-le depuis un téléphone : fini les resquilleurs.',
  },
  {
    title: 'Français, wolof, anglais',
    text: 'Vos invités choisissent leur langue. Le programme, les lieux et le billet restent lisibles même sans connexion.',
  },
]

const steps = [
  ['Racontez', 'Vos prénoms, votre histoire, le programme sur un ou plusieurs jours.'],
  ['Habillez', 'Photos, vidéo, musique, couleurs et typographie, avec un aperçu en direct sur téléphone.'],
  ['Envoyez', 'Publiez, puis partagez votre lien ou les liens personnels par WhatsApp.'],
  ['Accueillez', 'Suivez les réponses, puis scannez les billets à l’entrée.'],
]

export default function HomePage() {
  return (
    <div className="overflow-x-clip bg-sand-100">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/connexion" className="min-h-11 rounded-xl px-4 py-3 text-sm font-medium text-cocoa-700 hover:bg-cocoa-900/5">
            Connexion
          </Link>
          <Link href="/inscription" className={`${buttonClass} hidden sm:inline-flex`}>
            Créer mon invitation
          </Link>
        </nav>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-20 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
          <div>
            <p className="font-(family-name:--font-caps) text-xs font-semibold tracking-[0.35em] text-caramel uppercase">
              Faire-part de mariage numérique
            </p>
            <h1 className="mt-5 font-(family-name:--font-serif) text-[clamp(2.4rem,6vw,4.2rem)] leading-[1.05] text-cocoa-900">
              Une invitation qui s’ouvre comme une{' '}
              <span className="font-(family-name:--font-script) text-[1.25em] font-normal text-cocoa-700">lettre d’amour</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-cocoa-900/75">
              Teranga Invit réunit le plus beau des faire-part et l’outil qui gère vos invités : réponses, places, WhatsApp et
              billets QR. Pensé pour le Sénégal et sa diaspora.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/inscription" className={`${buttonClass} min-h-12 px-7`}>
                Créer mon invitation
              </Link>
              <Link
                href="/i/awa-et-junior"
                className="inline-flex min-h-12 items-center rounded-xl border border-cocoa-900/15 bg-white px-6 text-sm font-semibold text-cocoa-900 transition hover:border-caramel"
              >
                Voir un exemple ↗
              </Link>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm" aria-hidden>
            <div className="absolute inset-0 rotate-6 rounded-[2rem] bg-caramel/30" />
            <div className="absolute inset-0 -rotate-3 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,#c9a77c,#6b3f28_75%)] shadow-2xl" />
            <div className="absolute inset-6 flex flex-col items-center justify-center rounded-[1.5rem] border border-white/30 text-center text-white">
              <p className="font-(family-name:--font-caps) text-[10px] tracking-[0.4em] uppercase opacity-80">Nous nous marions</p>
              <p className="mt-3 font-(family-name:--font-script) text-6xl leading-tight">
                Awa
                <br />
                <span className="text-sand-100/80">&amp;</span> Junior
              </p>
              <p className="mt-4 font-(family-name:--font-caps) text-xs tracking-[0.25em] uppercase">9 janvier 2027</p>
              <span className="mt-8 grid size-16 place-items-center rounded-full bg-[radial-gradient(circle_at_35%_30%,#d9b48a,#b07a4a)] font-(family-name:--font-script) text-2xl shadow-lg">
                A&amp;J
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="text-center font-(family-name:--font-serif) text-3xl sm:text-4xl">Tout ce qu’il faut, rien de trop</h2>
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <li key={feature.title} className="rounded-3xl bg-sand-50 p-6">
                  <h3 className="font-(family-name:--font-serif) text-xl text-cocoa-700">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-cocoa-900/75">{feature.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
          <h2 className="text-center font-(family-name:--font-script) text-5xl text-cocoa-700">En quatre gestes</h2>
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([title, text], index) => (
              <li key={title} className="relative rounded-3xl border border-cocoa-900/10 bg-white p-6">
                <span className="font-(family-name:--font-serif) text-5xl text-caramel/40">{index + 1}</span>
                <h3 className="mt-2 font-(family-name:--font-serif) text-xl">{title}</h3>
                <p className="mt-2 text-sm text-cocoa-900/70">{text}</p>
              </li>
            ))}
          </ol>
          <div className="mt-14 text-center">
            <Link href="/inscription" className={`${buttonClass} min-h-12 px-8`}>
              Commencer gratuitement
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-cocoa-900/10 py-8 text-center text-sm text-cocoa-900/60">
        Teranga Invit · Fait avec amour à Dakar
      </footer>
    </div>
  )
}
