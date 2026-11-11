import { describe, expect, it } from 'vitest'
import { csvCell, parseCsv, parseGuestCsv, toCsv } from '@/lib/csv'

describe('parseCsv', () => {
  it('détecte le point-virgule et gère les guillemets', () => {
    expect(parseCsv('a;b\n"c;d";"e ""f"""\n')).toEqual([
      ['a', 'b'],
      ['c;d', 'e "f"'],
    ])
  })

  it('accepte la virgule, le BOM et les fins de ligne Windows', () => {
    expect(parseCsv('﻿nom,places\r\nAwa,2\r\n\r\n')).toEqual([
      ['nom', 'places'],
      ['Awa', '2'],
    ])
  })
})

describe('parseGuestCsv', () => {
  it('lit les colonnes nommées dans n’importe quel ordre', () => {
    expect(parseGuestCsv('Groupe;Nom;Places;Téléphone\nAmis;Awa Ndiaye;3;+221 77 000 00 00')).toEqual([
      { name: 'Awa Ndiaye', phone: '+221 77 000 00 00', seats: '3', group: 'Amis' },
    ])
  })

  it('suppose nom ; téléphone ; places ; groupe sans en-tête, avec 1 place par défaut', () => {
    expect(parseGuestCsv('Moussa Fall;770000000\nFatou Sarr;;2;Famille')).toEqual([
      { name: 'Moussa Fall', phone: '770000000', seats: '1', group: '' },
      { name: 'Fatou Sarr', phone: '', seats: '2', group: 'Famille' },
    ])
  })
})

describe('export CSV', () => {
  it('neutralise les formules mais garde les numéros de téléphone', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe(`"'=HYPERLINK(""x"")"`)
    expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)")
    expect(csvCell('+221 77 000 00 00')).toBe('+221 77 000 00 00')
    expect(csvCell('-cmd')).toBe("'-cmd")
  })

  it('ajoute le BOM pour Excel et sépare par des points-virgules', () => {
    expect(toCsv([['Nom', 'Message'], ['Awa', 'Oui; merci']])).toBe('﻿Nom;Message\r\nAwa;"Oui; merci"\r\n')
  })
})
