/**
 * middleware/requestLogger.ts
 *
 * HTTP Request Logger Middleware — thin wrapper.
 *
 * Hanya membaca data dari context dan memanggil fungsi dari utils/logger.
 * Logic formatting ANSI colors + Winston persistence ada di utils/logger.ts.
 *
 * Middleware chain di router.ts:
 *   requestIdMiddleware → requestLogger → ...
 *
 * Usage:
 *   import { requestLogger } from '@/middleware/requestLogger'
 *   app.use('*', requestLogger)
 */

import type { Context, Next } from 'hono'
import { logHttpRequest, logHttpResponse } from '@/utils/logger'
import { getIp } from '@/middleware/rate-limit'

export async function requestLogger(c: Context, next: Next): Promise<void> {
  const method = c.req.method
  const url = new URL(c.req.url)
  const path = url.pathname + url.search

  // IP detection: sama seperti yang dipakai audit/activity/login log (getIp()),
  // supaya cuma ada 1 sumber kebenaran — sebelumnya di sini punya logic sendiri
  // yang tidak split header x-forwarded-for multi-proxy ("client, proxy1, proxy2").
  const ip = c.var.ipAddress ?? getIp(c)

  // Request ID: ambil dari c.var yang diset oleh requestIdMiddleware
  const requestId: string =
    (c.get('requestId') as string | undefined) ??
    c.res.headers.get('x-request-id') ??
    c.req.header('x-request-id') ??
    crypto.randomUUID()

  const userAgent = c.req.header('user-agent') ?? c.req.header('origin') ?? 'direct'

  // Log request
  logHttpRequest(method, path)

  const start = Date.now()
  await next()
  const duration = Date.now() - start
  const status = c.res.status

  // Log response
  logHttpResponse(method, path, status, duration, ip, requestId, userAgent)
}