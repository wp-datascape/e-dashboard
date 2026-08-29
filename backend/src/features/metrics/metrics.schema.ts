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

export const crossSellingQuerySchema = z.object({
  company_id: z
    .union([z.coerce.number().int().positive(), z.literal('all')])
    .optional()
    .default('all'),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format must be YYYY-MM-DD').optional(),
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
