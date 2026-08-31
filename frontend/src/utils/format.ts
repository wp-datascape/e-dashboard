/**
 * Konvensi label Indonesia:
 *   jt  = juta  (1.000.000)
 *   M   = miliar (1.000.000.000)
 *
 * Dipakai KHUSUS tempat yang ruangnya sempit (axis chart, tick label) — di
 * situ singkatan memang perlu spy tidak numpuk. Untuk tabel/dialog/teks
 * biasa pakai `formatRupiah` (2026-08-19, instruksi user: "pakai Rp dan
 * titik untuk ribuan... agar lebih mudah terbaca" — angka penuh, bukan
 * disingkat, lebih jelas di konteks yang ruangnya cukup).
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

/**
 * Rupiah ANGKA PENUH, titik sbg pemisah ribuan (format Indonesia bawaan
 * `toLocaleString('id-ID')`) — mis. "Rp 4.930.000", BUKAN disingkat "Rp
 * 4.9jt". Standar utk tabel/dialog/teks (2026-08-19). Dibulatkan ke rupiah
 * penuh (tanpa desimal) — nilai transaksi tidak butuh sen.
 */
export function formatRupiah(val: number): string {
  return `Rp ${Math.round(val).toLocaleString('id-ID')}`
}

/** formatRupiah dengan tanda +/- di depan — utk nilai perubahan yang bisa negatif. */
export function formatRupiahSigned(val: number): string {
  const sign = val > 0 ? '+' : val < 0 ? '-' : ''
  return `${sign}${formatRupiah(Math.abs(val))}`
}

/** Format value enum snake_case dari DB jadi label tampilan, mis. 'e_commerce' -> 'E Commerce'. */
export function formatEnumLabel(value: string): string {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
