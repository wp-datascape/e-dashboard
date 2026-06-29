/**
 * middleware/permission.ts
 *
 * requirePermission — middleware penjaga permission per endpoint.
 *
 * Wajib dipasang SETELAH authMiddleware (butuh c.var.user + c.var.permissions).
 *
 * OR logic: user harus punya SETIDAKNYA SATU dari keys yang diberikan.
 * Superadmin (isSuperAdmin=true) selalu lolos tanpa cek.
 *
 * Usage:
 *   route.delete('/:id', requirePermission('settings.company:delete'), handleDelete)
 *   route.put('/credentials', requirePermission('config.integration:create', 'config.integration:update'), handle)
 */

import type { Context, Next } from 'hono'
import { AppError, ErrorCode } from '@/errors'

export function requirePermission(...keys: string[]) {
  return async (c: Context, next: Next) => {
    if (c.var.user?.isSuperAdmin) return next()

    const permissions: string[] = c.var.permissions ?? []
    const allowed = keys.some((k) => permissions.includes(k))
    if (!allowed) {
      throw new AppError(ErrorCode.FORBIDDEN, 'Akses ditolak — permission tidak mencukupi', 403)
    }

    return next()
  }
}
