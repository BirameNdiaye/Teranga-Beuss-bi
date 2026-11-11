'use client'

import { Field, inputClass } from '@/components/ui'
import { themes, type ThemeName } from '@/lib/invitation-view'
import type { StepProps } from '../Builder'
import { Choice, StepCard, Toggle } from './shared'

export function DesignStep({ form, update, errors }: StepProps) {
  return (
    <>
      <StepCard title="Thème" subtitle="Les couleurs de l’enveloppe, des titres et des boutons.">
        <div role="radiogroup" aria-label="Thème" className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(Object.keys(themes) as ThemeName[]).map((name) => {
            const vars = themes[name].vars
            const selected = form.theme === name
            return (
              <button
                key={name}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => update({ theme: name })}
                className={`overflow-hidden rounded-2xl border-2 text-left transition ${
                  selected ? 'border-cocoa-700 shadow-lg' : 'border-transparent hover:border-caramel'
                }`}
              >
                <span className="flex h-20" style={{ background: vars['--inv-bg'] }}>
                  <span className="m-3 w-10 rounded-lg" style={{ background: vars['--inv-primary'] }} />
                  <span className="my-3 w-6 rounded-lg" style={{ background: vars['--inv-accent'] }} />
                </span>
                <span className="block bg-white px-3 py-2 text-sm font-semibold">{themes[name].label}</span>
              </button>
            )
          })}
        </div>
        <Field label="Couleur d’accent personnalisée (facultatif)" error={errors.accentColor}>
          <div className="flex gap-3">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(form.accentColor) ? form.accentColor : themes[form.theme as ThemeName].vars['--inv-accent']}
              onChange={(e) => update({ accentColor: e.target.value })}
              className="h-11 w-14 cursor-pointer rounded-lg border border-cocoa-900/15"
              aria-label="Choisir la couleur d'accent"
            />
            <input
              value={form.accentColor}
              onChange={(e) => update({ accentColor: e.target.value })}
              placeholder="#B07A4A"
              maxLength={7}
              className={inputClass}
            />
            {form.accentColor && (
              <button type="button" onClick={() => update({ accentColor: '' })} className="text-sm whitespace-nowrap underline">
                Par défaut
              </button>
            )}
          </div>
        </Field>
      </StepCard>

      <StepCard title="Typographie">
        <Choice
          label="Paire de polices"
          value={form.fontPair}
          onChange={(fontPair) => update({ fontPair })}
          options={[
            { value: 'script', label: 'Calligraphie', hint: 'Great Vibes + Playfair' },
            { value: 'classic', label: 'Classique', hint: 'Playfair italique' },
            { value: 'modern', label: 'Moderne', hint: 'Montserrat + Inter' },
          ]}
        />
      </StepCard>

      <StepCard title="Accueil">
        <Choice
          label="Mise en page de l'accueil"
          value={form.heroLayout}
          onChange={(heroLayout) => update({ heroLayout })}
          options={[
            { value: 'centered', label: 'Centrée', hint: 'Noms au milieu' },
            { value: 'bottom', label: 'En bas', hint: 'La photo respire' },
            { value: 'editorial', label: 'Éditoriale', hint: 'Alignée à gauche' },
          ]}
        />
        <Field label={`Voile sur la photo : ${form.overlay} %`}>
          <input
            type="range"
            min={20}
            max={85}
            value={form.overlay}
            onChange={(e) => update({ overlay: Number(e.target.value) })}
            className="w-full accent-cocoa-700"
          />
        </Field>
        <Toggle checked={form.animations} onChange={(animations) => update({ animations })} label="Animations (enveloppe 3D, lumières, apparitions)" />
      </StepCard>
    </>
  )
}
