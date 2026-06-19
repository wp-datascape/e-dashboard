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
      { pageKey: 'dashboard', ready: true },
      { pageKey: 'customers', ready: true },
      { pageKey: 'customers-expansion', ready: true },
      { pageKey: 'dormant-customer', ready: true },
      { pageKey: 'cross-selling', ready: true },
      { pageKey: 'products', ready: false },
      { pageKey: 'products-high-margin', ready: false },
      { pageKey: 'products-trend', ready: false },
      { pageKey: 'transactions', ready: false },
      { pageKey: 'projects', ready: false },
      { pageKey: 'import', ready: true },
      { pageKey: 'users', ready: true },
      { pageKey: 'rbac', ready: true },
      { pageKey: 'config', ready: true },
      { pageKey: 'audit-log', ready: false },
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