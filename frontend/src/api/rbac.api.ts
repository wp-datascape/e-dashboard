// frontend/src/api/rbac.api.ts
import { api } from './axios';
import type { ApiResponse, ApiError } from '@/types/api';
import type { Role, Permission, CreateRolePayload, UpdateRolePermissionsPayload } from '@/types/rbac';

export const rbacApi = {
  // ─── Queries (GET) ──────────────────────────────────────────────────────────

  getRoles: async (): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>('/rbac/roles');
    return response.data.data;
  },

  getPermissions: async (): Promise<Record<string, Permission[]>> => {
    const response = await api.get<ApiResponse<Record<string, Permission[]>>>('/rbac/permissions');
    return response.data.data;
  },

  // ─── Mutations (POST/PUT/DELETE) ─────────────────────────────────────────────

  createRole: async (payload: CreateRolePayload): Promise<Role> => {
    try {
      const response = await api.post<ApiResponse<Role>>('/rbac/roles', payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  updateRole: async (id: number, payload: { description: string }): Promise<Role> => {
    try {
      const response = await api.put<ApiResponse<Role>>(`/rbac/roles/${id}`, payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  deleteRole: async (id: number): Promise<void> => {
    try {
      await api.delete(`/rbac/roles/${id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  updateRolePermissions: async (id: number, payload: UpdateRolePermissionsPayload): Promise<Role> => {
    try {
      const response = await api.put<ApiResponse<Role>>(`/rbac/roles/${id}/permissions`, payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },
};