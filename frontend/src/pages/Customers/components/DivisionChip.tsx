import { StatusChip } from '@/components/ui'
import { formatEnumLabel } from '@/utils/format'
import type { Division } from '@/types/customers'

interface DivisionChipProps {
  division: Division
}

const colorMap: Record<NonNullable<Division>, 'default' | 'info' | 'success' | 'warning' | 'error' | 'primary'> = {
  distribution: 'primary',
  project:      'info',
  e_commerce:   'success',
  intercompany: 'warning',
  freelancer:   'error',
  support:      'default',
}

export function DivisionChip({ division }: DivisionChipProps) {
  if (!division) return <StatusChip label="-" color="default" />
  return <StatusChip label={formatEnumLabel(division)} color={colorMap[division] ?? 'default'} />
}
