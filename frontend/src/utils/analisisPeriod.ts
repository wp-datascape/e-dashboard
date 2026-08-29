/**
 * utils/analisisPeriod.ts
 *
 * Helper murni untuk navigasi periode bulanan/kuartal/semester/tahunan di
 * halaman Analisis (task016). Mirror logic `period.util.ts` backend —
 * dibutuhkan versi frontend sendiri untuk hitung label/navigasi tanpa
 * round-trip ke server tiap klik prev/next.
 */
import type { AnalisisPeriodType } from '@/types/analisis'

function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

function quarterOf(month: number): number {
  return Math.floor((month - 1) / 3) + 1 // month 1-12 -> 1-4
}

function semesterOf(month: number): number {
  return month <= 6 ? 1 : 2
}

function quarterMonths(q: number): [number, number] {
  const start = (q - 1) * 3 + 1
  return [start, start + 2]
}

function semesterMonths(s: number): [number, number] {
  return s === 1 ? [1, 6] : [7, 12]
}

function lastDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

/** Periode kalender yang memuat `today` — bisa jadi periode BERJALAN (belum tutup). */
export function getCurrentPeriodKey(periodType: AnalisisPeriodType, today: Date = new Date()): string {
  const year = today.getFullYear()
  const month = today.getMonth() + 1
  if (periodType === 'annual') return String(year)
  if (periodType === 'monthly' || periodType === 'ytd') return `${year}-${pad2(month)}`
  if (periodType === 'quarter') return `${year}-Q${quarterOf(month)}`
  return `${year}-S${semesterOf(month)}`
}

/** Periode terakhir yang SUDAH TUTUP penuh — default awal buka halaman. */
export function getLatestClosedPeriodKey(periodType: AnalisisPeriodType, today: Date = new Date()): string {
  return getPreviousPeriodKey(periodType, getCurrentPeriodKey(periodType, today))
}

/**
 * Batas akhir data yang ADIL dibandingkan untuk periode yang MASIH BERJALAN
 * (in-progress) — mirror `period.util.ts` backend `getElapsedRangeEnd`
 * (task016 §24). Dipakai halaman Analisis buat potong caption "Pembanding:
 * X • Periode: Y" SUPAYA SAMA dengan angka yang benar-benar dihitung backend
 * (backend sudah potong currentRange/comparisonRange-nya sendiri) — kalau
 * cuma backend yang dipotong tapi caption di sini tidak, teks yang tampil
 * jadi menyesatkan (bilang "1 Jul - 30 Sep" padahal datanya cuma sampai Juli).
 */
export function getElapsedRangeEnd(periodType: AnalisisPeriodType, today: Date = new Date()): string {
  if (periodType === 'monthly') {
    return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  }
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  return `${prevYear}-${pad2(prevMonth)}-${pad2(lastDayOfMonth(prevYear, prevMonth))}`
}

/** Geser tanggal (YYYY-MM-DD) mundur/maju N tahun — mirror `period.util.ts`
 * backend `shiftDateByYears`. Dipakai hitung caption "Pembanding" (task016
 * §26 — filter Pembanding dihapus, SELALU YoY, digeser -1 tahun persis dari
 * tanggal "Tanggal" yang dipilih user). */
export function shiftDateByYears(dateStr: string, deltaYears: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetYear = y + deltaYears
  const maxDay = lastDayOfMonth(targetYear, m)
  return `${targetYear}-${pad2(m)}-${pad2(Math.min(d, maxDay))}`
}

const PERIOD_STEP_MONTHS: Record<AnalisisPeriodType, number> = {
  monthly: 1, ytd: 1, quarter: 3, semester: 6, annual: 12,
}

/** Geser tanggal filter "Tanggal" mundur/maju 1 satuan periodType (1 bulan
 * utk Bulanan/YTD, 3 bulan Kuartal, 6 bulan Semester, 12 bulan Tahunan) —
 * dipakai tombol chevron prev/next (task016 §26, ganti navigasi period_key
 * lama yang sekarang sudah tidak dipakai halaman Analisis). */
export function shiftEndDate(periodType: AnalisisPeriodType, dateStr: string, direction: 1 | -1): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const totalMonths = y * 12 + (m - 1) + direction * PERIOD_STEP_MONTHS[periodType]
  const targetYear = Math.floor(totalMonths / 12)
  const targetMonth = (totalMonths % 12) + 1
  const maxDay = lastDayOfMonth(targetYear, targetMonth)
  return `${targetYear}-${pad2(targetMonth)}-${pad2(Math.min(d, maxDay))}`
}

export function getPreviousPeriodKey(periodType: AnalisisPeriodType, periodKey: string): string {
  if (periodType === 'annual') return String(Number(periodKey) - 1)
  if (periodType === 'monthly' || periodType === 'ytd') {
    const [yearStr, monthStr] = periodKey.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    return month === 1 ? `${year - 1}-12` : `${year}-${pad2(month - 1)}`
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

export function getNextPeriodKey(periodType: AnalisisPeriodType, periodKey: string): string {
  if (periodType === 'annual') return String(Number(periodKey) + 1)
  if (periodType === 'monthly' || periodType === 'ytd') {
    const [yearStr, monthStr] = periodKey.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    return month === 12 ? `${year + 1}-01` : `${year}-${pad2(month + 1)}`
  }
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

/** Periode sama persis tahun lalu (YoY) — basis comparison satu-satunya di laporan Analisis (task016 §18). */
export function getYoyPeriodKey(periodType: AnalisisPeriodType, periodKey: string): string {
  if (periodType === 'annual') return getPreviousPeriodKey(periodType, periodKey)
  if (periodType === 'monthly' || periodType === 'ytd') {
    const [yearStr, monthStr] = periodKey.split('-')
    return `${Number(yearStr) - 1}-${monthStr}`
  }
  if (periodType === 'quarter') {
    const [yearStr, qStr] = periodKey.split('-Q')
    return `${Number(yearStr) - 1}-Q${qStr}`
  }
  const [yearStr, sStr] = periodKey.split('-S')
  return `${Number(yearStr) - 1}-S${sStr}`
}

const MONTH_NAMES_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
]

/**
 * Label periode, format rapi (revisi 2026-07-31):
 *   monthly  → "Juni 2026"
 *   ytd      → "s.d. Juni 2026"
 *   quarter  → "Kuartal (2) Tahun 2026"
 *   semester → "Semester (1) Tahun 2026"
 *   annual   → "2026"
 */
export function formatPeriodLabel(periodType: AnalisisPeriodType, periodKey: string): string {
  if (periodType === 'annual') return periodKey
  if (periodType === 'monthly') {
    const [year, month] = periodKey.split('-')
    return `${MONTH_NAMES_ID[Number(month) - 1]} ${year}`
  }
  if (periodType === 'ytd') {
    const [year, month] = periodKey.split('-')
    return `s.d. ${MONTH_NAMES_ID[Number(month) - 1]} ${year}`
  }
  if (periodType === 'quarter') {
    const [year, q] = periodKey.split('-Q')
    return `Kuartal (${q}) Tahun ${year}`
  }
  const [year, s] = periodKey.split('-S')
  return `Semester (${s}) Tahun ${year}`
}

export interface PeriodDateRange {
  start: string // YYYY-MM-DD, inklusif
  end: string   // YYYY-MM-DD, inklusif
}

/** Rentang tanggal aktual dari period_key — mirror `period.util.ts` backend. */
export function getPeriodDateRange(periodType: AnalisisPeriodType, periodKey: string): PeriodDateRange {
  if (periodType === 'annual') {
    const year = Number(periodKey)
    return { start: `${year}-01-01`, end: `${year}-12-31` }
  }
  if (periodType === 'monthly') {
    const [yearStr, monthStr] = periodKey.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    return {
      start: `${year}-${pad2(month)}-01`,
      end: `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`,
    }
  }
  if (periodType === 'ytd') {
    const [yearStr, monthStr] = periodKey.split('-')
    const year = Number(yearStr)
    const month = Number(monthStr)
    return {
      start: `${year}-01-01`,
      end: `${year}-${pad2(month)}-${pad2(lastDayOfMonth(year, month))}`,
    }
  }
  if (periodType === 'quarter') {
    const [yearStr, qStr] = periodKey.split('-Q')
    const year = Number(yearStr)
    const [startMonth, endMonth] = quarterMonths(Number(qStr))
    return {
      start: `${year}-${pad2(startMonth)}-01`,
      end: `${year}-${pad2(endMonth)}-${pad2(lastDayOfMonth(year, endMonth))}`,
    }
  }
  const [yearStr, sStr] = periodKey.split('-S')
  const year = Number(yearStr)
  const [startMonth, endMonth] = semesterMonths(Number(sStr))
  return {
    start: `${year}-${pad2(startMonth)}-01`,
    end: `${year}-${pad2(endMonth)}-${pad2(lastDayOfMonth(year, endMonth))}`,
  }
}

/** "1-30 Juni 2026" / "1 Jan - 31 Mar 2026" — rentang tanggal manusiawi. Semua tipe periode Analisis selalu dalam 1 tahun kalender, jadi tahun cukup ditulis sekali di akhir. */
export function formatDateRange(range: PeriodDateRange): string {
  const [sy, sm, sd] = range.start.split('-').map(Number)
  const [, em, ed] = range.end.split('-').map(Number)
  if (sm === em) return `${sd}–${ed} ${MONTH_NAMES_ID[sm - 1]} ${sy}`
  return `${sd} ${MONTH_NAMES_ID[sm - 1]} – ${ed} ${MONTH_NAMES_ID[em - 1]} ${sy}`
}
