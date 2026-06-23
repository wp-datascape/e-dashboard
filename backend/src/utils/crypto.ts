/**
 * utils/crypto.ts
 *
 * AES-256-GCM encryption/decryption untuk kredensial sensitive di DB.
 * Menggunakan secret key dari env CREDENTIALS_ENCRYPTION_KEY.
 * Key: base64 44 chars (openssl rand -base64 32) atau hex 64 chars.
 *
 * Format encrypted: iv_hex:tag_hex:ciphertext_hex
 *
 * NOTE: console.error di catch block ini SEMENTARA untuk debugging.
 * Setelah ketemu root cause error "selalu gagal saat save", ini akan
 * dirapikan (idealnya pakai logger.error dari @/utils/logger, bukan
 * console.error langsung).
 */

import { env } from '@/config/env'
import { AppError, ErrorCode } from '@/errors'
import { logger } from '@/utils/logger'
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const IV_LENGTH = 12
const ALGO = 'aes-256-gcm'

function decodeKey(secret: string): Buffer {
  if (/^[0-9a-fA-F]{64}$/.test(secret)) {
    return Buffer.from(secret, 'hex')
  }
  try {
    const b = Buffer.from(secret, 'base64')
    if (b.length === 32) return b
  } catch {}
  throw new Error('CREDENTIALS_ENCRYPTION_KEY: must be 32 bytes base64 (44 chars) or hex (64 chars)')
}

export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return ''
  try {
    const key = decodeKey(env.CREDENTIALS_ENCRYPTION_KEY)
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGO, key, iv)
    const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return `${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
  } catch (e) {
    logger.error('[crypto] Encryption failed', { error: e instanceof Error ? e.message : String(e) })
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Encryption failed', 500, true)
  }
}

export async function decrypt(encrypted: string): Promise<string> {
  if (!encrypted) return ''
  const parts = encrypted.split(':')
  if (parts.length !== 3) {
    console.error('[crypto] Decrypt failed: malformed format, expected 3 parts, got', parts.length, '| value:', encrypted)
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Malformed encrypted value', 500, true)
  }
  try {
    const [ivH, tagH, ctH] = parts
    const iv = Buffer.from(ivH, 'hex')
    const tag = Buffer.from(tagH, 'hex')
    const ct = Buffer.from(ctH, 'hex')
    const key = decodeKey(env.CREDENTIALS_ENCRYPTION_KEY)
    const decipher = createDecipheriv(ALGO, key, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(ct), decipher.final()])
    return dec.toString('utf8')
  } catch (e) {
    logger.error('[crypto] Decryption failed', { error: e instanceof Error ? e.message : String(e) })
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Decryption failed', 500, true)
  }
}