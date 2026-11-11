import { expect, test, type Page } from '@playwright/test'

// Parcours complet : un couple crée et publie son invitation, un invité répond,
// son billet est scanné à l'entrée, puis l'invitation est protégée par un code.
test.describe.configure({ mode: 'serial' })

const run = Date.now().toString(36)
const email = `e2e-${run}@teranga.test`
const password = `Mariage${run}2027`
const slug = `e2e-${run}`
let invitationUrl = ''
let ticketToken = ''

async function waitSaved(page: Page) {
  await expect(page.getByRole('status').filter({ hasText: /Enregistré à/ }).first()).toBeVisible()
}

async function login(page: Page) {
  await page.goto('/connexion')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Se connecter' }).click()
  await expect(page).toHaveURL(/\/tableau-de-bord$/)
}

async function openEnvelope(page: Page) {
  await page.getByRole('button', { name: "Ouvrir l'invitation" }).click()
  await expect(page.getByRole('navigation', { name: "Sections de l'invitation" })).toBeVisible()
}

test('les mariés créent, personnalisent et publient leur invitation', async ({ page }) => {
  await page.goto('/inscription')
  await page.getByLabel('Vos prénoms').fill('Mariama & Ibou')
  await page.getByLabel('E-mail').fill(email)
  await page.getByLabel('Mot de passe').fill(password)
  await page.getByRole('button', { name: 'Créer mon compte' }).click()
  await expect(page).toHaveURL(/\/tableau-de-bord$/)

  await page.getByRole('button', { name: 'Créer mon invitation' }).click()
  await expect(page).toHaveURL(/\/editer$/)
  invitationUrl = page.url().replace(/\/editer$/, '')

  await page.getByLabel('Prénom de la mariée').fill('Mariama')
  await page.getByLabel('Prénom du marié').fill('Ibou')
  await page.getByLabel('Adresse de la page').fill(slug)
  await page.getByLabel('Titre').first().fill('Takk')
  await page.getByLabel('Lieu', { exact: true }).first().fill('Grande mosquée de Rufisque')
  await waitSaved(page)

  // L'aperçu en direct affiche les nouveaux prénoms.
  const preview = page.frameLocator('iframe[title="Aperçu de l\'invitation sur téléphone"]')
  await expect(preview.getByRole('heading', { level: 1 })).toContainText('Mariama')

  await page.getByRole('button', { name: /Partage/ }).click()
  await page.getByRole('button', { name: 'Publier maintenant' }).click()
  await expect(page.getByText('Votre invitation est en ligne')).toBeVisible()
})

test('un invité ouvre l’enveloppe, répond et reçoit son billet', async ({ page }) => {
  await page.goto(`/i/${slug}`)
  await expect(page.getByText("Touchez l'enveloppe pour l'ouvrir")).toBeVisible()
  await openEnvelope(page)
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Mariama')

  // Langue : le wolof s'applique à toute la page.
  await page.getByRole('button', { name: 'wo', exact: true }).click()
  await expect(page.getByText('Ndax dinga ñëw ?')).toBeVisible()
  await page.getByRole('button', { name: 'fr', exact: true }).click()

  const rsvp = page.locator('#rsvp')
  await rsvp.getByRole('button', { name: 'Envoyer ma réponse' }).click()
  await expect(rsvp.getByRole('alert')).toContainText('corriger')

  await rsvp.getByLabel('Nom complet').fill('Coumba Diagne')
  await rsvp.getByLabel('Personnes').fill('3')
  await rsvp.getByRole('button', { name: 'Envoyer ma réponse' }).click()
  await expect(rsvp.getByRole('status')).toContainText('Votre réponse a bien été enregistrée')

  const ticketLink = rsvp.getByRole('link', { name: 'Voir mon billet d’entrée' })
  ticketToken = new URL((await ticketLink.getAttribute('href'))!, 'http://x').searchParams.get('t')!
  await ticketLink.click()
  await expect(page.getByText('Pour Coumba Diagne')).toBeVisible()
  await expect(page.getByText('3 personne(s)')).toBeVisible()
})

test('les mariés voient la réponse et scannent le billet une seule fois', async ({ page }) => {
  await login(page)

  await page.goto(`${invitationUrl}/reponses`)
  await expect(page.getByText('Coumba Diagne')).toBeVisible()

  const csv = await page.request.get(`${invitationUrl}/reponses/export`)
  expect(csv.ok()).toBe(true)
  expect(await csv.text()).toContain('Coumba Diagne;;Présent;3')

  await page.goto(`${invitationUrl}/accueil`)
  const code = page.getByLabel('Code du billet')
  await code.fill(`TI:${ticketToken}`)
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText('Bienvenue Coumba Diagne ! (3 pers.)')).toBeVisible()
  await code.fill(ticketToken)
  await page.getByRole('button', { name: 'Valider' }).click()
  await expect(page.getByText(/Coumba Diagne est déjà entré/)).toBeVisible()
})

test('une invitation protégée demande le code avant d’afficher quoi que ce soit', async ({ page, browser }) => {
  await login(page)
  await page.goto(`${invitationUrl}/editer`)
  await page.getByRole('button', { name: /Vérification/ }).click()
  await page.getByRole('radio', { name: /Protégée par code/ }).click()
  await page.getByLabel(/Code d’accès/).fill('SECRET2027')
  await waitSaved(page)

  const visitor = await browser.newContext()
  const guest = await visitor.newPage()
  await guest.goto(`/i/${slug}`)
  await expect(guest.getByText('Invitation protégée')).toBeVisible()
  expect(await guest.content()).not.toContain('Grande mosquée de Rufisque')

  await guest.getByPlaceholder("Code d'accès").fill('mauvais')
  await guest.getByRole('button', { name: 'Entrer' }).click()
  await expect(guest.getByText('Code incorrect.')).toBeVisible()

  await guest.getByPlaceholder("Code d'accès").fill('SECRET2027')
  await guest.getByRole('button', { name: 'Entrer' }).click()
  await openEnvelope(guest)
  await expect(guest.getByText('Grande mosquée de Rufisque').first()).toBeAttached()
  await visitor.close()
})

test('les mariés peuvent masquer le choix de langue', async ({ page, browser }) => {
  await login(page)
  await page.goto(`${invitationUrl}/editer`)
  // Invitation repassée en publique pour ce test (le précédent l'a protégée par code).
  await page.getByRole('button', { name: /Vérification/ }).click()
  await page.getByRole('radio', { name: /Publique par lien/ }).click()
  await page.getByRole('button', { name: /Design/ }).click()
  const toggle = page.getByRole('checkbox', { name: 'Afficher le choix de langue (FR · WO · EN)' })
  await expect(toggle).toBeChecked()
  await toggle.uncheck({ force: true })
  await waitSaved(page)

  const visitor = await browser.newContext()
  const guest = await visitor.newPage()
  // Un invité qui avait choisi le wolof auparavant retrouve la page en français.
  await guest.addInitScript(() => window.localStorage.setItem('teranga-lang', 'wo'))
  await guest.goto(`/i/${slug}`)
  await openEnvelope(guest)
  await expect(guest.getByRole('group', { name: 'Langue / Language' })).toHaveCount(0)
  await expect(guest.getByText('Serez-vous des nôtres ?')).toBeAttached()
  await visitor.close()
})
