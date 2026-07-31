import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Typography from '@mui/material/Typography'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import { StatusChip } from '@/components/ui'
import type { StatusChipColor } from '@/components/ui/StatusChip'
import { formatIDR, formatIDRSigned } from '@/utils/format'
import { formatGrowthPct, trendColor } from '@/utils/analisisComparison'
import type { AnalisisMetricComparison } from '@/types/analisis'

/**
 * components/analisis/ComparisonMetrics.tsx
 *
 * Blok Rev:/GM: dipakai berulang di halaman Analisis (kolom Periode Lampau/
 * Periode Ini/Perubahan Nilai/Perubahan %) DAN di popup detail notifikasi
 * (NotificationDetailDialog) — supaya tabel pembanding di popup persis sama
 * bentuknya dengan halaman Analisis (task016 §18, permintaan 2026-07-31).
 * Diekstrak dari pages/Analisis/index.tsx, jangan duplikasi ulang di tempat lain.
 */

// ─── Sepasang baris Rev:/GM: teks polos — dipakai di kolom Periode Lampau,
// Periode Ini, dan Perubahan Nilai ──────────────────────────────────────────
export function MetricPair({
  revenueLabel, marginLabel, revenueText, marginText, revenueColor, marginColor,
}: {
  revenueLabel: string
  marginLabel: string
  revenueText: string
  marginText: string
  revenueColor?: StatusChipColor
  marginColor?: StatusChipColor
}) {
  return (
    <Box sx={{ py: 1 }}>
      <Typography variant="body2" sx={{ fontWeight: revenueColor ? 600 : 400, color: revenueColor ? `${revenueColor}.main` : undefined }}>
        {revenueLabel}: {revenueText}
      </Typography>
      <Typography variant="caption" sx={{ display: 'block', fontWeight: marginColor ? 600 : 400, color: marginColor ? `${marginColor}.main` : 'text.secondary' }}>
        {marginLabel}: {marginText}
      </Typography>
    </Box>
  )
}

// ─── Chip trend (naik/turun) khusus kolom Perubahan (%) — tetap pakai chip +
// ikon grafik, bukan teks polos ─────────────────────────────────────────────
export function TrendChip({ label, pct, alert, newBusinessLabel }: { label: string; pct: number | null; alert: boolean; newBusinessLabel: string }) {
  if (pct === null) {
    return <StatusChip size="small" label={`${label}: ${newBusinessLabel}`} icon={<AutoAwesomeIcon />} color="info" />
  }
  const icon = pct < 0 ? <TrendingDownIcon /> : <TrendingUpIcon />
  return <StatusChip size="small" color={trendColor(pct, alert)} icon={icon} label={`${label}: ${formatGrowthPct(pct)}`} />
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
    <Stack spacing={0.5} sx={{ py: 1 }}>
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
  current, comparison, revenueLabel, marginLabel, newBusinessLabel,
}: {
  comparisonSectionLabel: string
  periodSectionLabel: string
  changeValueSectionLabel: string
  changePercentSectionLabel: string
  current: { revenue: number; margin: number }
  comparison: AnalisisMetricComparison
  revenueLabel: string
  marginLabel: string
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
        <MetricPair revenueLabel={revenueLabel} marginLabel={marginLabel} revenueText={formatIDR(current.revenue)} marginText={formatIDR(current.margin)} />
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
        />
      </Box>

      <Box>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
          {changePercentSectionLabel}
        </Typography>
        <MetricPercentPair
          revenueLabel={revenueLabel}
          marginLabel={marginLabel}
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
