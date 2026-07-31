import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import { formatIDR, formatIDRSigned } from '@/utils/format'
import { formatGrowthPct, trendColor } from '@/utils/analisisComparison'
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
 * - Semua nilai numerik rata kanan (readability, gampang dibandingkan
 *   besarannya secara vertikal).
 * - Badge trend persentase (dulu StatusChip pill + ikon) diganti teks polos
 *   berwarna — dulu terlalu menonjol dibanding kolom lain yang cuma teks.
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
    <Box sx={{ py: 1, textAlign: 'right' }}>
      <Typography variant="body2" sx={{ fontWeight: revenueColor ? 600 : 400, color: revenueColor ? `${revenueColor}.main` : undefined }}>
        {showLabels ? `${revenueLabel}: ${revenueText}` : revenueText}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontWeight: marginColor ? 600 : 400, color: marginColor ? `${marginColor}.main` : 'text.secondary' }}>
        {showLabels ? `${marginLabel}: ${marginText}` : marginText}
      </Typography>
    </Box>
  )
}

// ─── Trend persentase — teks polos berwarna, rata kanan (bukan chip pill +
// ikon lagi, sengaja dikurangi penekanan visualnya — kolom ini tidak perlu
// lebih menonjol dari kolom Rupiah di sebelahnya) ───────────────────────────
export function TrendChip({ label, pct, alert, newBusinessLabel }: { label: string; pct: number | null; alert: boolean; newBusinessLabel: string }) {
  const color = pct === null ? 'info.main' : `${trendColor(pct, alert)}.main`
  const text = pct === null ? `${label}: ${newBusinessLabel}` : `${label}: ${formatGrowthPct(pct)}`
  return (
    <Typography variant="caption" sx={{ display: 'block', fontWeight: 500, color }}>
      {text}
    </Typography>
  )
}

export function MetricPercentPair({
  revenueLabel, marginLabel, revenuePct, marginPct, revenueAlert, marginAlert, newBusinessLabel,
}: {
  revenueLabel: string
  marginLabel: string
  revenuePct: number | null
  marginPct: number | null
  revenueAlert: boolean
  marginAlert: boolean
  newBusinessLabel: string
}) {
  return (
    <Stack spacing={0.5} sx={{ py: 1, alignItems: 'flex-end', textAlign: 'right' }}>
      <TrendChip label={revenueLabel} pct={revenuePct} alert={revenueAlert} newBusinessLabel={newBusinessLabel} />
      <TrendChip label={marginLabel} pct={marginPct} alert={marginAlert} newBusinessLabel={newBusinessLabel} />
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
          revenueColor={trendColor(comparison.revenue_change_pct, comparison.revenue_alert)}
          marginColor={trendColor(comparison.margin_change_pct, comparison.margin_alert)}
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
        />
      </Box>
    </Stack>
  )
}
