import { z } from 'zod'

// division: dulu z.enum(6 nilai hardcode global) — sekarang string bebas.
// Kode divisi otomatis didaftarkan ke katalog `divisions` per
// (company_id, branch_id) kalau belum ada — lihat divisions.service.ts
// ensureDivisionCode() dan docs-v2/task/task004.md.
export const createChannelDivisionSchema = z.object({
  channel_name: z.string().min(1).max(255).transform((v) => v.toUpperCase().trim()),
  division: z.string().min(1).max(50).transform((v) => v.toLowerCase().trim()),
  // Wajib diisi — mapping channel division HARUS dimiliki 1 company spesifik,
  // mengikuti alur hirarki Company -> Branch -> Division (revisi 2026-07-09,
  // sebelumnya nullable/opsional utk "rule global" yg ternyata tidak dipakai).
  company_id: z.number().int().positive(),
  branch_id: z.number().int().positive().nullable().optional(),
})

export const updateChannelDivisionSchema = z.object({
  channel_name: z.string().min(1).max(255).transform((v) => v.toUpperCase().trim()).optional(),
  division: z.string().min(1).max(50).transform((v) => v.toLowerCase().trim()).optional(),
  company_id: z.number().int().positive().optional(),
  branch_id: z.number().int().positive().nullable().optional(),
})

export const listChannelDivisionsQuerySchema = z.object({
  division: z.string().min(1).max(50).optional(),
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
})

export const channelDivisionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const unmappedChannelsQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
})

// branch_id opsional — kalau diisi, dropdown menyempit ke divisi branch itu +
// company-wide; kalau tidak diisi, union semua branch di company itu (task005 §4)
export const listDivisionValuesQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
})

export type CreateChannelDivisionDto = z.infer<typeof createChannelDivisionSchema>
export type UpdateChannelDivisionDto = z.infer<typeof updateChannelDivisionSchema>
export type ListChannelDivisionsQuery = z.infer<typeof listChannelDivisionsQuerySchema>
export type UnmappedChannelsQuery = z.infer<typeof unmappedChannelsQuerySchema>
export type ListDivisionValuesQuery = z.infer<typeof listDivisionValuesQuerySchema>
