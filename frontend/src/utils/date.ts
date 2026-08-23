export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function todayIsoDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

/**
 * Clamp nilai date/month picker ke `maxValue` kalau melebihinya, ATAU
 * kalau `value` kosong (2026-08-23, bug dilaporkan user: klik tombol clear
 * bawaan browser pada date/month picker mengosongkan value → fetch data
 * error) — semua onChange date/month picker filter periode di app ini
 * SEHARUSNYA lewat fungsi pusat ini, bukan tiap tempat menulis kondisi
 * `value > max ? max : value` sendiri² (pola lama itu SALAH utk value
 * kosong: string kosong selalu lebih kecil dari string mana pun, jadi
 * lolos apa adanya alih-alih di-clamp).
 *
 * `maxValue` diisi caller (todayIsoDate() utk type="date", currentYearMonth()
 * utk type="month") — fungsi ini generik thd granularitas, cuma perbandingan
 * string leksikografik (valid krn semua format ini 'YYYY-MM'/'YYYY-MM-DD',
 * urutan leksikografik = urutan tanggal).
 */
export function clampDateNotFuture(value: string, maxValue: string): string {
  return !value || value > maxValue ? maxValue : value
}

/** Konversi 'YYYY-MM' ke hari terakhir bulan sebagai 'YYYY-MM-DD' */
export function monthToEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/**
 * Resolve filter bulan (input type="month", format 'YYYY-MM') ke tanggal `period_end`
 * yang dikirim ke backend. Bulan berjalan → tanggal hari ini di perangkat (data
 * parsial, bukan sampai akhir bulan yang belum terjadi). Bulan lampau → akhir bulan
 * (sudah closed, data 1 bulan penuh).
 */
export function resolvePeriodEnd(yearMonth: string): string {
  return yearMonth === currentYearMonth() ? todayIsoDate() : monthToEndDate(yearMonth)
}

/** Tanggal awal window N bulan yang berakhir di `yearMonth` (inklusif), format 'YYYY-MM-DD' */
export function windowStartDate(yearMonth: string, windowMonths: number): string {
  const [y, m] = yearMonth.split('-').map(Number)
  const d = new Date(y, m - windowMonths, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

// ─── Format tampilan (Indonesia, numerik) ──────────────────────────────────
// Dipusatkan di sini (2026-08-19, instruksi user: "gunakan format Indonesia
// di semua page") — sebelumnya tiap halaman (AuditLog/ActivityLog/LoginLog/
// Users/Notifications/NotificationBell/dialog detail masing-masing/Import
// log/PDF template) punya fungsi fmtDate/formatDate sendiri-sendiri, isinya
// duplikat (toLocaleDateString('id-ID', {day, month: 'short'|'long', ...}))
// — hasilnya nama bulan dieja ("19 Agu 2026"), BUKAN dd-mm-yyyy numerik yang
// diminta. Ganti semua pemakaian ke 2 fungsi ini.

/** Tanggal ke DD-MM-YYYY (numerik, standar Indonesia) — terima ISO string atau Date. */
export function formatDateID(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

/** Tanggal + jam ke "DD-MM-YYYY HH:mm" — terima ISO string atau Date. */
export function formatDateTimeID(input: string | Date): string {
  const d = typeof input === 'string' ? new Date(input) : input
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${formatDateID(d)} ${hh}:${min}`
}

/**
 * Label bulan kompak buat tick axis chart tren — terima 'YYYY-MM' (format trend point
 * dari backend), hasil "Jan 26"/"Agu 26" (2026-08-19, laporan user: axis chart tanggal
 * masih raw "2026-01", tidak terbaca). Dipakai sebagai xAxisFormatter di semua widget
 * chart tren bulanan — ruang tick sempit, makanya 2 digit tahun bukan 4.
 */
export function formatMonthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number)
  if (!y || !m) return month
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' })
}
