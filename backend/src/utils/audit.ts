import { db } from '@/config/db'
import { auditLogs } from '@/db/schema'
import type { Context } from 'hono'

export interface AuditOptions {
  action: string
  entity: string
  entityId: string | number
  companyId: number | null
  oldValue?: Record<string, unknown> | null
  newValue?: Record<string, unknown> | null
  meta?: Record<string, unknown> | null
}

export async function logAudit(ctx: Context, opts: AuditOptions) {
  const userId = ctx.var.user?.userId ?? null
  const ipAddress = ctx.var.ipAddress ?? null
  const requestId = ctx.var.requestId ?? null

  const values = {
    actor_id: userId,
    action: opts.action,
    entity: opts.entity,
    entity_id: String(opts.entityId),
    company_id: opts.companyId,
    old_value: opts.oldValue ?? null,
    new_value: opts.newValue ?? null,
    meta: opts.meta ?? null,
    ip_address: ipAddress,
    request_id: requestId,
  }

  try {
    await db.insert(auditLogs).values(values)
  } catch (err) {
    // Audit failure should never crash the main operation
    console.error('[audit] Failed to write audit log:', err)
  }
}
