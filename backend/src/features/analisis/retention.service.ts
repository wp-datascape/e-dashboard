import { findParetoThresholds } from '../settings/pareto-thresholds.repository'
import { DEFAULT_PARETO_DROP_PERCENT } from '../settings/pareto-thresholds.service'
import {
  findRetentionCustomers,
  aggregateInvoiceCountByCustomer,
  aggregateRetentionSummary,
  type CustomerInvoiceCountAggregate,
} from './retention.repository'
import {
  getPeriodRange,
  getYoyPeriodKey,
  getPreviousPeriodKey,
  getLatestClosedPeriodKey,
  getCurrentPeriodKey,
  getElapsedRangeEnd,
  shiftDateByYears,
  type PeriodType,
} from './period.util'
import type { AnalisisQuery } from './analisis.schema'

interface RetentionComparison {
  period_key: string
  invoice_count: number
  // Growth Value (Current - Previous), sama pola dgn Revenue & GP (Metric
  // Comparison Standard task016 §18) — selalu terisi, beda dari *_change_pct
  // yang bisa null kalau previous = 0.
  invoice_count_change_value: number
  invoice_count_change_pct: number | null
  invoice_count_alert: boolean
}

export interface RetentionRow {
  customer_id: number
  company_id: number
  company_name: string | null
  customer_name: string
  customer_code: string | null
  is_pareto: boolean
  period_type: PeriodType
  period_key: string
  current: { invoice_count: number }
  comparison: RetentionComparison
}

export interface RetentionSummaryResult {
  current_invoice_count: number
  comparison_invoice_count: number
  change_value: number
  change_pct: number | null
}

export interface RetentionResult {
  rows: RetentionRow[]
  total: number
  summary: RetentionSummaryResult
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null // tidak ada baseline (customer baru/belum ada transaksi) — sama pola dgn analisis.service.ts
  return ((current - previous) / previous) * 100
}

/**
 * Analisis Retention — customer repeat order (jumlah invoice) per periode,
 * dibandingkan periode sama tahun lalu. Mirror generateAnalisis() (Revenue &
 * GP) persis, cuma metrik yang dihitung beda: COUNT invoice bukan SUM
 * revenue. Alert threshold REUSE ambang penurunan revenue (Settings →
 * Threshold Pareto) sebagai proxy "penurunan signifikan" — belum ada
 * threshold khusus jumlah order per-customer di business_configs, ditinjau
 * ulang kalau ternyata perlu ambang terpisah.
 */
export async function generateRetentionAnalisis(
  query: AnalisisQuery,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
): Promise<RetentionResult> {
  const periodType = query.period_type

  let periodKey: string
  let currentRange: { start: string; end: string }
  let isInProgress = false

  if (query.end_date) {
    periodKey = getCurrentPeriodKey(periodType, new Date(query.end_date))
    currentRange = { start: getPeriodRange(periodType, periodKey).start, end: query.end_date }
  } else {
    periodKey = query.period_key ?? getLatestClosedPeriodKey(periodType)
    currentRange = getPeriodRange(periodType, periodKey)

    isInProgress = periodKey === getCurrentPeriodKey(periodType)
    if (isInProgress) {
      const elapsedEnd = getElapsedRangeEnd(periodType)
      currentRange = {
        start: currentRange.start,
        end: elapsedEnd < currentRange.start ? currentRange.start : (elapsedEnd < currentRange.end ? elapsedEnd : currentRange.end),
      }
    }
  }

  const { rows: customerRows, total } = await findRetentionCustomers(
    scopeIds,
    query.search,
    query.only_pareto,
    query.exclude_intercompany,
    query.sort_by === 'revenue' ? 'invoice_count' : 'default',
    query.sort_dir,
    currentRange,
    query.page,
    query.per_page,
    query.customer_id,
    branchScope,
    divisionScope,
    query.branch_id,
    query.division,
  )

  const zeroSummary: RetentionSummaryResult = {
    current_invoice_count: 0,
    comparison_invoice_count: 0,
    change_value: 0,
    change_pct: null,
  }
  if (customerRows.length === 0) return { rows: [], total, summary: zeroSummary }

  const customerIds = customerRows.map(c => c.customer_id)
  const companyIds = [...new Set(customerRows.map(c => c.company_id))]

  const isPreviousPeriodMode = query.comparison === 'previous_period' && periodType !== 'ytd' && !query.end_date
  const comparisonKey = isPreviousPeriodMode
    ? getPreviousPeriodKey(periodType, periodKey)
    : getYoyPeriodKey(periodType, periodKey)

  let comparisonRange = getPeriodRange(periodType, comparisonKey)
  if (query.end_date) {
    comparisonRange = { start: comparisonRange.start, end: shiftDateByYears(currentRange.end, -1) }
  } else if (isInProgress && !isPreviousPeriodMode) {
    const [, cMonth, cDay] = currentRange.end.split('-')
    const truncatedCompEnd = `${comparisonRange.end.slice(0, 4)}-${cMonth}-${cDay}`
    if (truncatedCompEnd >= comparisonRange.start && truncatedCompEnd < comparisonRange.end) {
      comparisonRange = { ...comparisonRange, end: truncatedCompEnd }
    }
  }

  const [comparisonAggMap, thresholdRows, summaryTotals] = await Promise.all([
    aggregateInvoiceCountByCustomer(customerIds, comparisonRange),
    findParetoThresholds(companyIds),
    aggregateRetentionSummary(
      scopeIds,
      query.search,
      query.only_pareto,
      query.exclude_intercompany,
      currentRange,
      comparisonRange,
      query.customer_id,
      branchScope,
      divisionScope,
      query.branch_id,
      query.division,
    ),
  ])

  const thresholdMap = new Map<string, number>()
  for (const t of thresholdRows) {
    if (!t.is_active || t.period_type !== periodType || t.metric !== 'revenue') continue
    thresholdMap.set(`${t.company_id}`, Number(t.drop_percent))
  }
  const getThreshold = (companyId: number) => thresholdMap.get(`${companyId}`) ?? DEFAULT_PARETO_DROP_PERCENT

  const buildComparison = (
    prevAgg: CustomerInvoiceCountAggregate | undefined,
    currentCount: number,
    threshold: number,
  ): RetentionComparison => {
    const prevCount = prevAgg?.invoice_count ?? 0
    const changePct = pctChange(currentCount, prevCount)
    return {
      period_key: comparisonKey,
      invoice_count: prevCount,
      invoice_count_change_value: currentCount - prevCount,
      invoice_count_change_pct: changePct,
      invoice_count_alert: changePct !== null && changePct <= -threshold,
    }
  }

  const rows = customerRows.map((c): RetentionRow => ({
    customer_id: c.customer_id,
    company_id: c.company_id,
    company_name: c.company_name,
    customer_name: c.customer_name,
    customer_code: c.customer_code,
    is_pareto: c.is_pareto,
    period_type: periodType,
    period_key: periodKey,
    current: { invoice_count: c.current_invoice_count },
    comparison: buildComparison(comparisonAggMap.get(c.customer_id), c.current_invoice_count, getThreshold(c.company_id)),
  }))

  const summary: RetentionSummaryResult = {
    current_invoice_count: summaryTotals.current_invoice_count,
    comparison_invoice_count: summaryTotals.comparison_invoice_count,
    change_value: summaryTotals.current_invoice_count - summaryTotals.comparison_invoice_count,
    change_pct: pctChange(summaryTotals.current_invoice_count, summaryTotals.comparison_invoice_count),
  }

  return { rows, total, summary }
}
