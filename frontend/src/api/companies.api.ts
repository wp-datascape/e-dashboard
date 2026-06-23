import { api } from './axios'
import type { ApiResponse, ApiError } from '@/types/api'
import type {
  Company,
  CompanyBranch,
  CreateCompanyPayload,
  UpdateCompanyPayload,
  CreateBranchPayload,
  UpdateBranchPayload,
} from '@/types/companies'

export const companiesApi = {
  // ─── Company Queries ──────────────────────────────────────────────────────────

  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get<ApiResponse<Company[]>>('/companies')
    return response.data.data
  },

  getCompanyById: async (id: number): Promise<Company> => {
    const response = await api.get<ApiResponse<Company>>(`/companies/${id}`)
    return response.data.data
  },

  // ─── Company Mutations ────────────────────────────────────────────────────────

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

  // ─── Branch Queries ──────────────────────────────────────────────────────────

  getBranchesByCompany: async (companyId: number): Promise<CompanyBranch[]> => {
    const response = await api.get<ApiResponse<CompanyBranch[]>>(`/companies/${companyId}/branches`)
    return response.data.data
  },

  // ─── Branch Mutations ─────────────────────────────────────────────────────────

  createBranch: async (companyId: number, payload: CreateBranchPayload): Promise<CompanyBranch> => {
    try {
      const response = await api.post<ApiResponse<CompanyBranch>>(`/companies/${companyId}/branches`, payload)
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },

  updateBranch: async (branchId: number, companyId: number, payload: UpdateBranchPayload): Promise<CompanyBranch> => {
    try {
      const response = await api.patch<ApiResponse<CompanyBranch>>(`/companies/branches/${branchId}?company_id=${companyId}`, payload)
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },

  deleteBranch: async (branchId: number, companyId: number): Promise<void> => {
    try {
      await api.delete(`/companies/branches/${branchId}?company_id=${companyId}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },
}