import { z } from 'zod'

export const dashboardQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  division: z
    .enum(['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support', 'other'])
    .optional(),
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
