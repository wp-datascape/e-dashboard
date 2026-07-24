import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { logActivity } from '@/utils/activityLog'
import { findActivityLogs, findActivityLogById as findById } from './activity-log.repository'
import type { ActivityLogsQuery } from './activity-log.repository'
import type { PageViewDto } from './activity-log.schema'

export async function getActivityLogs(query: ActivityLogsQuery) {
  const result = await findActivityLogs(query)
  return result!
}

export async function getActivityLogById(id: number, excludeSuperAdminActors: boolean) {
  const log = await findById(id, excludeSuperAdminActors)
  if (!log) throw new AppError(ErrorCode.NOT_FOUND, 'Activity log not found', 404)
  return log
}

// Dipanggil dari POST /activity-logs/page-view — event eksplisit dari frontend
// saat route React Router berubah (Level 1: page visit), beda dari request API
// generik yang di-log otomatis oleh activityLogMiddleware.
export async function createPageView(ctx: Context, dto: PageViewDto) {
  await logActivity(ctx, {
    method: 'PAGE_VIEW',
    path: dto.path,
    module: dto.module ?? dto.path.split('/').filter(Boolean)[0] ?? null,
    statusCode: null,
    durationMs: null,
  })
}
