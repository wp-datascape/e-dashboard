export interface AuditLogActor {
  id: number
  name: string
}

export interface AuditLogMeta {
  [key: string]: unknown
}

export interface AuditLog {
  id: number
  actor: AuditLogActor | null
  action: string
  entity: string
  entity_id: string
  entity_key: string
  company_id: number | null
  old_value: Record<string, unknown> | null
  new_value: Record<string, unknown> | null
  meta: AuditLogMeta | null
  ip_address: string | null
  request_id: string | null
  created_at: string
}

export interface AuditLogResponse {
  data: AuditLog[]
  meta: {
    page: number
    per_page: number
    total: number
  }
}

export interface AuditLogFilters {
  company_id?: number
  action?: string
  actor_id?: number
  date_from?: string
  date_to?: string
  page?: number
  per_page?: number
}

export const ACTION_TYPES = [
  'invoice.import',
  'user.create',
  'user.update',
  'user.delete',
  'role.create',
  'role.update',
  'role.delete',
  'permission.assign',
  'permission.revoke',
  'user_role.assign',
  'user_role.revoke',
  'config.update',
  'category.update',
  'page_setting.update',
] as const

export type ActionType = (typeof ACTION_TYPES)[number]