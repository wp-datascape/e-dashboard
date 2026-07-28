export interface ItemTypeRow {
  id: number
  company_id: number
  key: string
  label: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Field minimal - dipakai dropdown filter/form (endpoint /values, aktif saja)
export interface ItemTypeOption {
  id: number
  company_id: number
  key: string
  label: string
}

export interface CreateItemTypePayload {
  company_id: number
  label: string
}

export interface UpdateItemTypePayload {
  label?: string
  is_active?: boolean
}

export interface ListItemTypesParams {
  company_id?: number | 'all'
}
