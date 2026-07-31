import type { StatusChipColor } from '@/components/ui/StatusChip'

/**
 * utils/analisisComparison.ts
 *
 * Helper murni (bukan komponen React) dipisah dari
 * components/analisis/ComparisonMetrics.tsx supaya file itu cuma berisi
 * export komponen (react-refresh/only-export-components — fast refresh
 * rusak kalau 1 file campur export komponen + fungsi biasa).
 */

// Growth % di atas ini tampilannya di-cap ("999%+") — nilai asli (Growth
// Value dalam Rupiah) tetap ditampilkan penuh, TIDAK dibulatkan jadi 100%.
// Metric Comparison Standard: angka ekstrem murni akibat basis pembanding
// yang nyaris nol, secara matematis tetap benar, jadi bukan bug — cuma perlu
// tampilan yang tidak menyesatkan.
const EXTREME_PCT_CAP = 999

export function formatGrowthPct(pct: number): string {
  if (pct > EXTREME_PCT_CAP) return `${EXTREME_PCT_CAP}%+`
  if (pct < -EXTREME_PCT_CAP) return `-${EXTREME_PCT_CAP}%+`
  return `${pct > 0 ? '+' : ''}${pct.toFixed(1)}%`
}

// Warna trend: null (tanpa baseline) = info, naik = success, turun = warning
// (atau error kalau sudah lewat threshold alert).
export function trendColor(pct: number | null, alert: boolean): StatusChipColor {
  if (pct === null) return 'info'
  if (pct >= 0) return 'success'
  return alert ? 'error' : 'warning'
}
