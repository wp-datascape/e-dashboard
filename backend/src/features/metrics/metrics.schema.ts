import { z } from 'zod'

// Division sekarang FK integer per company (task012 v2, tabel `divisions`) — filter
// query pakai division_id numeric, bukan string key lagi (lihat docs-v2/task/task012.md §2d).
const divisionEnum = z.coerce.number().int().positive().optional()

// Toggle laporan (bukan RBAC scope) — exclude division 'intercompany' dari hasil metrik.
// Lihat utils/scope.ts buildExcludeIntercompanyCondition/-Raw().
// BUKAN z.coerce.boolean() — Boolean("false") === true di JS (string non-kosong = truthy),
// jadi toggle OFF (?exclude_intercompany=false di query string) malah ke-parse jadi true,
// exclude selalu aktif apa pun state toggle-nya (ditemukan 2026-07-23 lewat laporan user).
// Pola z.enum(['true','false']).transform(...) ini sudah dipakai di high_margin_only di
// bawah — seharusnya diikuti dari awal, bukan pakai coerce.boolean().
const excludeIntercompanyField = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true')

// Granularitas trend/KPI Header (task029.md §30, 2026-08-20) — 4 nilai resmi
// dari filter Growth/Retention/Value, BUKAN termasuk 'ytd' (itu khusus
// Analisis/task016, lihat period.util.ts). Default 'monthly' — behavior lama
// (tanpa param ini sama sekali) tetap identik, sudah diverifikasi numerik
// sama persis dgn query generate_series lama.
const periodTypeField = z.enum(['monthly', 'quarter', 'semester', 'annual']).optional().default('monthly')

// Mode "Apply date cutoff" (task029.md §30, instruksi user 2026-08-20) — SEMUA
// titik trend dipotong ke hari yang sama (bukan cuma titik yang sedang
// berjalan seperti default), dipakai analisis mis. "20 hari pertama tiap
// bulan, 12 bulan terakhir". BUKAN z.coerce.boolean() — pola sama dengan
// exclude_intercompany di atas (Boolean("false")===true di JS).
const applyDateCutoffField = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true')

// Bypass clampToElapsedEnd (task029, 2026-08-23 — laporan user: klik titik
// S2 2025 di chart trend M2, drilldown-nya kepotong ke "23-08-2025" padahal
// "Apply date cutoff" TIDAK aktif). Root cause: clampToElapsedEnd (period.
// util.ts) sengaja meng-clamp BUKAN cuma periode yang sedang berjalan, tapi
// juga padanan YoY-nya (persis 1 tahun lalu) — supaya KpiHeader "current vs
// YoY" apple-to-apple. Endpoint /metrics/cross-selling DIPAKAI ULANG utk 2
// tujuan beda: (1) titik trend/KpiHeader YoY (MEMANG harus di-clamp), (2)
// drilldown klik-titik user (endpoint sama, tapi harus SELALU periode penuh,
// termasuk saat period_end yang diklik kebetulan = padanan YoY periode
// berjalan). Backend tidak bisa membedakan 2 tujuan itu cuma dari
// period_end/period_type, jadi caller (frontend, `useCrossSellingDetail`)
// yang menandai eksplisit "ini drilldown, jangan clamp".
const skipElapsedClampField = z
  .enum(['true', 'false'])
  .optional()
  .transform((v) => v === 'true')

// Referensi "hari ke berapa" utk mode apply_date_cutoff, KHUSUS drilldown
// (task029, 2026-08-23 — susulan laporan user: centang "Apply date cutoff"
// + tanggal filter hari ini, tapi drilldown klik-titik S2 2025 tetap tampil
// "31 Desember", bukan kepotong ke hari yang sama). Root cause: mode ini
// (clampEndToDay) selalu memotong ke "hari dari period_end REQUEST INI
// SENDIRI" — utk fetch trend utama itu BENAR (period_end = tanggal filter
// halaman, mis. hari ini tgl 23), tapi utk drilldown period_end SENGAJA
// diisi tanggal AKHIR bucket yang diklik (mis. 2025-12-31, HARInya 31, BUKAN
// hari filter halaman) — pakai hari itu apa adanya jadi "dipotong ke hari
// 31" yang notabene = tanggal aslinya sendiri, TIDAK berefek sama sekali.
// Field ini membawa hari filter halaman YANG SEBENARNYA secara terpisah,
// dipakai HANYA kalau ada (fallback ke hari dari period_end kalau kosong,
// behavior lama utk fetch trend utama tetap identik).
// max 366 (2026-08-23, fix bug: sebelumnya max 31, asumsi lama "hari dalam
// bulan") — sejak `cutoff_day` berarti "hari ke-N SEJAK AWAL PERIODE"
// (daysSincePeriodStart, period.util.ts), nilainya bisa lebih dari 31 utk
// granularitas Kuartal/Semester/Tahun (mis. periode Tahunan bisa sampai hari
// ke-366 kalau tahun kabisat) — 31 cuma benar utk Bulanan.
const cutoffDayField = z.coerce.number().int().min(1).max(366).optional()

export const crossSellingQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  period_type: periodTypeField,
  apply_date_cutoff: applyDateCutoffField,
  cutoff_day: cutoffDayField,
  skip_elapsed_clamp: skipElapsedClampField,
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
})
export type CrossSellingQuery = z.infer<typeof crossSellingQuerySchema>

export const customerMetricsQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  // Granularitas periode (task029.md §30.9 poin 1, 2026-08-22) — M3-M7
  // sebelumnya hardcode bulanan, sekarang reuse periodTypeField yang sama
  // persis dgn crossSellingQuerySchema (M1/M2), default 'monthly' identik
  // dgn behavior lama kalau param ini tidak dikirim.
  period_type: periodTypeField,
  // apply_date_cutoff/cutoff_day — field SAMA (bukan duplikat) dgn
  // crossSellingQuerySchema, disediakan di sini juga supaya resolveTrendPeriod
  // (period.util.ts, dipakai getCustomerMetrics) punya param yang sama
  // lengkapnya dgn getCrossSellingMetrics — belum ada UI M3-M7 yang
  // mengaktifkan mode ini saat ini, tapi kapabilitasnya global/siap pakai.
  apply_date_cutoff: applyDateCutoffField,
  cutoff_day: cutoffDayField,
  // skip_elapsed_clamp (2026-08-23) — field SAMA (bukan duplikat) dgn
  // crossSellingQuerySchema di atas, disediakan di sini juga supaya kalau
  // M3-M7 nanti punya drilldown yang reuse getCustomerMetrics langsung
  // (pola sama M2 reuse getCrossSellingMetrics), bug class "drilldown ikut
  // ke-clamp" tidak terulang — belum ada caller yang set true saat ini
  // (drilldown M3-M7 lewat endpoint breakdown terpisah yang tidak pernah
  // panggil clampToElapsedEnd sama sekali), disiapkan lebih dulu di service
  // layer (lihat getCustomerMetrics) supaya global, tidak perlu dikerjakan
  // ulang tiap kali ada drilldown baru.
  skip_elapsed_clamp: skipElapsedClampField,
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
})

export type CustomerMetricsQuery = z.infer<typeof customerMetricsQuerySchema>

export const revenueBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
})

export type RevenueBreakdownQuery = z.infer<typeof revenueBreakdownQuerySchema>

export const expansionBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
  // Rentang PENARIKAN DATA — mirror `gpBreakdownQuerySchema.date_from`
  // persis (koreksi user 2026-08-10: "standarnya KPI4 untuk layout, desain,
  // DAN DATA"). Window current/previous yang dibandingkan (naik/turun)
  // ikut periodStart..period_end, TERPISAH dari business_configs
  // active_window_months (window "existing", tetap fixed — lihat
  // resolveSegmentParams). Opsional, fallback ke activeMonths lama kalau
  // kosong (backward-compat).
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  // period_type (2026-08-23, koreksi user: "membandingkan 1-7 vs 26-31 itu
  // makesense?" — jawaban TIDAK, window "sebelumnya" harus period-anchored
  // (posisi relatif sama di periode sebelumnya), bukan rolling-window mundur
  // dari date_from. Perlu granularitas supaya service tahu periode
  // SEBELUMNYA yang mana — opsional, fallback rolling-window lama kalau
  // kosong (caller lama blm wired, mis. M7Expansion.tsx workbench).
  period_type: z.enum(['monthly', 'quarter', 'semester', 'annual']).optional(),
})

export type ExpansionBreakdownQuery = z.infer<typeof expansionBreakdownQuerySchema>

export const gpBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
  // Rentang PENARIKAN DATA (task026 §8e, koreksi user 2026-08-09) — start
  // date dari periode filter (periodType), end date TETAP `period_end` di
  // atas. TERPISAH dari business_configs.active_window_months (window
  // "existing", tidak boleh berubah ikut filter — lihat resolveSegmentParams
  // di metrics.service.ts). Opsional, fallback ke activeMonths lama kalau
  // kosong (backward-compat).
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
})

export type GpBreakdownQuery = z.infer<typeof gpBreakdownQuerySchema>

export const hmBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
})

export type HmBreakdownQuery = z.infer<typeof hmBreakdownQuerySchema>

export const rorBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
})

export type RorBreakdownQuery = z.infer<typeof rorBreakdownQuerySchema>

export const dormantCustomerQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
})

export type DormantCustomerQuery = z.infer<typeof dormantCustomerQuerySchema>

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export const categoryPerformanceQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  division: divisionEnum,
  exclude_intercompany: excludeIntercompanyField,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce
    .number()
    .int()
    .min(1)
    .max(24)
    .optional()
    .default(6),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
  search: z.string().optional().default(''),
  high_margin_only: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  sort_by: z
    .enum(['total_revenue', 'total_gp', 'gp_margin_percent', 'customer_count'])
    .optional()
    .default('total_revenue'),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type CategoryPerformanceQuery = z.infer<typeof categoryPerformanceQuerySchema>

export const productPerformanceQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  division: divisionEnum,
  item_type: z.string().optional(), // key dinamis per company (task011)
  category_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce
    .number()
    .int()
    .min(1)
    .max(24)
    .optional()
    .default(6),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
  search: z.string().optional().default(''),
  high_margin_only: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  sort_by: z
    .enum(['total_revenue', 'total_gp', 'gp_margin_percent', 'customer_count'])
    .optional()
    .default('total_revenue'),
  sort_dir: z.enum(['asc', 'desc']).optional().default('desc'),
})

export type ProductPerformanceQuery = z.infer<typeof productPerformanceQuerySchema>

export const productCategoryOptionsQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  item_type: z.string().optional(), // key dinamis per company (task011)
})
export type ProductCategoryOptionsQuery = z.infer<typeof productCategoryOptionsQuerySchema>

export const categoryProductsQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  category_id: z.coerce.number().int().positive(),
  // Filter laporan (bukan RBAC scope) — mirror division/branch_id di hmDetailQuerySchema,
  // supaya drill-down produk konsisten dengan filter yang aktif di grid pemanggil
  // (laporan user: filter divisi di grid sudah benar, tapi popup detail produk
  // balik nampilin semua divisi).
  branch_id: z.coerce.number().int().positive().optional(),
  division: divisionEnum,
  exclude_intercompany: excludeIntercompanyField,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  // Task008 — batasi ke produk yang benar-benar ditandai high margin (bukan
  // semua produk kategori). Dipakai tab "Penetrasi Kategori"; pemakai lain
  // (tab Target Upsell, halaman Products) sengaja tidak kirim param ini.
  // enum(['true','false']) BUKAN z.coerce.boolean() - lihat catatan di atas.
  high_margin_only: z
    .enum(['true', 'false'])
    .optional()
    .default('false')
    .transform((v) => v === 'true'),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})

export type CategoryProductsQuery = z.infer<typeof categoryProductsQuerySchema>

// task017 — drill-down "Customer Pembeli" di dialog ProductsHighMargin, mirror
// categoryProductsQuerySchema tapi target bisa kategori ATAU produk.
export const hmCustomersQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  target_type: z.enum(['category', 'product']),
  target_id: z.coerce.number().int().positive(),
  branch_id: z.coerce.number().int().positive().optional(),
  division: divisionEnum,
  exclude_intercompany: excludeIntercompanyField,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})
export type HmCustomersQuery = z.infer<typeof hmCustomersQuerySchema>

export const hmDetailQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  division: divisionEnum,
  exclude_intercompany: excludeIntercompanyField,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})
export type HmDetailQuery = z.infer<typeof hmDetailQuerySchema>

export const upsellTargetQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  business_unit: z.string().optional(),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})
export type UpsellTargetQuery = z.infer<typeof upsellTargetQuerySchema>

export const customerProductsQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  customer_id:  z.coerce.number().int().positive(),
  category_id:  z.coerce.number().int().positive().optional(),
  item_type:    z.string().optional(), // key dinamis per company (task011)
  // Filter laporan (bukan RBAC scope) — mirror division/branch_id di hmDetailQuerySchema,
  // supaya riwayat pembelian customer di dialog drill-down konsisten dengan filter
  // yang aktif di grid pemanggil.
  branch_id: z.coerce.number().int().positive().optional(),
  division: divisionEnum,
  exclude_intercompany: excludeIntercompanyField,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional().default(6),
  // Rentang tanggal eksplisit (2026-08-22, bug dilaporkan user: drill-down
  // produk M1.1 heatmap pakai "Window N bulan terakhir" dari active_window
  // (config existing-customer, TIDAK terkait filter granularitas halaman),
  // padahal heatmap-nya sendiri sudah pakai rentang tanggal granularitas-
  // aware. Kalau KEDUANYA diisi, service pakai period_start/period_end ini
  // LANGSUNG (skip perhitungan period_month+active_window) — dipakai M1
  // heatmap drill-down. Opsional, BUKAN pengganti period_month/active_window
  // — UpsellCustomerDialog.tsx (fitur beda, Products High Margin) TETAP
  // pakai period_month/active_window apa adanya, tidak disentuh.
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'period_start harus format YYYY-MM-DD').optional(),
  period_end:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'period_end harus format YYYY-MM-DD').optional(),
  page:     z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().min(1).max(100).optional().default(50),
})
export type CustomerProductsQuery = z.infer<typeof customerProductsQuerySchema>

export const avgCategoryQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  branch_id: z.coerce.number().int().positive().optional(),
  division: divisionEnum,
  exclude_intercompany: excludeIntercompanyField,
  period_month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'period_month harus format YYYY-MM')
    .optional()
    .default(currentMonth),
  active_window: z.coerce.number().int().min(1).max(24).optional(),
})
export type AvgCategoryQuery = z.infer<typeof avgCategoryQuerySchema>
