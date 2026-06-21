// frontend/src/api/rbac.api.ts
import { api } from './axios';
import type { ApiResponse, ApiError } from '@/types/api';
import type { Role, Permission, CreateRolePayload, UpdateRolePermissionsPayload, CreatePermissionPayload, UpdatePermissionPayload } from '@/types/rbac';

export const rbacApi = {
  // ─── Queries (GET) ──────────────────────────────────────────────────────────

  getRoles: async (): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>('/roles');
    return response.data.data;
  },

  getPermissions: async (): Promise<Record<string, Permission[]>> => {
    const response = await api.get<ApiResponse<Permission[]>>('/permissions');
    // Group permissions by category for frontend
    const perms = response.data.data as (Permission & { category?: string })[];
    const grouped: Record<string, Permission[]> = {};
    for (const p of perms) {
      const cat = p.category ?? 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    }
    return grouped;
  },

  // ─── Mutations (POST/PUT/DELETE) ─────────────────────────────────────────────

  createRole: async (payload: CreateRolePayload): Promise<Role> => {
    try {
      const response = await api.post<ApiResponse<Role>>('/roles', payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  updateRole: async (id: number, payload: { description: string }): Promise<Role> => {
    try {
      const response = await api.put<ApiResponse<Role>>(`/roles/${id}`, payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  deleteRole: async (id: number): Promise<void> => {
    try {
      await api.delete(`/roles/${id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  updateRolePermissions: async (id: number, payload: UpdateRolePermissionsPayload): Promise<Role> => {
    try {
      const response = await api.put<ApiResponse<Role>>(`/permissions/roles/${id}/permissions`, payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  // ─── Permission CRUD ─────────────────────────────────────────────────────────

  createPermission: async (payload: CreatePermissionPayload): Promise<Permission> => {
    try {
      const response = await api.post<ApiResponse<Permission>>('/permissions', payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  updatePermission: async (id: number, payload: UpdatePermissionPayload): Promise<Permission> => {
    try {
      const response = await api.put<ApiResponse<Permission>>(`/permissions/${id}`, payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  deletePermission: async (id: number): Promise<void> => {
    try {
      await api.delete(`/permissions/${id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },
};
