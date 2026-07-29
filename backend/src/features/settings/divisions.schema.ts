import { z } from 'zod'

// 4 kategori threshold dormant customer TETAP (bukan dinamis, keputusan eksplisit
// user 2026-07-29 - kalau ada kategori baru nanti, itu task terpisah, lihat
// docs-v2/task/task012.md §1
export const DORMANT_CATEGORY_VALUES = ['b2b_dc', 'b2b_project', 'b2c', 'manufacturing'] as const

// key DIDERIVE otomatis dari label (slugify) di service layer, mirror item_types
// (task011) - key TIDAK bisa diubah lewat update (channel_divisions.division_id,
// user_divisions.division_id referensi lewat FK ke id, bukan key, tapi key tetap
// dipakai sebagai identifier machine-readable/business_unit historis).
export const createDivisionSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  // NULL = company-wide (semua branch), diisi = spesifik 1 branch (task012 v2 §2a)
  branch_id: z.coerce.number().int().positive().nullable().optional(),
  label: z.string().min(1).max(50).transform((v) => v.trim()),
  dormant_category: z.enum(DORMANT_CATEGORY_VALUES),
})

export const updateDivisionSchema = z.object({
  label: z.string().min(1).max(50).transform((v) => v.trim()).optional(),
  dormant_category: z.enum(DORMANT_CATEGORY_VALUES).optional(),
  is_active: z.boolean().optional(),
})

export const listDivisionsQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
})

export const divisionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateDivisionDto = z.infer<typeof createDivisionSchema>
export type UpdateDivisionDto = z.infer<typeof updateDivisionSchema>
export type ListDivisionsQuery = z.infer<typeof listDivisionsQuerySchema>
export type DormantCategory = (typeof DORMANT_CATEGORY_VALUES)[number]
