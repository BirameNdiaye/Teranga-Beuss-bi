/**
 * Adresse publique du site, utilisée pour les liens absolus (vignettes WhatsApp, Open Graph).
 * Sur Vercel, sans NEXT_PUBLIC_SITE_URL, on se rabat sur le domaine de production du projet.
 */
export function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, '')
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  return 'http://localhost:3000'
}
