/**
 * middleware/requestLogger.ts
 *
 * Request logger middleware — format:
 *   [:timestamp] :method :url :status :duration ms - :ip - :request_id - :user_agent
 *
 * Menggantikan hono/logger yang internalnya console.log.
 * Sesuai rule: logger wajib dari utils/logger.
 *
 * Usage:
 *   import { requestLogger } from '@/middleware/requestLogger'
 *   app.use('*', requestLogger)
 */

import type { Context, Next } from 'hono'
import { logger } from '@/utils/logger'

export async function requestLogger(c: Context, next: Next): Promise<void> {
  const start = Date.now()
  const method = c.req.method
  const url = c.req.url
  const ip = c.req.header('x-forwarded-for') ?? c.req.header('x-real-ip') ?? 'unknown'
  const requestId = c.req.header('x-request-id') ?? '-'
  const userAgent = c.req.header('user-agent') ?? '-'

  await next()

  const duration = Date.now() - start
  const status = c.res.status
  const ts = new Date().toISOString().replace('T', ' ').replace('Z', '')

  const line = `[${ts}] ${method} ${url} ${status} ${duration}ms - ${ip} - ${requestId} - ${userAgent}`

  if (status >= 500) {
    logger.error(line)
  } else if (status >= 400) {
    logger.warn(line)
  } else {
    logger.info(line)
  }
}