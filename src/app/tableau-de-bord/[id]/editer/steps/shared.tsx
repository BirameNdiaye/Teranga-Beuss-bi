'use client'

import { useId, useRef, useState, type ReactNode } from 'react'
import type { LibraryMedia } from '../Builder'

export function StepCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="mb-6 rounded-2xl border border-cocoa-900/8 bg-white p-5 shadow-[0_12px_40px_-28px_rgb(62_42_31/0.4)] sm:p-6">
      <h2 className="font-(family-name:--font-serif) text-xl">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-cocoa-900/65">{subtitle}</p>}
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  )
}

export function Choice<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string; hint?: string }[]
  onChange: (value: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-3">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={value === option.value}
          onClick={() => onChange(option.value)}
          className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm transition ${
            value === option.value
              ? 'border-cocoa-700 bg-cocoa-700 text-white'
              : 'border-cocoa-900/15 bg-white hover:border-caramel'
          }`}
        >
          <span className="block font-semibold">{option.label}</span>
          {option.hint && (
            <span className={`block text-xs ${value === option.value ? 'text-white/80' : 'text-cocoa-900/60'}`}>
              {option.hint}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (value: boolean) => void; label: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-4 rounded-xl border border-cocoa-900/10 bg-sand-50 px-4">
      <span className="text-sm font-medium">{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden
        className="relative h-6 w-11 rounded-full bg-cocoa-900/20 transition peer-checked:bg-cocoa-700 peer-focus-visible:ring-3 peer-focus-visible:ring-caramel/40 after:absolute after:top-0.5 after:left-0.5 after:size-5 after:rounded-full after:bg-white after:shadow after:transition peer-checked:after:translate-x-5"
      />
    </label>
  )
}

const accept = {
  image: 'image/jpeg,image/png,image/webp,image/heic,image/avif',
  video: 'video/mp4,video/webm,video/quicktime',
  audio: 'audio/mpeg,audio/mp4,audio/aac,audio/ogg,audio/wav,audio/x-m4a',
}

export function UploadButton({
  kind,
  multiple = false,
  label,
  onUploaded,
}: {
  kind: LibraryMedia['kind']
  multiple?: boolean
  label: string
  onUploaded: (media: LibraryMedia) => void
}) {
  const inputId = useId()
  const input = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = async (files: FileList | null) => {
    if (!files?.length) return
    setError(null)
    const list = [...files]
    for (const [index, file] of list.entries()) {
      setProgress(list.length > 1 ? `Envoi ${index + 1}/${list.length}…` : 'Envoi…')
      const body = new FormData()
      body.set('file', file)
      body.set('kind', kind)
      body.set('alt', file.name.replace(/\.[^.]+$/, '').slice(0, 120))
      try {
        const response = await fetch('/api/media', { method: 'POST', body })
        const json = await response.json()
        if (!response.ok) setError(json.error ?? 'Envoi impossible.')
        else onUploaded(json as LibraryMedia)
      } catch {
        setError('Connexion perdue pendant l’envoi.')
      }
    }
    setProgress(null)
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <input
        ref={input}
        type="file"
        accept={accept[kind]}
        multiple={multiple}
        className="sr-only"
        id={inputId}
        onChange={(event) => upload(event.target.files)}
      />
      <label
        htmlFor={inputId}
        className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-dashed border-caramel bg-sand-50 px-4 text-sm font-medium text-cocoa-700 transition hover:bg-caramel/10"
      >
        {progress ?? label}
      </label>
      {error && (
        <p role="alert" className="mt-2 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export function FieldError({ message }: { message?: string }) {
  return message ? <span className="mt-1 block text-xs font-medium text-red-700">{message}</span> : null
}
