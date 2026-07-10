import { z } from 'zod'

export const createDivisionChannelSchema = z.object({
  company_id: z.number().int().positive(),
  division_id: z.number().int().positive(),
  channel_name: z.string().min(1).max(255).transform((v) => v.toUpperCase().trim()),
})

export const updateDivisionChannelSchema = z.object({
  company_id: z.number().int().positive().optional(),
  division_id: z.number().int().positive().optional(),
  channel_name: z.string().min(1).max(255).transform((v) => v.toUpperCase().trim()).optional(),
})

export const listDivisionChannelsQuerySchema = z.object({
  division_id: z.coerce.number().int().positive().optional(),
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
})

export const divisionChannelIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateDivisionChannelDto = z.infer<typeof createDivisionChannelSchema>
export type UpdateDivisionChannelDto = z.infer<typeof updateDivisionChannelSchema>
export type ListDivisionChannelsQuery = z.infer<typeof listDivisionChannelsQuerySchema>