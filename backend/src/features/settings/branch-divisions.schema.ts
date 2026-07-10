import { z } from 'zod'

const DORMANT_BUCKETS = ['b2b_dc', 'b2b_project', 'b2c', 'manufacturing'] as const

export const createDivisionSchema = z.object({
  company_id: z.number().int().positive(),
  branch_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(100).trim(),
  code: z.string().min(1).max(50).transform((v) => v.toLowerCase().trim()),
  dormant_bucket: z.enum(DORMANT_BUCKETS).optional().default('b2b_dc'),
  is_active: z.boolean().optional().default(true),
})

export const updateDivisionSchema = z.object({
  branch_id: z.number().int().positive().nullable().optional(),
  name: z.string().min(1).max(100).trim().optional(),
  code: z.string().min(1).max(50).transform((v) => v.toLowerCase().trim()).optional(),
  dormant_bucket: z.enum(DORMANT_BUCKETS).optional(),
  is_active: z.boolean().optional(),
})

export const listDivisionsQuerySchema = z.object({
  company_id: z.coerce.number().int().positive().optional(),
  branch_id: z.coerce.number().int().positive().optional(),
  is_active: z.coerce.boolean().optional(),
})

export const divisionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateDivisionDto = z.infer<typeof createDivisionSchema>
export type UpdateDivisionDto = z.infer<typeof updateDivisionSchema>
export type ListDivisionsQuery = z.infer<typeof listDivisionsQuerySchema>