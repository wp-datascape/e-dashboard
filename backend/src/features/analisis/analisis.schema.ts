import { z } from 'zod'

export const analisisQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).optional().default('all'),
  period_type: z.enum(['quarter', 'semester', 'annual']).optional().default('quarter'),
  // Default: periode terakhir yang sudah tutup penuh (dihitung server-side kalau kosong)
  period_key: z.string().optional(),
  // Basis perbandingan yang ditampilkan — user pilih di UI (task016 §2)
  comparison: z.enum(['qoq', 'yoy', 'both']).optional().default('both'),
  // Menampilkan SEMUA customer (bukan cuma yang di-flag Pareto) — yang di-flag
  // ditandai `is_pareto` + diprioritaskan tampil duluan (mirror pola High Margin
  // di halaman Product Ledger), lihat task016 §12.
  search: z.string().optional(),
  // Toggle "Hanya Pareto" — mirror `high_margin_only` di Product Ledger.
  // z.coerce.boolean() SALAH untuk query string: Boolean("false") === true
  // (lihat pola yang sama di high-margin.schema.ts active_only).
  only_pareto: z.string().optional().default('false').transform(v => v === 'true'),
  // Toggle "Exclude Intercompany" — mirror ExcludeIntercompanyToggle yang sudah
  // dipakai Products/Transactions/Customers. Pola string+transform yang sama,
  // BUKAN z.coerce.boolean() (lihat catatan only_pareto di atas).
  exclude_intercompany: z.string().optional().default('false').transform(v => v === 'true'),
  // Sort by revenue (kolom "Periode Ini") — 'default' = prioritas Pareto lalu
  // nama alfabetis (task016 §12).
  sort_by:  z.enum(['default', 'revenue']).optional().default('default'),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc'),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type AnalisisQuery = z.infer<typeof analisisQuerySchema>
