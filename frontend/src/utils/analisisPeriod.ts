/**
 * utils/analisisPeriod.ts
 *
 * Helper murni untuk navigasi periode bulanan/kuartal/semester/tahunan di
 * halaman Analisis (task016). Mirror logic `period.util.ts` backend —
 * dibutuhkan versi frontend sendiri untuk hitung label/navigasi tanpa
 * round-trip ke server tiap klik prev/next.
 */
import type { AnalisisPeriodType } from '@/types/analisis'
import type { ParetoPeriodType } from '@/types/paretoThresholds'

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

/** `period_end` utk fetch pembanding MoM (periode LANGSUNG SEBELUMNYA,
 * granularitas-aware) — mirror `shiftDateByYears` (YoY) tapi anchor ke
 * PERIODE, bukan geser tanggal mentah (2026-08-23, task029.md §31, dipakai
 * Top 5 M1/M2 supaya basisnya SAMA dgn Top Movers M7). Reuse
 * `getPreviousPeriodKey`+`getPeriodDateRange` yang sudah ada — periode
 * sebelumnya SELALU sudah tutup penuh (relatif ke periode yang sedang
 * dilihat), jadi aman pakai akhir kalendernya apa adanya, tidak perlu
 * elapsed-day-anchor spt fix cutoff_day (itu urusan mode "Apply date
 * cutoff", beda konteks dari fetch pembanding Top 5 ini). */
export function getMomComparisonPeriodEnd(periodType: AnalisisPeriodType, periodEnd: string): string {
  const [y, m, d] = periodEnd.split('-').map(Number)
  const periodKey = getCurrentPeriodKey(periodType, new Date(y, m - 1, d))
  const prevKey = getPreviousPeriodKey(periodType, periodKey)
  return getPeriodDateRange(periodType, prevKey).end
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
    return `Kuartal ${q} Tahun ${year}`
  }
  const [year, s] = periodKey.split('-S')
  return `Semester ${s} Tahun ${year}`
}

/**
 * Label periode KOMPAK — dipakai tick axis chart (task029.md §30, 2026-08-20)
 * yang ruangnya sempit, beda dari `formatPeriodLabel` (versi panjang, dipakai
 * caption/header). Mirror `formatMonthLabel` (utils/date.ts) tapi generalized
 * ke 4 granularitas:
 *   monthly  → "Agu 26"
 *   quarter  → "Q3 26"
 *   semester → "S1 26"
 *   annual   → "2026"
 */
export function formatPeriodLabelShort(periodType: AnalisisPeriodType, periodKey: string): string {
  if (periodType === 'annual') return periodKey
  if (periodType === 'monthly' || periodType === 'ytd') {
    const [year, month] = periodKey.split('-')
    const y = Number(year)
    const m = Number(month)
    if (!y || !m) return periodKey
    const d = new Date(y, m - 1, 1)
    return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
  }
  if (periodType === 'quarter') {
    const [year, q] = periodKey.split('-Q')
    return `Q${q} ${year.slice(2)}`
  }
  const [year, s] = periodKey.split('-S')
  return `S${s} ${year.slice(2)}`
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

/**
 * Potong tanggal akhir periode ke HARI INI kalau `periodKey` yang diklik
 * adalah periode SAAT INI yang masih berjalan (in-progress) — mirror
 * `clampToElapsedEnd` backend (period.util.ts). Bug (2026-08-22, user:
 * "data di pop up ... sumber atau filtering-nya tidak sama dengan data
 * dalam tabel"): `getPeriodDateRange()` cuma kalkulator kalender murni
 * (Agustus SELALU dianggap berakhir tgl 31, tidak tahu hari ini baru
 * tgl berapa) — klik bar bulan berjalan (mis. Agustus, hari ini baru
 * tgl 22) buka drill-down "per 31 Agustus" (9 hari ke MASA DEPAN),
 * sementara tabel breakdown utama di halaman yang sama defaultnya "per
 * hari ini". 2 sumber data yang seharusnya identik (sama-sama "periode
 * berjalan saat ini") jadi query dengan `period_end` beda, hasilnya
 * beda (window "previous" ikut bergeser, bukan cuma soal invoice masa
 * depan yang kosong). Dipakai di onBarClick M2AvgCategory.tsx dan
 * M7ExpansionGrowth.tsx — klik bar PERIODE LAMPAU (sudah tutup) TIDAK
 * kena clamp ini (rawEnd-nya memang sudah <= hari ini secara alami).
 */
export function clampPeriodEndToToday(
  periodType: AnalisisPeriodType,
  periodKey: string,
  rawEnd: string,
  today: Date = new Date(),
): string {
  if (periodKey !== getCurrentPeriodKey(periodType, today)) return rawEnd
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  return rawEnd < todayStr ? rawEnd : todayStr
}

/**
 * Potong tanggal akhir periode ke HARI KE-D (dihitung dari AWAL periode) —
 * mirror `clampEndToDay` backend (period.util.ts, fix 2026-08-23: hari ke-D
 * dari bulan AKHIR kalender itu salah utk granularitas non-bulanan, harus
 * dari awal periode). Dipakai drill-down (klik titik chart) saat mode
 * "Apply date cutoff" AKTIF — sebelumnya drill-down M7 cuma pakai
 * `clampPeriodEndToToday` (elapsed clamp default), sama sekali tidak
 * memperhitungkan cutoff_day, jadi popup-nya tetap tampil "s/d hari ini"
 * walau toggle cutoff sudah aktif & filter tanggal lain di halaman sudah
 * benar (bug dilaporkan user 2026-08-23).
 */
/**
 * Hari ke-berapa (1-indexed) sebuah TANGGAL itu, DIHITUNG DARI AWAL PERIODE
 * AKTIF — bukan angka tanggal mentah 1-31. Mirror backend
 * `daysSincePeriodStart` (period.util.ts, 2026-08-23 — laporan user: cutoff
 * "13 Agustus" di granularitas Kuartal/Semester/Tahun malah menarik data
 * 1-13 Juli/Januari, krn dulu angka tanggal MENTAH (13) yang dikirim sbg
 * `day`, diterapkan balik ke bulan PERTAMA periode manapun — bukan ke bulan
 * tempat tanggal itu sebenarnya dipilih). WAJIB dipakai (bukan
 * `dateStr.split('-')[2]` mentah) tiap kali menghitung `day`/`cutoff_day`
 * utk `clampPeriodEndToDay` di bawah ATAU `DrilldownPeriodParams.cutoff_day`.
 */
export function daysSincePeriodStart(periodStart: string, dateStr: string): number {
  const [sy, sm, sd] = periodStart.split('-').map(Number)
  const [dy, dm, dd] = dateStr.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const target = new Date(dy, dm - 1, dd)
  return Math.round((target.getTime() - start.getTime()) / 86400000) + 1
}

export function clampPeriodEndToDay(
  periodType: AnalisisPeriodType,
  periodKey: string,
  periodStart: string,
  periodEnd: string,
  day: number,
  today: Date = new Date(),
): string {
  const [y, m, d0] = periodStart.split('-').map(Number)
  const candidate = new Date(y, m - 1, d0 + (day - 1))
  const candidateStr = `${candidate.getFullYear()}-${pad2(candidate.getMonth() + 1)}-${pad2(candidate.getDate())}`
  const clamped = candidateStr > periodEnd ? periodEnd : candidateStr
  if (periodKey !== getCurrentPeriodKey(periodType, today)) return clamped
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  return clamped > todayStr ? todayStr : clamped
}

/** "1-30 Juni 2026" / "1 Jan - 31 Mar 2026" — rentang tanggal manusiawi. Semua tipe periode Analisis selalu dalam 1 tahun kalender, jadi tahun cukup ditulis sekali di akhir. */
export function formatDateRange(range: PeriodDateRange): string {
  const [sy, sm, sd] = range.start.split('-').map(Number)
  const [, em, ed] = range.end.split('-').map(Number)
  if (sm === em) return `${sd}–${ed} ${MONTH_NAMES_ID[sm - 1]} ${sy}`
  return `${sd} ${MONTH_NAMES_ID[sm - 1]} – ${ed} ${MONTH_NAMES_ID[em - 1]} ${sy}`
}

/** Params yang WAJIB dikirim tiap fetch drilldown (klik-titik chart) ke
 * backend — mirror `ResolveTrendPeriodParams` di backend `period.util.ts`.
 * Dibuat SATU kali dari state filter halaman (bukan diturunkan ulang per
 * hook) — lihat `buildDrilldownPeriodParams`. */
export interface DrilldownPeriodParams {
  // ParetoPeriodType (bukan AnalisisPeriodType) — 'ytd' TIDAK termasuk, sama
  // seperti `crossSellingQuerySchema` backend (khusus Analisis/task016, tidak
  // relevan buat KPI Growth/Retention/Value yang punya drilldown).
  period_type: ParetoPeriodType
  apply_date_cutoff: boolean
  cutoff_day: number
  skip_elapsed_clamp: true
}

/**
 * SATU fungsi pusat yang merakit params drilldown dari state filter halaman
 * — dipakai SEMUA hook drilldown (M2 `useCrossSellingDetail` sekarang, dan
 * KPI lain berikutnya yang butuh pola serupa) lewat SATU pemanggilan, BUKAN
 * tiap komponen halaman menurunkan `cutoff_day`/`skip_elapsed_clamp` sendiri²
 * (2026-08-23, koreksi user: "filter ini fungsinya harus global... kalau
 * [diturunkan ulang di tiap fungsi] akan rawan bug di metric KPI lainnya").
 *
 * `cutoff_day` SENGAJA diambil dari `pageriodEnd` (tanggal FILTER HALAMAN),
 * BUKAN dari titik yang diklik user — drilldown mengirim `period_end`-nya
 * sendiri (tanggal akhir bucket yang diklik, mis. akhir semester lalu),
 * yang HARINYA beda dari hari filter halaman (mis. hari ini tgl 23) — kalau
 * cutoff_day ikut dari titik yang diklik, "dipotong" ke hari ITU SENDIRI,
 * tidak berefek apa pun (lihat komentar backend `resolveTrendPeriod`).
 * Dihitung via `daysSincePeriodStart` (2026-08-23, fix lanjutan — bukan
 * lagi angka tanggal mentah `pageriodEnd.split('-')[2]`, lihat JSDoc
 * fungsi itu kenapa: salah utk granularitas Kuartal/Semester/Tahun kalau
 * tanggal yg dipilih user jatuh di bulan ke-2/3 periode).
 *
 * `skip_elapsed_clamp` SELALU `true` — drilldown TIDAK PERNAH boleh ikut
 * clamp otomatis default (`clampToElapsedEnd`, backend), walau `apply_date_
 * cutoff` OFF — backend `resolveTrendPeriod` mengecek apply_date_cutoff
 * LEBIH DULU (prioritas lebih tinggi), jadi flag ini aman selalu true, tidak
 * menimpa toggle eksplisit user.
 */
export function buildDrilldownPeriodParams(
  periodType: ParetoPeriodType,
  pageriodEnd: string,
  applyDateCutoff: boolean,
): DrilldownPeriodParams {
  const [py, pm, pd] = pageriodEnd.split('-').map(Number)
  const pageriodKey = getCurrentPeriodKey(periodType, new Date(py, pm - 1, pd))
  const pageriodStart = getPeriodDateRange(periodType, pageriodKey).start
  return {
    period_type: periodType,
    apply_date_cutoff: applyDateCutoff,
    cutoff_day: daysSincePeriodStart(pageriodStart, pageriodEnd),
    skip_elapsed_clamp: true,
  }
}
