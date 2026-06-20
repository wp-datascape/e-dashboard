/**
 * errors/index.ts
 *
 * Barrel export untuk semua error utilities.
 *
 * Usage:
 *   import { AppError, ErrorCode, isAppError } from '@/errors'
 *   import { registerErrorHandlers } from '@/errors'
 */

export { AppError, ErrorCode, isAppError, ERROR_STATUS } from '@/errors/AppError'
export type { ErrorCodeType } from '@/errors/AppError'
export { registerErrorHandlers } from '@/errors/errorHandler'