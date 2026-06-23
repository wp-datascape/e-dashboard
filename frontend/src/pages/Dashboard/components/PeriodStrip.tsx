import Box from '@mui/material/Box'
import { StatusChip } from '@/components/ui/StatusChip'

interface PeriodStripProps {
  period: string
  activeWindow: number
}

export function PeriodStrip({ period, activeWindow }: PeriodStripProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
      <StatusChip label={`Periode: ${period}`} color="default" />
      <StatusChip label={`Window Aktif: ${activeWindow} bulan`} color="default" />
    </Box>
  )
}