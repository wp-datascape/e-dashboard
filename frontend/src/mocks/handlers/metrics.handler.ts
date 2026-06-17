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

// ─── Customer Metrics (M2–M7) ─────────────────────────────────────────────────
const customerMetricsTrend = months12().map((month, i) => ({
  month,
  existing_customers:   120 + i * 3,
  total_revenue_existing: (120 + i * 3) * (5_000_000 + i * 200_000),
  avg_revenue:          5_000_000 + i * 200_000,
  avg_gross_profit:     1_500_000 + i * 60_000,
  // Stacked gross profit segments (tier1 + tier2 + tier3 = avg_gross_profit)
  gp_tier1:  Math.round((1_500_000 + i * 60_000) * 0.45), // top customers
  gp_tier2:  Math.round((1_500_000 + i * 60_000) * 0.35), // mid customers
  gp_tier3:  Math.round((1_500_000 + i * 60_000) * 0.20), // long tail
  high_margin_ratio:    parseFloat((22 + i * 1.1).toFixed(1)),
  repeat_order_rate:    parseFloat((58 + i * 0.9).toFixed(1)),
  expansion_rate:       parseFloat((35 + i * 0.5 - (i > 8 ? 2 : 0)).toFixed(1)),
  // For M7: 100% stacked horizontal bar
  up_rate:              parseFloat((35 + i * 0.5 - (i > 8 ? 2 : 0)).toFixed(1)),
  flat_down_rate:       parseFloat((65 - i * 0.5 + (i > 8 ? 2 : 0)).toFixed(1)),
}));

const customerMetricsDetail = Array.from({ length: 20 }, (_, i) => ({
  id: i + 1,
  customer_code: `CUST-${String(i + 1).padStart(4, '0')}`,
  customer_name: `PT. Customer ${i + 1}`,
  revenue_current:   (i + 1) * 2_000_000 + 500_000,
  revenue_previous:  (i + 1) * 1_800_000 + 300_000,
  gross_profit:      (i + 1) * 600_000 + 100_000,
  has_high_margin:   i % 3 === 0,
  has_repeat_order:  i % 4 !== 0,
  spending_trend:    i % 5 === 0 ? 'down' : 'up',
}));

// M5: High Margin Donut — current month snapshot
const highMarginCurrent = {
  bought_pct:     65.4,
  not_bought_pct: 34.6,
};

// M6: Repeat Order Rate — current month single value
const repeatOrderCurrent = {
  value: parseFloat(customerMetricsTrend.at(-1)!.repeat_order_rate.toFixed(1)),
};

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
export const metricsHandlers = [
  // M1 + M1.1 + M2: Cross Selling
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

  // M2–M7: Customer Metrics
  http.get(`${BASE_URL}/metrics/customer-metrics`, () =>
    HttpResponse.json<ApiResponse<unknown>>({
      message: 'OK',
      data: {
        trend:                customerMetricsTrend,
        detail:               customerMetricsDetail,
        high_margin_current:  highMarginCurrent,
        repeat_order_current: repeatOrderCurrent,
      },
    })
  ),

  // M8–M10: Dormant Customer
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