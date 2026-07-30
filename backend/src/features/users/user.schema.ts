import { z } from 'zod'

// ─── Isolasi data Company/Branch/Division (docs-v2/task/task001.md) ──────────

// Division sekarang FK integer per company (task012 v2, tabel `divisions`) — array
// division_id, bukan enum string tetap lagi. Validasi FK exists + branch-scope rule
// di service layer (user.service.ts), bukan Zod enum.
//
// Assignment berjenjang: pilih Company -> per company pilih Branch -> per branch pilih Division.
// Company boleh punya branches: [] (dipilih tapi belum ada branch ter-assign) - default-deny total
// untuk company itu sampai branch di-assign, lihat task001.md §4.4 (Task D2 warning).
const branchAssignmentSchema = z.object({
  branch_id: z.number().int().positive(),
  divisions: z.array(z.number().int().positive()),
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
  // Email tujuan notifikasi/alert (task016) — TERPISAH dari email login. Empty
  // string dari form ditransform jadi null (clear di DB), bukan invalid/disimpan
  // sebagai string kosong.
  notification_email: z.union([z.string().email(), z.literal('')]).optional()
    .transform(v => v === '' ? null : v),
})

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

// ─── Response Type ────────────────────────────────────────────────────────────

export const userResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  email: z.string(),
  notification_email: z.string().nullable(),
  is_active: z.boolean(),
  created_at: z.date(),
  updated_at: z.date(),
})

export type CreateUserDto = z.infer<typeof createUserSchema>
export type UpdateUserDto = z.infer<typeof updateUserSchema>
export type UserResponse = z.infer<typeof userResponseSchema>
