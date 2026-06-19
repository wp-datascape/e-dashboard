// src/api/users.api.ts
import { api } from './axios';
import type { ApiResponse, ApiError } from '@/types/api';
import type { User, Company, CreateUserPayload, UpdateUserPayload } from '@/types/users';
import type { Role } from '@/types/rbac';

export const usersApi = {
  // ─── Queries (GET) — tanpa try/catch, interceptor handle 401 ────────────────

  getUsers: async (): Promise<User[]> => {
    const response = await api.get<ApiResponse<User[]>>('/users');
    return response.data.data;
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
};