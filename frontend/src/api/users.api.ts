// src/api/users.api.ts
import { api } from './axios';
import type { ApiResponse, ApiError } from '@/types/api';
import type { User, Company, CreateUserPayload, UpdateUserPayload } from '@/types/users';
import type { Role } from '@/types/rbac';

// Adapter — transform backend snake_case/camelCase fields to frontend User type
function adaptUser(raw: Record<string, unknown>): User {
  return {
    id: raw.id as number,
    name: raw.name as string,
    email: raw.email as string,
    // Backend uses isActive (camelCase), frontend expects is_active (snake_case)
    is_active: (raw.is_active) as boolean,
    // These fields only available after RBAC is implemented — default to empty array
    roles: (raw.roles as User['roles']) ?? [],
    companies: (raw.companies as User['companies']) ?? [],
    company_assignments: (raw.company_assignments as User['company_assignments']) ?? [],
    permissions: (raw.permissions as string[]) ?? [],
    // Backend uses lastLoginAt (camelCase), frontend expects last_login_at (snake_case)
    last_login_at: (raw.last_login_at ?? null) as string | null,
    created_at: (raw.created_at) as string,
    locked_until: (raw.locked_until ?? null) as string | null,
  };
}

export const usersApi = {
  // ─── Queries (GET) — tanpa try/catch, interceptor handle 401 ────────────────

  getUsers: async (): Promise<User[]> => {
    // Backend returns paginated: { message, data: [...], meta: { page, per_page, total } }
    const response = await api.get<{ message: string; data: Record<string, unknown>[]; meta?: unknown }>('/users');
    const rawData = response.data.data ?? [];
    return rawData.map(adaptUser);
  },

  getCompanies: async (): Promise<Company[]> => {
    const response = await api.get<ApiResponse<Company[]>>('/companies');
    return response.data.data;
  },

  getRoles: async (): Promise<Role[]> => {
    const response = await api.get<ApiResponse<Role[]>>('/roles');
    return response.data.data;
  },

  // ─── Mutations (POST/PUT/DELETE) — wajib try/catch ──────────────────────────

  createUser: async (payload: CreateUserPayload): Promise<User> => {
    try {
      const response = await api.post<ApiResponse<User>>('/users', payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  updateUser: async (id: number, payload: UpdateUserPayload): Promise<User> => {
    try {
      const response = await api.put<ApiResponse<User>>(`/users/${id}`, payload);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  deleteUser: async (id: number): Promise<void> => {
    try {
      await api.delete(`/users/${id}`);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  // Task002 Task C4 — unlock manual (reset failed_login_count/locked_until)
  unlockUser: async (id: number): Promise<User> => {
    try {
      const response = await api.post<ApiResponse<User>>(`/users/${id}/unlock`);
      return response.data.data;
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: ApiError } };
      if (axiosErr.response?.data) throw axiosErr.response.data as ApiError;
      throw err;
    }
  },

  importUsers: async (
    file: File,
    defaultPassword: string,
  ): Promise<{ added: number; skipped: number; errors: Array<{ row: number; message: string }> }> => {
    const form = new FormData();
    form.append('file', file);
    form.append('default_password', defaultPassword);
    const res = await api.post<ApiResponse<{ added: number; skipped: number; errors: Array<{ row: number; message: string }> }>>('/users/import', form);
    return res.data.data;
  },

  downloadTemplate: async (): Promise<void> => {
    const res = await api.get('/users/template', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_user.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  },
};
