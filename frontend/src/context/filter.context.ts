import { createContext, useContext } from 'react'
import type { PeriodGranularity } from '@/hooks/usePeriodTypeFilter'

/**
 * context/filter.context.ts (task043.md, HOLDINGIT-696)
 *
 * Tipe + Context object + hook `useFilterStore` — dipisah dari
 * `FilterContext.tsx` (Provider) krn lint `react-refresh/only-export-
 * components` (file yang export komponen React HANYA boleh export
 * komponen). Pola SAMA PERSIS `auth.context.ts`/`AuthContext.tsx`.
 */
export interface StoredFilterState {
  companyId: number | 'all'
  branchId: number | 'all'
  division: number | ''
  excludeIntercompany: boolean
  periodEnd: string
  applyDateCutoff: boolean
  periodType: PeriodGranularity
  onlyPareto: boolean
}

export interface FilterContextType extends StoredFilterState {
  setCompanyId: (value: number | 'all') => void
  setBranchId: (value: number | 'all') => void
  setDivision: (value: number | '') => void
  setExcludeIntercompany: (value: boolean) => void
  setPeriodEnd: (value: string) => void
  setApplyDateCutoff: (value: boolean) => void
  setPeriodType: (value: PeriodGranularity) => void
  setOnlyPareto: (value: boolean) => void
  resetAll: () => void
}

export const FilterContext = createContext<FilterContextType | null>(null)

export function useFilterStore(): FilterContextType {
  const ctx = useContext(FilterContext)
  if (!ctx) throw new Error('useFilterStore must be used within FilterProvider')
  return ctx
}
