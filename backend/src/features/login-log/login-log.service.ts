import { AppError, ErrorCode } from '@/errors'
import { findLoginLogs, findLoginLogById as findById } from './login-log.repository'
import type { LoginLogsQuery } from './login-log.repository'

export async function getLoginLogs(query: LoginLogsQuery) {
  const result = await findLoginLogs(query)
  return result!
}

export async function getLoginLogById(id: number, excludeSuperAdminActors: boolean) {
  const log = await findById(id, excludeSuperAdminActors)
  if (!log) throw new AppError(ErrorCode.NOT_FOUND, 'Login log not found', 404)
  return log
}
