import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import { Card } from '@/components/ui'

/**
 * components/analisis/SummaryBar.tsx
 *
 * Baris ringkasan TOTAL (bukan per-baris customer) di atas tabel halaman
 * Analisis — Total Periode Lampau / Total Periode Ini / Total Perubahan
 * Nilai / Total Perubahan %, dihitung dari SELURUH customer yang lolos
 * filter (bukan cuma halaman yang sedang tampil). Layout generik (4 slot
 * konten), isi tiap slot beda antar submenu Analisis — Revenue pakai
 * MetricPair (Rev+GP), Retention pakai angka tunggal — makanya konten
 * di-pass sebagai children, bukan di-hardcode di sini.
 */
export function SummaryBar({
  comparisonLabel, periodLabel, changeValueLabel, changePercentLabel,
  comparisonContent, periodContent, changeValueContent, changePercentContent,
}: {
  comparisonLabel: string
  periodLabel: string
  changeValueLabel: string
  changePercentLabel: string
  comparisonContent: React.ReactNode
  periodContent: React.ReactNode
  changeValueContent: React.ReactNode
  changePercentContent: React.ReactNode
}) {
  const slots: [string, React.ReactNode][] = [
    [comparisonLabel, comparisonContent],
    [periodLabel, periodContent],
    [changeValueLabel, changeValueContent],
    [changePercentLabel, changePercentContent],
  ]
  return (
    <Card sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(4, 1fr)' }, gap: 2 }}>
        {slots.map(([label, content]) => (
          <Box key={label}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
              {label}
            </Typography>
            {content}
          </Box>
        ))}
      </Box>
    </Card>
  )
}
