import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import Typography from '@mui/material/Typography'
import { useTranslation } from 'react-i18next'
import { StatusChip } from '@/components/ui'
import { formatIDR, formatIDRSigned } from '@/utils/format'
import { formatGrowthPct, resolveTrendKind, trendKindColor } from '@/utils/analisisComparison'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import type { AnalisisMetricComparison } from '@/types/analisis'

/**
 * components/analisis/ComparisonMetrics.tsx
 *
 * Blok Rev:/GP: dipakai berulang di halaman Analisis (kolom Periode Lampau/
 * Periode Ini/Perubahan Nilai/Perubahan %) DAN di popup detail notifikasi
 * (NotificationDetailDialog) — supaya tabel pembanding di popup persis sama
 * bentuknya dengan halaman Analisis (task016 §18, permintaan 2026-07-31).
 * Diekstrak dari pages/Analisis/index.tsx, jangan duplikasi ulang di tempat lain.
 *
 * Revisi 2026-07-31 (task016 §25, permintaan user):
 * - Nilai Rupiah pakai label "GP" (Gross Profit, angka absolut), nilai
 *   persentase tetap pakai "GM" (Gross Margin, rasio) — 2 label BEDA
 *   sengaja, bukan typo. `marginLabel` di MetricPair/MetricSections
 *   sekarang khusus GP, `marginPercentLabel` terpisah khusus GM.
 * - `showLabels` (default true) — kolom/section PERTAMA (Pembanding) tetap
 *   tampilkan "Rev:"/"GP:", kolom sesudahnya (Periode Ini, Perubahan Nilai)
 *   cukup angka polos rata kanan tanpa label berulang — posisi vertikal
 *   (Rev di atas, GP di bawah) KONSISTEN di semua kolom jadi tetap terbaca
 *   tanpa perlu label diulang tiap kolom.
 * - Nilai numerik: rata kiri (revisi 2026-07-31, sempat dicoba rata kanan
 *   lalu dibalik lagi atas permintaan user).
 * - Badge trend persentase tetap pakai StatusChip pill (bentuk sama dgn chip
 *   "Kritis"/"Normal" kolom Status) — sempat dicoba teks polos tanpa pill
 *   lalu dikembalikan atas permintaan user. Isi teksnya pakai panah unicode
 *   ▲/▼ (bukan ikon MUI) + tooltip nampilin angka persis tanpa pembulatan/cap.
 */

// ─── Sepasang baris Rev:/GP: — dipakai di kolom Periode Lampau, Periode Ini,
// dan Perubahan Nilai. Rata kanan, label cuma tampil kalau showLabels=true
// (kolom pertama saja secara default) ───────────────────────────────────────
export function MetricPair({
  revenueLabel, marginLabel, revenueText, marginText, revenueColor, marginColor, showLabels = true,
}: {
  revenueLabel: string
  marginLabel: string
  revenueText: string
  marginText: string
  revenueColor?: StatusChipColor
  marginColor?: StatusChipColor
  showLabels?: boolean
}) {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: revenueColor ? 600 : 400, color: revenueColor ? `${revenueColor}.main` : undefined }}>
        {showLabels ? `${revenueLabel}: ${revenueText}` : revenueText}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontWeight: marginColor ? 600 : 400, color: marginColor ? `${marginColor}.main` : 'text.secondary' }}>
        {showLabels ? `${marginLabel}: ${marginText}` : marginText}
      </Typography>
    </Box>
  )
}

// ─── Trend persentase — chip pill (StatusChip, konsisten sama bentuk dgn chip
// "Kritis"/"Normal" di kolom Status), isi teks pakai panah unicode kecil
// (▲/▼, bukan ikon MUI — permintaan user 2026-07-31 biar lebih simple).
// Tooltip nampilin angka PERSIS (2 desimal, tanpa cap 999%) — formatGrowthPct
// yang dipakai di teks utama sengaja MEMBULATKAN & MEN-CAP nilai ekstrem
// (mis. "999%+") biar tidak menyesatkan tampilan, tapi angka aslinya tetap
// harus bisa dicek — permintaan user, tooltip tetap dipertahankan. ─────────
export function TrendChip({
  label, pct, alert, newBusinessLabel, currentIsZero = false, hideLabel = false,
}: {
  label: string
  pct: number | null
  alert: boolean
  newBusinessLabel: string
  /** current metric = 0 persis — membedakan `pct===null` "belum pernah ada
   * transaksi sama sekali" (current JUGA 0) dari "pelanggan baru" (current >
   * 0). Juga membedakan "berhenti total" (pct===-100 DAN current 0) dari
   * "turun 100%" biasa. Default false (aman utk caller lama yang belum
   * di-update pass prop ini). */
  currentIsZero?: boolean
  /** true = chip TANPA prefix label (mis. "▲ 64.3%" bukan "▲ Pendapatan:
   * 64.3%") — dipakai kolom Perubahan (%) tabel Analisis, urutan stack
   * (atas=Pendapatan, bawah=Laba) sudah cukup menyatakan metrik mana tanpa
   * label diulang (feedback user 2026-08-07: chip kepanjangan/kepotong).
   * Default false (backward compat — ComparisonSections/mobile card/
   * NotificationDetailDialog tetap pakai label seperti sebelumnya). */
  hideLabel?: boolean
}) {
  const { t } = useTranslation()
  const kind = resolveTrendKind(pct, currentIsZero)
  const color = trendKindColor(kind, alert)
  const arrow = kind === 'up' ? '▲ ' : kind === 'down' ? '▼ ' : ''
  const prefix = hideLabel ? '' : `${label}: `

  const text = (() => {
    switch (kind) {
      case 'new': return `${prefix}${newBusinessLabel}`
      case 'none': return `${prefix}${t('analisis.noDataLabel')}`
      case 'stopped': return `${prefix}${t('analisis.stoppedLabel')}`
      case 'flat': return `${prefix}${t('analisis.flatLabel')}`
      // withSign=false — panah ▲/▼ sudah menyatakan arah, tanda +/- jadi
      // redundan (feedback user 2026-08-07, contoh target "▲ 64.3%").
      default: return `${arrow}${prefix}${formatGrowthPct(pct as number, false)}`
    }
  })()
  const exactText = pct === null ? null : `${pct > 0 ? '+' : ''}${pct.toFixed(2)}%`

  const content = <StatusChip size="small" color={color} label={text} />
  // StatusChip bukan forwardRef component — bungkus <span> biar Tooltip
  // (butuh ref utk positioning) tidak nge-warn "function components cannot
  // be given refs" di console.
  return exactText === null ? content : (
    <Tooltip title={exactText} arrow placement="top">
      <span>{content}</span>
    </Tooltip>
  )
}

export function MetricPercentPair({
  revenueLabel, marginLabel, revenuePct, marginPct, revenueAlert, marginAlert, newBusinessLabel,
  revenueCurrentIsZero = false, marginCurrentIsZero = false, hideLabel = false,
}: {
  revenueLabel: string
  marginLabel: string
  revenuePct: number | null
  marginPct: number | null
  revenueAlert: boolean
  marginAlert: boolean
  newBusinessLabel: string
  /** Lihat `TrendChip.currentIsZero` — bedakan "belum pernah ada transaksi"
   * dari "pelanggan baru"/"berhenti total". Default false (backward compat). */
  revenueCurrentIsZero?: boolean
  marginCurrentIsZero?: boolean
  /** Lihat `TrendChip.hideLabel`. Default false (backward compat). */
  hideLabel?: boolean
}) {
  return (
    <Stack spacing={0.5} sx={{ py: 1 }}>
      <TrendChip label={revenueLabel} pct={revenuePct} alert={revenueAlert} newBusinessLabel={newBusinessLabel} currentIsZero={revenueCurrentIsZero} hideLabel={hideLabel} />
      <TrendChip label={marginLabel} pct={marginPct} alert={marginAlert} newBusinessLabel={newBusinessLabel} currentIsZero={marginCurrentIsZero} hideLabel={hideLabel} />
    </Stack>
  )
}

// ─── Blok lengkap 4 section (Pembanding/Periode/Perubahan Nilai/Perubahan %)
// — bentuk PERSIS sama dengan card mobile halaman Analisis (task016 §18).
// Dipakai di sana DAN di popup detail notifikasi biar tabel pembandingnya
// identik, bukan reimplementasi terpisah. ──────────────────────────────────
export function ComparisonSections({
  comparisonSectionLabel, periodSectionLabel, changeValueSectionLabel, changePercentSectionLabel,
  current, comparison, revenueLabel, marginLabel, marginPercentLabel, newBusinessLabel,
}: {
  comparisonSectionLabel: string
  periodSectionLabel: string
  changeValueSectionLabel: string
  changePercentSectionLabel: string
  current: { revenue: number; margin: number }
  comparison: AnalisisMetricComparison
  revenueLabel: string
  /** Label margin utk nilai Rupiah — "GP" (Gross Profit). */
  marginLabel: string
  /** Label margin utk nilai persentase — "GM" (Gross Margin), beda dari marginLabel. */
  marginPercentLabel: string
  newBusinessLabel: string
}) {
  return (
    <Stack spacing={2}>
      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {comparisonSectionLabel}
        </Typography>
        <MetricPair revenueLabel={revenueLabel} marginLabel={marginLabel} revenueText={formatIDR(comparison.revenue)} marginText={formatIDR(comparison.margin)} />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {periodSectionLabel}
        </Typography>
        <MetricPair revenueLabel={revenueLabel} marginLabel={marginLabel} revenueText={formatIDR(current.revenue)} marginText={formatIDR(current.margin)} showLabels={false} />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {changeValueSectionLabel}
        </Typography>
        <MetricPair
          revenueLabel={revenueLabel}
          marginLabel={marginLabel}
          revenueText={formatIDRSigned(comparison.revenue_change_value)}
          marginText={formatIDRSigned(comparison.margin_change_value)}
          revenueColor={trendKindColor(resolveTrendKind(comparison.revenue_change_pct, current.revenue === 0), comparison.revenue_alert)}
          marginColor={trendKindColor(resolveTrendKind(comparison.margin_change_pct, current.margin === 0), comparison.margin_alert)}
          showLabels={false}
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {changePercentSectionLabel}
        </Typography>
        <MetricPercentPair
          revenueLabel={revenueLabel}
          marginLabel={marginPercentLabel}
          revenuePct={comparison.revenue_change_pct}
          marginPct={comparison.margin_change_pct}
          revenueAlert={comparison.revenue_alert}
          marginAlert={comparison.margin_alert}
          newBusinessLabel={newBusinessLabel}
          revenueCurrentIsZero={current.revenue === 0}
          marginCurrentIsZero={current.margin === 0}
        />
      </Box>
    </Stack>
  )
}
