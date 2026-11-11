import { randomBytes } from 'node:crypto'

/** Jeton aléatoire non devinable, sûr dans une URL (32 caractères). */
export const newToken = () => randomBytes(24).toString('base64url')
