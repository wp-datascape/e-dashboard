// frontend/src/mocks/handlers/auth.handler.ts
import { http, HttpResponse } from 'msw';
import { ApiResponse } from '@/types/api';
import { LoginResponse, User } from '@/types/auth';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Seed Data Auth
const MOCK_USER: User = {
  id: '018fec3b-7b21-7abc-9def-0123456789ab', // UUIDv7 sortable style
  name: 'Wahyu Prasetyo Priyo',
  email: 'admin@example.com',
  role: 'superadmin',
};

// Full superadmin permissions — semua menu:* aktif
const MOCK_PERMISSIONS = [
  'metrics:menu', 'metrics:view',
  'customers:menu', 'customers:view', 'customers:input', 'customers:update', 'customers:delete',
  'products:menu', 'products:view', 'products:input', 'products:update', 'products:delete',
  'transactions:menu', 'transactions:view', 'transactions:input', 'transactions:update', 'transactions:delete',
  'import:menu', 'import:view', 'import:input',
  'users:menu', 'users:view', 'users:input', 'users:update', 'users:delete',
  'rbac:menu', 'rbac:view', 'rbac:input', 'rbac:update', 'rbac:delete',
  'config:menu', 'config:view', 'config:update',
  'audit:menu', 'audit:view',
  'companies:manage',
];

export const authHandlers = [
  /**
   * 1. HANDLER: LOGIN
   */
  http.post(`${BASE_URL}/auth/login`, async ({ request }) => {
    const body = (await request.json()) as { email?: string; password?: string };

    if (body.email === 'admin@example.com' && body.password === 'password') {
      sessionStorage.setItem('mock_auth_session', JSON.stringify(MOCK_USER));

      return HttpResponse.json<ApiResponse<LoginResponse>>({
        message: 'Login berhasil',
        data: {
          success: true,
          csrf_token: 'mock-csrf-token-secure-12345',
          data: {
            token: 'mock-jwt-token-secure-xyz',
            user: MOCK_USER,
            permissions: MOCK_PERMISSIONS,
          },
        },
      }, { status: 200 });
    }

    return HttpResponse.json(
      {
        error: 'UNAUTHORIZED',
        message: 'Email atau password yang Anda masukkan salah.',
      },
      { status: 401 }
    );
  }),

  /**
   * 2. HANDLER: GET CURRENT SESSION (ME)
   */
  http.get(`${BASE_URL}/auth/me`, () => {
    const session = sessionStorage.getItem('mock_auth_session');

    if (!session) {
      return HttpResponse.json(
        {
          error: 'UNAUTHORIZED',
          message: 'Sesi Anda telah berakhir, silakan login kembali.',
        },
        { status: 401 }
      );
    }

    const user = JSON.parse(session) as User;

    return HttpResponse.json<ApiResponse<{ user: User }>>({
      message: 'Sesi aktif ditemukan',
      data: {
        user,
      },
    }, { status: 200 });
  }),

  /**
   * 3. HANDLER: LOGOUT
   */
  http.post(`${BASE_URL}/auth/logout`, () => {
    sessionStorage.removeItem('mock_auth_session');

    return HttpResponse.json<ApiResponse>({
      message: 'Logout berhasil',
      data: {},
    }, { status: 200 });
  }),
];