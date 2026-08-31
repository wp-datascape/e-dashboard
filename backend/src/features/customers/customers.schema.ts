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

// Pilih field export (2026-08-31, instruksi user: "expor produk belum ada
// fitur pilih field seperti transaksi" + "periksa juga untuk export
// customer") — allow-list eksplisit, pola SAMA PERSIS
// EXPORT_INVOICE_FIELDS (transactions.schema.ts). Urutan array ini JUGA
// urutan kolom default di Excel (dipakai handler kalau `fields` kosong =
// export semua, urutan TETAP ini, bukan urutan client kirim).
export const EXPORT_CUSTOMER_FIELDS = [
  'customer_code', 'name', 'company_name', 'division_label', 'status_label',
  'category_count', 'avg_monthly_revenue', 'lifetime_value', 'last_invoice_date', 'total_invoices',
] as const
export type ExportCustomerField = typeof EXPORT_CUSTOMER_FIELDS[number]

// Export Excel (2026-08-31) — filter SAMA PERSIS customersQuerySchema, TANPA
// page/per_page/sort_by/sort_dir (export selalu representasi PENUH dari
// filter aktif, bukan 1 halaman/1 urutan pilihan user), + `fields` opsional
// (comma-separated) utk pilih kolom yang di-export — pola sama persis
// invoicesExportQuerySchema (transactions.schema.ts). Field TIDAK DIKENAL
// diam-diam dibuang (bukan error).
export const customersExportQuerySchema = customersQuerySchema.omit({
  sort_by: true,
  sort_dir: true,
  page: true,
  per_page: true,
}).extend({
  fields: z.string().optional().transform((v) => {
    if (!v) return undefined
    const set = new Set(v.split(',').map((f) => f.trim()))
    return EXPORT_CUSTOMER_FIELDS.filter((f) => set.has(f))
  }),
})
export type CustomersExportQuery = z.infer<typeof customersExportQuerySchema>

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