import { z } from 'zod'

export const invoicesQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  // Division sekarang FK integer per company (task012 v2) — filter pakai division_id.
  business_unit: z.coerce.number().int().positive().optional(),
  // Toggle laporan (bukan RBAC scope) — exclude division 'intercompany'. Lihat
  // utils/scope.ts buildExcludeIntercompanyCondition/-Raw(). BUKAN z.coerce.boolean() —
  // Boolean("false") === true di JS, jadi toggle OFF (?exclude_intercompany=false)
  // malah ke-parse true (exclude selalu aktif). Lihat metrics.schema.ts untuk detail.
  exclude_intercompany: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
  customer_search: z.string().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal harus YYYY-MM-DD').optional(),
  sort_by: z.enum(['invoice_date', 'total_revenue', 'total_gp']).optional().default('invoice_date'),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(200).optional().default(50),
})
export type InvoicesQuery = z.infer<typeof invoicesQuerySchema>

// Kartu ringkasan Revenue/Laba Kotor/Margin di menu Transaksi (2026-08-29)
// — filter SAMA PERSIS invoicesQuerySchema, tanpa sort/pagination (aggregate
// 1 baris, bukan list).
export const invoicesSummaryQuerySchema = invoicesQuerySchema.omit({
  sort_by: true,
  sort_dir: true,
  page: true,
  per_page: true,
})
export type InvoicesSummaryQuery = z.infer<typeof invoicesSummaryQuerySchema>

export const invoiceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
