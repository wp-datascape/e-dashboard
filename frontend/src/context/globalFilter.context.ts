import { createContext, useContext } from 'react'
import type { useScopedCompanyFilter } from '@/hooks/useScopedCompanyFilter'
import type { KpiPeriodType } from '@/utils/analisisPeriod'

// ─── Types ────────────────────────────────────────────────────────────────────
// SIAPA (task026 Fase 1) — shape SAMA PERSIS dengan return
// useScopedCompanyFilter(), cuma dipindah dari "dipanggil per halaman" jadi
// "dipanggil sekali di Provider". KAPAN (task026 Fase 2) — periodType+endDate,
// pola yang sama dengan state lokal `KpiFilterBar` yang sebelumnya di-declare
// sendiri-sendiri di tiap halaman (`useState<KpiPeriodType>('quarter')` +
// `useState<string>(todayIsoDate())`) — sekarang 1 instance dibagi semua
// halaman. Halaman existing migrasi cukup ganti sumber state, TIDAK ada
// perubahan nama field (companyId/branchId/... /periodType/endDate identik).
export type GlobalFilterContextType = ReturnType<typeof useScopedCompanyFilter> & {
  periodType: KpiPeriodType
  setPeriodType: (v: KpiPeriodType) => void
  endDate: string
  setEndDate: (v: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────
export const GlobalFilterContext = createContext<GlobalFilterContextType | null>(null)

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useGlobalFilter() {
  const ctx = useContext(GlobalFilterContext)
  if (!ctx) throw new Error('useGlobalFilter must be used within GlobalFilterProvider')
  return ctx
}
