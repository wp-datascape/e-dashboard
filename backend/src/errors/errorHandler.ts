/**
 * errors/errorHandler.ts
 *
 * Global Hono error handlers — dipasang di router.ts sebelum semua route.
 *
 * registerErrorHandlers(app) memasang:
 *   app.onError  — menangkap semua unhandled error dari handler/service/repository
 *   app.notFound — menangkap request ke route yang tidak terdaftar
 *
 * Rules:
 *   - AppError    → return code + message sesuai statusCode, log 5xx errors
 *   - ZodError    → return VALIDATION_ERROR 400 (seharusnya tidak sampai sini)
 *   - Unknown     → log detail (termasuk stack) ke file, return INTERNAL_ERROR 500
 *   - DILARANG    : expose stack trace ke client response
 *   - WAJIB       : include request_id di setiap error log untuk tracing
 *
 * Usage (di router.ts, sebelum middleware dan route lain):
 *   import { registerErrorHandlers } from '@/errors'
 *   registerErrorHandlers(app)
 */

import type { Hono } from 'hono'
import { ZodError } from 'zod'
import { AppError, ErrorCode } from '@/errors/AppError'
import { logger } from '@/utils/logger'

// ─── Helpers ─────────────────────────────────────────────────────────────────

type ValidStatusCode = 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502

function toValidStatus(code: number): ValidStatusCode {
  const allowed: ValidStatusCode[] = [400, 401, 403, 404, 409, 413, 422, 429, 500, 502]
  return allowed.includes(code as ValidStatusCode) ? (code as ValidStatusCode) : 500
}

function jsonError(
  code: string,
  message: string,
  statusCode: ValidStatusCode,
): Response {
  return new Response(JSON.stringify({ error: code, message }), {
    status: statusCode,
    headers: { 'Content-Type': 'application/json' },
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

/**
 * Pasang global error handler dan 404 handler ke Hono app.
 * Panggil ini PERTAMA di createRouter(app), sebelum middleware dan route lain.
 */
export function registerErrorHandlers(app: Hono): void {

  // ─── Global Error Handler ──────────────────────────────────────────────────
  app.onError((err, c) => {
    const requestId = c.req.header('x-request-id') ?? '-'
    const path = c.req.path
    const method = c.req.method

    // AppError — operational error yang diharapkan
    if (err instanceof AppError) {
      // Log 5xx AppError (unexpected operational error)
      if (err.statusCode >= 500) {
        logger.error('[error] AppError 5xx', {
          request_id: requestId,
          code: err.code,
          message: err.message,
          path,
          method,
        })
      }
      return jsonError(err.code, err.message, toValidStatus(err.statusCode))
    }

    // ZodError — seharusnya sudah ditangani di handler via validateBody/Query/Param
    // Jika sampai sini, ada yang melempar ZodError langsung
    if (err instanceof ZodError) {
      const messages = err.issues
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join('; ')

      logger.warn('[error] Unhandled ZodError (should be caught in handler)', {
        request_id: requestId,
        path,
        method,
        messages,
      })

      return jsonError(ErrorCode.VALIDATION_ERROR, messages, 400)
    }

    // Unknown / unexpected error
    // Log detail termasuk stack trace — JANGAN kirim ke client
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorStack = err instanceof Error ? err.stack : undefined
    
    logger.error('[error] Unhandled exception', {
      request_id: requestId,
      path,
      method,
      name: err instanceof Error ? err.name : 'Unknown',
      message: errorMessage,
      stack: errorStack, // hanya di log server, tidak dikirim ke client
    })

    return jsonError(
      ErrorCode.INTERNAL_ERROR,
      'An unexpected error occurred. Please try again later.',
      500,
    )
  })

  // ─── 404 Not Found Handler ─────────────────────────────────────────────────
  app.notFound((c) => {
    return jsonError(
      ErrorCode.NOT_FOUND,
      `Route ${c.req.method} ${c.req.path} not found.`,
      404,
    )
  })
}