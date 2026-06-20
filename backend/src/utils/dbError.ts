/**
 * utils/dbError.ts
 *
 * Database error converter — mengubah error PostgreSQL/Drizzle menjadi AppError.
 *
 * WAJIB: Setiap repository harus membungkus query dengan try/catch dan panggil handleDbError().
 * Tujuannya mencegah detail internal database (constraint name, column name) bocor ke client.
 *
 * Error codes PostgreSQL yang umum:
 *   23505 — unique_violation (duplicate key)
 *   23503 — foreign_key_violation (referensi tidak valid)
 *   23514 — check_violation (data tidak memenuhi constraint)
 *   42P01 — undefined_table (salah query — ini error dev, bukan user error)
 *   40P01 — deadlock_detected (butuh retry)
 *
 * Usage:
 *   import { handleDbError } from '@/utils/dbError'
 *
 *   try {
 *     return await db.insert(invoices).values(data).returning()
 *   } catch (err) {
 *     handleDbError(err)
 *   }
 */

import { AppError, ErrorCode } from '@/utils/error'
import { logger } from '@/utils/logger'

/**
 * PostgreSQL error code pattern — numeric string 5 karakter.
 */
interface PostgresError {
  code: string
  message: string
  detail?: string
  schema?: string
  table?: string
  constraint?: string
}

/**
 * Type guard: apakah ini error PostgreSQL?
 * Cek dari keberadaan properti 'code' (string 5 digit) dan 'message'.
 */
function isPostgresError(err: unknown): err is PostgresError {
  if (!err || typeof err !== 'object') return false
  const e = err as Record<string, unknown>
  return (
    typeof e.code === 'string' &&
    /^\d{5}$/.test(e.code) &&
    typeof e.message === 'string'
  )
}

/**
 * Human-readable label dari constraint name PostgreSQL.
 * Contoh: "invoices_company_id_fkey" → "invoices"
 */
function constraintLabel(constraint?: string): string {
  if (!constraint) return ''
  // Hapus suffix _key, _fkey, _pkey, _unique
  return constraint
    .replace(/_(fkey|pkey|key|unique)$/, '')
    .replace(/_/g, ' ')
    .trim()
}

/**
 * Handle database error — convert ke AppError atau throw ulang.
 *
 * Behaviour:
 *   23505 (unique_violation) → AppError(DUPLICATE_ENTRY, 409)
 *   23503 (foreign_key_violation) → AppError(INVALID_REFERENCE, 400)
 *   23514 (check_violation) → AppError(VALIDATION_ERROR, 400)
 *   40P01 (deadlock_detected) → AppError(RATE_LIMITED, 429)
 *   42P01, 42703 (dev error) → AppError(INTERNAL_ERROR, 500) — log detail
 *   Lainnya → throw ulang, biar ditangkap global errorHandler
 */
export function handleDbError(err: unknown): never {
  if (!isPostgresError(err)) {
    throw err
  }

  // Log semua error DB untuk tracing
  logger.warn('[db] Database error', {
    code: err.code,
    constraint: err.constraint,
    detail: err.detail,
    table: err.table,
  })

  switch (err.code) {
    case '23505': // unique_violation
      throw new AppError(
        ErrorCode.DUPLICATE_ENTRY,
        constraintLabel(err.constraint)
          ? `Duplicate entry: ${constraintLabel(err.constraint)}`
          : 'Resource already exists',
        409,
      )

    case '23503': // foreign_key_violation
      throw new AppError(
        ErrorCode.INVALID_REFERENCE,
        'Referenced record not found',
        400,
      )

    case '23514': // check_violation
      throw new AppError(
        ErrorCode.VALIDATION_ERROR,
        'Data violates database constraint',
        400,
      )

    case '40P01': // deadlock_detected
      throw new AppError(
        ErrorCode.RATE_LIMITED,
        'Database deadlock detected. Please retry.',
        429,
      )

    case '42P01': // undefined_table
    case '42703': // undefined_column
      logger.error('[db] Schema error — possible migration issue', {
        code: err.code,
        message: err.message,
        table: err.table,
      })
      throw new AppError(
        ErrorCode.INTERNAL_ERROR,
        'Internal database error',
        500,
      )

    default:
      throw err
  }
}