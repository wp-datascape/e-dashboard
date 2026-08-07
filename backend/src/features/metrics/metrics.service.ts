import { AppError, ErrorCode } from '@/utils/error'
import { loadThresholds, resolveDormantCategory, resolveDormantMonths } from '@/features/config/threshold'
import { loadDivisionFallbackIds, flattenFallbackByBranch } from '@/utils/scope'
import { fetchCustomerMetricsTrend, fetchRevenueBreakdown, fetchExpansionBreakdown, fetchGpBreakdown, fetchHmBreakdown, fetchRorBreakdown, fetchDormantTrend, fetchDormantValueRanking, fetchReactivatedCustomers, fetchCrossSellingKPI, fetchCrossSellingTrend, fetchCrossSellingDetail, fetchCrossSellingHeatmap, fetchCategoryPerformance, fetchProductPerformance, fetchProductCategoryOptions, fetchCategoryProducts, fetchHmDetail, fetchHmProductDetail, fetchUpsellTargets, fetchCustomerProducts, fetchAvgCategoryTrend, fetchHmCustomers, fetchHmDivisionBreakdown } from './metrics.repository'
// Reuse fetchDormantValueTrend (task025 §19, 2026-08-07) — sebelumnya cuma
// dipakai Dashboard summary card, sekarang dipakai juga halaman KPI9
// (Nilai Hilang) supaya bisa averageLastMonths sama seperti KPI8/KPI10.
// Formula/threshold PERSIS sama, cuma dipanggil dari 1 tempat lagi.
import { fetchDormantValueTrend } from '@/features/dashboard/dashboard.repository'
import type { AssignToDivision } from './metrics.repository'
import { buildSegmentParams } from './segment.helper'
import type { SegmentParams } from './segment.helper'
import type { CrossSellingQuery, CustomerMetricsQuery, RevenueBreakdownQuery, ExpansionBreakdownQuery, GpBreakdownQuery, HmBreakdownQuery, RorBreakdownQuery, DormantCustomerQuery, CategoryPerformanceQuery, ProductPerformanceQuery, ProductCategoryOptionsQuery, CategoryProductsQuery, HmDetailQuery, UpsellTargetQuery, CustomerProductsQuery, AvgCategoryQuery, HmCustomersQuery } from './metrics.schema'
import type { CrossSellingMetricsData, CustomerMetricsData, CustomerMetricsTrendPoint, RevenueBreakdownData, ExpansionBreakdownData, GpBreakdownData, HmBreakdownData, RorBreakdownData, DormantMetricsData, DormantValueRow, ProductTrendData } from './metrics.types'

// "Assign To" (task017) — divisi di luar scope viewer TIDAK PERNAH ditampilkan
// sama sekali (bukan cuma angkanya, chip-nya juga) — beda dari data transaksi
// lain yang sudah otomatis ter-scope di level SQL (WHERE branchCond/
// divisionScopeCond), field ini murni metadata config (high_margin_product_
// divisions) yang tidak lewat filter itu, jadi difilter di sini secara eksplisit.
function filterAssignToByScope(assignTo: AssignToDivision[], divisionScope: Map<number, number[]> | undefined): AssignToDivision[] {
  if (!divisionScope) return assignTo // superadmin/bypass — tampilkan semua
  const allowed = new Set([...divisionScope.values()].flat())
  return assignTo.filter((d) => allowed.has(d.id))
}

function todayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Scope hasil resolveCompanyScope/resolveBranchScope/resolveDivisionScope (handler layer).
 * Fix bug (2026-07-06): sebelumnya scopeIds dihitung di handler tapi dibuang, tidak
 * pernah diteruskan ke service/repository — company_id='all' selalu tanpa filter
 * company untuk SEMUA user, bukan cuma superadmin. Lihat docs-v2/task/task001.md.
 */
export interface MetricsScope {
  companyScopeIds?: number[]
  branchScope?: Map<number, number[]>
  divisionScope?: Map<number, number[]>
}

export async function resolveSegmentParams(
  companyId: number | 'all',
  filterDate: string,
  division?: number,
  companyScopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
  branchId?: number,
  excludeIntercompany?: boolean,
): Promise<SegmentParams> {
  const { activeMonths, dormant } = await loadThresholds()
  const cid = companyId === 'all' ? 0 : companyId
  let dormantMonths: number
  if (division) {
    const dormantKey = await resolveDormantCategory(division)
    dormantMonths = dormant[dormantKey]
  } else {
    dormantMonths = await resolveDormantMonths(cid, dormant, companyScopeIds)
  }
  // Fallback division_id 'other'/'intercompany' per company (task012 v2) — resolusi
  // sekali per request, lihat utils/scope.ts
  const [otherIdByCompany, intercompanyIdByCompany] = await Promise.all([
    loadDivisionFallbackIds('other'),
    loadDivisionFallbackIds('intercompany'),
  ])
  const otherIdByBranch = flattenFallbackByBranch(branchScope, otherIdByCompany)
  return buildSegmentParams(companyId, filterDate, activeMonths, dormantMonths, otherIdByBranch, intercompanyIdByCompany, division, branchScope, divisionScope, companyScopeIds, branchId, excludeIntercompany)
}

export async function getCrossSellingMetrics(params: CrossSellingQuery, scope: MetricsScope = {}): Promise<CrossSellingMetricsData> {
  try {
    const periodEnd = params.period_end ?? todayDate()

    // Normalisasi ke akhir bulan agar KPI / Detail / Heatmap / Trend semua pakai window identik.
    // Tanpa ini, KPI pakai filterDate (hari ini) sementara Trend pakai end-of-month per bulan →
    // pada 1 Juli KPI Card 1 menunjuk data Juni tapi Trend titik Juli = 0%.
    const [py, pm] = periodEnd.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const endOfMonth = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const segParams = await resolveSegmentParams(params.company_id, endOfMonth, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)

    const [kpiRaw, trend, detail, heatmapResult] = await Promise.all([
      fetchCrossSellingKPI(segParams),
      fetchCrossSellingTrend(segParams),
      fetchCrossSellingDetail(segParams),
      fetchCrossSellingHeatmap(segParams),
    ])

    // period.start = hari pertama window inklusif: endOfMonth − activeMonths bulan + 1 hari.
    // Date.UTC aman untuk boundary tahun (Jan − 3 = Okt tahun lalu).
    const startStr = new Date(Date.UTC(py, pm - segParams.activeMonths, 1)).toISOString().slice(0, 10)

    return {
      period: { start: startStr, end: endOfMonth, active_months: segParams.activeMonths },
      kpi1: {
        multi_cat_count: kpiRaw.multi_cat_count,
        active_count:    kpiRaw.active_count,
        rate:            kpiRaw.multi_cat_rate,
      },
      kpi2: {
        avg_categories:      kpiRaw.avg_categories,
        total_distinct_cats: kpiRaw.total_distinct_cats,
      },
      trend,
      detail,
      heatmap:    heatmapResult.heatmap,
      categories: heatmapResult.categories,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data cross-selling metrics', 500)
  }
}

export async function getCustomerMetrics(params: CustomerMetricsQuery, scope: MetricsScope = {}): Promise<CustomerMetricsData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const [segParams, { repeatOrderTargetPct }] = await Promise.all([
      resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany),
      loadThresholds(),
    ])

    const trend = await fetchCustomerMetricsTrend(segParams)

    const trendPoints: CustomerMetricsTrendPoint[] = trend.map((row) => ({
      month:                  row.month,
      existing_customers:      row.existing_customers,
      total_revenue_existing:  row.total_revenue_existing,
      avg_revenue:             row.avg_revenue,
      avg_gross_profit:        row.avg_gross_profit,
      gp_tier1:                row.gp_tier1,
      gp_tier2:                row.gp_tier2,
      gp_tier3:                row.gp_tier3,
      top_gp_customer_id:      row.top_gp_customer_id,
      top_gp_customer_name:    row.top_gp_customer_name,
      top_gp_revenue:          row.top_gp_revenue,
      top_gp_pct:              row.top_gp_pct,
      is_gp_concentrated:      row.top_gp_pct > 25,
      high_margin_ratio:       row.high_margin_ratio,
      repeat_order_rate:       row.repeat_order_rate,
      expansion_rate:          row.expansion_rate,
      up_rate:                 row.expansion_rate,
      flat_down_rate:          parseFloat((100 - row.expansion_rate).toFixed(1)),
      active_existing_count:   row.active_existing_count,
      active_new_count:        row.active_new_count,
      median_revenue:          row.median_revenue,
      top_customer_id:         row.top_customer_id,
      top_customer_name:       row.top_customer_name,
      top_customer_revenue:    row.top_customer_revenue,
      top_customer_pct:        row.top_customer_pct,
      is_concentrated:         row.top_customer_pct > 25,
      hm_revenue:              row.hm_revenue,
    }))

    const last = trendPoints.at(-1)

    return {
      trend:   trendPoints,
      detail:  [],
      high_margin_current: {
        bought_pct:     last?.high_margin_ratio ?? 0,
        not_bought_pct: parseFloat((100 - (last?.high_margin_ratio ?? 0)).toFixed(1)),
      },
      repeat_order_current: {
        value:      last?.repeat_order_rate ?? 0,
        target_pct: repeatOrderTargetPct,
      },
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data customer metrics', 500)
  }
}

export async function getRevenueBreakdown(params: RevenueBreakdownQuery, scope: MetricsScope = {}): Promise<RevenueBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
    const result = await fetchRevenueBreakdown(segParams)
    return {
      period_end:       filterDate,
      total_revenue:    result.total_revenue,
      median_threshold: result.median_threshold,
      total_existing:   result.total_existing,
      hm_revenue:       result.hm_revenue,
      rows:             result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil revenue breakdown', 500)
  }
}

export async function getExpansionBreakdown(params: ExpansionBreakdownQuery, scope: MetricsScope = {}): Promise<ExpansionBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
    const result = await fetchExpansionBreakdown(segParams)
    return {
      period_end:     filterDate,
      up_count:       result.up_count,
      total_existing: result.total_existing,
      rows:           result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil expansion breakdown', 500)
  }
}

export async function getGpBreakdown(params: GpBreakdownQuery, scope: MetricsScope = {}): Promise<GpBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
    const result = await fetchGpBreakdown(segParams)
    return {
      period_end:       filterDate,
      total_gp:         result.total_gp,
      median_threshold: result.median_threshold,
      total_existing:   result.total_existing,
      rows:             result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil GP breakdown', 500)
  }
}

export async function getHmBreakdown(params: HmBreakdownQuery, scope: MetricsScope = {}): Promise<HmBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
    const result = await fetchHmBreakdown(segParams)
    return {
      period_end:       filterDate,
      total_hm_revenue: result.total_hm_revenue,
      hm_buyer_count:   result.hm_buyer_count,
      total_existing:   result.total_existing,
      rows:             result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil HM breakdown', 500)
  }
}

/** Geser tanggal YYYY-MM-DD mundur/maju N tahun (kalender, bukan hitung hari) */
function shiftDateByYears(dateStr: string, years: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(Date.UTC(y + years, m - 1, d))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
}

export async function getDormantCustomerMetrics(params: DormantCustomerQuery, scope: MetricsScope = {}): Promise<DormantMetricsData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    // comparisonFilterDate (task025 lanjutan, 2026-08-07): tanggal yang sama
    // setahun lalu — dipakai utk komponen KpiSummaryStrip (pola "apple to
    // apple" dgn Revenue/Retention, SEMUA halaman KPI selalu YoY). Threshold
    // dormant/scope TETAP dari segParams yang SAMA (resolusi 1x, di-reuse
    // dgn filterDate di-override) — TIDAK ada aturan bisnis yang berubah,
    // cuma dihitung ulang di 2 titik waktu.
    const comparisonFilterDate = shiftDateByYears(filterDate, -1)
    const [segParams, thresholds] = await Promise.all([
      resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany),
      loadThresholds(),
    ])
    const comparisonSegParams = { ...segParams, filterDate: comparisonFilterDate }

    const [trend, valueRanking, comparisonTrend, comparisonValueRanking, reactivatedCustomers, valueTrend] = await Promise.all([
      fetchDormantTrend(segParams),
      fetchDormantValueRanking(segParams),
      fetchDormantTrend(comparisonSegParams),
      fetchDormantValueRanking(comparisonSegParams),
      fetchReactivatedCustomers(segParams),
      fetchDormantValueTrend(segParams),
    ])

    const last = trend.at(-1)
    const comparisonLast = comparisonTrend.at(-1)
    const sumLostValue = (rows: DormantValueRow[]) => rows.reduce((acc, r) => acc + r.estimated_lost_value, 0)

    return {
      trend,
      value_ranking: valueRanking,
      dormant_rate_current: {
        value:            last?.dormant_rate ?? 0,
        dormant_count:    last?.dormant_count ?? 0,
        total_customers:  last?.total_customers ?? 0,
        alert_pct:        thresholds.dormantRateAlertPct,
        comparison_value: comparisonLast?.dormant_rate ?? 0,
      },
      reactivation_current: {
        value:            last?.reactivation_rate ?? 0,
        target_low:       thresholds.reactivationTargetLow,
        target_high:      thresholds.reactivationTargetHigh,
        comparison_value: comparisonLast?.reactivation_rate ?? 0,
      },
      value_ranking_total_current:    sumLostValue(valueRanking),
      value_ranking_total_comparison: sumLostValue(comparisonValueRanking),
      reactivated_customers: reactivatedCustomers,
      value_trend: valueTrend,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data dormant customer metrics', 500)
  }
}

export async function getRorBreakdown(params: RorBreakdownQuery, scope: MetricsScope = {}): Promise<RorBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id, params.exclude_intercompany)
    const result = await fetchRorBreakdown(segParams)
    return {
      period_end:     filterDate,
      repeat_count:   result.repeat_count,
      total_existing: result.total_existing,
      rows:           result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil ROR breakdown', 500)
  }
}

export async function getCategoryPerformance(
  params: CategoryPerformanceQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id

    // Normalisasi period_month ke akhir bulan (sama dengan pola cross-selling)
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchCategoryPerformance({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd,
      activeWindow:   params.active_window,
      search:         params.search,
      highMarginOnly: params.high_margin_only,
      sortBy:         params.sort_by,
      sortDir:        params.sort_dir,
      page:           params.page,
      perPage:        params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: row.category_id, ...row }))

    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil performa kategori produk', 500)
  }
}

export async function getProductPerformance(
  params: ProductPerformanceQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id

    // Normalisasi period_month ke akhir bulan (sama dengan pola cross-selling)
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchProductPerformance({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      categoryId:      params.category_id,
      itemType:        params.item_type,
      periodEnd,
      activeWindow:   params.active_window,
      search:         params.search,
      highMarginOnly: params.high_margin_only,
      sortBy:         params.sort_by,
      sortDir:        params.sort_dir,
      page:           params.page,
      perPage:        params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: row.product_id, ...row }))

    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil performa produk', 500)
  }
}

export async function getProductCategoryOptions(
  params: ProductCategoryOptionsQuery,
  scope: MetricsScope = {},
): Promise<{ id: number; name: string }[]> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    return await fetchProductCategoryOptions({ cid, companyScopeIds: scope.companyScopeIds, itemType: params.item_type })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar kategori', 500)
  }
}

export async function getCategoryProducts(
  params: CategoryProductsQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number; summary: Record<string, unknown> }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const { rows, summary } = await fetchCategoryProducts({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      categoryId:  params.category_id,
      excludeIntercompany: params.exclude_intercompany,
      onlyHighMargin: params.high_margin_only,
      division:     params.division,
      branchFilter: params.branch_id,
      periodEnd,
      activeWindow: params.active_window,
      page:         params.page,
      perPage:      params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, assign_to, ...row }) => ({
      id: row.product_id,
      ...row,
      assign_to: filterAssignToByScope(assign_to, scope.divisionScope),
    }))

    return { data, total, summary: { ...summary } }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil produk dalam kategori', 500)
  }
}

export async function getHmPenetrationDetail(
  params: HmDetailQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchHmDetail({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd, activeWindow: params.active_window,
      page: params.page, perPage: params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, assign_to, ...row }) => ({
      id: row.category_id,
      is_high_margin: true,
      ...row,
      assign_to: filterAssignToByScope(assign_to, scope.divisionScope),
    }))
    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil penetrasi high margin', 500)
  }
}

/** task017 lanjutan — view flat per-produk (1 baris = 1 produk high margin),
 * VIEW DEFAULT baru menggantikan asumsi lama "baris = kategori" (flag di DB
 * SELALU per-produk, lihat catatan di fetchHmProductDetail()). */
export async function getHmProductPenetrationDetail(
  params: HmDetailQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchHmProductDetail({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd, activeWindow: params.active_window,
      page: params.page, perPage: params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, assign_to, ...row }) => ({
      id: row.product_id,
      is_high_margin: true,
      ...row,
      assign_to: filterAssignToByScope(assign_to, scope.divisionScope),
    }))
    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil penetrasi high margin per produk', 500)
  }
}

/** Drill-down "Customer Pembeli" + "Capaian per Divisi" (task017) — 1 dialog,
 * 2 query paralel: list customer terpaginasi + breakdown per divisi (TIDAK
 * terpaginasi, supaya angkanya selalu lengkap walau customer di halaman ini
 * sedikit). */
export async function getHmCustomers(
  params: HmCustomersQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number; breakdown: object[] }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const repoParams = {
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      targetType:  params.target_type,
      targetId:    params.target_id,
      division:     params.division,
      branchFilter: params.branch_id,
      excludeIntercompany: params.exclude_intercompany,
      periodEnd, activeWindow: params.active_window,
      page: params.page, perPage: params.per_page,
    }

    const [rows, breakdown] = await Promise.all([
      fetchHmCustomers(repoParams),
      fetchHmDivisionBreakdown(repoParams),
    ])

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: `${row.customer_id}-${row.division_id ?? 'na'}`, ...row }))
    return { data, total, breakdown }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil customer pembeli', 500)
  }
}

export async function getCustomerProducts(
  params: CustomerProductsQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchCustomerProducts({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      customerId:  params.customer_id,
      categoryId:  params.category_id,
      itemType:    params.item_type,
      excludeIntercompany: params.exclude_intercompany,
      division:     params.division,
      branchFilter: params.branch_id,
      periodEnd,
      activeWindow: params.active_window,
      page:         params.page,
      perPage:      params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: row.product_id, ...row }))
    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil riwayat produk customer', 500)
  }
}

export async function getUpsellTargets(
  params: UpsellTargetQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchUpsellTargets({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd, activeWindow: params.active_window,
      businessUnit: params.business_unit || null,
      page: params.page, perPage: params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, relevance_score, ...row }) => row)
    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil upsell targets', 500)
  }
}

export async function getAvgCategoryTrend(params: AvgCategoryQuery, scope: MetricsScope = {}): Promise<ProductTrendData> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id

    // Normalisasi period_month ke akhir bulan (sama dengan pola cross-selling / category-performance)
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // Default active_window dari business_configs.active_window_months (SSOT, sama dengan
    // cross-selling/dormant) — bukan hardcode, supaya tiap titik trend self-contained per bulan
    // kalender (bukan rolling multi-bulan) kecuali caller eksplisit override.
    const activeWindow = params.active_window ?? (await loadThresholds()).activeMonths

    const trend = await fetchAvgCategoryTrend({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      division:        params.division,
      excludeIntercompany: params.exclude_intercompany,
      branchFilter:    params.branch_id,
      periodEnd,
      activeWindow,
    })

    const current = trend.at(-1)
    const prev    = trend.at(-2)
    const currentAvg = current?.avg_category ?? 0
    const prevAvg     = prev?.avg_category ?? null
    const changePct   = prevAvg !== null && prevAvg !== 0
      ? parseFloat((((currentAvg - prevAvg) / prevAvg) * 100).toFixed(1))
      : null

    return {
      company_id:   params.company_id,
      period_month: params.period_month,
      trend,
      current_avg:  currentAvg,
      prev_avg:     prevAvg,
      change_pct:   changePct,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil tren rata-rata kategori produk', 500)
  }
}
