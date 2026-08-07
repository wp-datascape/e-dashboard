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

/**
 * `withSign=false` (default true) — buang tanda +/- di depan angka. Dipakai
 * kalau teksnya SUDAH didampingi panah ▲/▼ (tanda +/- jadi redundan dgn arah
 * panah, feedback user 2026-08-07: contoh chip target "▲ 64.3%" bukan
 * "▲ +64.3%"). Konteks TANPA panah (mis. kalimat pertumbuhan "Naik Rp X
 * (+Y%)") tetap pakai default withSign=true.
 */
export function formatGrowthPct(pct: number, withSign = true): string {
  const capped = Math.abs(pct) > EXTREME_PCT_CAP
  const magnitude = capped ? `${EXTREME_PCT_CAP}%+` : `${Math.abs(pct).toFixed(1)}%`
  if (!withSign) return magnitude
  const sign = pct > 0 ? '+' : pct < 0 ? '-' : ''
  return `${sign}${magnitude}`
}

// Warna trend: null (tanpa baseline) = info, naik = success, turun = warning
// (atau error kalau sudah lewat threshold alert).
export function trendColor(pct: number | null, alert: boolean): StatusChipColor {
  if (pct === null) return 'info'
  if (pct >= 0) return 'success'
  return alert ? 'error' : 'warning'
}

/**
 * Kategori tren yang lebih lengkap dari sekadar naik/turun — dipakai untuk
 * membedakan kasus yang sebelumnya SEMUA numpuk jadi "naik/turun generik atau
 * null" (feedback audit UX halaman Analisis, 2026-08-07):
 *
 * - `new`     — previous 0, current > 0 (pelanggan baru, SUDAH ada sebelumnya)
 * - `none`    — previous 0 DAN current 0 (belum pernah ada transaksi sama
 *               sekali di kedua periode) — BEDA dari `new`, sebelumnya
 *               keduanya numpuk jadi 1 label "Pelanggan Baru" yang salah utk
 *               kasus current juga 0.
 * - `stopped` — previous > 0, current TEPAT 0 (pct selalu tepat -100 pada
 *               kasus ini) — berhenti total, bukan sekadar "turun 100%".
 * - `flat`    — pct tepat 0 (tidak ada perubahan sama sekali).
 * - `up` / `down` — kasus umum.
 */
export type TrendKind = 'up' | 'down' | 'flat' | 'new' | 'stopped' | 'none'

export function resolveTrendKind(pct: number | null, currentIsZero: boolean): TrendKind {
  if (pct === null) return currentIsZero ? 'none' : 'new'
  if (pct === -100 && currentIsZero) return 'stopped'
  if (pct === 0) return 'flat'
  return pct > 0 ? 'up' : 'down'
}

/** Warna per kategori tren — `stopped` SELALU merah (bukan tergantung alert
 * threshold, karena berhenti total ke 0 selalu signifikan), `flat`/`none`
 * netral abu-abu (bukan hijau seperti sebelumnya saat pct>=0 termasuk pct===0
 * persis).
 *
 * `inversePolarity` (task024/025, `utils/metricPolarity.ts`) — metrik yang
 * "naik = buruk" (mis. Dormant Rate/Value): `up`/`down` DIBALIK sebelum
 * dipetakan ke warna, supaya kenaikan dormant tetap merah bukan hijau. Arah
 * panah/kata "Naik/Turun" di caller TIDAK ikut dibalik (tetap sesuai arah
 * data asli) — HANYA warnanya. `stopped`/`flat`/`new`/`none` tidak terpengaruh
 * polaritas (berhenti/datar/baru/tanpa-data maknanya sama terlepas metriknya
 * apa). */
export function trendKindColor(kind: TrendKind, alert: boolean, inversePolarity = false): StatusChipColor {
  const effectiveKind = inversePolarity && (kind === 'up' || kind === 'down')
    ? (kind === 'up' ? 'down' : 'up')
    : kind
  switch (effectiveKind) {
    case 'up': return 'success'
    case 'down': return alert ? 'error' : 'warning'
    case 'flat': return 'default'
    case 'new': return 'info'
    case 'stopped': return 'error'
    case 'none': return 'default'
  }
}

/**
 * Status keseluruhan 1 BARIS (bukan 1 metrik) — gabungan dari beberapa
 * `TrendKind` (mis. Revenue + GP sekaligus) + flag alert. Dipakai kolom
 * STATUS tabel Analisis — sebelumnya cuma binary Aman/Perlu Perhatian,
 * sekarang mencakup Baru/Berhenti/Datar/Belum ada data juga (feedback user
 * 2026-08-07). Prioritas (paling spesifik/darurat duluan): none > stopped >
 * new > critical (alert) > flat > normal.
 */
export type RowStatusKind = 'critical' | 'normal' | 'new' | 'stopped' | 'flat' | 'none'

export function resolveRowStatusKind(kinds: TrendKind[], hasAlert: boolean): RowStatusKind {
  if (kinds.length > 0 && kinds.every((k) => k === 'none')) return 'none'
  if (kinds.some((k) => k === 'stopped')) return 'stopped'
  if (kinds.some((k) => k === 'new')) return 'new'
  if (hasAlert) return 'critical'
  if (kinds.length > 0 && kinds.every((k) => k === 'flat')) return 'flat'
  return 'normal'
}

/** Warna per status baris — `inversePolarity` TIDAK relevan di sini (beda
 * dari `trendKindColor`): status "critical"/"stopped" sudah eksplisit
 * ditentukan caller lewat `hasAlert`/kombinasi kind, bukan diturunkan ulang
 * dari arah naik/turun mentah. */
export function rowStatusColor(kind: RowStatusKind): StatusChipColor {
  switch (kind) {
    case 'critical': return 'error'
    case 'normal': return 'success'
    case 'new': return 'info'
    case 'stopped': return 'error'
    case 'flat': return 'default'
    case 'none': return 'default'
  }
}
