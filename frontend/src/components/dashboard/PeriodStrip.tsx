import Box from '@mui/material/Box'
import { useTranslation } from 'react-i18next'
import { StatusChip } from '@/components/ui/StatusChip'

interface PeriodStripProps {
  period: string
  activeWindow: number
}

export function PeriodStrip({ period, activeWindow }: PeriodStripProps) {
  const { t } = useTranslation()
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <StatusChip label={t('dashboard.periodStripLabel', { period })} color="default" />
      <StatusChip label={t('dashboard.activeWindowStripLabel', { months: activeWindow })} color="default" />
    </Box>
  )
}
