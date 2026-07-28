import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type {
  ItemTypeRow,
  ItemTypeOption,
  CreateItemTypePayload,
  UpdateItemTypePayload,
  ListItemTypesParams,
} from '@/types/itemTypes'

export const itemTypesApi = {
  list: async (params?: ListItemTypesParams): Promise<ItemTypeRow[]> => {
    const res = await api.get<ApiResponse<ItemTypeRow[]>>('/settings/item-types', { params })
    return res.data.data
  },

  listValues: async (companyId: number | 'all'): Promise<ItemTypeOption[]> => {
    const res = await api.get<ApiResponse<ItemTypeOption[]>>('/settings/item-types/values', {
      params: { company_id: companyId },
    })
    return res.data.data
  },

  create: async (payload: CreateItemTypePayload): Promise<ItemTypeRow> => {
    const res = await api.post<ApiResponse<ItemTypeRow>>('/settings/item-types', payload)
    return res.data.data
  },

  update: async (id: number, payload: UpdateItemTypePayload): Promise<ItemTypeRow> => {
    const res = await api.patch<ApiResponse<ItemTypeRow>>(`/settings/item-types/${id}`, payload)
    return res.data.data
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/settings/item-types/${id}`)
  },
}
