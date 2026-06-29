import { AppError, ErrorCode } from '@/utils/error'
import { loadThresholds, BU_DORMANT_KEY_MAP } from '@/features/config/threshold'
import type { ThresholdConfig } from '@/features/config/threshold'
import { fetchCustomerMetricsTrend, fetchGpBreakdown, fetchHmBreakdown, fetchRorBreakdown, fetchDormantTrend, fetchDormantValueRanking, fetchCrossSellingKPI, fetchCrossSellingTrend, fetchCrossSellingDetail, fetchCrossSellingHeatmap } from './metrics.repository'
import { buildSegmentParams, monthEndDate } from './segment.helper'
import type { SegmentParams } from './segment.helper'
import type { CrossSellingQuery, CustomerMetricsQuery, GpBreakdownQuery, HmBreakdownQuery, RorBreakdownQuery, DormantCustomerQuery } from './metrics.schema'
import type { CrossSellingMetricsData, CustomerMetricsData, CustomerMetricsTrendPoint, GpBreakdownData, HmBreakdownData, RorBreakdownData, DormantMetricsData } from './metrics.types'
import { db } from '@/config/db'
import { sql } from 'drizzle-orm'

function todayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Tentukan dormantDays berdasarkan division terbanyak dari invoices company.
 * Ambil channel_name → channel_divisions.division → dormant_threshold_months.{type}
 */
async function resolveDormantDays(
  cid: number,
  dormant: ThresholdConfig['dormant'],
): Promise<number> {
  const result = await db.execute(sql`
    SELECT cd.division, COUNT(*) AS cnt
    FROM invoices i
    JOIN channel_divisions cd
      ON cd.channel_name = i.channel_name
     AND (cd.company_id = ${cid === 0 ? null : cid}::int OR cd.company_id IS NULL)
    WHERE i.deleted_at IS NULL
      AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
      AND i.channel_name IS NOT NULL
    GROUP BY cd.division
    ORDER BY cnt DESC
    LIMIT 1
  `)

  const rows = result as unknown[]
  const first = rows[0] as Record<string, unknown> | undefined
  const division = first?.division != null ? String(first.division) : 'distribution'
  const dormantKey = BU_DORMANT_KEY_MAP[division] ?? 'b2b_dc'
  return dormant[dormantKey] * 30
}

async function resolveSegmentParams(
  companyId: number | 'all',
  filterDate: string,
  division?: string,
): Promise<SegmentParams> {
  const { activeMonths, dormant } = await loadThresholds()
  const cid = companyId === 'all' ? 0 : companyId
  let dormantDays: number
  if (division) {
    const dormantKey = BU_DORMANT_KEY_MAP[division] ?? 'b2b_dc'
    dormantDays = dormant[dormantKey] * 30
  } else {
    dormantDays = await resolveDormantDays(cid, dormant)
  }
  return buildSegmentParams(companyId, filterDate, activeMonths * 30, dormantDays, division)
}

export async function getCrossSellingMetrics(params: CrossSellingQuery): Promise<CrossSellingMetricsData> {
  try {
    const periodEnd = params.period_end ?? todayDate()
    const cid       = params.company_id === 'all' ? 0 : params.company_id
    const division  = params.division ?? null
    const p = { cid, periodEnd, division }

    const [kpiRaw, trend, detail, heatmapResult] = await Promise.all([
      fetchCrossSellingKPI(p),
      fetchCrossSellingTrend(p),
      fetchCrossSellingDetail(p),
      fetchCrossSellingHeatmap(p),
    ])

    const periodStart = new Date(periodEnd)
    periodStart.setDate(periodStart.getDate() - 30)
    const startStr = periodStart.toISOString().slice(0, 10)

    return {
      period: { start: startStr, end: periodEnd },
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

export async function getCustomerMetrics(params: CustomerMetricsQuery): Promise<CustomerMetricsData> {
  try {
    const filterDate = params.period_month ? monthEndDate(params.period_month) : todayDate()
    const [segParams, { repeatOrderTargetPct }] = await Promise.all([
      resolveSegmentParams(params.company_id, filterDate, params.division),
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
      active_count:            row.active_count,
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

export async function getGpBreakdown(params: GpBreakdownQuery): Promise<GpBreakdownData> {
  try {
    const filterDate = monthEndDate(params.month)
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division)
    const result = await fetchGpBreakdown(segParams)
    return {
      month:            params.month,
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

export async function getHmBreakdown(params: HmBreakdownQuery): Promise<HmBreakdownData> {
  try {
    const filterDate = monthEndDate(params.month)
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division)
    const result = await fetchHmBreakdown(segParams)
    return {
      month:            params.month,
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

export async function getDormantCustomerMetrics(params: DormantCustomerQuery): Promise<DormantMetricsData> {
  try {
    const filterDate = params.period_month ? monthEndDate(params.period_month) : todayDate()
    const [segParams, thresholds] = await Promise.all([
      resolveSegmentParams(params.company_id, filterDate, params.division),
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

export async function getRorBreakdown(params: RorBreakdownQuery): Promise<RorBreakdownData> {
  try {
    const filterDate = monthEndDate(params.month)
    const segParams = await resolveSegmentParams(params.company_id, filterDate, params.division)
    const result = await fetchRorBreakdown(segParams)
    return {
      month:          params.month,
      repeat_count:   result.repeat_count,
      total_existing: result.total_existing,
      rows:           result.rows,
    }
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil ROR breakdown', 500)
  }
}
