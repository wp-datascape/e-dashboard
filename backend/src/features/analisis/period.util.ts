/**
 * period.util.ts
 *
 * Helper murni (tanpa DB) untuk resolve rentang tanggal & key periode
 * kuartal/semester/tahunan (task016 Fase A, fitur Analisis). period_key format:
 *   quarter  → "YYYY-Q1".."YYYY-Q4"
 *   semester → "YYYY-S1"/"YYYY-S2"
 *   annual   → "YYYY"
 */

export type PeriodType = 'quarter' | 'semester' | 'annual'

export interface PeriodRange {
  start: string // YYYY-MM-DD, inklusif
  end: string   // YYYY-MM-DD, inklusif
}

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function lastDayOfMonth(year: number, month: number): number {
  // month 1-12, hari terakhir bulan itu
  return new Date(year, month, 0).getDate()
}

function quarterMonths(q: number): [number, number] {
  const start = (q - 1) * 3 + 1
  return [start, start + 2]
}

function semesterMonths(s: number): [number, number] {
  return s === 1 ? [1, 6] : [7, 12]
}

export function getPeriodRange(periodType: PeriodType, periodKey: string): PeriodRange {
  if (periodType === 'annual') {
    const year = Number(periodKey)
    return { start: `${year}-01-01`, end: `${year}-12-31` }
  }

  if (periodType === 'quarter') {
    const [yearStr, qStr] = periodKey.split('-Q')
    const year = Number(yearStr)
    const q = Number(qStr)
    const [startMonth, endMonth] = quarterMonths(q)
    return {
      start: `${year}-${pad2(startMonth)}-01`,
      end: `${year}-${pad2(endMonth)}-${pad2(lastDayOfMonth(year, endMonth))}`,
    }
  }

  // semester
  const [yearStr, sStr] = periodKey.split('-S')
  const year = Number(yearStr)
  const s = Number(sStr)
  const [startMonth, endMonth] = semesterMonths(s)
  return {
    start: `${year}-${pad2(startMonth)}-01`,
    end: `${year}-${pad2(endMonth)}-${pad2(lastDayOfMonth(year, endMonth))}`,
  }
}

/** Periode sejenis sebelumnya (QoQ/SoS) — quarter/semester mundur 1, tahun ikut kalau perlu. */
export function getPreviousPeriodKey(periodType: PeriodType, periodKey: string): string {
  if (periodType === 'annual') {
    return String(Number(periodKey) - 1)
  }
  if (periodType === 'quarter') {
    const [yearStr, qStr] = periodKey.split('-Q')
    const year = Number(yearStr)
    const q = Number(qStr)
    return q === 1 ? `${year - 1}-Q4` : `${year}-Q${q - 1}`
  }
  const [yearStr, sStr] = periodKey.split('-S')
  const year = Number(yearStr)
  const s = Number(sStr)
  return s === 1 ? `${year - 1}-S2` : `${year}-S1`
}

/** Periode sama persis tahun lalu (YoY) — untuk annual, sama dengan getPreviousPeriodKey. */
export function getYoyPeriodKey(periodType: PeriodType, periodKey: string): string {
  if (periodType === 'annual') return getPreviousPeriodKey(periodType, periodKey)
  if (periodType === 'quarter') {
    const [yearStr, qStr] = periodKey.split('-Q')
    return `${Number(yearStr) - 1}-Q${qStr}`
  }
  const [yearStr, sStr] = periodKey.split('-S')
  return `${Number(yearStr) - 1}-S${sStr}`
}

/**
 * Periode terakhir yang SUDAH TUTUP penuh relatif ke `today` (default hari ini)
 * — dipakai sebagai default kalau user tidak pilih periode eksplisit di UI.
 * Periode yang masih berjalan tidak adil dibandingkan (belum penuh sebulan/dst).
 */
export function getLatestClosedPeriodKey(periodType: PeriodType, today: Date = new Date()): string {
  const year = today.getFullYear()
  const month = today.getMonth() + 1 // 1-12

  if (periodType === 'annual') {
    return String(year - 1)
  }

  if (periodType === 'quarter') {
    const currentQ = Math.floor((month - 1) / 3) + 1
    return currentQ === 1 ? `${year - 1}-Q4` : `${year}-Q${currentQ - 1}`
  }

  const currentS = month <= 6 ? 1 : 2
  return currentS === 1 ? `${year - 1}-S2` : `${year}-S1`
}
