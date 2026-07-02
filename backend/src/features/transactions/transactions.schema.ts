import { z } from 'zod'

export const invoicesQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  business_unit: z.enum(['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support']).optional(),
  customer_search: z.string().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  sort_by: z.enum(['invoice_date', 'total_revenue', 'total_gp']).optional().default('invoice_date'),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(200).optional().default(50),
})
export type InvoicesQuery = z.infer<typeof invoicesQuerySchema>

export const invoiceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
