import { StatusChip } from '@/components/ui'
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

const labelMap: Record<NonNullable<Division>, string> = {
  distribution: 'Distribution',
  project:      'Project',
  e_commerce:   'E-Commerce',
  intercompany: 'Intercompany',
  freelancer:   'Freelancer',
  support:      'Support',
}

export function DivisionChip({ division }: DivisionChipProps) {
  if (!division) return <StatusChip label="-" color="default" />
  return <StatusChip label={labelMap[division]} color={colorMap[division]} />
}
