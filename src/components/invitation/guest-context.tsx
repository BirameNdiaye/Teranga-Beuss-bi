'use client'

import { createContext, useContext, type ReactNode } from 'react'

export type PersonalGuest = {
  name: string
  seats: number
  rsvp: { attendance: 'yes' | 'no' | 'maybe'; partySize: number; message: string; ticketToken: string } | null
}

export type GuestContextValue = {
  slug: string
  invitationId: string
  token: string | null
  guest: PersonalGuest | null
  /** Code d'accès saisi par l'invité (invitations protégées). */
  accessCode: string | null
  /** Aperçu du constructeur : rien n'est envoyé au serveur. */
  preview: boolean
}

const GuestContext = createContext<GuestContextValue | null>(null)

export function GuestContextProvider({ value, children }: { value: GuestContextValue; children: ReactNode }) {
  return <GuestContext.Provider value={value}>{children}</GuestContext.Provider>
}

export function useGuest() {
  const value = useContext(GuestContext)
  if (!value) throw new Error('useGuest doit être utilisé dans <GuestContextProvider>')
  return value
}
