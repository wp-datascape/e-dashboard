import { AppError, ErrorCode } from '@/utils/error'
import { loadThresholds, BU_DORMANT_KEY_MAP, resolveDormantMonths } from '@/features/config/threshold'
import { fetchCustomerMetricsTrend, fetchGpBreakdown, fetchHmBreakdown, fetchRorBreakdown, fetchDormantTrend, fetchDormantValueRanking, fetchCrossSellingKPI, fetchCrossSellingTrend, fetchCrossSellingDetail, fetchCrossSellingHeatmap, fetchCategoryPerformance, fetchCategoryProducts, fetchHmDetail, fetchUpsellTargets, fetchCustomerProducts, fetchAvgCategoryTrend } from './metrics.repository'
import { buildSegmentParams } from './segment.helper'
import type { SegmentParams } from './segment.helper'
import type { CrossSellingQuery, CustomerMetricsQuery, GpBreakdownQuery, HmBreakdownQuery, RorBreakdownQuery, DormantCustomerQuery, CategoryPerformanceQuery, CategoryProductsQuery, HmDetailQuery, UpsellTargetQuery, CustomerProductsQuery, AvgCategoryQuery } from './metrics.schema'
import type { CrossSellingMetricsData, CustomerMetricsData, CustomerMetricsTrendPoint, GpBreakdownData, HmBreakdownData, RorBreakdownData, DormantMetricsData, ProductTrendData } from './metrics.types'

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
  divisionScope?: Map<number, string[]>
}

export async function resolveSegmentParams(
  companyId: number | 'all',
  filterDate: string,
  division?: string,
  companyScopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, string[]>,
  branchId?: number,
): Promise<SegmentParams> {
  const { activeMonths, dormant } = await loadThresholds()
  const cid = companyId === 'all' ? 0 : companyId
  let dormantMonths: number
  if (division) {
    const dormantKey = BU_DORMANT_KEY_MAP[division] ?? 'b2b_dc'
    dormantMonths = dormant[dormantKey]
  } else {
    dormantMonths = await resolveDormantMonths(cid, dormant)
  }
  return buildSegmentParams(companyId, filterDate, activeMonths, dormantMonths, division, branchScope, divisionScope, companyScopeIds, branchId)
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

    const segParams = await resolveSegmentParams(params.company_id, endOfMonth, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id)

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
      resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id),
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

export async function getGpBreakdown(params: GpBreakdownQuery, scope: MetricsScope = {}): Promise<GpBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id)
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
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id)
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

export async function getDormantCustomerMetrics(params: DormantCustomerQuery, scope: MetricsScope = {}): Promise<DormantMetricsData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const [segParams, thresholds] = await Promise.all([
      resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id),
      loadThresholds(),
    ])

    const [trend, valueRanking] = await Promise.all([
      fetchDormantTrend(segParams),
      fetchDormantValueRanking(segParams),
    ])

    const last = trend.at(-1)

    return {
      trend,
      value_ranking: valueRanking,
      dormant_rate_current: {
        value:           last?.dormant_rate ?? 0,
        dormant_count:   last?.dormant_count ?? 0,
        total_customers: last?.total_customers ?? 0,
        alert_pct:       thresholds.dormantRateAlertPct,
      },
      reactivation_current: {
        value:       last?.reactivation_rate ?? 0,
        target_low:  thresholds.reactivationTargetLow,
        target_high: thresholds.reactivationTargetHigh,
      },
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data dormant customer metrics', 500)
  }
}

export async function getRorBreakdown(params: RorBreakdownQuery, scope: MetricsScope = {}): Promise<RorBreakdownData> {
  try {
    const filterDate = params.period_end ?? todayDate()
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division, scope.companyScopeIds, scope.branchScope, scope.divisionScope, params.branch_id)
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

export async function getCategoryProducts(
  params: CategoryProductsQuery,
  scope: MetricsScope = {},
): Promise<{ data: object[]; total: number }> {
  try {
    const cid = params.company_id === 'all' ? 0 : params.company_id
    const [py, pm] = params.period_month.split('-').map(Number)
    const lastDay   = new Date(Date.UTC(py, pm, 0)).getDate()
    const periodEnd = `${py}-${String(pm).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    const rows = await fetchCategoryProducts({
      cid,
      companyScopeIds: scope.companyScopeIds,
      branchScope:     scope.branchScope,
      divisionScope:   scope.divisionScope,
      categoryId:  params.category_id,
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
      branchFilter:    params.branch_id,
      periodEnd, activeWindow: params.active_window,
      page: params.page, perPage: params.per_page,
    })

    const total = rows[0]?.total_count ?? 0
    const data  = rows.map(({ total_count, ...row }) => ({ id: row.category_id, is_high_margin: true, ...row }))
    return { data, total }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil penetrasi high margin', 500)
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
