import { z } from 'zod'

// ─── Request Schemas ──────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(72),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  isActive: z.boolean().optional(),
  role_ids: z.array(z.number().int().positive()).optional(),
  company_ids: z.array(z.number().int().positive()).optional(),
})

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// ─── Response Type ────────────────────────────────────────────────────────────

export const userResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
export type UserResponse = z.infer<typeof userResponseSchema>
