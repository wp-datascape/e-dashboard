import { z } from 'zod'

export const customersQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['new', 'active', 'dormant', 'existing']).optional(),
  // Division sekarang FK integer per company (task012 v2) — filter pakai division_id.
  business_unit: z.coerce.number().int().positive().optional(),
  sort_by: z
    .enum(['avg_monthly_revenue', 'lifetime_value', 'category_count', 'last_invoice_date'])
    .optional()
    .default('last_invoice_date'),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(50),
  as_of_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .optional(),
  // Toggle laporan (bukan RBAC scope) — exclude division 'intercompany'. Lihat
  // utils/scope.ts buildExcludeIntercompanyCondition/-Raw(). BUKAN z.coerce.boolean() —
  // Boolean("false") === true di JS, jadi toggle OFF (?exclude_intercompany=false)
  // malah ke-parse true (exclude selalu aktif). Lihat metrics.schema.ts untuk detail.
  exclude_intercompany: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
})

export const customerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export const customerDetailQuerySchema = z.object({
  as_of_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD')
    .optional(),
})

export type CustomersQuery = z.infer<typeof customersQuerySchema>
export type CustomerDetailQuery = z.infer<typeof customerDetailQuerySchema>