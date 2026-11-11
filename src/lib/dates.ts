export const EVENT_TIME_ZONE = 'Africa/Dakar'

/** Jour calendaire (AAAA-MM-JJ) d'une date ISO dans le fuseau de l'événement. */
export const dayKey = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: EVENT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))

/** Heure HH:MM dans le fuseau de l'événement. */
export const timeOf = (iso: string) =>
  new Intl.DateTimeFormat('fr-FR', {
    timeZone: EVENT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))

export const formatFr = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('fr-FR', { timeZone: EVENT_TIME_ZONE, ...options }).format(new Date(iso))

/**
 * Convertit une saisie locale « AAAA-MM-JJTHH:MM » (heure de Dakar, UTC+0
 * sans heure d'été) en Date UTC.
 */
export const fromDakarInput = (value: string) => new Date(`${value}:00Z`)

/** Inverse de fromDakarInput, pour pré-remplir un <input type="datetime-local">. */
export const toDakarInput = (date: Date | string) => new Date(date).toISOString().slice(0, 16)
