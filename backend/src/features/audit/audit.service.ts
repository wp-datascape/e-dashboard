import { AppError, ErrorCode } from '@/utils/error'
import { findAuditLogs, findAuditLogById as findById, findDistinctActions } from './audit.repository'
import type { AuditLogsQuery } from './audit.repository'

export async function getAuditLogs(query: AuditLogsQuery) {
  const result = await findAuditLogs(query)
  return result!
}

export async function getAuditActions() {
  return findDistinctActions()
}

export async function getAuditLogById(id: number, excludeSuperAdminActors: boolean) {
  const log = await findById(id, excludeSuperAdminActors)
  if (!log) throw new AppError(ErrorCode.NOT_FOUND, 'Audit log not found', 404)
  return log
}