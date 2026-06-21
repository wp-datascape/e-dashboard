import { z } from 'zod'

export const createRoleSchema = z.object({
  name: z.string().min(2).max(100).toLowerCase(),
  description: z.string().max(500).optional(),
})

export const updateRoleSchema = z.object({
  description: z.string().max(500).optional(),
})

export const roleIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateRoleDto = z.infer<typeof createRoleSchema>
export type UpdateRoleDto = z.infer<typeof updateRoleSchema>