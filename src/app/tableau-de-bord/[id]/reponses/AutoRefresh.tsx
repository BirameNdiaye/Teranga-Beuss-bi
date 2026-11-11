'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

/** Rafraîchit les données du serveur à intervalle régulier, onglet visible uniquement. */
export function AutoRefresh({ seconds }: { seconds: number }) {
  const router = useRouter()
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') router.refresh()
    }, seconds * 1000)
    return () => window.clearInterval(timer)
  }, [router, seconds])
  return null
}
