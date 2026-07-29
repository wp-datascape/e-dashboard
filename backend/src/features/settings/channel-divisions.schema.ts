import { z } from 'zod'

// Division sekarang FK integer per company (task012 v2, tabel `divisions`) —
// company_id WAJIB (dulu nullable = rule global, dihapus karena division sendiri
// company-scoped, tidak ada "division row" yang berlaku semua company sekaligus).
export const createChannelDivisionSchema = z.object({
  channel_name: z.string().min(1).max(255).transform((v) => v.toUpperCase().trim()),
  division_id: z.coerce.number().int().positive(),
  company_id: z.coerce.number().int().positive(),
})

export const updateChannelDivisionSchema = z.object({
  channel_name: z.string().min(1).max(255).transform((v) => v.toUpperCase().trim()).optional(),
  division_id: z.coerce.number().int().positive().optional(),
  company_id: z.coerce.number().int().positive().optional(),
})

export const listChannelDivisionsQuerySchema = z.object({
  division: z.coerce.number().int().positive().optional(),
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
  search: z.string().optional(),
})

export const channelDivisionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const unmappedChannelsQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
})

export type CreateChannelDivisionDto = z.infer<typeof createChannelDivisionSchema>
export type UpdateChannelDivisionDto = z.infer<typeof updateChannelDivisionSchema>
export type ListChannelDivisionsQuery = z.infer<typeof listChannelDivisionsQuerySchema>
export type UnmappedChannelsQuery = z.infer<typeof unmappedChannelsQuerySchema>
