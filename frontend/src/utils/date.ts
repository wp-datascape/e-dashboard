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
