/**
 * middleware/auth.ts
 *
 * JWT authentication + CSRF validation middleware.
 *
 * Reads JWT from HttpOnly cookie 'access_token'.
 * For mutations (POST/PUT/PATCH/DELETE), validates X-CSRF-Token header.
 * Loads user permissions fresh from DB on every request (dynamic RBAC).
 *
 * Sets on context:
 *   c.var.user        — JwtPayload (userId, email, companyIds, isSuperAdmin)
 *   c.var.permissions — string[] of permission names
 */

import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { AppError, ErrorCode } from '@/errors'
import { verifyToken } from '@/utils/jwt'
import { validateCsrfToken } from '@/utils/csrf'
import { getUserPermissions, getUserCompanyIds } from '@/features/auth/auth.repository'

const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Resolve company scope untuk query DB berdasarkan JWT + request.
 *
 * Returns:
 *   undefined        → superadmin + 'all'  → tidak ada filter (akses semua)
 *   number[]([id])   → company spesifik     → validasi akses lalu filter ke 1 company
 *   number[]         → non-superadmin 'all' → filter otomatis ke company milik user
 *
 * Usage di handler:
 *   const scopeIds = resolveCompanyScope(c, query.company_id)
 *   const data = await getX(query, scopeIds)
 *
 * Usage di repository:
 *   if (scopeIds) conditions.push(inArray(table.company_id, scopeIds))
 */
export function resolveCompanyScope(c: Context, requested: number | 'all'): number[] | undefined {
  const { companyIds, isSuperAdmin } = c.var.user
  if (isSuperAdmin) {
    if (requested === 'all') return undefined
    return [requested]
  }
  if (requested === 'all') return companyIds
  if (!companyIds.includes(requested)) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Akses ke company ini tidak diizinkan', 403)
  }
  return [requested]
}

/** @deprecated gunakan resolveCompanyScope */
export function assertCompanyAccess(c: Context, companyId: number | 'all'): void {
  resolveCompanyScope(c, companyId)
}

export function authMiddleware() {
  return async (c: Context, next: Next) => {
    const token = getCookie(c, 'access_token')
    if (!token) throw new AppError(ErrorCode.UNAUTHORIZED, 'Tidak terautentikasi', 401)

    // verifyToken throws AppError(UNAUTHORIZED) if invalid or expired
    const payload = verifyToken(token)

    if (MUTATION_METHODS.has(c.req.method.toUpperCase())) {
      const csrfHeader = c.req.header('X-CSRF-Token')
      if (!csrfHeader || !validateCsrfToken(csrfHeader)) {
        throw new AppError(ErrorCode.CSRF_INVALID, 'CSRF token tidak valid', 403)
      }
    }

    const [permissions, companyIds] = await Promise.all([
      getUserPermissions(payload.userId),
      getUserCompanyIds(payload.userId),
    ])

    c.set('user', { ...payload, companyIds })
    c.set('permissions', permissions)

    await next()
  }
}
