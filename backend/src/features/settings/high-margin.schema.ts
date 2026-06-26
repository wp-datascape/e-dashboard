import { z } from 'zod'

export const createHighMarginSchema = z.object({
  company_id: z.number().int().positive(),
  product_id: z.number().int().positive().optional(),
  product_category_id: z.number().int().positive().optional(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  effective_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
  note: z.string().max(500).optional(),
}).refine(
  (d) => d.product_id !== undefined || d.product_category_id !== undefined,
  { message: 'Harus mengisi product_id atau product_category_id' },
).refine(
  (d) => !d.effective_until || d.effective_until >= d.effective_from,
  { message: 'effective_until tidak boleh sebelum effective_from' },
)

export const updateHighMarginSchema = z.object({
  effective_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').nullable(),
  note: z.string().max(500).optional(),
})

export const listHighMarginQuerySchema = z.object({
  company_id: z.coerce.number().int().positive(),
  period: z.string().regex(/^\d{4}-\d{2}$/, 'Format: YYYY-MM').optional(),
  // z.coerce.boolean() salah untuk query string: Boolean("false") === true
  active_only: z.string().optional().default('false').transform(v => v === 'true'),
})

export const highMarginIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateHighMarginDto = z.infer<typeof createHighMarginSchema>
export type UpdateHighMarginDto = z.infer<typeof updateHighMarginSchema>
export type ListHighMarginQuery = z.infer<typeof listHighMarginQuerySchema>
