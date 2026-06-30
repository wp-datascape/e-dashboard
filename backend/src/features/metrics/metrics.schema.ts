import { z } from 'zod'

const divisionEnum = z
  .enum(['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support'])
  .optional()

export const crossSellingQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
})
export type CrossSellingQuery = z.infer<typeof crossSellingQuerySchema>

export const customerMetricsQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
})

export type CustomerMetricsQuery = z.infer<typeof customerMetricsQuerySchema>

export const gpBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
})

export type GpBreakdownQuery = z.infer<typeof gpBreakdownQuerySchema>

export const hmBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
})

export type HmBreakdownQuery = z.infer<typeof hmBreakdownQuerySchema>

export const rorBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
})

export type RorBreakdownQuery = z.infer<typeof rorBreakdownQuerySchema>

export const dormantCustomerQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
})

export type DormantCustomerQuery = z.infer<typeof dormantCustomerQuerySchema>
