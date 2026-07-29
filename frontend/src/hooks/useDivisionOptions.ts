import { useActiveDivisions } from './useDivisions'
import { useCompanies } from './useCompanies'

export interface DivisionFilterOption {
  value: number
  label: string
}

/**
 * Opsi divisi untuk dropdown filter — diambil dari katalog `divisions` per company
 * (task012 v2, FK-based), bukan dari distinct value channel_divisions lagi.
 * `value` sekarang division_id (number), bukan string key.
 *
 * companyId='all' (union lintas company, mis. filter Dashboard saat Entitas="Semua") —
 * label di-prefix singkatan nama company (mis. "MKO-Distribution") supaya user bisa
 * bedakan "Distribution" milik company mana, karena ID-nya beda per company (bukan
 * kategori yang sama dibagi bersama, lihat docs-v2/task/task012.md §2d).
 */
export function useDivisionOptions(companyId: number | 'all'): DivisionFilterOption[] {
  const { data: values = [] } = useActiveDivisions(companyId)
  const { data: companies = [] } = useCompanies()

  if (companyId !== 'all' || companies.length <= 1) {
    return values.map((v) => ({ value: v.id, label: v.label }))
  }

  const abbrByCompanyId = new Map(companies.map((c) => [c.id, c.code.replace(/^PT\s+/i, '')]))
  return values.map((v) => {
    const abbr = abbrByCompanyId.get(v.company_id)
    return { value: v.id, label: abbr ? `${abbr}-${v.label}` : v.label }
  })
}
