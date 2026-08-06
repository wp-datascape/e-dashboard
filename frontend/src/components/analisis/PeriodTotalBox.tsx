import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { TrendChip } from './ComparisonMetrics'

/**
 * components/analisis/PeriodTotalBox.tsx
 *
 * Kotak total di kiri/kanan navigasi periode halaman Analisis (Revenue &
 * Retention) — total dari SELURUH customer yang lolos filter (bukan cuma
 * halaman yang sedang tampil, lihat meta.summary). Kotak kiri = Periode
 * Lampau (baseline, tanpa growth — belum ada apa-apa buat dibandingkan).
 * Kotak kanan = Periode Ini (+ growth % dibanding kotak kiri).
 * Sebelumnya baris ringkasan ini di bawah kartu filter — dipindah ke sini
 * atas permintaan user (2026-08-06), supaya langsung kelihatan berdampingan
 * dengan navigasi periode, bukan di section terpisah.
 */
export function PeriodTotalBox({
  label, lines, growthPct, growthAlert, growthLabel, newBusinessLabel,
}: {
  label: string
  /** Baris nilai — mis. [{ label: 'Pendapatan', text: 'Rp 10.000.000' }, ...] */
  lines: { label: string; text: string }[]
  /** Growth % — cuma dirender kalau di-isi (kotak Periode Ini). */
  growthPct?: number | null
  growthAlert?: boolean
  growthLabel?: string
  newBusinessLabel?: string
}) {
  return (
    <Box
      sx={{
        textAlign: 'center',
        minWidth: 150,
        px: 1.5,
        py: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: 'action.hover',
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      {lines.map((line) => (
        <Typography key={line.label} variant="body2" sx={{ fontWeight: 600, lineHeight: 1.5 }}>
          {line.label}: {line.text}
        </Typography>
      ))}
      {growthPct !== undefined && growthLabel && newBusinessLabel !== undefined && (
        <Box sx={{ mt: 0.75 }}>
          <TrendChip label={growthLabel} pct={growthPct} alert={!!growthAlert} newBusinessLabel={newBusinessLabel} />
        </Box>
      )}
    </Box>
  )
}
