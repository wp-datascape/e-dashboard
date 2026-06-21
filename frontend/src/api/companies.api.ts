import { api } from './axios'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Company, CreateCompanyPayload, UpdateCompanyPayload } from '@/types/companies'

export const companiesApi = {
  // ─── Queries (GET) ───────────────────────────────────────────────────────────

  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get<ApiResponse<Company[]>>('/companies')
    return response.data.data
  },

  getCompanyById: async (id: number): Promise<Company> => {
    const response = await api.get<ApiResponse<Company>>(`/companies/${id}`)
    return response.data.data
  },

  // ─── Mutations (POST/PUT/DELETE) ──────────────────────────────────────────────

  createCompany: async (payload: CreateCompanyPayload): Promise<Company> => {
    try {
      const response = await api.post<ApiResponse<Company>>('/companies', payload)
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },

  updateCompany: async (id: number, payload: UpdateCompanyPayload): Promise<Company> => {
    try {
      const response = await api.patch<ApiResponse<Company>>(`/companies/${id}`, payload)
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },

  deleteCompany: async (id: number): Promise<void> => {
    try {
      await api.delete(`/companies/${id}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },
}