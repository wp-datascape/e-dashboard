/**
 * utils/csrf.ts
 *
 * CSRF token helpers — generate dan validate token.
 * Token di-generate saat login/refresh dan dikirim ke client via response body.
 * Client wajib mengirim token ini di header X-CSRF-Token pada setiap mutasi.
 *
 * Usage:
 *   import { generateCsrfToken, validateCsrfToken } from '@/utils/csrf'
 *
 *   const token = generateCsrfToken()
 *   const isValid = validateCsrfToken(token)
 */

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'
import { env } from '@/config/env'

const TOKEN_LENGTH = 32 // bytes

/**
 * Generate CSRF token yang di-sign dengan CSRF_SECRET (HMAC-SHA256).
 * Format: <random_hex>.<hmac_signature>
 */
export function generateCsrfToken(): string {
  const random = randomBytes(TOKEN_LENGTH).toString('hex')
  const signature = sign(random)
  return `${random}.${signature}`
}

/**
 * Validate CSRF token.
 * Returns true jika token valid, false jika tidak.
 * Menggunakan timingSafeEqual untuk mencegah timing attacks.
 */
export function validateCsrfToken(token: string): boolean {
  try {
    const [random, signature] = token.split('.')
    if (!random || !signature) return false

    const expectedSignature = sign(random)

    const sigBuffer = Buffer.from(signature)
    const expectedBuffer = Buffer.from(expectedSignature)

    if (sigBuffer.length !== expectedBuffer.length) return false

    return timingSafeEqual(sigBuffer, expectedBuffer)
  } catch {
    return false
  }
}

function sign(value: string): string {
  return createHmac('sha256', env.CSRF_SECRET).update(value).digest('hex')
}