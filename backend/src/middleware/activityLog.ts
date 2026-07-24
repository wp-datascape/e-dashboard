/**
 * middleware/activityLog.ts
 *
 * Auto-log setiap request API terautentikasi ke activity_logs (Level 2 —
 * Action Log generik). Dipasang di router.ts pada protectedApi, SETELAH
 * authMiddleware() (butuh c.var.user) dan SEBELUM feature routes di-mount,
 * supaya membungkus seluruh request/response cycle (durasi & status akhir).
 *
 * Endpoint /activity-logs/page-view (dipakai frontend utk Level 1) SENGAJA
 * di-skip di sini — kalau ikut ke-log, hasilnya entry "request logging tentang
 * request logging" yang membingungkan; page-view sudah tercatat sendiri lewat
 * activity-log.service.ts.
 *
 * Usage:
 *   import { activityLogMiddleware } from '@/middleware/activityLog'
 *   protectedApi.use('*', activityLogMiddleware)
 */

import type { Context, Next } from 'hono'
import { logActivity } from '@/utils/activityLog'

function resolvePath(c: Context): string {
  const raw = c.req.routePath || c.req.path
  return raw.replace(/^\/api\/v1/, '') || '/'
}

export async function activityLogMiddleware(c: Context, next: Next): Promise<void> {
  const start = Date.now()
  await next()

  const path = resolvePath(c)
  if (path.startsWith('/activity-logs')) return

  const module = path.split('/').filter(Boolean)[0] ?? null

  await logActivity(c, {
    method: c.req.method,
    path,
    module,
    statusCode: c.res.status,
    durationMs: Date.now() - start,
  })
}
