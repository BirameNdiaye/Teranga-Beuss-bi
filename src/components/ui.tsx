import Link from 'next/link'
import type { ComponentProps, ReactNode } from 'react'

export const inputClass =
  'w-full min-h-11 rounded-xl border border-cocoa-900/15 bg-white px-4 py-2.5 text-sm text-cocoa-900 outline-none transition placeholder:text-cocoa-900/40 focus:border-caramel focus:ring-3 focus:ring-caramel/20 aria-invalid:border-red-500'

export const buttonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cocoa-700 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-cocoa-900 disabled:cursor-not-allowed disabled:opacity-60'

export const ghostButtonClass =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-cocoa-900/15 bg-white px-4 text-sm font-medium text-cocoa-900 transition hover:border-caramel hover:bg-sand-50 disabled:opacity-60'

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold tracking-wide text-cocoa-900/70 uppercase">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-cocoa-900/55">{hint}</span>}
      {error && <span className="mt-1 block text-xs font-medium text-red-700">{error}</span>}
    </label>
  )
}

export function Card({ className = '', ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={`rounded-2xl border border-cocoa-900/8 bg-white p-5 shadow-[0_12px_40px_-24px_rgb(62_42_31/0.35)] sm:p-6 ${className}`}
      {...props}
    />
  )
}

export function Logo({ href = '/' }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2" aria-label="Teranga Invit — accueil">
      <span className="grid size-9 place-items-center rounded-full bg-cocoa-700 font-(family-name:--font-script) text-xl text-white">
        T
      </span>
      <span className="font-(family-name:--font-serif) text-lg text-cocoa-900">Teranga Invit</span>
    </Link>
  )
}

export function FormMessage({ message, ok = false }: { message?: string | null; ok?: boolean }) {
  if (!message) return null
  return (
    <p
      role={ok ? 'status' : 'alert'}
      className={`rounded-xl px-4 py-3 text-sm ${ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}
    >
      {message}
    </p>
  )
}
