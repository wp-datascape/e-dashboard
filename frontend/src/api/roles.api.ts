import { api } from './axios'
import type { ApiResponse, ApiError } from '@/types/api'
import type { Role, CreateRolePayload, UpdateRolePayload } from '@/types/roles'

export const rolesApi = {
  // ─── Queries (GET) ───────────────────────────────────────────────────────────

  getRoles: async (): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>('/roles')
    return response.data.data
  },

  getRoleById: async (id: number): Promise<Role> => {
    const response = await api.get<ApiResponse<Role>>(`/roles/${id}`)
    return response.data.data
  },

  // ─── Mutations (POST/PUT/DELETE) ──────────────────────────────────────────────

  createRole: async (payload: CreateRolePayload): Promise<Role> => {
    try {
      const response = await api.post<ApiResponse<Role>>('/roles', payload)
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },

  updateRole: async (id: number, payload: UpdateRolePayload): Promise<Role> => {
    try {
      const response = await api.patch<ApiResponse<Role>>(`/roles/${id}`, payload)
      return response.data.data
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },

  deleteRole: async (id: number): Promise<void> => {
    try {
      await api.delete(`/roles/${id}`)
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } }
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError
      throw err
    }
  },
}