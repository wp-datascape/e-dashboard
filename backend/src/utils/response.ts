/**
 * utils/response.ts
 *
 * Standardized API response helpers.
 *
 * WAJIB: Semua handler HARUS menggunakan fungsi dari sini.
 * DILARANG: Menggunakan c.json() langsung di handler.
 *
 * Usage:
 *   import { success, error, paginated } from '@/utils/response'
 *
 *   return success(c, data)
 *   return success(c, data, 'Created', 201)
 *   return error(c, ErrorCode.NOT_FOUND, 'Invoice not found', 404)
 *   return paginated(c, items, { page: 1, per_page: 20, total: 100 })
 */

import type { Context } from 'hono'
import type { ErrorCodeType } from '@/utils/error'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PaginationMeta {
  page: number
  per_page: number
  total: number
  total_pages?: number
  // Agregat opsional di luar data per-baris (mis. total keseluruhan produk yang
  // difilter, dihitung terpisah dari pagination) - dipakai kalau endpoint perlu
  // kirim ringkasan yang beda dari sekadar SUM per-halaman. Opsional & generic
  // supaya utility ini tidak terikat ke satu domain tertentu.
  summary?: Record<string, unknown>
  // Breakdown opsional TIDAK terpaginasi di luar data per-baris (task017 —
  // "Capaian per Divisi" di dialog drill-down Customer Pembeli, array bukan
  // object tunggal seperti summary, makanya field terpisah).
  breakdown?: unknown[]
}

export interface SuccessResponse<T> {
  message: string
  data: T
}

export interface PaginatedResponse<T> {
  message: string
  data: T[]
  meta: PaginationMeta
}

export interface ErrorResponse {
  error: ErrorCodeType
  message: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Single resource success response
 * Default status: 200
 */
export function success<T>(
  c: Context,
  data: T,
  message = 'Success',
  statusCode: 200 | 201 = 200,
): Response {
  return c.json<SuccessResponse<T>>({ message, data }, statusCode)
}

/**
 * No content response (204) — untuk delete tanpa body
 */
export function noContent(c: Context): Response {
  return new Response(null, { status: 204 })
}

/**
 * Paginated list success response
 */
export function paginated<T>(
  c: Context,
  data: T[],
  meta: PaginationMeta,
  message = 'Success',
): Response {
  const total_pages = Math.ceil(meta.total / meta.per_page)
  return c.json<PaginatedResponse<T>>({
    message,
    data,
    meta: { ...meta, total_pages },
  })
}

/**
 * Deteksi apakah error berasal dari kondisi data tidak ditemukan (ORM / DB level)
 */
export function isNotFoundError(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false
  const e = err as Record<string, unknown>
  return e.name === 'NotFoundError' || e.code === 'RECORD_NOT_FOUND' || e.status === 404
}

/**
 * Deteksi apakah error berasal dari pelanggaran unique constraint DB (PostgreSQL code 23505)
 */
export function isDuplicateError(err: unknown): boolean {
  if (err === null || typeof err !== 'object') return false
  const e = err as Record<string, unknown>
  return e.code === '23505' || e.name === 'UniqueConstraintError'
}

/**
 * Error response
 * Never expose stack trace — only code + message
 */
export function error(
  c: Context,
  code: ErrorCodeType,
  message: string,
  statusCode: 400 | 401 | 403 | 404 | 409 | 413 | 422 | 429 | 500 | 502 = 500,
): Response {
  return c.json<ErrorResponse>({ error: code, message }, statusCode)
}