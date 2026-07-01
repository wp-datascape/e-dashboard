import { useChannelDivisions } from './useChannelDivisions'
import { formatEnumLabel } from '@/utils/format'
import type { Division } from '@/types/customers'

export interface DivisionOption {
  value: NonNullable<Division>
  label: string
}

/** Opsi divisi untuk dropdown filter — diambil dari mapping riil di channel_divisions, bukan hardcode. */
export function useDivisionOptions(companyId: number | 'all'): DivisionOption[] {
  const { data: rows = [] } = useChannelDivisions({ company_id: companyId })
  const values = [...new Set(rows.map((r) => r.division))]
  return values.map((value) => ({ value, label: formatEnumLabel(value) }))
}
