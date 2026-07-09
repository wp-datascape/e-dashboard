import { useDivisionValues } from './useChannelDivisions'
import { formatEnumLabel } from '@/utils/format'

export interface DivisionOption {
  value: string
  label: string
}

/**
 * Opsi divisi untuk dropdown filter — diambil dari katalog `divisions` dinamis
 * per company/branch (task004/task005), bukan hardcode.
 *
 * branchId opsional: kalau diisi, opsi menyempit ke divisi branch itu +
 * company-wide; kalau kosong, union semua branch di company itu.
 */
export function useDivisionOptions(companyId: number | 'all', branchId?: number): DivisionOption[] {
  const { data: values = [] } = useDivisionValues(companyId, branchId)
  return values.map((value) => ({ value, label: formatEnumLabel(value) }))
}
