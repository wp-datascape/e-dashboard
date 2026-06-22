/**
 * utils/audit.ts
 *
 * Audit log helper — tulis ke tabel audit_logs di DB.
 *
 * WAJIB: Dipanggil di Service layer setelah setiap mutasi berhasil (create/update/delete).
 * DILARANG: Dipanggil dari Handler atau Repository.
 *
 * Required audit actions:
 *   invoice.import | user.create/update/delete | role.create/update/delete
 *   permission.assign/revoke | user_role.assign/revoke | config.update | category.update
 *
 * Usage:
 *   import { logAudit } from '@/utils/audit'
 *
 *   // CREATE
 *   await logAudit(c, {
 *     action: 'user.create',
 *     entity: 'users',
 *     entityId: newUser.id,
 *     companyId: 1,
 *     newValue: { id: newUser.id, email: newUser.email, name: newUser.name },
 *   })
 *
 *   // UPDATE
 *   await logAudit(c, {
 *     action: 'user.update',
 *     entity: 'users',
 *     entityId: user.id,
 *     companyId: 1,
 *     oldValue: { name: 'Before', email: 'old@example.com' },
 *     newValue: { name: 'After',  email: 'new@example.com' },
 *   })
 *
 *   // DELETE
 *   await logAudit(c, {
 *     action: 'user.delete',
 *     entity: 'users',
 *     entityId: user.id,
 *     companyId: 1,
 *     oldValue: { id: user.id, email: user.email },
 *   })
 *
 *   // IMPORT (no old/new value, gunakan meta)
 *   await logAudit(c, {
 *     action: 'invoice.import',
 *     entity: 'import_logs',
 *     entityId: importLog.id,
 *     companyId: 1,
 *     meta: { filename: 'invoices.xlsx', total_rows: 120, success: 118, errors: 2 },
 *   })
 */

import type { Context } from 'hono'
import { getConnInfo } from 'hono/bun'
import { sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { logger } from '@/utils/logger'

// ─── Types ───────────────────────────────────────────────────────────────────

export type AuditAction =
  | 'invoice.import'
  | 'user.create'
  | 'user.update'
  | 'user.delete'
  | 'role.create'
  | 'role.update'
  | 'role.delete'
  | 'permission.assign'
  | 'permission.revoke'
  | 'user_role.assign'
  | 'user_role.revoke'
  | 'config.update'
  | 'category.update'
  | 'page_setting.update'

export interface AuditOptions {
  /** Action yang terjadi, e.g. 'user.create' */
  action: AuditAction
  /** Nama tabel yang terpengaruh, e.g. 'users', 'roles' */
  entity: string
  /** ID row yang terpengaruh */
  entityId: number | string
  /** Perusahaan dalam konteks mutasi ini */
  companyId: number | null
  /** State sebelum mutasi — wajib untuk update dan delete, null untuk create/import */
  oldValue?: Record<string, unknown> | null
  /** State setelah mutasi — wajib untuk create dan update, null untuk delete */
  newValue?: Record<string, unknown> | null
  /** Konteks tambahan yang tidak masuk old/new value, e.g. { filename, total_rows } untuk import */
  meta?: Record<string, unknown>
}

// ─── Helper ──────────────────────────────────────────────────────────────────

/**
 * Log audit entry ke tabel audit_logs.
 * Actor diambil dari c.var.user (di-set oleh authMiddleware).
 * IP address diambil dari request header.
 * Request ID diambil dari header x-request-id (untuk tracing).
 *
 * Jika insert gagal: error di-log tapi TIDAK di-throw.
 * Audit failure tidak boleh break request yang sudah berhasil.
 */
export async function logAudit(c: Context, opts: AuditOptions): Promise<void> {
  try {
    const actorId = (c.get('userId') as string | undefined) ?? null
    // companyId: gunakan dari opts, fallback ke context var (di-set oleh auth middleware)
    const companyId =
      opts.companyId !== undefined
        ? opts.companyId
        : ((c.get('companyId') as number | undefined) ?? null)
    const requestId = c.req.header('x-request-id') ?? null
    // Proxy headers first, fallback ke Bun connection info
    let ipAddress =
      c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ??
      c.req.header('x-real-ip') ??
      null

    if (!ipAddress) {
      try {
        const info = getConnInfo(c)
        ipAddress = info.remote.address ?? null
      } catch {
        // Tidak tersedia di luar Bun
      }
    }

    await db.execute(sql`
      INSERT INTO audit_logs
        (actor_id, action, entity, entity_id, company_id, old_value, new_value, meta, ip_address, request_id, created_at)
      VALUES
        (
          ${actorId},
          ${opts.action},
          ${opts.entity},
          ${String(opts.entityId)},
          ${companyId},
          ${opts.oldValue ? JSON.stringify(opts.oldValue) : null},
          ${opts.newValue ? JSON.stringify(opts.newValue) : null},
          ${opts.meta ? JSON.stringify(opts.meta) : null},
          ${ipAddress},
          ${requestId},
          NOW()
        )
    `)
  } catch (err) {
    // Audit failure tidak boleh crash request — hanya log error
    logger.error('[audit] Failed to write audit log', {
      action: opts.action,
      entity: opts.entity,
      entityId: opts.entityId,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}