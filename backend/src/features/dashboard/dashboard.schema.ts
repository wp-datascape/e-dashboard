import { z } from 'zod'

export const dashboardQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  division: z
    .enum(['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support', 'other'])
    .optional(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  // Toggle laporan (bukan RBAC scope) — exclude division 'intercompany'. Lihat
  // utils/scope.ts buildExcludeIntercompanyCondition/-Raw(). BUKAN z.coerce.boolean() —
  // Boolean("false") === true di JS, jadi toggle OFF (?exclude_intercompany=false)
  // malah ke-parse true (exclude selalu aktif). Lihat metrics.schema.ts untuk detail.
  exclude_intercompany: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
