/**
 * utils/error.ts
 *
 * @deprecated Import langsung dari '@/errors' lebih direkomendasikan.
 *
 * File ini dipertahankan untuk backward compatibility.
 * Canonical source: src/errors/AppError.ts
 *
 * Usage (preferred):
 *   import { AppError, ErrorCode } from '@/errors'
 *
 * Usage (legacy — masih bekerja):
 *   import { AppError, ErrorCode } from '@/utils/error'
 */

export {
  AppError,
  ErrorCode,
  isAppError,
  ERROR_STATUS,
} from '@/errors/AppError'

export type { ErrorCodeType } from '@/errors/AppError'