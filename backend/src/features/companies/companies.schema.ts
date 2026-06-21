import { z } from 'zod'

export const createCompanySchema = z.object({
  code: z.string().min(2).max(50).toUpperCase(),
  name: z.string().min(2).max(255),
})

export const updateCompanySchema = z.object({
  code: z.string().min(2).max(50).toUpperCase().optional(),
  name: z.string().min(2).max(255).optional(),
})

export const companyIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateCompanyDto = z.infer<typeof createCompanySchema>
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>