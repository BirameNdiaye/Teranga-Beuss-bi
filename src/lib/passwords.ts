import { hash, verify } from '@node-rs/argon2'

// Paramètres OWASP pour argon2id (19 Mio, 2 itérations).
const options = { memoryCost: 19456, timeCost: 2, parallelism: 1 }

export const hashSecret = (value: string) => hash(value, options)

export async function verifySecret(hashed: string, value: string) {
  try {
    return await verify(hashed, value)
  } catch {
    return false
  }
}
