import { db } from '@/config/db'
import { activityLogs } from '@/db/schema'
import type { Context } from 'hono'

export interface ActivityLogOptions {
  method: string
  path: string
  module?: string | null
  statusCode?: number | null
  durationMs?: number | null
}

/**
 * Tulis 1 baris ke activity_logs — dipanggil oleh activityLogMiddleware (tiap
 * request API) dan activity-log.service.ts (event page-view eksplisit dari
 * frontend, method='PAGE_VIEW'). Pola sama seperti logAudit(): gagal insert
 * tidak boleh menggagalkan request utama.
 */
export async function logActivity(ctx: Context, opts: ActivityLogOptions) {
  const userId = ctx.var.user?.userId ?? null
  const ipAddress = ctx.var.ipAddress ?? null
  const requestId = ctx.var.requestId ?? null
  const userAgent = ctx.req.header('user-agent') ?? null

  const values = {
    user_id: userId,
    method: opts.method,
    path: opts.path,
    module: opts.module ?? null,
    status_code: opts.statusCode ?? null,
    duration_ms: opts.durationMs ?? null,
    ip_address: ipAddress,
    user_agent: userAgent,
    request_id: requestId,
  }

  try {
    await db.insert(activityLogs).values(values)
  } catch (err) {
    console.error('[activity-log] Failed to write activity log:', err)
  }
}
