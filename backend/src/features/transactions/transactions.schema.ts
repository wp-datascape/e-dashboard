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

// Pilih field export (2026-08-30, instruksi user: "export nya ditambahkan
// filter field mana saja yang ingin di export") — allow-list eksplisit
// (BUKAN terima nama field bebas dari client) supaya tidak ada risiko field
// internal/sensitif ke-expose lewat query string sembarangan. Urutan array
// ini JUGA urutan kolom default di Excel (dipakai handler kalau `fields`
// kosong = export semua, urutan TETAP ini, bukan urutan client kirim).
export const EXPORT_INVOICE_FIELDS = [
  'invoice_number', 'invoice_date', 'company_name', 'customer_name',
  'customer_code', 'business_unit', 'total_revenue', 'total_gp',
  'gp_margin_ratio', 'category_count', 'import_source',
] as const
export type ExportInvoiceField = typeof EXPORT_INVOICE_FIELDS[number]

// Export Excel (2026-08-30) — filter SAMA PERSIS invoicesSummaryQuerySchema,
// + `fields` opsional (comma-separated, mis. "customer_name,total_revenue,
// total_gp") utk pilih kolom yang di-export. Field TIDAK DIKENAL diam-diam
// dibuang (bukan error) — cukup jadi seolah tidak dipilih, aman krn hasil
// akhirnya cuma dipakai FILTER dari daftar kolom yang backend sudah
// definisikan sendiri (handler), bukan diteruskan mentah ke query DB.
export const invoicesExportQuerySchema = invoicesSummaryQuerySchema.extend({
  fields: z.string().optional().transform((v) => {
    if (!v) return undefined
    const set = new Set(v.split(',').map((f) => f.trim()))
    return EXPORT_INVOICE_FIELDS.filter((f) => set.has(f))
  }),
})
export type InvoicesExportQuery = z.infer<typeof invoicesExportQuerySchema>

export const invoiceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
})
