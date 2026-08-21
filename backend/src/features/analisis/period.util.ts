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

/**
 * Potong akhir periode ke titik yang ADIL kalau periode itu (atau padanan
 * tahun-nya, buat YoY) masih berjalan relatif ke HARI INI — supaya current
 * & pembanding YoY tetap apple-to-apple dan TIDAK tampil 0/kosong di tengah
 * periode (task029.md §30, instruksi user 2026-08-20: "pakai data per
 * tanggal hari ini untuk cutoff, begitu juga data pembanding YoY nya").
 *
 * Bekerja TANPA perlu tahu apakah request ini "current" atau "YoY" — cukup
 * dari tahun di `periodKey` sendiri: kalau periodKey 1 tahun sebelum tahun
 * berjalan (kasus YoY), "hari ini" ikut digeser mundur setahun juga sebagai
 * referensi, jadi otomatis konsisten dengan current-nya tanpa parameter
 * tambahan dari caller. Periode yang SUDAH TUTUP penuh (calendarEnd sudah
 * lewat referensi "hari ini" versi periode itu) TIDAK terpotong sama sekali
 * — tetap tampil penuh, cuma periode yang genuinely masih berjalan yang kena
 * potong. Contoh: hari ini 2026-08-19, filter Kuartalan Q3 2026 (calendarEnd
 * 2026-09-30, masih berjalan) → dipotong ke 2026-08-19. Pembanding YoY-nya
 * Q3 2025 (calendarEnd 2025-09-30) → yearsBack=1 → referensi "hari ini"
 * digeser ke 2025-08-19 → dipotong ke 2025-08-19 juga (apple-to-apple, sama
 * "sejauh mana" ke dalam periode). Q1 2026 yang sudah tutup (calendarEnd
 * 2026-03-31, sudah lewat) TIDAK kena potong — tetap tampil 1 kuartal penuh.
 */
/**
 * "Hari ini" yang digeser mundur sejumlah tahun = (tahun `today` − `year`) —
 * dipakai `clampToElapsedEnd`/`clampEndToDay` supaya request YoY (periodKey/
 * bucket-nya tahun lalu) otomatis dapat referensi "sejauh mana" yang SAMA
 * dengan request current-nya, TANPA caller perlu bilang eksplisit "ini
 * current" atau "ini YoY" — cukup dari selisih tahun `year` itu sendiri.
 */
function referenceNowForYear(year: number, today: Date): string {
  const yearsBack = today.getFullYear() - year
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  return shiftDateByYears(todayStr, -yearsBack)
}

// BUG ditemukan 2026-08-21 (user klik titik Desember 2025 di chart trend M2 —
// popup drill-down 0 customer aktif, padahal invoice Des 2025 ada 12678+404):
// `referenceNowForYear` cuma bandingin TAHUN periodKey vs tahun `today` buat
// nebak "apa ini current period atau padanan YoY-nya" — periodKey="2025-12"
// (Desember, SUDAH TUTUP 8 bulan) kena dianggap "yearsBack=1" krn tahunnya
// beda 1 dari today (2026), lalu di-cap ke "21 Agustus 2025" (referenceNow),
// yang JATUH SEBELUM periodStart Desember (1 Des 2025) → range invoice_date
// >= 1-Des-2025 AND <= 21-Ags-2025 jadi TERBALIK/mustahil → 0 baris. Fix:
// hanya boleh di-clamp kalau periodKey itu MEMANG current period ATAU
// padanan YoY-nya (geser tahunnya ke tahun `today`, hasilnya harus PERSIS
// sama dgn `getCurrentPeriodKey`) — bulan/kuartal/semester ikut dicek, tidak
// cuma tahun. Periode lampau sembarang (drill-down klik titik chart) selalu
// lolos tanpa clamp, sesuai niat awal komentar "periode yang sudah tutup
// tidak kena potong sama sekali".
export function clampToElapsedEnd(periodKey: string, calendarEnd: string, periodType: PeriodType, today: Date = new Date()): string {
  const periodYear = Number(periodKey.slice(0, 4))
  if (!periodYear) return calendarEnd
  const shiftedToThisYear = `${today.getFullYear()}${periodKey.slice(4)}`
  if (shiftedToThisYear !== getCurrentPeriodKey(periodType, today)) return calendarEnd
  const referenceNow = referenceNowForYear(periodYear, today)
  return calendarEnd > referenceNow ? referenceNow : calendarEnd
}

/**
 * Potong tanggal akhir SEBUAH periode ke hari ke-D bulan yang sama (dibatasi
 * hari terakhir bulan itu kalau D lebih besar) — dipakai mode "Apply date
 * cutoff" (task029.md §30, instruksi user 2026-08-20): user pilih hari
 * spesifik lewat date picker, SEMUA titik trend dipotong ke hari yang sama
 * setiap bulannya (mis. analisis "20 hari pertama tiap bulan, 12 bulan
 * terakhir") — BUKAN behavior default (`clampToElapsedEnd` di atas, yang
 * cuma memotong titik yang SEDANG berjalan, periode yang sudah tutup tetap
 * penuh). Ini mode terpisah, eksplisit dipilih user, bukan pengganti default.
 *
 * PENTING (bug ditemukan 2026-08-20 lewat pertanyaan user "apakah ini bekerja
 * untuk kuartalan/semesteran/tahunan?"): untuk granularitas > bulanan, bucket
 * `periodEnd` yang masuk ke sini adalah AKHIR KALENDER bulan TERAKHIR periode
 * itu (mis. Kuartal 3 → 30 September) — kalau periode itu SEDANG BERJALAN,
 * bulan terakhirnya bisa jadi bulan yang BELUM TERJADI SAMA SEKALI (hari ini
 * baru Agustus, bulan September belum mulai), jadi "hari ke-20 bulan itu"
 * jadi tanggal masa depan yang tidak masuk akal (hasilnya 0/kosong). Makanya
 * hasil akhirnya di-cap ke `referenceNowForYear` juga (sama seperti
 * `clampToElapsedEnd`) — periode yang SUDAH TUTUP tidak terdampak (hasil
 * clamp-nya sudah otomatis di masa lalu), cuma periode yang MASIH BERJALAN
 * yang kena batasi ke hari ini (atau padanan tahun-nya buat YoY).
 *
 * Fix sama seperti `clampToElapsedEnd` (bug 2026-08-21) — cap ke
 * `referenceNowForYear` cuma valid buat bucket yang MEMANG current period
 * atau padanan YoY-nya (dicek dari `periodKey`+`periodType` bucket itu, bukan
 * cuma tahun `periodEnd`) — bucket lampau sembarang (mis. Desember tahun
 * lalu di mode Apply date cutoff) harus lolos apa adanya, tidak boleh ikut
 * ke-cap ke tanggal yang jatuh SEBELUM bucket itu bahkan mulai.
 */
export function clampEndToDay(periodEnd: string, day: number, periodKey: string, periodType: PeriodType, today: Date = new Date()): string {
  const [y, m] = periodEnd.split('-').map(Number)
  const lastDay = lastDayOfMonth(y, m)
  const d = Math.min(day, lastDay)
  const clamped = `${y}-${pad2(m)}-${pad2(d)}`
  const shiftedToThisYear = `${today.getFullYear()}${periodKey.slice(4)}`
  if (shiftedToThisYear !== getCurrentPeriodKey(periodType, today)) return clamped
  const referenceNow = referenceNowForYear(y, today)
  return clamped > referenceNow ? referenceNow : clamped
}

export function getCurrentPeriodKey(periodType: PeriodType, today: Date = new Date()): string {
  const year = today.getFullYear()
  const month = today.getMonth() + 1

  if (periodType === 'annual') return String(year)
  if (periodType === 'monthly' || periodType === 'ytd') return `${year}-${pad2(month)}`
  if (periodType === 'quarter') return `${year}-Q${Math.floor((month - 1) / 3) + 1}`
  return `${year}-S${month <= 6 ? 1 : 2}`
}

export interface TrailingPeriodBucket {
  /** period_key ('YYYY-MM'/'YYYY-QN'/'YYYY-SN'/'YYYY') — dipakai sebagai label titik trend chart. */
  label: string
  /** Tanggal awal periode itu (YYYY-MM-DD), inklusif, SELALU batas kalender
   * (task029.md §30.10 — 1 Jan/1 Apr/1 Jul/1 Okt dst, tidak pernah digeser/
   * dipotong apa pun kondisinya, beda dari `end`). Dipakai sbg acuan New/
   * Existing per-bucket (§30.10) DAN lower-bound rentang transaksi. */
  start: string
  /** Tanggal akhir periode itu (YYYY-MM-DD), inklusif — dipakai sbg cutoff query per bucket.
   * BISA dipotong (elapsed/day-cutoff) oleh service layer, beda dari `start`. */
  end: string
}

/**
 * N periode berurutan MUNDUR dari `currentKey` (termasuk currentKey sendiri
 * sebagai titik terakhir) — generalisasi trend chart "12 periode terakhir,
 * mengikuti granularitas filter" (task029.md §28.3/§30.1) supaya SATU fungsi
 * ini dipakai semua KPI (M1-M10) yang butuh N-titik trend per granularitas,
 * BUKAN ditulis ulang generate_series hardcode-bulanan di tiap repository
 * (§30.4 — "REUSE ini, jangan tulis ulang").
 *
 * Dipakai oleh SERVICE layer (bukan repository) — hasilnya array {label,end}
 * dikirim ke repository sbg parameter query mentah (VALUES list), repository
 * TIDAK menghitung tanggal periode sendiri (business logic tetap di service,
 * lihat CRITICAL_RULES.md pembagian layer).
 */
export function buildTrailingPeriods(periodType: PeriodType, currentKey: string, count: number): TrailingPeriodBucket[] {
  const keys: string[] = [currentKey]
  let key = currentKey
  for (let i = 1; i < count; i++) {
    key = getPreviousPeriodKey(periodType, key)
    keys.unshift(key)
  }
  return keys.map((k) => {
    const range = getPeriodRange(periodType, k)
    return { label: k, start: range.start, end: range.end }
  })
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
