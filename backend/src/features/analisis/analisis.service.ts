import { AppError, ErrorCode } from '@/errors'
import { findParetoThresholds } from '../settings/pareto-thresholds.repository'
import { DEFAULT_PARETO_DROP_PERCENT } from '../settings/pareto-thresholds.service'
import {
  findAnalisisCustomers,
  aggregateInvoicesByCustomer,
  type CustomerPeriodAggregate,
} from './analisis.repository'
import {
  getPeriodRange,
  getPreviousPeriodKey,
  getYoyPeriodKey,
  getLatestClosedPeriodKey,
  type PeriodType,
} from './period.util'
import type { AnalisisQuery } from './analisis.schema'

interface MetricComparison {
  period_key: string
  revenue: number
  margin: number
  revenue_change_pct: number | null
  margin_change_pct: number | null
  revenue_alert: boolean
  margin_alert: boolean
}

export interface AnalisisRow {
  customer_id: number
  company_id: number
  company_name: string | null
  customer_name: string
  customer_code: string | null
  is_pareto: boolean
  period_type: PeriodType
  period_key: string
  current: { revenue: number; margin: number }
  previous: MetricComparison | null
  yoy: MetricComparison | null
}

export interface AnalisisResult {
  rows: AnalisisRow[]
  total: number
}

function pctChange(current: number, previous: number): number | null {
  if (previous <= 0) return null // tidak ada baseline (customer baru/belum ada transaksi) — task016 §9
  return ((current - previous) / previous) * 100
}

function buildComparison(
  periodKey: string,
  currentAgg: { revenue: number; margin: number },
  prevAgg: CustomerPeriodAggregate | undefined,
  revenueDropThreshold: number,
  marginDropThreshold: number,
): MetricComparison {
  const prevRevenue = prevAgg?.revenue ?? 0
  const prevMargin = prevAgg?.margin ?? 0
  const revenueChangePct = pctChange(currentAgg.revenue, prevRevenue)
  const marginChangePct = pctChange(currentAgg.margin, prevMargin)

  return {
    period_key: periodKey,
    revenue: prevRevenue,
    margin: prevMargin,
    revenue_change_pct: revenueChangePct,
    margin_change_pct: marginChangePct,
    revenue_alert: revenueChangePct !== null && revenueChangePct <= -revenueDropThreshold,
    margin_alert: marginChangePct !== null && marginChangePct <= -marginDropThreshold,
  }
}

/**
 * Laporan Analisis menampilkan SEMUA customer di scope (bukan cuma yang
 * di-flag Pareto) — yang di-flag ditandai `is_pareto` dan diprioritaskan
 * tampil duluan (mirror pola High Margin di Product Ledger: chip + tetap
 * dalam list lengkap). Kondisi kalkulasi (threshold, perbandingan QoQ/YoY)
 * SAMA untuk semua baris, supaya customer non-Pareto yang kebetulan turun
 * tajam juga kelihatan — dasar untuk "tabel kedua" di notifikasi email Fase C
 * (lihat task016).
 */
export async function generateAnalisis(query: AnalisisQuery, scopeIds?: number[]): Promise<AnalisisResult> {
  const periodType = query.period_type
  const periodKey = query.period_key ?? getLatestClosedPeriodKey(periodType)

  let currentRange: { start: string; end: string }
  try {
    currentRange = getPeriodRange(periodType, periodKey)
  } catch {
    throw new AppError(ErrorCode.VALIDATION_ERROR, `period_key "${periodKey}" tidak valid untuk period_type "${periodType}"`, 400)
  }

  const { rows: customerRows, total } = await findAnalisisCustomers(
    scopeIds,
    query.search,
    query.only_pareto,
    query.exclude_intercompany,
    query.sort_by,
    query.sort_dir,
    currentRange,
    query.page,
    query.per_page,
  )
  if (customerRows.length === 0) return { rows: [], total }

  const customerIds = customerRows.map(c => c.customer_id)
  const companyIds = [...new Set(customerRows.map(c => c.company_id))]

  const wantsPrevious = query.comparison === 'qoq' || query.comparison === 'both'
  const wantsYoy = query.comparison === 'yoy' || query.comparison === 'both'

  const previousKey = getPreviousPeriodKey(periodType, periodKey)
  const yoyKey = getYoyPeriodKey(periodType, periodKey)

  const [previousAggMap, yoyAggMap, thresholdRows] = await Promise.all([
    wantsPrevious ? aggregateInvoicesByCustomer(customerIds, getPeriodRange(periodType, previousKey)) : Promise.resolve(new Map<number, CustomerPeriodAggregate>()),
    wantsYoy ? aggregateInvoicesByCustomer(customerIds, getPeriodRange(periodType, yoyKey)) : Promise.resolve(new Map<number, CustomerPeriodAggregate>()),
    findParetoThresholds(companyIds),
  ])

  // Threshold per company — fallback ke default kalau company belum set custom
  // (task016 §9), atau row-nya dinonaktifkan (is_active=false). SAMA untuk
  // semua customer (Pareto maupun bukan) — bukan cuma yang di-flag.
  const thresholdMap = new Map<string, number>() // key: `${company_id}:${metric}`
  for (const t of thresholdRows) {
    if (!t.is_active || t.period_type !== periodType) continue
    thresholdMap.set(`${t.company_id}:${t.metric}`, Number(t.drop_percent))
  }
  const getThreshold = (companyId: number, metric: 'revenue' | 'margin') =>
    thresholdMap.get(`${companyId}:${metric}`) ?? DEFAULT_PARETO_DROP_PERCENT

  const rows = customerRows.map((c): AnalisisRow => {
    const current = { revenue: Number(c.current_revenue), margin: Number(c.current_margin) }
    const revenueThreshold = getThreshold(c.company_id, 'revenue')
    const marginThreshold = getThreshold(c.company_id, 'margin')

    return {
      customer_id: c.customer_id,
      company_id: c.company_id,
      company_name: c.company_name,
      customer_name: c.customer_name,
      customer_code: c.customer_code,
      is_pareto: c.is_pareto,
      period_type: periodType,
      period_key: periodKey,
      current: { revenue: current.revenue, margin: current.margin },
      previous: wantsPrevious
        ? buildComparison(previousKey, current, previousAggMap.get(c.customer_id), revenueThreshold, marginThreshold)
        : null,
      yoy: wantsYoy
        ? buildComparison(yoyKey, current, yoyAggMap.get(c.customer_id), revenueThreshold, marginThreshold)
        : null,
    }
  })

  return { rows, total }
}
