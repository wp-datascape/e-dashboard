import { z } from 'zod'

export const dashboardQuerySchema = z.object({
  company_id: z.union([z.coerce.number().int().positive(), z.literal('all')]).default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  // Division sekarang FK integer per company (task012 v2) — filter pakai division_id.
  division: z.coerce.number().int().positive().optional(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  // Awal rentang periode aktif (dihitung frontend dari periodType via
  // `getPeriodDateRange`, sama pola dgn 10 halaman KPI individual) - task026
  // §9 lanjutan (2026-08-09), koreksi user "kenapa filter periode bulanan,
  // kuartalan, semester, tahunan di dashboard tidak bekerja": sebelumnya
  // periodType di UI Dashboard cuma kontrol tampilan, tidak pernah dikirim
  // ke backend sama sekali. Optional (fallback ke perilaku lama - titik
  // bulan terakhir - kalau tidak dikirim) supaya backward compatible.
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  // Granularitas periode (2026-08-28) — Overview sebelumnya hardcode 'monthly'
  // di semua fetch metric (task029.md §30/§39-40 komentar dashboard.service.ts),
  // sekarang terima param yang sama persis dgn crossSellingQuerySchema/
  // customerMetricsQuerySchema/dormantCustomerQuerySchema (metrics.schema.ts)
  // — 3 fungsi itu SUDAH terima period_type dari awal, Overview cuma belum
  // pernah oper param aslinya.
  period_type: z.enum(['monthly', 'quarter', 'semester', 'annual']).optional().default('monthly'),
  // Toggle laporan (bukan RBAC scope) — exclude division 'intercompany'. Lihat
  // utils/scope.ts buildExcludeIntercompanyCondition/-Raw(). BUKAN z.coerce.boolean() —
  // Boolean("false") === true di JS, jadi toggle OFF (?exclude_intercompany=false)
  // malah ke-parse true (exclude selalu aktif). Lihat metrics.schema.ts untuk detail.
  exclude_intercompany: z.enum(['true', 'false']).optional().transform((v) => v === 'true'),
})

export type DashboardQuery = z.infer<typeof dashboardQuerySchema>
