import { z } from 'zod'

export const createParetoCustomerSchema = z.object({
  company_id: z.number().int().positive(),
  customer_id: z.number().int().positive(),
  effective_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD'),
  effective_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').optional(),
  note: z.string().max(500).optional(),
}).refine(
  (d) => !d.effective_until || d.effective_until >= d.effective_from,
  { message: 'effective_until tidak boleh sebelum effective_from' },
)

export const updateParetoCustomerSchema = z.object({
  effective_until: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format: YYYY-MM-DD').nullable(),
  note: z.string().max(500).optional(),
})

export const listParetoCustomersQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
  active_only: z.string().optional().default('false').transform(v => v === 'true'),
})

export const paretoCustomerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const paretoCustomerOptionsQuerySchema = z.object({
  company_id: z.coerce.number().int().positive(),
})

export type CreateParetoCustomerDto = z.infer<typeof createParetoCustomerSchema>
export type UpdateParetoCustomerDto = z.infer<typeof updateParetoCustomerSchema>
export type ListParetoCustomersQuery = z.infer<typeof listParetoCustomersQuerySchema>
