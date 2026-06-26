/**
 * utils/validator.ts
 *
 * Zod validation helpers untuk handler input validation.
 *
 * WAJIB: Setiap handler harus validasi input (body, query, param) sebelum memanggil service.
 * Gunakan validateBody / validateQuery / validateParam — bukan zod.parse langsung.
 *
 * Juga menyediakan helper untuk validasi environment variables dan pagination query.
 *
 * Usage:
 *   import { validateBody, validateQuery, validateParam, paginationSchema } from '@/utils/validator'
 *
 *   // Di handler:
 *   const body = validateBody(c, createUserSchema)
 *   const query = validateQuery(c, paginationSchema)
 *   const param = validateParam(c, z.object({ id: z.coerce.number().int().positive() }))
 */

import type { Context } from 'hono'
import { z } from 'zod'
import { AppError, ErrorCode } from '@/utils/error'

// ─── Generic Validator ────────────────────────────────────────────────────────

/**
 * Validate arbitrary data against a Zod schema.
 * Throws AppError(VALIDATION_ERROR) jika validation gagal.
 * Returns typed parsed data jika berhasil.
 */
export function validateDto<T>(schema: z.ZodType<T, any, any>, data: unknown): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const messages = result.error.errors
      .map((e) => `${e.path.join('.')}: ${e.message}`)
      .join('; ')
    throw new AppError(ErrorCode.VALIDATION_ERROR, messages, 400)
  }
  return result.data
}

// ─── Handler-level Validators ─────────────────────────────────────────────────

/**
 * Validate request body (JSON).
 * Throws AppError(VALIDATION_ERROR) dengan detail field errors jika gagal.
 */
export async function validateBody<T>(c: Context, schema: z.ZodType<T, any, any>): Promise<T> {
  let body: unknown
  try {
    body = await c.req.json()
  } catch {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Request body must be valid JSON', 400)
  }
  return validateDto(schema, body)
}

/**
 * Validate request query parameters.
 */
export function validateQuery<T>(c: Context, schema: z.ZodType<T, any, any>): T {
  const raw = c.req.query()
  return validateDto(schema, raw)
}

/**
 * Validate route path parameters.
 */
export function validateParam<T>(c: Context, schema: z.ZodType<T, any, any>): T {
  const raw = c.req.param()
  return validateDto(schema, raw)
}

// ─── Common Schemas ───────────────────────────────────────────────────────────

/**
 * Standard pagination + sort query schema.
 * Digunakan di semua list endpoints: ?page=1&per_page=20&sort=created_at:desc
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(100).default(20),
  sort: z
    .string()
    .regex(/^[a-z_]+:(asc|desc)$/, 'sort format must be field:asc or field:desc')
    .optional(),
})

export type PaginationQuery = z.infer<typeof paginationSchema>

/**
 * Parse sort string → { field, direction }
 * Input: 'created_at:desc' → { field: 'created_at', direction: 'desc' }
 */
export function parseSort(sort?: string): { field: string; direction: 'asc' | 'desc' } {
  if (!sort) return { field: 'created_at', direction: 'desc' }
  const [field, direction] = sort.split(':')
  return {
    field: field ?? 'created_at',
    direction: (direction as 'asc' | 'desc') ?? 'desc',
  }
}

/**
 * company_id query schema — accepts integer atau "all" untuk holding view.
 */
export const companyIdSchema = z.union([
  z.coerce.number().int().positive(),
  z.literal('all'),
])

export type CompanyIdParam = z.infer<typeof companyIdSchema>

/**
 * Metric filter query schema — digunakan di semua /metrics/* endpoints.
 */
export const metricQuerySchema = z.object({
  company_id: companyIdSchema,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month must be YYYY-MM format'),
  active_window: z.coerce.number().refine((v) => [3, 6, 12].includes(v), {
    message: 'active_window must be 3, 6, or 12',
  }),
})

export type MetricQuery = z.infer<typeof metricQuerySchema>