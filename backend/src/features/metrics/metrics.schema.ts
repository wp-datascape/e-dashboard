import { z } from 'zod'

export const customerMetricsQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_month: z.string().regex(/^\d{4}-\d{2}$/, 'Format must be YYYY-MM').optional(),
})

export type CustomerMetricsQuery = z.infer<typeof customerMetricsQuerySchema>
