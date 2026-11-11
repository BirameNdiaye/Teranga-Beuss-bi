import type { ReactNode } from 'react'
import { Logo } from '@/components/ui'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-cocoa-700 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#b07a4a,transparent_60%)] opacity-70" />
        <div className="relative flex h-full flex-col justify-end p-12 text-white">
          <p className="font-(family-name:--font-script) text-6xl leading-tight">Teranga Invit</p>
          <p className="mt-4 max-w-md font-(family-name:--font-serif) text-xl text-white/85">
            Un faire-part qui s’ouvre comme une lettre d’amour, et qui gère vos invités comme un pro.
          </p>
        </div>
      </div>
      <div className="flex flex-col px-4 py-8 sm:px-10">
        <Logo />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">{children}</div>
      </div>
    </main>
  )
}
