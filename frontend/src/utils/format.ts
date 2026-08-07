/**
 * Konvensi label Indonesia:
 *   jt  = juta  (1.000.000)
 *   M   = miliar (1.000.000.000)
 */
export function formatIDR(val: number): string {
  if (val >= 1_000_000_000) return `Rp ${(val / 1_000_000_000).toFixed(1)}M`
  if (val >= 1_000_000)     return `Rp ${(val / 1_000_000).toFixed(1)}jt`
  return `Rp ${val.toLocaleString('id-ID')}`
}

/** formatIDR dengan tanda +/- di depan — buat Growth Value (current - previous) yang bisa negatif. */
export function formatIDRSigned(val: number): string {
  const sign = val > 0 ? '+' : val < 0 ? '-' : ''
  return `${sign}${formatIDR(Math.abs(val))}`
}

/** Format value enum snake_case dari DB jadi label tampilan, mis. 'e_commerce' -> 'E Commerce'. */
export function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Default Y-axis tick formatter untuk chart widget (Bar/Area/LineAlert). Recharts
 * TANPA tickFormatter menghasilkan tick mentah dari algoritma auto-scale-nya
 * (bisa "86.02", bukan "86") — kelihatan belum dipoles (task023, temuan audit UX
 * Dashboard 2026-08-07). Dibulatkan ke bilangan bulat kalau nilainya "dekat" bulat
 * (toleransi kecil buat floating point), kalau memang perlu desimal (skala kecil,
 * mis. rata-rata kategori 2.35) tetap tampilkan maks 1 desimal.
 */
export function formatAxisTick(v: number): string {
  const rounded = Math.round(v)
  if (Math.abs(v - rounded) < 0.05) return rounded.toString()
  return v.toFixed(1)
}
