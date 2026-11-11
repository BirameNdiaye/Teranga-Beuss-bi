import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-sand-100 px-4 text-center">
      <div>
        <p className="font-(family-name:--font-script) text-6xl text-caramel">Oups</p>
        <h1 className="mt-4 font-(family-name:--font-serif) text-2xl text-cocoa-900">Cette page est introuvable</h1>
        <p className="mt-2 text-sm text-cocoa-900/70">
          L’invitation n’existe pas, n’est pas encore publiée, ou le lien a changé.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex min-h-11 items-center rounded-xl bg-cocoa-700 px-5 text-sm font-semibold text-white"
        >
          Retour à l’accueil
        </Link>
      </div>
    </main>
  )
}
