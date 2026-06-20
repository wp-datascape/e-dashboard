/**
 * utils/hash.ts
 *
 * Password hashing helpers menggunakan bcryptjs.
 * Cost factor >= 12 sesuai security rules.
 *
 * Usage:
 *   import { hashPassword, comparePassword } from '@/utils/hash'
 *
 *   const hashed = await hashPassword('plaintext')
 *   const isMatch = await comparePassword('plaintext', hashed)
 */

import bcrypt from 'bcryptjs'

const SALT_ROUNDS = 12

/**
 * Hash password dengan bcrypt cost >= 12
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return bcrypt.hash(plaintext, SALT_ROUNDS)
}

/**
 * Compare plaintext password dengan hash yang tersimpan di DB
 * Returns true jika cocok, false jika tidak
 */
export async function comparePassword(plaintext: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plaintext, hash)
}