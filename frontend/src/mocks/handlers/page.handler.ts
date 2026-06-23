// frontend/src/mocks/handlers/page.handler.ts
import { http, HttpResponse } from 'msw';
import type { ApiResponse } from '@/types/api';
import type { PageSetting, ConfigItem } from '@/types/page';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ─── Mock config data (per-BU dormant thresholds) ────────────────────────────
const mockConfigData: ConfigItem[] = [
  {
    key: 'active_window_months',
    value: '3',
    description: 'Window bulan aktif: customer dianggap aktif jika ada transaksi dalam N bulan terakhir',
  },
  {
    key: 'dormant_threshold_months.b2b_dc',
    value: '3',
    description: 'Threshold dormant untuk B2B DC (bulan)',
  },
  {
    key: 'dormant_threshold_months.b2b_project',
    value: '12',
    description: 'Threshold dormant untuk B2B Project (bulan) — cycle project lebih panjang',
  },
  {
    key: 'dormant_threshold_months.b2c',
    value: '6',
    description: 'Threshold dormant untuk B2C (bulan)',
  },
  {
    key: 'dormant_threshold_months.manufacturing',
    value: '6',
    description: 'Threshold dormant untuk Manufacturing (bulan)',
  },
];

export const pageHandlers = [
  // GET /page-settings — page ready flags
  http.get(`${BASE_URL}/page-settings`, () => {
    const mockDbData: PageSetting[] = [
      { page_key: 'dashboard', ready: true },
      { page_key: 'customers', ready: true },
      { page_key: 'customers-expansion', ready: true },
      { page_key: 'dormant-customer', ready: true },
      { page_key: 'cross-selling', ready: true },
      { page_key: 'products', ready: true },
      { page_key: 'products-high-margin', ready: true },
      { page_key: 'products-trend', ready: true },
      { page_key: 'transactions', ready: true },
       { page_key: 'projects', ready: false },
       { page_key: 'import', ready: true },
       { page_key: 'users', ready: true },
       { page_key: 'rbac', ready: true },
       { page_key: 'config', ready: true },
       { page_key: 'audit-log', ready: true },
       { page_key: 'companies', ready: true },
    ];

    return HttpResponse.json<ApiResponse<PageSetting[]>>({
      message: 'Konfigurasi halaman berhasil dimuat',
      data: mockDbData,
    }, { status: 200 });
  }),

  // GET /config — list all config items
  http.get(`${BASE_URL}/config`, () => {
    return HttpResponse.json<ApiResponse<ConfigItem[]>>({
      message: 'Success',
      data: mockConfigData,
    });
  }),

  // PUT /config/:key — update one config value
  http.put(`${BASE_URL}/config/:key`, async ({ params, request }) => {
    const key = decodeURIComponent(params.key as string);
    const body = (await request.json()) as { value: string };
    const item = mockConfigData.find((c) => c.key === key);
    if (!item) {
      return HttpResponse.json({ message: 'Config key not found' }, { status: 404 });
    }
    item.value = body.value;
    return HttpResponse.json<ApiResponse<ConfigItem>>({
      message: 'Config updated',
      data: item,
    });
  }),
];