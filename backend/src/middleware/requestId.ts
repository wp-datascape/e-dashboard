/**
 * middleware/requestId.ts
 *
 * Request ID middleware — auto-generate x-request-id jika tidak dikirim client.
 *
 * Dipasang di Layer 1 (Global) di router.ts — sebelum middleware lain.
 *
 * Kegunaan:
 *   - Tracing error dari log ke response (via errorHandler.ts)
 *   - Debugging request di log server
 *   - Correlation ID untuk tracking antar service
 *
 * Usage:
 *   import { requestIdMiddleware } from '@/middleware/requestId'
 *   app.use('*', requestIdMiddleware)
 */

import type { Context, Next } from 'hono'
import { env } from '@/config/env'

export async function requestIdMiddleware(c: Context, next: Next): Promise<void> {
  const id = c.req.header('x-request-id') ?? crypto.randomUUID()

  // Simpan di context untuk digunakan errorHandler / logger
  c.set('requestId', id)

  // Set response header — client bisa pakai untuk tracing
  c.res.headers.set('x-request-id', id)

  await next()
}