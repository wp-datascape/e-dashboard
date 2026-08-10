import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import { StatusChip } from '@/components/ui/StatusChip'

interface PeriodStripProps {
  period: string
  comparisonPeriod?: string
  activeWindow: number
}

export function PeriodStrip({ period, comparisonPeriod, activeWindow }: PeriodStripProps) {
  const { t } = useTranslation()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <StatusChip label={t('dashboard.periodStripLabel', { period })} color="default" />
      {/* Chip pembanding YoY (task026 §9, 2026-08-09) - dashboard sekarang
          pakai pembanding YoY, bukan MoM lagi, jadi periode pembandingnya
          perlu terlihat juga di sini. */}
      {comparisonPeriod && (
        <StatusChip label={t('dashboard.comparisonStripLabel', { period: comparisonPeriod })} color="default" />
      )}
      <StatusChip label={t('dashboard.activeWindowStripLabel', { months: activeWindow })} color="default" />
    </Box>
  )
}
