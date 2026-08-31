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

// Toggle laporan (task029.md §35, 2026-08-25) — persempit ke customer yang
// ditandai Pareto (flag manual admin, tabel pareto_customers, task016).
// Lihat utils/scope.ts buildOnlyParetoRaw(). Pola sama persis
// excludeIntercompanyField di atas — BUKAN z.coerce.boolean().
const onlyParetoField = z
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
  only_pareto: onlyParetoField,
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
  only_pareto: onlyParetoField,
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
  only_pareto: onlyParetoField,
  // date_from (2026-08-25, task029.md §33 — M3 dipakai di Value page yg
  // SEKARANG py filter granularitas) — pola sama persis gpBreakdownQuerySchema/M4.
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
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
  only_pareto: onlyParetoField,
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
  only_pareto: onlyParetoField,
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
  only_pareto: onlyParetoField,
  // date_from (2026-08-25, task029.md §33 — M5 dipakai di Value page yg
  // SEKARANG py filter granularitas) — pola sama persis gpBreakdownQuerySchema/M4.
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
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
  only_pareto: onlyParetoField,
  // date_from (2026-08-24, M6 dipakai di Retention page yg SUDAH py filter
  // granularitas — pola sama persis gpBreakdownQuerySchema/M4) — opsional,
  // fallback ke awal bulan kalender lama kalau kosong.
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
})

export type RorBreakdownQuery = z.infer<typeof rorBreakdownQuerySchema>

export const dormantCustomerQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  // Granularitas periode (2026-08-24, susulan task029.md §30.9 poin 1 —
  // M8-M10 sebelumnya hardcode bulanan spt M3-M7 dulu, sekarang reuse
  // periodTypeField yang SAMA, pola identik customerMetricsQuerySchema.
  // apply_date_cutoff/cutoff_day disediakan sekalian — dipakai
  // resolveTrendPeriod (period.util.ts) di getDormantCustomerMetrics,
  // menggantikan workaround frontend `dormantPeriodEnd` (Retention/index.tsx)
  // yang sebelumnya perlu ada krn backend ini belum bisa self-clamp.
  period_type: periodTypeField,
  apply_date_cutoff: applyDateCutoffField,
  cutoff_day: cutoffDayField,
  skip_elapsed_clamp: skipElapsedClampField,
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
  only_pareto: onlyParetoField,
})

export type DormantCustomerQuery = z.infer<typeof dormantCustomerQuerySchema>

// Drill-down status per customer (2026-08-24, susulan pertanyaan user soal
// ambiguitas reaktivasi — lihat JSDoc CustomerDormantStatusRow di
// metrics.types.ts). date_from = awal bucket yang diklik, period_end = akhir
// bucket (SUDAH di-clamp oleh frontend, pola SAMA PERSIS onPointClick M8) —
// period_type dipakai hitung window "sebelumnya" (period-anchored, pola SAMA
// PERSIS expansionBreakdownQuerySchema).
export const dormantStatusBreakdownQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
  period_type: z.enum(['monthly', 'quarter', 'semester', 'annual']).optional(),
  // apply_date_cutoff/cutoff_day/skip_elapsed_clamp (2026-08-27, task029.md
  // §36.54 — koreksi user: "semua parameter harus seragam, akhir bulan
  // kecuali cutoff diaktifkan") — bucket current+sebelumnya SEKARANG
  // dihitung backend sendiri via resolveDormantSnapshotBucket (SATU sumber
  // acuan sama dgn getDormantCustomerMetrics), bukan lagi dari `date_from`/
  // `period_end` mentah kiriman frontend yang pre-clamp sendiri (2 acuan
  // beda, itu akar masalah).
  apply_date_cutoff: applyDateCutoffField,
  cutoff_day: cutoffDayField,
  skip_elapsed_clamp: skipElapsedClampField,
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
  only_pareto: onlyParetoField,
  status: z.enum(['active', 'inactive', 'dormant', 'newlyDormant', 'reactivated']).optional(),
})

export type DormantStatusBreakdownQuery = z.infer<typeof dormantStatusBreakdownQuerySchema>

// Riwayat revenue bulanan per customer (2026-08-25, drilldown M9 — klik bar
// ranking "Potensi Omset Hilang"). `customer_id`/`ref_date` WAJIB —
// ref_date = last_invoice_date baris yang diklik (window 12 bulan dihitung
// mundur dari situ, SAMA PERSIS avg_monthly_revenue yang sudah ditampilkan).
export const dormantValueHistoryQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  customer_id: z.coerce.number().int().positive(),
  ref_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD'),
  division: divisionEnum,
  branch_id: z.coerce.number().int().positive().optional(),
  exclude_intercompany: excludeIntercompanyField,
  only_pareto: onlyParetoField,
})

export type DormantValueHistoryQuery = z.infer<typeof dormantValueHistoryQuerySchema>

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

// Pilih field export (2026-08-31, instruksi user: "expor produk belum ada
// fitur pilih field seperti transaksi") — allow-list eksplisit, pola SAMA
// PERSIS EXPORT_INVOICE_FIELDS (transactions.schema.ts). Urutan array ini
// JUGA urutan kolom default di Excel (dipakai handler kalau `fields` kosong
// = export semua, urutan TETAP ini, bukan urutan client kirim).
export const EXPORT_PRODUCT_FIELDS = [
  'product_name', 'category_name', 'is_high_margin', 'total_revenue',
  'total_gp', 'gp_margin_ratio', 'customer_count', 'invoice_count', 'last_sold_month',
] as const
export type ExportProductField = typeof EXPORT_PRODUCT_FIELDS[number]

// Export Excel (2026-08-31) — filter SAMA PERSIS productPerformanceQuerySchema,
// TANPA page/per_page/sort_by/sort_dir (export selalu representasi PENUH dari
// filter aktif, bukan 1 halaman/1 urutan pilihan user), + `fields` opsional
// (comma-separated) utk pilih kolom yang di-export — pola sama persis
// invoicesExportQuerySchema (transactions.schema.ts). Field TIDAK DIKENAL
// diam-diam dibuang (bukan error).
export const productPerformanceExportQuerySchema = productPerformanceQuerySchema.omit({
  page: true,
  per_page: true,
  sort_by: true,
  sort_dir: true,
}).extend({
  fields: z.string().optional().transform((v) => {
    if (!v) return undefined
    const set = new Set(v.split(',').map((f) => f.trim()))
    return EXPORT_PRODUCT_FIELDS.filter((f) => set.has(f))
  }),
})
export type ProductPerformanceExportQuery = z.infer<typeof productPerformanceExportQuerySchema>

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

// period_start (2026-08-31, laporan user: "makanya aku menyuruh pakai filter
// global itu karena hal seperti ini" — susulan bug window Annual: activeWindow
// hasil DERIVASI dari period_type di frontend, Aug 2026 Annual jadi "trailing
// 12 bulan mundur" (Sep 2025-Agu 2026), BUKAN "1 Jan-hari ini" spt M5/Revenue/
// GP yg dipakai HALAMAN YANG SAMA. Akar masalahnya: kontrak lama
// (period_month+active_window, "N bulan trailing") secara STRUKTURAL tidak
// bisa merepresentasikan period_start eksak filter global, tak peduli seberapa
// pintar activeWindow "diturunkan" di frontend — pola SAMA PERSIS yg sudah ada
// customerProductsQuerySchema (period_start/period_end eksplisit, kalau diisi
// dipakai LANGSUNG, skip perhitungan period_month+active_window - lihat
// komentar di situ). Opsional & backward-compatible: ProductsHighMargin/
// index.tsx (halaman standalone, py RangeFilter sendiri, BUKAN filter global)
// TETAP jalan tanpa mengisi ini sama sekali.
const periodStartField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'period_start harus format YYYY-MM-DD').optional()

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
  period_start: periodStartField,
  // only_pareto (2026-08-31, laporan user: "cek dan perbaiki filter lain di
  // halaman sama" — susulan bug period_start) — DITEMUKAN belum pernah
  // diteruskan sama sekali ke fetchHmProductDetail/fetchUpsellTargets
  // (`resolveInvoiceScopeConditions` sengaja bikin onlyParetoCond OPSIONAL
  // no-op utk caller lama, lihat komentar InvoiceScopeParams.filterDate di
  // segment.helper.ts - "ProductsHighMargin/Product Workbench TIDAK punya UI
  // filter Pareto", BENAR saat itu, TAPI Report/Revenue skrg reuse komponen
  // ini DENGAN toggle Pareto di filter globalnya, celah sama persis dgn
  // period_start). Diverifikasi lewat API: only_pareto=true vs false hasil
  // SAMA PERSIS sebelum fix ini.
  only_pareto: onlyParetoField,
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
  period_start: periodStartField,
  // only_pareto — lihat komentar hmDetailQuerySchema.only_pareto di atas, pola sama.
  only_pareto: onlyParetoField,
  // division (2026-08-26, task031.md §3 — GANTI dari 'business_unit'
  // string legacy ke FK numeric, pola SAMA filter Divisi query lain).
  division: z.coerce.number().int().positive().optional(),
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
