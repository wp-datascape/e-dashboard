import { z } from 'zod'

// ─── Isolasi data Company/Branch/Division (docs-v2/task/task001.md) ──────────

export const DIVISION_VALUES = [
  'distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support', 'other',
] as const

// Assignment berjenjang: pilih Company -> per company pilih Branch -> per branch pilih Division.
// Company boleh punya branches: [] (dipilih tapi belum ada branch ter-assign) - default-deny total
// untuk company itu sampai branch di-assign, lihat task001.md §4.4 (Task D2 warning).
const branchAssignmentSchema = z.object({
  branch_id: z.number().int().positive(),
  divisions: z.array(z.enum(DIVISION_VALUES)),
})

const companyAssignmentSchema = z.object({
  company_id: z.number().int().positive(),
  branches: z.array(branchAssignmentSchema),
})

export type CompanyAssignmentDto = z.infer<typeof companyAssignmentSchema>

// ─── Request Schemas ──────────────────────────────────────────────────────────

export const createUserSchema = z.object({
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(8).max(72),
  role_ids: z.array(z.number().int().positive()).optional(),
  company_assignments: z.array(companyAssignmentSchema).optional(),
})

export const updateUserSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  is_active: z.boolean().optional(),
  role_ids: z.array(z.number().int().positive()).optional(),
  company_assignments: z.array(companyAssignmentSchema).optional(),
  password: z.string().min(8).max(72).optional(),
})

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// ─── Response Type ────────────────────────────────────────────────────────────

export const userResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  is_active: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
})

export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
export type UserResponse = z.infer<typeof userResponseSchema>
