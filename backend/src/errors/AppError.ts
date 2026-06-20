/**
 * errors/AppError.ts
 *
 * AppError class dan error constants — canonical source untuk semua error di aplikasi.
 *
 * Usage:
 *   import { AppError, ErrorCode, isAppError } from '@/errors'
 *
 *   throw new AppError(ErrorCode.NOT_FOUND, 'Invoice not found', 404)
 */

export const ErrorCode = {
  // 400
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  INVALID_REFERENCE: 'INVALID_REFERENCE',

  // 401
  UNAUTHORIZED: 'UNAUTHORIZED',

  // 403
  FORBIDDEN: 'FORBIDDEN',
  COMPANY_ACCESS_DENIED: 'COMPANY_ACCESS_DENIED',
  CSRF_INVALID: 'CSRF_INVALID',
  SYSTEM_RESOURCE: 'SYSTEM_RESOURCE',

  // 404
  NOT_FOUND: 'NOT_FOUND',

  // 409
  DUPLICATE_IMPORT: 'DUPLICATE_IMPORT',
  DUPLICATE_ENTRY: 'DUPLICATE_ENTRY',

  // 413
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',

  // 422
  IMPORT_PROCESSING_ERROR: 'IMPORT_PROCESSING_ERROR',

  // 429
  RATE_LIMITED: 'RATE_LIMITED',

  // 502
  ACCURATE_API_ERROR: 'ACCURATE_API_ERROR',

  // 500
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode]

/**
 * AppError — operational error yang sudah dihandle.
 * Selalu gunakan ini untuk error yang diharapkan (validation, not found, forbidden, dll).
 * DILARANG: expose stack trace ke client.
 */
export class AppError extends Error {
  public readonly code: ErrorCodeType
  public readonly statusCode: number
  public readonly isOperational: boolean

  constructor(code: ErrorCodeType, message: string, statusCode = 500, isOperational = true) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * Type guard: cek apakah error adalah AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Default HTTP status codes per error code
 */
export const ERROR_STATUS: Record<ErrorCodeType, number> = {
  VALIDATION_ERROR: 400,
  INVALID_FILE_FORMAT: 400,
  INVALID_REFERENCE: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  COMPANY_ACCESS_DENIED: 403,
  CSRF_INVALID: 403,
  SYSTEM_RESOURCE: 403,
  NOT_FOUND: 404,
  DUPLICATE_IMPORT: 409,
  DUPLICATE_ENTRY: 409,
  FILE_TOO_LARGE: 413,
  IMPORT_PROCESSING_ERROR: 422,
  RATE_LIMITED: 429,
  ACCURATE_API_ERROR: 502,
  INTERNAL_ERROR: 500,
}
