import { z } from 'zod'

export const customersQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['new', 'active', 'dormant', 'existing']).optional(),
  // Filter laporan — string bebas (bukan enum hardcode), dinamis per company/branch,
  // lihat docs-v2/task/task004.md. Kode tidak valid cukup hasilkan list kosong.
  business_unit: z.string().min(1).max(50).optional(),
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
})

export const customerIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})

export type CustomersQuery = z.infer<typeof customersQuerySchema>