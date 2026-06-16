import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { ApiError } from '@/types/api';

let csrfToken: string | null = null;

export const setCsrfToken = (token: string | null): void => {
  csrfToken = token;
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  withCredentials: true, // Wajib agar HttpOnly Cookie dikirim otomatis oleh browser
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Otomatis pasang CSRF Token untuk POST/PUT/PATCH/DELETE
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase();
    const isMutation = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    if (isMutation && csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Menangani global error catch secara centralized
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError<ApiError>) => {
    // Jika sesi habis, hapus token lokal dan paksa kembali ke login
    if (error.response?.status === 401) {
      setCsrfToken(null);
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = `/login?expired=true&returnTo=${encodeURIComponent(window.location.pathname)}`;
      }
    }

    // Memastikan data error yang dilempar balik berformat ApiError (Bukan struktur AxiosError mentah)
    return Promise.reject(
      error.response?.data || {
        error: 'INTERNAL_SERVER_ERROR',
        message: error.message || 'Koneksi jaringan terputus.',
      }
    );
  }
);