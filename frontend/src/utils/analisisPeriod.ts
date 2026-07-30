/**
 * utils/analisisPeriod.ts
 *
 * Helper murni untuk navigasi periode kuartal/semester/tahunan di halaman
 * Analisis (task016). Mirror logic `period.util.ts` backend — dibutuhkan versi
 * frontend sendiri untuk hitung label/navigasi tanpa round-trip ke server tiap
 * klik prev/next.
 */
import type { ParetoPeriodType } from '@/types/paretoThresholds'

function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1 // month 1-12 -> 1-4
}

function semesterOf(month: number): number {
  return month <= 6 ? 1 : 2
}

/** Periode kalender yang memuat `today` — bisa jadi periode BERJALAN (belum tutup). */
export function getCurrentPeriodKey(periodType: ParetoPeriodType, today: Date = new Date()): string {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  if (periodType === 'annual') return String(year)
  if (periodType === 'quarter') return `${year}-Q${quarterOf(month)}`
  return `${year}-S${semesterOf(month)}`
}

/** Periode terakhir yang SUDAH TUTUP penuh — default awal buka halaman. */
export function getLatestClosedPeriodKey(periodType: ParetoPeriodType, today: Date = new Date()): string {
  return getPreviousPeriodKey(periodType, getCurrentPeriodKey(periodType, today))
}

export function getPreviousPeriodKey(periodType: ParetoPeriodType, periodKey: string): string {
  if (periodType === 'annual') return String(Number(periodKey) - 1)
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

export function getNextPeriodKey(periodType: ParetoPeriodType, periodKey: string): string {
  if (periodType === 'annual') return String(Number(periodKey) + 1)
  if (periodType === 'quarter') {
    const [yearStr, qStr] = periodKey.split('-Q')
    const year = Number(yearStr)
    const q = Number(qStr)
    return q === 4 ? `${year + 1}-Q1` : `${year}-Q${q + 1}`
  }
  const [yearStr, sStr] = periodKey.split('-S')
  const year = Number(yearStr)
  const s = Number(sStr)
  return s === 2 ? `${year + 1}-S1` : `${year}-S2`
}

/** Label manusiawi, e.g. "Kuartal 2 2026" / "Semester 1 2026" / "2026". */
export function formatPeriodLabel(
  periodType: ParetoPeriodType,
  periodKey: string,
  periodTypeLabel: string, // t(`paretoThreshold.period.${periodType}`) — "Kuartal"/"Semester"/"Tahunan"
): string {
  if (periodType === 'annual') return periodKey
  if (periodType === 'quarter') {
    const [year, q] = periodKey.split('-Q')
    return `${periodTypeLabel} ${q} ${year}`
  }
  const [year, s] = periodKey.split('-S')
  return `${periodTypeLabel} ${s} ${year}`
}
