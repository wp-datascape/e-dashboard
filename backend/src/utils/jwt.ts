/**
 * utils/jwt.ts
 *
 * JWT helpers — generate dan verify token.
 *
 * JWT Payload Strategy:
 *   Payload hanya berisi { userId, email, companyIds, isSuperAdmin }.
 *   Permissions TIDAK disimpan di JWT — di-load dari DB per request oleh authMiddleware.
 *   Alasan: RBAC dinamis — revoke permission harus langsung efektif.
 *   Detail: shared/architecture.md -> Permission Strategy Decision
 *
 * Usage:
 *   import { generateToken, verifyToken } from '@/utils/jwt'
 *
 *   const token = generateToken({ userId: 1, email: 'a@b.com', companyIds: [1], isSuperAdmin: false })
 *   const payload = verifyToken(token)
 */

import jwt from 'jsonwebtoken'
import { env } from '@/config/env'
import { AppError, ErrorCode } from '@/utils/error'

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * Access token payload.
 * Permissions TIDAK ada di sini — di-load dari DB oleh authMiddleware.
 */
export interface JwtPayload {
  userId: number
  email: string
  companyIds: number[]
  isSuperAdmin: boolean
  // Invalidasi sesi (Task002 Task D) — dibandingkan vs users.token_version tiap request
  // oleh authMiddleware. Mismatch (mis. setelah password direset) = token ditolak.
  tokenVersion: number
  iat?: number
  exp?: number
}

/**
 * Refresh token payload — minimal, hanya userId + type guard + tokenVersion.
 */
export interface RefreshTokenPayload {
  userId: number
  type: 'refresh'
  tokenVersion: number
  iat?: number
  exp?: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Generate access token (short-lived, default 15m)
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

/**
 * Generate refresh token (long-lived, default 7d)
 */
export function generateRefreshToken(userId: number, tokenVersion: number): string {
  const payload: Omit<RefreshTokenPayload, 'iat' | 'exp'> = { userId, type: 'refresh', tokenVersion }
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  })
}

/**
 * Verify access token.
 * Throws AppError(UNAUTHORIZED) jika invalid atau expired.
 */
export function verifyToken(token: string): JwtPayload {
  try {
    return jwt.verify(token, env.JWT_SECRET) as JwtPayload
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Token expired', 401)
    }
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid token', 401)
  }
}

/**
 * Verify refresh token.
 * Throws AppError(UNAUTHORIZED) jika invalid, expired, atau bukan refresh token.
 */
export function verifyRefreshToken(token: string): RefreshTokenPayload {
  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as RefreshTokenPayload
    if (decoded.type !== 'refresh') {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid token type', 401)
    }
    return decoded
  } catch (err) {
    if (err instanceof AppError) throw err
    if (err instanceof jwt.TokenExpiredError) {
      throw new AppError(ErrorCode.UNAUTHORIZED, 'Refresh token expired', 401)
    }
    throw new AppError(ErrorCode.UNAUTHORIZED, 'Invalid refresh token', 401)
  }
}