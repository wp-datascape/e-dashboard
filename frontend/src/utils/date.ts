export function currentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function todayIsoDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
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

/**
 * Format tanggal (ISO 'YYYY-MM-DD' atau ISO datetime) ke 'DD-MM-YYYY' —
 * dipakai KAPAN PUN tanggal ditampilkan sbg teks di seluruh app (bukan cuma
 * input picker) - tabel, dialog detail, chart, dst (2026-08-09, koreksi user
 * "bukan hanya date picker, contoh legend chart, dan lainnya, buat saja util
 * format tanggal ddmmyyyy"). Sebelumnya belasan file (Log/Notification/User
 * dialogs) masing-masing duplikat `toLocaleDateString('id-ID', {day, month,
 * year})` sendiri-sendiri — dipusatkan di sini, lihat
 * [[feedback_centralize_ui_no_duplication]]. Sengaja numerik SEMUA (bukan
 * nama bulan "Agu"/"Agustus") supaya 1 format konsisten di seluruh app.
 */
export function formatDateDDMMYYYY(iso: string | null | undefined, fallback = '—'): string {
  if (!iso) return fallback
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return fallback
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}-${mm}-${d.getFullYear()}`
}

/** Sama seperti `formatDateDDMMYYYY`, ditambah jam:menit ("09-08-2026 14.30")
 * - dipakai timestamp log/notifikasi yang butuh presisi waktu, bukan cuma
 * tanggal. */
export function formatDateTimeDDMMYYYY(iso: string | null | undefined, fallback = '—'): string {
  if (!iso) return fallback
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return fallback
  const hh = String(d.getHours()).padStart(2, '0')
  const min = String(d.getMinutes()).padStart(2, '0')
  return `${formatDateDDMMYYYY(iso, fallback)} ${hh}.${min}`
}

/**
 * Label sumbu-X/tooltip chart bulanan ('YYYY-MM' → 'MM-YYYY', mis. "2026-01"
 * → "01-2026") — konsisten dgn konvensi numerik dd-mm-yyyy (2026-08-09,
 * lanjutan "chart masih format 2026-01"). AMAN dipakai default di SEMUA
 * chart widget (Area/Bar/Line/Combo/LineAlert) tanpa perlu tahu apakah
 * `xKey` chart itu genuinely bulan atau bukan — value yang TIDAK match pola
 * 'YYYY-MM' (mis. nama tier "Atas"/nama customer di chart horizontal)
 * dikembalikan apa adanya, tidak ikut diubah/rusak.
 */
export function formatMonthTick(value: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(value)
  return m ? `${m[2]}-${m[1]}` : value
}
