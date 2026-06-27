// frontend/src/mocks/handlers/metrics.handler.ts
import { http, HttpResponse } from 'msw';
import type { ApiResponse } from '@/types/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// ─── Helper ───────────────────────────────────────────────────────────────────
function months12() {
  return [
    '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09',
    '2024-10', '2024-11', '2024-12', '2025-01', '2025-02', '2025-03',
  ];
}

// ─── Cross Selling (M1 + M1.1 + M2) ──────────────────────────────────────────
const crossSellingTrend = months12().map((month, i) => ({
  month,
  total_active: 80 + i * 2,
  multi_product: Math.round((80 + i * 2) * (0.16 + i * 0.006)),
  ratio: parseFloat((16 + i * 0.6).toFixed(1)),
  avg_category: parseFloat((1.3 + i * 0.04).toFixed(2)),
}));

const crossSellingDetail = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  customer_code: `CUST-${String(i + 1).padStart(4, '0')}`,
  customer_name: `PT. Customer ${i + 1}`,
  hardware: i % 3 !== 0,
  consumable: i % 2 === 0,
  service: i % 5 === 0,
  category_count: (i % 3) + 1,
  total_revenue: (i + 1) * 1_500_000 + Math.round((i * 37) * 500_000 * 0.01),
}));

// M1.1: Heatmap — Customer × Product Category
const PRODUCT_CATEGORIES = ['Scanner', 'Printer', 'Label', 'Ribbon', 'POS'];

// Deterministic pseudo-random using index to avoid Math.random() changing on reload
const heatmapData = Array.from({ length: 15 }, (_, i) => ({
  customer: `PT. Customer ${i + 1}`,
  values: {
    Scanner:  (i * 7 + 3) % 5 !== 0 ? (i % 4) + 1 : 0,
    Printer:  (i * 3 + 1) % 4 !== 0 ? (i % 6) + 2 : 0,
    Label:    (i * 5 + 2) % 3 !== 0 ? (i % 3) + 1 : 0,
    Ribbon:   (i * 2 + 4) % 5 !== 0 ? (i % 5) + 1 : 0,
    POS:      (i * 9 + 1) % 6 !== 0 ? (i % 2) + 1 : 0,
  },
}));

// Customer Metrics (M3–M7) tidak di-mock lagi — gunakan real backend API
// GET /api/v1/metrics/customer-metrics

// ─── Dormant Customer (M8–M10) ────────────────────────────────────────────────
const dormantTrend = months12().map((month, i) => ({
  month,
  total_existing:   500 + i * 5,
  dormant_count:    Math.round((500 + i * 5) * (0.12 - i * 0.003)),
  dormant_rate:     parseFloat((12 - i * 0.3).toFixed(1)),
  dormant_prev:     Math.round((500 + i * 5) * 0.12),
  reactivated:      5 + i,
  reactivation_rate: parseFloat((8 + i * 0.4).toFixed(1)),
}));

const dormantDetail = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  customer_code:         `CUST-${String(i + 101).padStart(4, '0')}`,
  customer_name:         `PT. Dormant Customer ${i + 1}`,
  last_transaction_date: `202${3 + (i % 2)}-0${(i % 9) + 1}-15`,
  months_dormant:        3 + (i % 8),
  avg_monthly_revenue:   (i + 1) * 1_200_000,
  estimated_lost_value:  (i + 1) * 1_200_000 * (3 + (i % 8)),
  status:                i % 4 === 0 ? 'reactivated' : 'dormant',
}));

// M9: Dormant Value Ranking — sorted descending by estimated_lost_value
const dormantValueRanking = [...dormantDetail]
  .filter((d) => d.status === 'dormant')
  .sort((a, b) => b.estimated_lost_value - a.estimated_lost_value)
  .slice(0, 10)
  .map((d) => ({
    customer_name:       d.customer_name.replace('PT. Dormant Customer ', 'PT. Cust '),
    estimated_lost_value: d.estimated_lost_value,
    months_dormant:      d.months_dormant,
  }));

// M10: Reactivation Bullet Chart — current value + target band
const reactivationCurrent = {
  value:       parseFloat(dormantTrend.at(-1)!.reactivation_rate.toFixed(1)),
  target_low:  15,
  target_high: 20,
};

// ─── Handlers ─────────────────────────────────────────────────────────────────

// M1 + M1.1 + M2: Cross Selling (still mock)
export const crossSellingHandlers = [
  http.get(`${BASE_URL}/metrics/cross-selling`, () =>
    HttpResponse.json<ApiResponse<unknown>>({
      message: 'OK',
      data: {
        trend:      crossSellingTrend,
        detail:     crossSellingDetail,
        heatmap:    heatmapData,
        categories: PRODUCT_CATEGORIES,
      },
    })
  ),
];

// M3–M7: Customer Metrics — DISABLED, uses real backend API
// export const customerMetricsHandlers = [ ... ]

// M8–M10: Dormant Customer (still mock)
export const dormantHandlers = [
  http.get(`${BASE_URL}/metrics/dormant-customer`, () =>
    HttpResponse.json<ApiResponse<unknown>>({
      message: 'OK',
      data: {
        trend:                 dormantTrend,
        detail:                dormantDetail,
        value_ranking:         dormantValueRanking,
        reactivation_current:  reactivationCurrent,
      },
    })
  ),
];

export const metricsHandlers = [
  ...crossSellingHandlers,
  // customerMetricsHandlers — DISABLED: real backend at GET /api/v1/metrics/customer-metrics
  ...dormantHandlers,
];