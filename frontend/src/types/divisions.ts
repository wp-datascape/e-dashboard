// 4 kategori threshold dormant customer TETAP (bukan dinamis) — lihat
// docs-v2/task/task012.md §1
export const DORMANT_CATEGORY_VALUES = ['b2b_dc', 'b2b_project', 'b2c', 'manufacturing'] as const
export type DormantCategory = (typeof DORMANT_CATEGORY_VALUES)[number]

export interface DivisionRow {
  id: number
  company_id: number
  // NULL = company-wide (semua branch), diisi = spesifik 1 branch (task012 v2)
  branch_id: number | null
  key: string
  label: string
  dormant_category: DormantCategory
  is_protected: boolean
  is_active: boolean
  created_at: string
  updated_at: string
}

// Field minimal - dipakai dropdown filter/form (endpoint /values, aktif saja)
export interface DivisionOption {
  id: number
  company_id: number
  branch_id: number | null
  key: string
  label: string
  dormant_category: DormantCategory
}

export interface CreateDivisionPayload {
  company_id: number
  branch_id?: number | null
  label: string
  dormant_category: DormantCategory
}

export interface UpdateDivisionPayload {
  label?: string
  dormant_category?: DormantCategory
  is_active?: boolean
}

export interface ListDivisionsParams {
  company_id?: number | 'all'
}
