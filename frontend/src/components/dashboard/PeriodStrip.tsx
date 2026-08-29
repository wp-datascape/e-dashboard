import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import { StatusChip } from '@/components/ui/StatusChip'

interface PeriodStripProps {
  period: string
}

// Sebelumnya juga menampilkan chip "Active Window" (activeMonths dari
// business_configs) di sebelah chip Period ini — dihapus (2026-08-29, user
// tanya baliknya membingungkan: dikira ikut granularitas filter, padahal
// ambang tetap kohort "Existing" yang SENGAJA dikunci, lihat task026 §8e).
// Bukan info yang perlu dilihat user tiap saat, chip-nya dibuang daripada
// dipertahankan setengah-benar.
export function PeriodStrip({ period }: PeriodStripProps) {
  const { t } = useTranslation()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <StatusChip label={t('dashboard.periodStripLabel', { period })} color="default" />
    </Box>
  )
}
