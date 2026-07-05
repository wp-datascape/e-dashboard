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
 *                        + branchScopes, divisionScopes (isolasi data Branch/Division,
 *                        lihat docs-v2/task/task001.md)
 *   c.var.permissions — string[] of permission names
 */

import type { Context, Next } from 'hono'
import { getCookie } from 'hono/cookie'
import { AppError, ErrorCode } from '@/errors'
import { verifyToken } from '@/utils/jwt'
import { validateCsrfToken } from '@/utils/csrf'
import {
  getUserPermissions,
  getUserCompanyIds,
  getUserBranchScopes,
  getUserDivisionScopes,
} from '@/features/auth/auth.repository'

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

/**
 * Resolve branch scope — child dari company scope (docs-v2/task/task001.md §4.2).
 *
 * Returns:
 *   undefined                    → superadmin → bypass, lihat semua branch
 *   Map<company_id, branch_id[]> → non-superadmin, cuma company+branch yang di-assign eksplisit
 *                                   (map kosong / company tidak ada di key = default deny total company itu)
 *
 * Input companyScopeIds = hasil resolveCompanyScope() — branch di company yang SUDAH
 * tersaring di luar companyScopeIds ikut tersaring juga di sini.
 */
export function resolveBranchScope(
  c: Context,
  companyScopeIds: number[] | undefined,
): Map<number, number[]> | undefined {
  const { branchScopes, isSuperAdmin } = c.var.user
  if (isSuperAdmin) return undefined

  const map = new Map<number, number[]>()
  for (const { company_id, branch_id } of branchScopes as { company_id: number; branch_id: number }[]) {
    if (companyScopeIds && !companyScopeIds.includes(company_id)) continue
    if (!map.has(company_id)) map.set(company_id, [])
    map.get(company_id)!.push(branch_id)
  }
  return map
}

/**
 * Resolve division scope — child dari branch scope, BUKAN company scope (docs-v2/task/task001.md §4.2).
 *
 * Input branchScope = hasil resolveBranchScope() (bukan companyScopeIds) — division cuma
 * bermakna dalam branch yang SUDAH lolos resolveBranchScope. Kalau branchScope bypass
 * (undefined, superadmin), division ikut bypass otomatis.
 */
export function resolveDivisionScope(
  c: Context,
  branchScope: Map<number, number[]> | undefined,
): Map<number, string[]> | undefined {
  const { divisionScopes, isSuperAdmin } = c.var.user
  if (isSuperAdmin) return undefined

  const allowedBranchIds = new Set(branchScope ? [...branchScope.values()].flat() : [])
  const map = new Map<number, string[]>()
  for (const { branch_id, division } of divisionScopes as { branch_id: number; division: string }[]) {
    if (!allowedBranchIds.has(branch_id)) continue
    if (!map.has(branch_id)) map.set(branch_id, [])
    map.get(branch_id)!.push(division)
  }
  return map
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

    const [permissions, companyIds, branchScopes, divisionScopes] = await Promise.all([
      getUserPermissions(payload.userId),
      getUserCompanyIds(payload.userId),
      getUserBranchScopes(payload.userId),
      getUserDivisionScopes(payload.userId),
    ])

    c.set('user', { ...payload, companyIds, branchScopes, divisionScopes })
    c.set('permissions', permissions)

    await next()
  }
}
