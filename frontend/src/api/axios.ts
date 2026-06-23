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

/**
 * HTTP Request Logger — menampilkan log HTTP request/response ke browser console.
 * Format request  : [HTTP] → :method :url
 * Format response : [HTTP] ← :method :url :status :duration ms
 * Format error    : [HTTP] ✗ :method :url :status :duration ms - :message
 *
 * Hanya aktif di development (import.meta.env.DEV).
 */
const HTTP_STYLE = 'color:#8b5cf6;font-weight:bold';   // purple
const METHOD_COLORS: Record<string, string> = {
  GET: 'color:#22c55e;font-weight:bold',    // green
  POST: 'color:#3b82f6;font-weight:bold',   // blue
  PUT: 'color:#f59e0b;font-weight:bold',    // amber
  PATCH: 'color:#f59e0b;font-weight:bold',  // amber
  DELETE: 'color:#ef4444;font-weight:bold', // red
};

// WeakMap untuk menyimpan start time per config — type-safe, tanpa `any`
const requestTimers = new WeakMap<InternalAxiosRequestConfig, number>();

function logRequest(method: string, url: string): void {
  const methodColor = METHOD_COLORS[method] ?? 'color:#94a3b8;font-weight:bold';
  console.groupCollapsed(`%c[HTTP] → %c${method}%c ${url}`, HTTP_STYLE, methodColor, 'color:inherit');
  console.trace('Request initiated');
  console.groupEnd();
}

function logResponse(method: string, url: string, status: number, duration: number): void {
  const methodColor = METHOD_COLORS[method] ?? 'color:#94a3b8;font-weight:bold';
  const statusColor = status >= 500 ? 'color:#ef4444' : status >= 400 ? 'color:#f59e0b' : 'color:#22c55e';
  console.log(
    `%c[HTTP] ← %c${method}%c ${url} %c${status}%c ${duration}ms`,
    HTTP_STYLE,
    methodColor,
    'color:inherit',
    statusColor,
    'color:#94a3b8',
  );
}

function logError(method: string, url: string, status: number, duration: number, message: string): void {
  const methodColor = METHOD_COLORS[method] ?? 'color:#94a3b8;font-weight:bold';
  console.log(
    `%c[HTTP] ✗ %c${method}%c ${url} %c${status}%c ${duration}ms - ${message}`,
    HTTP_STYLE,
    methodColor,
    'color:inherit',
    'color:#ef4444;font-weight:bold',
    'color:#94a3b8',
  );
}

// Request Interceptor: Log request + pasang CSRF Token untuk POST/PUT/PATCH/DELETE
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const method = config.method?.toUpperCase() ?? 'UNKNOWN';
    const url = config.url ?? '';

    // Log request ke console — hanya development
    if (import.meta.env.DEV) {
      logRequest(method, url);
    }

    // Pasang CSRF Token untuk mutasi
    const isMutation = method && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (isMutation && csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    }

    // Simpan timestamp untuk hitung durasi — pakai WeakMap, type-safe
    requestTimers.set(config, Date.now());

    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response Interceptor: Log response + error handling centralized
api.interceptors.response.use(
  (response: AxiosResponse) => {
    const method = response.config.method?.toUpperCase() ?? 'UNKNOWN';
    const url = response.config.url ?? '';
    const status = response.status;
    const startTime = requestTimers.get(response.config);
    const duration = startTime ? Date.now() - startTime : 0;

    // Log response sukses ke console — hanya development
    if (import.meta.env.DEV) {
      logResponse(method, url, status, duration);
    }

    return response;
  },
  (error: AxiosError<ApiError>) => {
    const method = error.config?.method?.toUpperCase() ?? 'UNKNOWN';
    const url = error.config?.url ?? '';
    const status = error.response?.status ?? 0;
    const startTime = error.config ? requestTimers.get(error.config) : undefined;
    const duration = startTime ? Date.now() - startTime : 0;
    const message = error.response?.data?.message ?? error.message;

    // Log error ke console — hanya development
    if (import.meta.env.DEV) {
      logError(method, url, status, duration, message);
    }

    // Jika sesi habis, hapus token lokal dan paksa kembali ke login
    if (status === 401) {
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
