import Typography from '@mui/material/Typography'
import { StatusChip } from '@/components/ui'
import { formatEnumLabel } from '@/utils/format'
import { getDivisionColor } from '@/utils/divisionColor'
import type { Division } from '@/types/customers'

interface BuChipProps {
  bu: Division
}

export function BuChip({ bu }: BuChipProps) {
  if (!bu) return <Typography variant="body2" color="text.disabled">—</Typography>
  return <StatusChip label={formatEnumLabel(bu)} color={getDivisionColor(bu)} />
}
