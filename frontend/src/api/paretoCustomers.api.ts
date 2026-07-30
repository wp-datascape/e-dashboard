import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type {
  ParetoCustomerRow,
  CreateParetoCustomerPayload,
  UpdateParetoCustomerPayload,
  ListParetoCustomersParams,
  ParetoCustomerOption,
} from '@/types/paretoCustomers'

export const paretoCustomersApi = {
  list: async (params: ListParetoCustomersParams): Promise<ParetoCustomerRow[]> => {
    const res = await api.get<ApiResponse<ParetoCustomerRow[]>>('/settings/pareto-customers', { params })
    return res.data.data
  },

  create: async (payload: CreateParetoCustomerPayload): Promise<ParetoCustomerRow> => {
    const res = await api.post<ApiResponse<ParetoCustomerRow>>('/settings/pareto-customers', payload)
    return res.data.data
  },

  update: async (id: number, payload: UpdateParetoCustomerPayload): Promise<ParetoCustomerRow> => {
    const res = await api.patch<ApiResponse<ParetoCustomerRow>>(`/settings/pareto-customers/${id}`, payload)
    return res.data.data
  },

  deactivate: async (id: number): Promise<ParetoCustomerRow> => {
    const res = await api.patch<ApiResponse<ParetoCustomerRow>>(`/settings/pareto-customers/${id}/deactivate`)
    return res.data.data
  },

  remove: async (id: number): Promise<void> => {
    await api.delete(`/settings/pareto-customers/${id}`)
  },

  customerOptions: async (companyId: number): Promise<ParetoCustomerOption[]> => {
    const res = await api.get<ApiResponse<ParetoCustomerOption[]>>('/settings/pareto-customers/customer-options', {
      params: { company_id: companyId },
    })
    return res.data.data
  },
}
