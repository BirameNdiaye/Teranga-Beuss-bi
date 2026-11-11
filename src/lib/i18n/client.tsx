'use client'

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { EVENT_TIME_ZONE } from '../dates'
import { intlLocale, languages, translate, type DictionaryKey, type Lang } from './dictionaries'

const STORAGE_KEY = 'teranga-lang'

type LanguageContextValue = {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: DictionaryKey, vars?: Record<string, string | number>) => string
  formatDate: (iso: string, options: Intl.DateTimeFormatOptions) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const format = (lang: Lang, iso: string, options: Intl.DateTimeFormatOptions) => {
  try {
    return new Intl.DateTimeFormat(intlLocale[lang], { timeZone: EVENT_TIME_ZONE, ...options }).format(
      new Date(iso),
    )
  } catch {
    return new Intl.DateTimeFormat('fr-FR', { timeZone: EVENT_TIME_ZONE, ...options }).format(new Date(iso))
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Toujours « fr » au rendu serveur ; la préférence enregistrée s'applique après le montage.
  const [lang, setLangState] = useState<Lang>('fr')

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY) as Lang | null
      if (saved && languages.includes(saved)) setLangState(saved)
    } catch {
      // Stockage indisponible : on garde le français.
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Préférence non conservée.
    }
  }, [])

  const value: LanguageContextValue = {
    lang,
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    formatDate: (iso, options) => format(lang, iso, options),
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const value = useContext(LanguageContext)
  if (!value) throw new Error('useLanguage doit être utilisé dans <LanguageProvider>')
  return value
}

/** Texte traduit, utilisable dans un composant serveur. */
export function T({ k, vars }: { k: DictionaryKey; vars?: Record<string, string | number> }) {
  return <>{useLanguage().t(k, vars)}</>
}

/** Date localisée, utilisable dans un composant serveur. */
export function LocalDate({ iso, options }: { iso: string; options: Intl.DateTimeFormatOptions }) {
  return <>{useLanguage().formatDate(iso, options)}</>
}

export function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { lang, setLang } = useLanguage()
  return (
    <div role="group" aria-label="Langue / Language" className={`flex gap-1 ${className}`}>
      {languages.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLang(code)}
          aria-pressed={lang === code}
          className={`min-h-11 min-w-11 rounded-full px-3 text-xs font-semibold tracking-wider uppercase transition ${
            lang === code ? 'bg-white text-(--inv-primary)' : 'text-white/90 hover:bg-white/15'
          }`}
        >
          {code}
        </button>
      ))}
    </div>
  )
}
