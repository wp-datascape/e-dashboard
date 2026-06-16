import { api, setCsrfToken } from './axios';
import { ApiResponse, ApiError } from '@/types/api'; 
import { LoginResponse, User } from '@/types/auth';

export interface LoginInput {
  email: string;
  password: string;
}

export const authApi = {
  login: async (credentials: LoginInput): Promise<LoginResponse> => {
    try {
      const response = await api.post<ApiResponse<LoginResponse>>('/auth/login', credentials);
      const { csrf_token } = response.data.data;
      
      setCsrfToken(csrf_token);
      return response.data.data;
    } catch (err: any) {
       if (err.response && err.response.data) {
        throw err.response.data as ApiError;
      }
      throw err;
    }
  },

  me: async (): Promise<User> => {
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
    setCsrfToken(null);
  },
};