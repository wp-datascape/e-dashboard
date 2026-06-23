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

export async function requestLogger(c: Context, next: Next): Promise<void> {
  const method = c.req.method
  const url = new URL(c.req.url)
  const path = url.pathname + url.search

  // IP detection: proxy headers → remote address
  const ip =
    c.req.header('x-forwarded-for') ??
    c.req.header('x-real-ip') ??
    c.req.header('cf-connecting-ip') ??
    c.req.header('true-client-ip') ??
    (c.env as Record<string, unknown>)?.remoteAddress?.['address' as keyof unknown] ??
    // @ts-expect-error — Bun's raw request has socket.remoteAddress
    c.req.raw?.socket?.remoteAddress ??
    '127.0.0.1'

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