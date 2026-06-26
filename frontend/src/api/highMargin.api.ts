import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type {
  HighMarginMapping,
  CreateHighMarginPayload,
  UpdateHighMarginPayload,
  HighMarginListParams,
  ProductOption,
} from '@/types/highMargin'

export const highMarginApi = {
  list: async (params: HighMarginListParams): Promise<HighMarginMapping[]> => {
    const res = await api.get<ApiResponse<HighMarginMapping[]>>('/settings/high-margin', { params })
    return res.data.data
  },

  create: async (payload: CreateHighMarginPayload): Promise<HighMarginMapping> => {
    const res = await api.post<ApiResponse<HighMarginMapping>>('/settings/high-margin', payload)
    return res.data.data
  },

  update: async (id: number, payload: UpdateHighMarginPayload): Promise<HighMarginMapping> => {
    const res = await api.patch<ApiResponse<HighMarginMapping>>(`/settings/high-margin/${id}`, payload)
    return res.data.data
  },

  deactivate: async (id: number): Promise<HighMarginMapping> => {
    const res = await api.patch<ApiResponse<HighMarginMapping>>(`/settings/high-margin/${id}/deactivate`)
    return res.data.data
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/settings/high-margin/${id}`)
  },

  getProducts: async (company_id: number): Promise<ProductOption[]> => {
    const res = await api.get<ApiResponse<{ id: number; product_name: string }[]>>(
      '/products',
      { params: { company_id } }
    )
    return res.data.data.map((p) => ({ id: p.id, name: p.product_name, type: 'product' as const }))
  },

  getCategories: async (company_id: number): Promise<ProductOption[]> => {
    const res = await api.get<ApiResponse<{ id: number; name: string }[]>>(
      '/products/categories',
      { params: { company_id } }
    )
    return res.data.data.map((c) => ({ id: c.id, name: c.name, type: 'category' as const }))
  },
}
