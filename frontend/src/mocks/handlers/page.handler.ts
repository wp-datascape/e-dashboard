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
      { pageKey: 'customers', ready: false },
      { pageKey: 'customers-expansion', ready: true }, // customer-metrics
      { pageKey: 'dormant-customer', ready: true },
      { pageKey: 'cross-selling', ready: true },
      { pageKey: 'products', ready: false },
      { pageKey: 'products-high-margin', ready: false },
      { pageKey: 'products-trend', ready: false },
      { pageKey: 'transactions', ready: false },
      { pageKey: 'projects', ready: false },
      { pageKey: 'import', ready: false },
      { pageKey: 'users', ready: false },
      { pageKey: 'rbac', ready: true },
      { pageKey: 'config', ready: true },
      { pageKey: 'audit-log', ready: false },
    ];

    return HttpResponse.json<ApiResponse<PageSetting[]>>({
      message: 'Konfigurasi halaman berhasil dimuat',
      data: mockDbData,
    }, { status: 200 });
  }),
];