import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope, assertBranchFilterAccess } from '@/middleware/auth'
import { crossSellingQuerySchema, customerMetricsQuerySchema, revenueBreakdownQuerySchema, expansionBreakdownQuerySchema, gpBreakdownQuerySchema, hmBreakdownQuerySchema, rorBreakdownQuerySchema, dormantCustomerQuerySchema, dormantStatusBreakdownQuerySchema, dormantValueHistoryQuerySchema, categoryPerformanceQuerySchema, productPerformanceQuerySchema, productCategoryOptionsQuerySchema, categoryProductsQuerySchema, hmDetailQuerySchema, hmCustomersQuerySchema, upsellTargetQuerySchema, customerProductsQuerySchema, avgCategoryQuerySchema } from './metrics.schema'
import { getCrossSellingMetrics, getCrossSellingSummary, getCustomerMetrics, getRevenueBreakdown, getExpansionBreakdown, getGpBreakdown, getHmBreakdown, getRorBreakdown, getDormantCustomerMetrics, getDormantBreakdown, getDormantStatusBreakdown, getDormantValueHistory, getCategoryPerformance, getProductPerformance, getProductCategoryOptions, getCategoryProducts, getHmPenetrationDetail, getHmProductPenetrationDetail, getHmCustomers, getUpsellTargets, getCustomerProducts, getAvgCategoryTrend } from './metrics.service'
import type { MetricsScope } from './metrics.service'

/**
 * Resolve companyScopeIds/branchScope/divisionScope dari Context — dipakai di semua
 * handler di bawah. Fix bug (2026-07-06): sebelumnya resolveCompanyScope() dipanggil
 * cuma untuk efek samping (validasi akses ke company spesifik), hasilnya dibuang,
 * tidak pernah diteruskan ke service/repository. company_id='all' jadi TIDAK PERNAH
 * difilter company sama sekali untuk siapa pun (bukan cuma superadmin) — lihat
 * docs-v2/task/task001.md.
 */
function resolveScope(c: Context, companyId: number | 'all', branchId?: number): MetricsScope {
  const companyScopeIds = resolveCompanyScope(c, companyId)
  const branchScope = resolveBranchScope(c, companyScopeIds)
  const divisionScope = resolveDivisionScope(c, branchScope)
  if (branchId) assertBranchFilterAccess(branchScope, branchId)
  return { companyScopeIds, branchScope, divisionScope }
}

export async function handleGetCrossSelling(c: Context) {
  const query = validateQuery(c, crossSellingQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getCrossSellingMetrics(query, scope)
  return success(c, data)
}

// Versi ringan /cross-selling — cuma kpi1/kpi2, TANPA trend/detail/heatmap
// (2026-08-28). Dipakai halaman Overview, lihat komentar getCrossSellingSummary
// (metrics.service.ts) utk alasan endpoint terpisah ini dibuat.
export async function handleGetCrossSellingSummary(c: Context) {
  const query = validateQuery(c, crossSellingQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getCrossSellingSummary(query, scope)
  return success(c, data)
}

export async function handleGetCustomerMetrics(c: Context) {
  const query = validateQuery(c, customerMetricsQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getCustomerMetrics(query, scope)
  return success(c, data)
}

export async function handleGetRevenueBreakdown(c: Context) {
  const query = validateQuery(c, revenueBreakdownQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getRevenueBreakdown(query, scope)
  return success(c, data)
}

export async function handleGetExpansionBreakdown(c: Context) {
  const query = validateQuery(c, expansionBreakdownQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getExpansionBreakdown(query, scope)
  return success(c, data)
}

export async function handleGetGpBreakdown(c: Context) {
  const query = validateQuery(c, gpBreakdownQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getGpBreakdown(query, scope)
  return success(c, data)
}

export async function handleGetHmBreakdown(c: Context) {
  const query = validateQuery(c, hmBreakdownQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getHmBreakdown(query, scope)
  return success(c, data)
}

export async function handleGetRorBreakdown(c: Context) {
  const query = validateQuery(c, rorBreakdownQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getRorBreakdown(query, scope)
  return success(c, data)
}

export async function handleGetDormantMetrics(c: Context) {
  const query = validateQuery(c, dormantCustomerQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getDormantCustomerMetrics(query, scope)
  return success(c, data)
}

// Drill-down M8 (2026-08-24) — query params SAMA PERSIS dormantCustomerQuerySchema
// (reuse langsung, bukan schema baru — pola sama rorBreakdownQuerySchema/
// dormantCustomerQuerySchema yang shape-nya juga identik).
export async function handleGetDormantBreakdown(c: Context) {
  const query = validateQuery(c, dormantCustomerQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getDormantBreakdown(query, scope)
  return success(c, data)
}

// Status breakdown per customer (2026-08-24) — drill-down klik-titik-chart
// M10, lihat JSDoc getDormantStatusBreakdown (metrics.service.ts).
export async function handleGetDormantStatusBreakdown(c: Context) {
  const query = validateQuery(c, dormantStatusBreakdownQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getDormantStatusBreakdown(query, scope)
  return success(c, data)
}

// Riwayat revenue bulanan per customer (2026-08-25) — drill-down klik-bar
// ranking M9, lihat JSDoc getDormantValueHistory (metrics.service.ts).
export async function handleGetDormantValueHistory(c: Context) {
  const query = validateQuery(c, dormantValueHistoryQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getDormantValueHistory(query, scope)
  return success(c, data)
}

export async function handleGetCategoryPerformance(c: Context) {
  const query = validateQuery(c, categoryPerformanceQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const { data, total } = await getCategoryPerformance(query, scope)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetProductPerformance(c: Context) {
  const query = validateQuery(c, productPerformanceQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const { data, total } = await getProductPerformance(query, scope)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetProductCategoryOptions(c: Context) {
  const query = validateQuery(c, productCategoryOptionsQuerySchema)
  const scope = resolveScope(c, query.company_id)
  const data = await getProductCategoryOptions(query, scope)
  return success(c, data)
}

export async function handleGetCategoryProducts(c: Context) {
  const query = validateQuery(c, categoryProductsQuerySchema)
  const scope = resolveScope(c, query.company_id)
  const { data, total, summary } = await getCategoryProducts(query, scope)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total, summary })
}

export async function handleGetHmDetail(c: Context) {
  const query = validateQuery(c, hmDetailQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const { data, total } = await getHmPenetrationDetail(query, scope)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetHmProductDetail(c: Context) {
  const query = validateQuery(c, hmDetailQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const { data, total } = await getHmProductPenetrationDetail(query, scope)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetHmCustomers(c: Context) {
  const query = validateQuery(c, hmCustomersQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const { data, total, breakdown } = await getHmCustomers(query, scope)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total, breakdown })
}

export async function handleGetCustomerProducts(c: Context) {
  const query = validateQuery(c, customerProductsQuerySchema)
  const scope = resolveScope(c, query.company_id)
  const { data, total, summary } = await getCustomerProducts(query, scope)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total, summary })
}

export async function handleGetUpsellTargets(c: Context) {
  const query = validateQuery(c, upsellTargetQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const { data, total } = await getUpsellTargets(query, scope)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetAvgCategory(c: Context) {
  const query = validateQuery(c, avgCategoryQuerySchema)
  const scope = resolveScope(c, query.company_id, query.branch_id)
  const data = await getAvgCategoryTrend(query, scope)
  return success(c, data)
}
