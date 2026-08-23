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
 * Potong akhir periode ke HARI INI, HANYA kalau periode itu SENDIRI (bukan
 * padanan tahun lalunya) yang genuinely masih berjalan — supaya tidak
 * tampil 0/kosong di tengah periode (data invoice memang belum ada untuk
 * tanggal yang belum terjadi).
 *
 * REVISI (2026-08-23, koreksi user: "kalau filter date cutoff tidak aktif,
 * seharusnya SECARA GLOBAL fetch data periode PENUH — memang jadi tidak
 * apple-to-apple, tapi datanya tetap VALID, dan justru karena itu kita buat
 * filter TAMBAHAN 'Apply date cutoff' [utk kasus user MEMANG mau apple-to-
 * apple]") — versi SEBELUMNYA fungsi ini JUGA otomatis memotong padanan
 * YoY (tahun lalu, same periodKey suffix) SUPAYA "apple-to-apple", TANPA
 * user perlu aktifkan toggle apa pun. Itu SALAH KONSEP: pemotongan otomatis
 * yang tidak diminta itu MENYEMBUNYIKAN data valid (mis. KpiHeader teks
 * "Semester 2 Tahun 2025" nunjuk 1.583 customer padahal datanya yang benar
 * penuh 1 semester = 2.655 customer) — dan justru membuat toggle "Apply
 * date cutoff" jadi ambigu/redundan (2 mekanisme beda diam-diam melakukan
 * hal serupa). SEKARANG: fungsi ini CUMA memotong kalau periodKey PERSIS
 * periode yang sedang berjalan sekarang (yearsBack === 0) — padanan YoY
 * ATAU periode lampau mana pun (termasuk yang kebetulan berbagi suffix
 * period-type yang sama, mis. beberapa S2 di tahun berbeda — bug lama,
 * lihat riwayat git kalau perlu) TIDAK PERNAH lagi otomatis dipotong.
 * Kalau user MEMANG mau perbandingan apple-to-apple (current vs YoY sama-
 * sama dipotong ke titik elapsed yang sama), itu SEKARANG cuma lewat toggle
 * eksplisit "Apply date cutoff" (`clampEndToDay`, dipanggil terpisah).
 *
 * Contoh: hari ini 2026-08-23, filter Semester 2 2026 (calendarEnd
 * 2026-12-31, masih berjalan) → dipotong ke 2026-08-23 (periode ITU SENDIRI
 * sedang berjalan). Semester 2 2025 (padanan YoY, calendarEnd 2025-12-31,
 * SUDAH TUTUP total sejak Januari 2026) → TIDAK dipotong sama sekali, tetap
 * tampil 1 semester penuh — walau itu berarti perbandingan "current vs YoY"
 * jadi 54 hari lawan 184 hari (tidak apple-to-apple), itu memang pilihan
 * defaultnya sekarang: valid tapi tidak apple-to-apple, KECUALI user aktifkan
 * "Apply date cutoff".
 */

export function clampToElapsedEnd(periodKey: string, calendarEnd: string, periodType: PeriodType, today: Date = new Date()): string {
  // yearsBack === 0 SAJA (2026-08-23, lihat JSDoc di atas) — bukan lagi
  // "same period-type suffix, tahun berapa pun" (bug lama, sempat salah
  // memotong YoY twin bahkan periode lampau sembarang yang kebetulan
  // berbagi suffix, mis. S2 tahun-tahun sebelumnya).
  if (periodKey !== getCurrentPeriodKey(periodType, today)) return calendarEnd
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  return calendarEnd > todayStr ? todayStr : calendarEnd
}

/**
 * Potong tanggal akhir SEBUAH periode ke hari ke-D bulan yang sama (dibatasi
 * hari terakhir bulan itu kalau D lebih besar) — dipakai mode "Apply date
 * cutoff" (task029.md §30, instruksi user 2026-08-20): user pilih hari
 * spesifik lewat date picker, SEMUA titik trend (termasuk padanan YoY-nya)
 * dipotong ke hari yang sama setiap bulannya (mis. analisis "20 hari pertama
 * tiap bulan, 12 bulan terakhir") — mode terpisah, eksplisit dipilih user,
 * BEDA dari `clampToElapsedEnd` (default, cuma potong periode yang genuinely
 * sedang berjalan, TANPA toggle apa pun — lihat JSDoc di sana, 2026-08-23).
 *
 * `clamped` (potong ke hari D bulan itu) SELALU dihitung & dipakai apa
 * adanya utk SEMUA bucket, termasuk yang sudah tutup total (itu memang
 * tujuan mode ini: "hari D tiap bulan", bukan cuma bucket berjalan).
 *
 * Guard `today`-cap DI BAWAH hanya utk 1 masalah SEMPIT: bucket yang
 * GENUINELY sedang berjalan sekarang (yearsBack===0) py `periodEnd` = akhir
 * KALENDER bulan terakhirnya (mis. Kuartal 3 berjalan → 30 September),
 * padahal bulan itu bisa jadi BELUM MULAI SAMA SEKALI (hari ini baru
 * Agustus) — "hari ke-20 bulan itu" jadi tanggal masa depan yang tidak
 * masuk akal, WAJIB di-cap ke hari ini. Bucket LAIN (termasuk padanan YoY,
 * atau periode lampau sembarang yang kebetulan berbagi suffix period-type)
 * TIDAK butuh guard ini — bulan mereka sudah pasti tutup total, jadi "hari
 * D bulan itu" otomatis selalu valid tanpa perlu di-cap tambahan. Bug lama
 * (2026-08-21/23) — guard ini sempat ikut kepasang ke bucket YoY twin
 * (bahkan periode lampau sembarang yang berbagi suffix), MEMOTONG bucket
 * yang seharusnya sudah tutup penuh jadi terlalu pendek.
 */
/**
 * Hari ke-berapa (1-indexed) sebuah TANGGAL itu, DIHITUNG DARI AWAL PERIODE
 * AKTIF — bukan angka tanggal mentah 1-31 (2026-08-23, fix lanjutan: laporan
 * user "cutoff 13 Agustus di granularitas Kuartal/Semester/Tahun malah
 * menarik data 1-13 JULI/JANUARI, bukan Agustus yang sebenarnya dipilih").
 * Root cause fix sebelumnya (JSDoc lama `clampEndToDay`, masih di bawah):
 * pemanggil kirim angka tanggal MENTAH (13, dari "2026-08-13".split('-')[2])
 * sbg `day`, lalu diterapkan ke bulan PERTAMA periode manapun — kalau
 * tanggal yang dipilih user kebetulan jatuh di bulan ke-2/3 periode
 * (kuartal/semester/tahun), maknanya HILANG, "13 Agustus" jadi "hari ke-13"
 * generik yg diterapkan balik ke bulan pertama (Juli). Fungsi INI
 * menghitung "sudah berapa hari sejak awal periode" (bukan angka tanggal
 * mentah) sbg `day` param `clampEndToDay` — utk granularitas Bulanan
 * hasilnya PERSIS SAMA angka tanggal mentah (awal periode = tanggal 1 bulan
 * yang sama), cuma beda utk Kuartal/Semester/Tahun.
 */
export function daysSincePeriodStart(periodStart: string, dateStr: string): number {
  const [sy, sm, sd] = periodStart.split('-').map(Number)
  const [dy, dm, dd] = dateStr.split('-').map(Number)
  const start = new Date(sy, sm - 1, sd)
  const target = new Date(dy, dm - 1, dd)
  return Math.round((target.getTime() - start.getTime()) / 86400000) + 1
}

export function clampEndToDay(periodStart: string, periodEnd: string, day: number, periodKey: string, periodType: PeriodType, today: Date = new Date()): string {
  // `day` = hari ke-N SEJAK AWAL PERIODE (1-indexed, lihat `daysSincePeriodStart`
  // di atas — WAJIB dipakai pemanggil, BUKAN angka tanggal mentah 1-31, lihat
  // JSDoc-nya kenapa). Diterapkan sbg "N-1 hari setelah awal periode".
  const [y, m, d0] = periodStart.split('-').map(Number)
  const candidate = new Date(y, m - 1, d0 + (day - 1))
  const candidateStr = `${candidate.getFullYear()}-${pad2(candidate.getMonth() + 1)}-${pad2(candidate.getDate())}`
  const clamped = candidateStr > periodEnd ? periodEnd : candidateStr
  if (periodKey !== getCurrentPeriodKey(periodType, today)) return clamped
  const todayStr = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  return clamped > todayStr ? todayStr : clamped
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

export interface ResolveTrendPeriodParams {
  /** periodKey titik TERAKHIR (biasanya = current period request ini). */
  periodKey: string
  /** Akhir kalender penuh periodKey itu (getPeriodRange(...).end, BELUM dipotong apa pun). */
  calendarEnd: string
  /** Awal kalender penuh periodKey itu (getPeriodRange(...).start) — dipakai
   * `clampEndToDay` (mode "Apply date cutoff") sbg acuan "hari ke-D DARI AWAL
   * periode", supaya benar utk granularitas non-bulanan (2026-08-23, fix bug
   * kuartal — lihat JSDoc `clampEndToDay`). */
  calendarStart: string
  periodType: PeriodType
  /** 12 (atau N) titik trend, SUDAH dibangun via buildTrailingPeriods — fungsi
   * ini TIDAK mengubah array asli, mengembalikan array baru. */
  buckets: TrailingPeriodBucket[]
  /** Mode "Apply date cutoff" (toggle eksplisit user) — kalau true, SEMUA
   * bucket dipotong ke `cutoffDay ?? fallbackDay`, prioritas PALING TINGGI
   * (mengalahkan skipElapsedClamp — toggle eksplisit user tidak boleh
   * ditimpa flag internal apa pun). */
  applyDateCutoff?: boolean
  /** Hari referensi eksplisit utk apply_date_cutoff (dipakai drilldown, di
   * mana `periodEnd` request = tanggal bucket yang diklik, BUKAN tanggal
   * filter halaman — lihat komentar `clampEndToDay`/`getCrossSellingMetrics`
   * kenapa 2 hal itu beda). Fallback ke `fallbackDay` kalau kosong. */
  cutoffDay?: number
  /** Hari dari `period_end` REQUEST INI SENDIRI — dipakai sbg cutoffDay kalau
   * cutoffDay tidak dikirim (behavior lama, benar utk fetch trend utama). */
  fallbackDay: number
  /** Bypass clampToElapsedEnd (drilldown klik-titik) — periode SELALU kalender
   * penuh, walau periodKey kebetulan = current atau padanan YoY-nya. Prioritas
   * DI BAWAH applyDateCutoff (toggle eksplisit user tetap menang). */
  skipElapsedClamp?: boolean
  today?: Date
}

/**
 * SATU fungsi pusat yang memutuskan "periode ini dipotong ke tanggal apa" —
 * dipakai SEMUA service metrics (M1/M2 `getCrossSellingMetrics`, M3-M7
 * `getCustomerMetrics`, dan KPI mana pun berikutnya yang butuh trend/drilldown
 * serupa) lewat SATU pemanggilan, BUKAN tiap service menulis ulang if/else
 * prioritas apply_date_cutoff/skip_elapsed_clamp/clampToElapsedEnd sendiri²
 * (2026-08-23, koreksi user: "filter ini fungsinya harus global... kalau
 * [ditulis ulang di tiap fungsi] akan rawan bug di metric KPI lainnya" —
 * PERSIS insiden yang baru terjadi: fix skip_elapsed_clamp dulu HANYA
 * menyentuh getCrossSellingMetrics, lalu apply_date_cutoff drilldown baru
 * ketahuan belum ikut diperbaiki krn prioritasnya beda-beda per tempat).
 * Prioritas TETAP (satu-satunya sumber kebenaran, urutan TIDAK BOLEH beda
 * antar caller): applyDateCutoff > skipElapsedClamp > default clampToElapsedEnd.
 */
export function resolveTrendPeriod(p: ResolveTrendPeriodParams): { periodEndDate: string, buckets: TrailingPeriodBucket[] } {
  const { periodKey, calendarEnd, calendarStart, periodType, buckets, applyDateCutoff, cutoffDay, fallbackDay, skipElapsedClamp, today } = p

  if (applyDateCutoff) {
    const day = cutoffDay ?? fallbackDay
    const clampedBuckets = buckets.map((b) => ({ ...b, end: clampEndToDay(b.start, b.end, day, b.label, periodType, today) }))
    return { periodEndDate: clampEndToDay(calendarStart, calendarEnd, day, periodKey, periodType, today), buckets: clampedBuckets }
  }

  if (skipElapsedClamp) {
    return { periodEndDate: calendarEnd, buckets }
  }

  const periodEndDate = clampToElapsedEnd(periodKey, calendarEnd, periodType, today)
  const lastIdx = buckets.length - 1
  const newBuckets = buckets.slice()
  if (lastIdx >= 0) newBuckets[lastIdx] = { ...newBuckets[lastIdx]!, end: periodEndDate }
  return { periodEndDate, buckets: newBuckets }
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
