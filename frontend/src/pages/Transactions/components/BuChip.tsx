import Typography from '@mui/material/Typography'
import { StatusChip } from '@/components/ui'
import type { BusinessUnit } from '@/types/customers'

interface BuChipProps {
  bu: BusinessUnit
}

export function BuChip({ bu }: BuChipProps) {
  if (!bu) return <Typography variant="body2" color="text.disabled">—</Typography>
  const map: Record<NonNullable<BusinessUnit>, { label: string; color: 'primary' | 'info' | 'success' | 'warning' }> = {
    b2b_dc: { label: 'B2B DC', color: 'primary' },
    b2b_project: { label: 'B2B Project', color: 'info' },
    b2c: { label: 'B2C', color: 'success' },
    manufacturing: { label: 'Manufacturing', color: 'warning' },
  }
  const { label, color } = map[bu]
  return <StatusChip label={label} color={color} />
}