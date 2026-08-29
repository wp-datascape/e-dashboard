/**
 * period.util.ts
 *
 * Helper murni (tanpa DB) untuk resolve rentang tanggal & key periode
 * bulanan/YTD/kuartal/semester/tahunan (task016 Fase A, fitur Analisis).
 * period_key format:
 *   monthly  → "YYYY-MM"
 *   ytd      → "YYYY-MM" (year-to-date, "sampai dengan" bulan MM di tahun YYYY)
 *   quarter  → "YYYY-Q1".."YYYY-Q4"
 *   semester → "YYYY-S1"/"YYYY-S2"
 *   annual   → "YYYY"
 *
 * `monthly`/`ytd` HANYA dipakai laporan on-demand (filter di halaman
 * Analisis) — scheduler alert (`scheduler.ts`) sengaja tetap loop 3 tipe
 * periode lama saja (task016 §2, keputusan desain threshold).
 *
 * Comparison SELALU vs periode sama tahun lalu (YoY) — standar internal
 * "Metric Comparison Standard" (2026-07-30): tidak ada lagi mode QoQ/Both,
 * lihat task016 §18.
 */

export type PeriodType = 'monthly' | 'ytd' | 'quarter' | 'semester' | 'annual'

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

/**
 * Mundur 1 satuan periode — dipakai UNTUK NAVIGASI (tombol chevron di UI),
 * BUKAN untuk comparison (comparison sekarang selalu YoY, lihat getYoyPeriodKey).
 */
export function getPreviousPeriodKey(periodType: PeriodType, periodKey: string): string {
  if (periodType === 'annual') {
    return String(Number(periodKey) - 1)
  }
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

/**
 * Periode sama persis tahun lalu (YoY) — SATU-SATUNYA basis comparison yang
 * ditampilkan di laporan Analisis sekarang (Metric Comparison Standard,
 * task016 §18). Untuk annual, sama dengan getPreviousPeriodKey. Untuk ytd,
 * hasilnya tetap "sampai bulan yang sama" tahun lalu (range awal tahun ikut
 * berubah otomatis lewat getPeriodRange).
 */
export function getYoyPeriodKey(periodType: PeriodType, periodKey: string): string {
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

/** Potongan tanggal 1 s.d. `day` dalam bulan `monthKey` — dipakai Trigger A
 * mid-month (scheduler.ts) supaya perbandingan apple-to-apple (potongan hari
 * sama antara bulan berjalan vs bulan pembanding), BUKAN 1 bulan penuh. */
export function getMidMonthDayRange(monthKey: string, day: number): PeriodRange {
  const d = String(day).padStart(2, '0')
  return { start: `${monthKey}-01`, end: `${monthKey}-${d}` }
}

/** YTD (Year-to-Date) turunan dari tanggal akhir SEBUAH range — dipakai digest
 * laporan (task016 §23) sebagai basis INFORMASI TAMBAHAN (bukan trigger),
 * dihitung dari string tanggal akhir langsung supaya konsisten baik untuk
 * periode penuh (getPeriodRange) maupun potongan tanggal 14 (getMidMonthDayRange). */
export function getYtdRange(end: string): PeriodRange {
  const year = end.slice(0, 4)
  return { start: `${year}-01-01`, end }
}

/** Pembanding YTD — YTD tahun lalu, "sampai tanggal yang sama" (apple-to-apple). */
export function getYtdYoyRange(end: string): PeriodRange {
  const year = Number(end.slice(0, 4)) - 1
  return { start: `${year}-01-01`, end: `${year}${end.slice(4)}` }
}

export interface TriggerRanges {
  current: PeriodRange
  previousKey: string
  previous: PeriodRange
  yoyKey: string
  yoy: PeriodRange
  ytd: PeriodRange
  ytdYoy: PeriodRange
}

/**
 * Satu sumber kebenaran resolve SEMUA rentang tanggal 1 trigger alert (current/
 * previous/yoy/ytd/ytdYoy) dari (period_type, period_key, checkpoint) saja —
 * dipakai scheduler.ts (saat evaluasi, generate notifikasi) MAUPUN
 * notifications/pdf.service.ts (saat susun ulang caption "Pembanding: X •
 * Periode: Y" di PDF, TANPA perlu simpan string range di entity_ref — cukup
 * simpan period_type/period_key/checkpoint, ranges selalu deterministik
 * dihitung ulang dari situ, task016 §23).
 */
export function resolveTriggerRanges(
  periodType: PeriodType,
  periodKey: string,
  checkpoint: 'closed' | 'mid_month',
  midMonthDay: number,
): TriggerRanges {
  const previousKey = getPreviousPeriodKey(periodType, periodKey)
  const yoyKey = getYoyPeriodKey(periodType, periodKey)
  const rangeFor = (key: string): PeriodRange =>
    checkpoint === 'mid_month' ? getMidMonthDayRange(key, midMonthDay) : getPeriodRange(periodType, key)
  const current = rangeFor(periodKey)
  return {
    current,
    previousKey,
    previous: rangeFor(previousKey),
    yoyKey,
    yoy: rangeFor(yoyKey),
    ytd: getYtdRange(current.end),
    ytdYoy: getYtdYoyRange(current.end),
  }
}

/** Key periode yang SEDANG BERJALAN (belum tutup) relatif ke `today` — kebalikan
 * dari getLatestClosedPeriodKey. Dipakai deteksi "user lagi lihat periode
 * in-progress" (task016 §24) supaya current+comparison range bisa dipotong
 * (truncate) apple-to-apple, BUKAN buat filter default (default tetap periode
 * yang sudah tutup, lihat getLatestClosedPeriodKey). */
/** Geser tanggal (YYYY-MM-DD) mundur/maju N tahun — dipakai basis YoY di
 * halaman Analisis (task016 §26): comparisonRange = currentRange digeser -1
 * tahun persis, start MAUPUN end. Fallback ke tanggal terakhir bulan itu
 * kalau hasil geseran tidak valid (edge case 29 Feb tahun kabisat -> tahun
 * biasa, tidak ada 29 Feb). */
export function shiftDateByYears(dateStr: string, deltaYears: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const targetYear = y + deltaYears
  const maxDay = lastDayOfMonth(targetYear, m)
  return `${targetYear}-${pad2(m)}-${pad2(Math.min(d, maxDay))}`
}

export function getCurrentPeriodKey(periodType: PeriodType, today: Date = new Date()): string {
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  if (periodType === 'annual') return String(year)
  if (periodType === 'monthly' || periodType === 'ytd') return `${year}-${pad2(month)}`
  if (periodType === 'quarter') return `${year}-Q${Math.floor((month - 1) / 3) + 1}`
  return `${year}-S${month <= 6 ? 1 : 2}`
}

/**
 * Batas akhir data yang ADIL dibandingkan untuk periode yang MASIH BERJALAN
 * (in-progress) — task016 §24, permintaan user: cek Q3 yang baru jalan 1
 * bulan (Juli), pembanding Q3 tahun lalu HARUS dipotong jadi cuma Juli juga
 * (bukan Juli-September penuh), supaya tidak bandingkan data parsial vs data
 * penuh setahun lalu.
 *
 * - monthly: granularitas HARI (dipotong s.d. HARI INI) — periode itu sendiri
 *   cuma 1 bulan, tidak ada satuan "bulan penuh" di dalamnya buat dipotong.
 * - quarter/semester/annual/ytd: granularitas BULAN (dipotong s.d. akhir bulan
 *   TERAKHIR yang sudah PENUH tutup) — bulan berjalan datanya pasti belum
 *   lengkap (invoice masih bisa nambah), jangan diikutkan sama sekali.
 */
export function getElapsedRangeEnd(periodType: PeriodType, today: Date = new Date()): string {
  if (periodType === 'monthly') {
    return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  }
  const currentMonth = today.getMonth() + 1
  const currentYear = today.getFullYear()
  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear
  return `${prevYear}-${pad2(prevMonth)}-${pad2(lastDayOfMonth(prevYear, prevMonth))}`
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

  if (periodType === 'monthly' || periodType === 'ytd') {
    return month === 1 ? `${year - 1}-12` : `${year}-${pad2(month - 1)}`
  }

  if (periodType === 'quarter') {
    const currentQ = Math.floor((month - 1) / 3) + 1
    return currentQ === 1 ? `${year - 1}-Q4` : `${year}-Q${currentQ - 1}`
  }

  const currentS = month <= 6 ? 1 : 2
  return currentS === 1 ? `${year - 1}-S2` : `${year}-S1`
}
