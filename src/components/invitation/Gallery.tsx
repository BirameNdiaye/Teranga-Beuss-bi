'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'
import { useLanguage } from '@/lib/i18n/client'
import type { ImageView } from '@/lib/invitation-view'
import { Section, SectionHeading } from './sections'

export function Gallery({ images }: { images: ImageView[] }) {
  const { t } = useLanguage()
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  if (!images.length) return null

  const go = (step: number) => setIndex((current) => (current + step + images.length) % images.length)

  return (
    <Section id="galerie">
      <div className="mx-auto max-w-4xl">
        <SectionHeading eyebrow="gallery.eyebrow" title="gallery.title" script />
        <div
          className="relative mx-auto aspect-[4/5] w-[calc(100%-1.5rem)] max-w-sm select-none sm:max-w-md"
          onTouchStart={(event) => (touchStart.current = event.touches[0]?.clientX ?? null)}
          onTouchEnd={(event) => {
            if (touchStart.current === null) return
            const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current
            if (Math.abs(delta) > 40) go(delta < 0 ? 1 : -1)
            touchStart.current = null
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowRight') go(1)
            if (event.key === 'ArrowLeft') go(-1)
          }}
          tabIndex={0}
          role="region"
          aria-roledescription="carrousel"
          aria-label={t('gallery.title')}
        >
          {images.map((image, position) => {
            const offset = (position - index + images.length) % images.length
            return (
              <figure
                key={`${image.url}-${position}`}
                aria-hidden={offset !== 0}
                className="absolute inset-0 rounded-sm bg-white p-2.5 pb-10 shadow-[0_25px_50px_-20px_rgb(0_0_0/0.45)] transition-all duration-500 ease-out sm:p-3 sm:pb-12"
                style={{
                  zIndex: images.length - offset,
                  opacity: offset < 3 ? 1 : 0,
                  transform: `translate(${offset * 8}px, ${offset * 7}px) rotate(${offset === 0 ? -1.5 : offset * 2.5}deg)`,
                }}
              >
                <div className="relative h-full w-full overflow-hidden bg-(--inv-bg)">
                  {offset < 3 && (
                    <Image
                      src={image.url}
                      alt={image.alt}
                      fill
                      sizes="(min-width: 640px) 28rem, 90vw"
                      className="object-cover"
                      loading={offset === 0 ? 'eager' : 'lazy'}
                    />
                  )}
                </div>
              </figure>
            )
          })}
        </div>

        {images.length > 1 && (
          <div className="mt-12 flex items-center justify-center gap-6">
            <RoundButton label={t('gallery.prev')} onClick={() => go(-1)}>
              ←
            </RoundButton>
            <p
              className="min-w-28 text-center font-(family-name:--font-caps) text-xs tracking-[0.2em] text-(--inv-muted) uppercase"
              aria-live="polite"
            >
              {t('gallery.count', { current: index + 1, total: images.length })}
            </p>
            <RoundButton label={t('gallery.next')} onClick={() => go(1)}>
              →
            </RoundButton>
          </div>
        )}
      </div>
    </Section>
  )
}

function RoundButton({ label, onClick, children }: { label: string; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-11 place-items-center rounded-full border border-(--inv-accent)/40 bg-(--inv-surface) text-(--inv-primary) transition hover:border-(--inv-accent) hover:bg-(--inv-accent)/10"
    >
      {children}
    </button>
  )
}
