import { z } from 'zod'

export const createBranchSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(50).toUpperCase(),
  is_active: z.boolean(),
})

export const updateBranchSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  code: z.string().min(2).max(50).toUpperCase().optional(),
  is_active: z.boolean().optional(),
})

export const branchIdParamSchema = z.object({
  branchId: z.coerce.number().int().positive(),
})

export type CreateBranchDto = z.infer<typeof createBranchSchema>
export type UpdateBranchDto = z.infer<typeof updateBranchSchema>