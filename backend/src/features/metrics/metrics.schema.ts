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

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const categoryPerformanceQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce
    .number()
    .int()
    .min(1)
    .max(24)
    .optional()
    .default(6),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
  search: z.string().optional().default(''),
  high_margin_only: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  sort_by: z
    .enum(['total_revenue', 'total_gp', 'gp_margin_percent', 'customer_count'])
    .optional()
    .default('total_revenue'),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type CategoryPerformanceQuery = z.infer<typeof categoryPerformanceQuerySchema>

export const categoryProductsQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  category_id: z.coerce.number().int().positive(),
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type CategoryProductsQuery = z.infer<typeof categoryProductsQuerySchema>

export const hmDetailQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})
export type HmDetailQuery = z.infer<typeof hmDetailQuerySchema>

export const upsellTargetQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  business_unit: z.string().optional(),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})
export type UpsellTargetQuery = z.infer<typeof upsellTargetQuerySchema>

export const customerProductsQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  customer_id:  z.coerce.number().int().positive(),
  category_id:  z.coerce.number().int().positive().optional(),
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})
export type CustomerProductsQuery = z.infer<typeof customerProductsQuerySchema>
