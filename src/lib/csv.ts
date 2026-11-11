// Lecture et écriture CSV, sans dépendance. Séparateur « ; » (Excel en français) ou « , ».

export function parseCsv(text: string): string[][] {
  const source = text.replace(/^﻿/, '')
  const firstLine = source.split(/\r?\n/, 1)[0] ?? ''
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) >= (firstLine.match(/,/g)?.length ?? 0) ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false

  for (let i = 0; i < source.length; i++) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"'
        i++
      } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === delimiter) {
      row.push(field)
      field = ''
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && source[i + 1] === '\n') i++
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += char
  }
  if (field || row.length) {
    row.push(field)
    rows.push(row)
  }
  return rows.map((r) => r.map((cell) => cell.trim())).filter((r) => r.some(Boolean))
}

const HEADERS: Record<string, 'name' | 'phone' | 'seats' | 'group'> = {
  nom: 'name',
  name: 'name',
  invite: 'name',
  invité: 'name',
  telephone: 'phone',
  téléphone: 'phone',
  tel: 'phone',
  phone: 'phone',
  places: 'seats',
  seats: 'seats',
  personnes: 'seats',
  groupe: 'group',
  group: 'group',
}

export type GuestCsvRow = { name: string; phone: string; seats: string; group: string }

/** Colonnes : nom ; téléphone ; places ; groupe. La ligne d'en-tête est facultative. */
export function parseGuestCsv(text: string): GuestCsvRow[] {
  const rows = parseCsv(text)
  if (!rows.length) return []
  const header = rows[0]!.map((cell) => HEADERS[cell.toLowerCase()])
  const hasHeader = header.some(Boolean)
  const columns = hasHeader ? header : (['name', 'phone', 'seats', 'group'] as const)
  return rows.slice(hasHeader ? 1 : 0).map((cells) => {
    const guest: GuestCsvRow = { name: '', phone: '', seats: '1', group: '' }
    columns.forEach((column, index) => {
      if (column && cells[index] !== undefined && cells[index] !== '') guest[column] = cells[index]!
    })
    return guest
  })
}

/** Échappe une cellule ; neutralise les formules (=, +, -, @) pour Excel. */
export function csvCell(value: unknown) {
  let text = value == null ? '' : String(value)
  // Un numéro de téléphone (« +221 77… ») n'est pas une formule : on le laisse tel quel.
  if (/^[=+\-@\t\r]/.test(text) && !/^[+-][\d\s().-]+$/.test(text)) text = `'${text}`
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(rows: unknown[][]) {
  return `﻿${rows.map((row) => row.map(csvCell).join(';')).join('\r\n')}\r\n`
}
