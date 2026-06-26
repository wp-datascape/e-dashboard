import { z } from 'zod'

const DIVISION_VALUES = ['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support'] as const

export const createChannelDivisionSchema = z.object({
  channel_name: z.string().min(1).max(255).transform((v) => v.toUpperCase().trim()),
  division: z.enum(DIVISION_VALUES),
  company_id: z.number().int().positive().nullable().optional(),
})

export const updateChannelDivisionSchema = z.object({
  channel_name: z.string().min(1).max(255).transform((v) => v.toUpperCase().trim()).optional(),
  division: z.enum(DIVISION_VALUES).optional(),
  company_id: z.number().int().positive().nullable().optional(),
})

export const listChannelDivisionsQuerySchema = z.object({
  division: z.enum(DIVISION_VALUES).optional(),
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
  search: z.string().optional(),
})

export const channelDivisionIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateChannelDivisionDto = z.infer<typeof createChannelDivisionSchema>
export type UpdateChannelDivisionDto = z.infer<typeof updateChannelDivisionSchema>
export type ListChannelDivisionsQuery = z.infer<typeof listChannelDivisionsQuerySchema>
