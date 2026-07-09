import { StatusChip } from '@/components/ui'
import { formatEnumLabel } from '@/utils/format'
import { getDivisionColor } from '@/utils/divisionColor'
import type { Division } from '@/types/customers'

interface DivisionChipProps {
  division: Division
}

export function DivisionChip({ division }: DivisionChipProps) {
  if (!division) return <StatusChip label="-" color="default" />
  return <StatusChip label={formatEnumLabel(division)} color={getDivisionColor(division)} />
}
