import Typography from '@mui/material/Typography'
import { StatusChip } from '@/components/ui'
import { formatEnumLabel } from '@/utils/format'
import type { Division } from '@/types/customers'

interface BuChipProps {
  bu: Division
}

const colorMap: Record<NonNullable<Division>, 'primary' | 'info' | 'success' | 'warning' | 'error' | 'default'> = {
  distribution: 'primary',
  project:      'info',
  e_commerce:   'success',
  intercompany: 'warning',
  freelancer:   'error',
  support:      'default',
}

export function BuChip({ bu }: BuChipProps) {
  if (!bu) return <Typography variant="body2" color="text.disabled">—</Typography>
  return <StatusChip label={formatEnumLabel(bu)} color={colorMap[bu] ?? 'default'} />
}
