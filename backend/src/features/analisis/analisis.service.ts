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
  getYoyPeriodKey,
  getPreviousPeriodKey,
  getLatestClosedPeriodKey,
  getCurrentPeriodKey,
  getElapsedRangeEnd,
  shiftDateByYears,
  type PeriodType,
} from './period.util'
import type { AnalisisQuery } from './analisis.schema'

interface MetricComparison {
  period_key: string
  revenue: number
  margin: number
  // Growth Value (Current - Previous) — indikator UTAMA (Metric Comparison
  // Standard task016 §18), Growth % cuma pendukung. Selalu terisi (beda dari
  // *_change_pct yang bisa null kalau previous = 0 / "New Business").
  revenue_change_value: number
  margin_change_value: number
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
  // Comparison SELALU vs periode sama tahun lalu (YoY) — tidak ada lagi QoQ
  // terpisah (Metric Comparison Standard, task016 §18).
  comparison: MetricComparison
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
    revenue_change_value: currentAgg.revenue - prevRevenue,
    margin_change_value: currentAgg.margin - prevMargin,
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
 * dalam list lengkap). Kondisi kalkulasi (threshold, perbandingan YoY)
 * SAMA untuk semua baris, supaya customer non-Pareto yang kebetulan turun
 * tajam juga kelihatan — dasar untuk "tabel kedua" di notifikasi email Fase C
 * (lihat task016).
 */
export async function generateAnalisis(
  query: AnalisisQuery,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
): Promise<AnalisisResult> {
  const periodType = query.period_type

  let periodKey: string
  let currentRange: { start: string; end: string }
  let isInProgress = false

  if (query.end_date) {
    // Tanggal eksplisit dari date picker "Tanggal" di halaman Analisis (task016
    // §26, revisi 2026-08-01: dropdown Pembanding dihapus dari UI, SELALU YoY).
    // Start SELALU awal periode yang MENGANDUNG tanggal ini, end SELALU tanggal
    // ini persis — apa pun status periode-nya (sudah tutup atau masih berjalan).
    periodKey = getCurrentPeriodKey(periodType, new Date(query.end_date))
    currentRange = { start: getPeriodRange(periodType, periodKey).start, end: query.end_date }
  } else {
    periodKey = query.period_key ?? getLatestClosedPeriodKey(periodType)
    try {
      currentRange = getPeriodRange(periodType, periodKey)
    } catch {
      throw new AppError(ErrorCode.VALIDATION_ERROR, `period_key "${periodKey}" tidak valid untuk period_type "${periodType}"`, 400)
    }

    // Fallback lama (task016 §24) — dipakai caller yang belum kirim end_date
    // (mis. NotificationDetailDialog, permalink ke periode historis tertentu).
    // Periode MASIH BERJALAN (in-progress) — potong currentRange biar apple-to-
    // apple sama comparisonRange.
    isInProgress = periodKey === getCurrentPeriodKey(periodType)
    if (isInProgress) {
      const elapsedEnd = getElapsedRangeEnd(periodType)
      currentRange = {
        start: currentRange.start,
        end: elapsedEnd < currentRange.start ? currentRange.start : (elapsedEnd < currentRange.end ? elapsedEnd : currentRange.end),
      }
    }
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
    query.customer_id,
    branchScope,
    divisionScope,
    query.branch_id,
    query.division,
  )
  if (customerRows.length === 0) return { rows: [], total }

  const customerIds = customerRows.map(c => c.customer_id)
  const companyIds = [...new Set(customerRows.map(c => c.company_id))]

  // Pembanding — user pilih eksplisit di UI (default 'last_year'/YoY). Kalau
  // end_date dikirim (task016 §26), SELALU YoY — previous_period diabaikan,
  // halaman Analisis sekarang tidak punya dropdown Pembanding lagi.
  // YTD SENGAJA dikecualikan dari 'previous_period': range YTD selalu mulai
  // dari 1 Jan tahun berjalan, jadi "periode sebelumnya" (mundur 1 bulan di
  // tahun yang sama) menghasilkan rentang beda panjang bulan (mis. Jan-Jul
  // vs Jan-Jun) — tidak apple-to-apple. Satu-satunya pembanding yang adil
  // untuk YTD adalah YTD tahun lalu di bulan akhir yang SAMA (YoY).
  const isPreviousPeriodMode = query.comparison === 'previous_period' && periodType !== 'ytd' && !query.end_date
  const comparisonKey = isPreviousPeriodMode
    ? getPreviousPeriodKey(periodType, periodKey)
    : getYoyPeriodKey(periodType, periodKey)

  let comparisonRange = getPeriodRange(periodType, comparisonKey)
  if (query.end_date) {
    // end comparisonRange SELALU digeser -1 tahun PERSIS dari currentRange.end
    // (bukan akhir periode natural) — apple-to-apple dgn currentRange yg juga
    // dipotong ke end_date persis.
    comparisonRange = { start: comparisonRange.start, end: shiftDateByYears(currentRange.end, -1) }
  } else if (isInProgress && !isPreviousPeriodMode) {
    // Potong comparisonRange JUGA kalau currentRange lagi dipotong (in-progress,
    // fallback lama tanpa end_date) — TAPI cuma basis YoY. Basis 'previous_period'
    // TIDAK PERNAH perlu dipotong: periode sebelumnya selalu SUDAH tutup penuh
    // duluan sebelum periode berjalan dimulai (mis. Q2 selalu tutup sebelum Q3
    // mulai), jadi otomatis sudah adil.
    const [, cMonth, cDay] = currentRange.end.split('-')
    const truncatedCompEnd = `${comparisonRange.end.slice(0, 4)}-${cMonth}-${cDay}`
    if (truncatedCompEnd >= comparisonRange.start && truncatedCompEnd < comparisonRange.end) {
      comparisonRange = { ...comparisonRange, end: truncatedCompEnd }
    }
  }

  const [comparisonAggMap, thresholdRows] = await Promise.all([
    aggregateInvoicesByCustomer(customerIds, comparisonRange),
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
      comparison: buildComparison(comparisonKey, current, comparisonAggMap.get(c.customer_id), revenueThreshold, marginThreshold),
    }
  })

  return { rows, total }
}
