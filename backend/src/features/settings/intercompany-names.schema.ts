import { z } from 'zod'

// customer_name dinormalisasi UPPERCASE - sama pola dengan customers.customer_name
// (upsertCustomer), supaya matching sync ke division_override_id konsisten.
export const createIntercompanyNameSchema = z.object({
  company_id: z.coerce.number().int().positive(),
  customer_name: z.string().min(1).max(255).transform((v) => v.trim().toUpperCase()),
})

export const listIntercompanyNamesQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
})

// customer-options SELALU 1 company spesifik (dropdown autocomplete di form tambah
// nama, bukan report lintas company)
export const customerOptionsQuerySchema = z.object({
  company_id: z.coerce.number().int().positive(),
})

export const intercompanyNameIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CreateIntercompanyNameDto = z.infer<typeof createIntercompanyNameSchema>
export type ListIntercompanyNamesQuery = z.infer<typeof listIntercompanyNamesQuerySchema>
