import { api } from './axios'
import type { ApiResponse } from '@/types/api'
import type {
  CompanyBranch,
  AccurateCredential,
  AccurateCredentialsPayload,
  AccurateTestResult,
} from '@/types/accurate'

export const accurateApi = {
  // ─── Branches ─────────────────────────────────────────────────────────────
  getBranchesByCompany: async (companyId: number): Promise<CompanyBranch[]> => {
    const response = await api.get<ApiResponse<CompanyBranch[]>>(`/companies/${companyId}/branches`)
    return response.data.data
  },

  // ─── Credentials ─────────────────────────────────────────────────────────
  getCredentials: async (branchId: number): Promise<AccurateCredential> => {
    const response = await api.get<ApiResponse<AccurateCredential>>(
      `/config/accurate/credentials/${branchId}`,
    )
    return response.data.data
  },

  saveCredentials: async (payload: AccurateCredentialsPayload): Promise<AccurateCredential> => {
    try {
      const response = await api.put<ApiResponse<AccurateCredential>>(
        `/config/accurate/credentials/${payload.branch_id}`,
        payload,
      )
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      if (axiosErr.response?.data) throw axiosErr.response.data
      throw err
    }
  },

  testConnection: async (payload: AccurateCredentialsPayload): Promise<AccurateTestResult> => {
    try {
      const response = await api.post<ApiResponse<AccurateTestResult>>(
        '/config/accurate/test-connection',
        payload,
      )
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { message?: string } } }
      if (axiosErr.response?.data) throw axiosErr.response.data
      throw err
    }
  },
}