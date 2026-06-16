// frontend/src/mocks/handlers/page.handler.ts
import { http, HttpResponse } from 'msw';
import { ApiResponse } from '@/types/api';
import { PageSetting } from '@/types/page';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

export const pageHandlers = [
  /**
   * HANDLER: DYNAMIC PAGE SETTINGS (DATABASE TOGGLE MOCK)
   * Menggunakan BASE_URL yang sinkron dengan API client untuk mencegah kebocoran JSON
   */
  http.get(`${BASE_URL}/page-settings`, () => {
    const mockDbData: PageSetting[] = [
      { pageKey: 'dashboard', ready: true },
      { pageKey: 'cross-selling', ready: false },
      { pageKey: 'customer-metrics', ready: false },
      { pageKey: 'dormant-customer', ready: false },
      { pageKey: 'import', ready: false },
      { pageKey: 'users', ready: false },
      { pageKey: 'rbac', ready: false },
      { pageKey: 'config', ready: false },
      { pageKey: 'audit-log', ready: false },
    ];

    return HttpResponse.json<ApiResponse<PageSetting[]>>({
      message: 'Konfigurasi halaman berhasil dimuat',
      data: mockDbData,
    }, { status: 200 });
  }),
];