'use client'

import Image from 'next/image'
import { useState } from 'react'
import type { LibraryMedia, StepProps } from '../Builder'
import { IconButton } from './InformationStep'
import { FieldError, StepCard, UploadButton } from './shared'

export function MediaStep({ form, update, errors, library, addMedia }: StepProps) {
  const [picking, setPicking] = useState(false)
  const images = [...library.values()].filter((m) => m.kind === 'image')
  const media = (id: string | null) => (id ? library.get(id) : undefined)
  const cover = media(form.coverId)
  const video = media(form.videoId)
  const music = media(form.musicId)

  const moveGallery = (from: number, to: number) => {
    const next = [...form.gallery]
    const [item] = next.splice(from, 1)
    if (item) next.splice(to, 0, item)
    update({ gallery: next })
  }

  return (
    <>
      <StepCard title="Photo de couverture" subtitle="Affichée en plein écran à l’ouverture de l’enveloppe.">
        <div className="flex flex-wrap items-center gap-4">
          {cover ? (
            <div className="relative h-36 w-28 overflow-hidden rounded-xl bg-sand-100">
              <Image src={cover.url} alt={cover.alt} fill sizes="112px" className="object-cover" />
            </div>
          ) : (
            <div className="grid h-36 w-28 place-items-center rounded-xl bg-sand-100 text-xs text-cocoa-900/50">Aucune</div>
          )}
          <div className="space-y-2">
            <UploadButton
              kind="image"
              label="Choisir une photo"
              onUploaded={(m) => {
                addMedia(m)
                update({ coverId: m.id })
              }}
            />
            {cover && (
              <button type="button" onClick={() => update({ coverId: null })} className="text-xs text-red-700 underline">
                Retirer
              </button>
            )}
          </div>
        </div>
        <FieldError message={errors.coverId} />
      </StepCard>

      <StepCard title="Vidéo d’accueil (facultatif)" subtitle="Remplace la photo sur l’accueil, en boucle et sans son. 60 Mo maximum.">
        <MediaRow
          media={video}
          kind="video"
          label="Choisir une vidéo"
          onUploaded={(m) => {
            addMedia(m)
            update({ videoId: m.id })
          }}
          onRemove={() => update({ videoId: null })}
        />
        <FieldError message={errors.videoId} />
      </StepCard>

      <StepCard title="Musique (facultatif)" subtitle="Démarre quand l’invité ouvre l’enveloppe. MP3 ou M4A, 15 Mo maximum.">
        <MediaRow
          media={music}
          kind="audio"
          label="Choisir une musique"
          onUploaded={(m) => {
            addMedia(m)
            update({ musicId: m.id })
          }}
          onRemove={() => update({ musicId: null })}
        />
        <FieldError message={errors.musicId} />
      </StepCard>

      <StepCard title="Galerie" subtitle={`${form.gallery.length}/24 photos. L’ordre ici est l’ordre d’affichage.`}>
        {form.gallery.length > 0 && (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {form.gallery.map((id, index) => {
              const item = library.get(id)
              return (
                <li key={id} className="overflow-hidden rounded-xl border border-cocoa-900/10 bg-sand-50">
                  <div className="relative aspect-[4/5]">
                    {item && <Image src={item.url} alt={item.alt} fill sizes="200px" className="object-cover" />}
                  </div>
                  <div className="flex justify-between gap-1 p-2">
                    <IconButton label="Avant" disabled={index === 0} onClick={() => moveGallery(index, index - 1)}>
                      ←
                    </IconButton>
                    <IconButton label="Retirer de la galerie" onClick={() => update({ gallery: form.gallery.filter((g) => g !== id) })}>
                      ✕
                    </IconButton>
                    <IconButton label="Après" disabled={index === form.gallery.length - 1} onClick={() => moveGallery(index, index + 1)}>
                      →
                    </IconButton>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
        <div className="flex flex-wrap gap-3">
          {form.gallery.length < 24 && (
            <UploadButton
              kind="image"
              multiple
              label="+ Ajouter des photos"
              onUploaded={(m) => {
                addMedia(m)
                update({ gallery: [...form.gallery, m.id].slice(0, 24) })
              }}
            />
          )}
          {images.some((m) => !form.gallery.includes(m.id)) && (
            <button
              type="button"
              onClick={() => setPicking((v) => !v)}
              aria-expanded={picking}
              className="min-h-11 rounded-xl border border-cocoa-900/15 bg-white px-4 text-sm font-medium"
            >
              Choisir parmi mes photos
            </button>
          )}
        </div>
        {picking && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {images
              .filter((m) => !form.gallery.includes(m.id))
              .map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => update({ gallery: [...form.gallery, m.id].slice(0, 24) })}
                    className="relative block aspect-square w-full overflow-hidden rounded-lg ring-caramel hover:ring-3"
                    aria-label={`Ajouter ${m.alt || 'cette photo'}`}
                  >
                    <Image src={m.url} alt="" fill sizes="120px" className="object-cover" />
                  </button>
                </li>
              ))}
          </ul>
        )}
        <FieldError message={errors.gallery} />
      </StepCard>
    </>
  )
}

function MediaRow({
  media,
  kind,
  label,
  onUploaded,
  onRemove,
}: {
  media: LibraryMedia | undefined
  kind: 'video' | 'audio'
  label: string
  onUploaded: (media: LibraryMedia) => void
  onRemove: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {media &&
        (kind === 'video' ? (
          <video src={media.url} className="h-28 rounded-xl bg-black" muted controls preload="metadata" />
        ) : (
          <audio src={media.url} controls preload="none" className="max-w-full" />
        ))}
      <UploadButton kind={kind} label={label} onUploaded={onUploaded} />
      {media && (
        <button type="button" onClick={onRemove} className="text-xs text-red-700 underline">
          Retirer
        </button>
      )}
    </div>
  )
}
