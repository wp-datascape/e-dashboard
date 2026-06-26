import Typography from '@mui/material/Typography'
import { StatusChip } from '@/components/ui'
import type { Division } from '@/types/customers'

interface BuChipProps {
  bu: Division
}

const map: Record<NonNullable<Division>, { label: string; color: 'primary' | 'info' | 'success' | 'warning' | 'error' | 'default' }> = {
  distribution: { label: 'Distribution', color: 'primary' },
  project:      { label: 'Project', color: 'info' },
  e_commerce:   { label: 'E-Commerce', color: 'success' },
  intercompany: { label: 'Intercompany', color: 'warning' },
  freelancer:   { label: 'Freelancer', color: 'error' },
  support:      { label: 'Support', color: 'default' },
}

export function BuChip({ bu }: BuChipProps) {
  if (!bu) return <Typography variant="body2" color="text.disabled">—</Typography>
  const entry = map[bu]
  if (!entry) return <StatusChip label={bu} color="default" />
  return <StatusChip label={entry.label} color={entry.color} />
}
