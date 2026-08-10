// frontend/src/mocks/handlers/dashboard.handler.ts
import { http, HttpResponse } from 'msw';
import type { ApiResponse } from '@/types/api';
import type { DashboardData, MonthlyTrendPoint } from '@/types/dashboard';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

// Helper: generate 12 monthly trend points ending at current_value
function makeTrend(base: number, current: number): MonthlyTrendPoint[] {
  const months = [
    '2024-04','2024-05','2024-06','2024-07','2024-08','2024-09',
    '2024-10','2024-11','2024-12','2025-01','2025-02','2025-03',
  ];
  return months.map((month, i) => ({
    month,
    value: parseFloat((base + (current - base) * (i / 11) + (Math.sin(i) * base * 0.05)).toFixed(2)),
  }));
}

// Sama seperti makeTrend, tapi tiap titik juga punya 3 tier (Atas/Tengah/
// Bawah) yang jumlahnya = value — khusus 'avg_gross_profit' (chart_type
// 'stacked-bar', task026 §9 lanjutan, 2026-08-09).
function makeStackedTrend(base: number, current: number): MonthlyTrendPoint[] {
  return makeTrend(base, current).map((p) => ({
    ...p,
    tier1: parseFloat((p.value * 0.5).toFixed(2)),
    tier2: parseFloat((p.value * 0.3).toFixed(2)),
    tier3: parseFloat((p.value * 0.2).toFixed(2)),
  }));
}

const MOCK_DASHBOARD: DashboardData = {
  period_month: '2025-03',
  // Pembanding YoY (task026 §9, 2026-08-09) - dulu MoM, sekarang YoY.
  comparison_period_month: '2024-03',
  has_data: true,
  active_window: 6,
  thresholds: {
    // Disamakan dgn default DB (business_configs) - task026 §9 lanjutan.
    repeat_order_target_pct: 80,
    dormant_rate_alert_pct: 10,
    reactivation_target_low_pct: 15,
    reactivation_target_high_pct: 20,
  },
  metrics: [
    {
      metric_key: 'cross_selling_ratio',
      title: 'Cross Selling Ratio',
      subtitle: 'Customer beli >1 kategori / Total customer aktif',
      link: '/cross-selling',
      format: 'percent',
      chart_type: 'bar',
      summary: { current_value: 22.5, previous_value: 20.0, change_percent: 12.5, trend: 'up' },
      monthly_trend: makeTrend(16, 22.5),
    },
    {
      metric_key: 'avg_category',
      title: 'Rata-rata Kategori Produk',
      subtitle: 'Rata-rata kategori unik per customer aktif',
      link: '/cross-selling',
      format: 'number',
      chart_type: 'area',
      summary: { current_value: 1.8, previous_value: 1.6, change_percent: 12.5, trend: 'up' },
      monthly_trend: makeTrend(1.3, 1.8),
    },
    {
      metric_key: 'avg_revenue',
      title: 'Rata-rata Revenue',
      subtitle: 'Revenue per existing customer di periode ini',
      link: '/customer-metrics',
      format: 'currency',
      chart_type: 'bar',
      summary: { current_value: 7500000, previous_value: 6800000, change_percent: 10.3, trend: 'up' },
      monthly_trend: makeTrend(5000000, 7500000),
    },
    {
      metric_key: 'avg_gross_profit',
      title: 'Rata-rata Gross Profit',
      subtitle: 'Gross profit per existing customer',
      link: '/customer-metrics',
      format: 'currency',
      chart_type: 'stacked-bar',
      summary: { current_value: 2200000, previous_value: 2000000, change_percent: 10.0, trend: 'up' },
      monthly_trend: makeStackedTrend(1500000, 2200000),
    },
    {
      metric_key: 'high_margin_penetration',
      title: 'High Margin Penetration',
      subtitle: 'Existing customer beli produk high margin',
      link: '/customer-metrics',
      format: 'percent',
      chart_type: 'line',
      summary: { current_value: 34.5, previous_value: 30.0, change_percent: 15.0, trend: 'up' },
      monthly_trend: makeTrend(22, 34.5),
    },
    {
      metric_key: 'repeat_order_rate',
      title: 'Repeat Order Rate',
      subtitle: 'Existing customer yang bertransaksi ulang',
      link: '/customer-metrics',
      format: 'percent',
      chart_type: 'bar',
      summary: { current_value: 68.0, previous_value: 65.0, change_percent: 4.6, trend: 'up' },
      monthly_trend: makeTrend(58, 68),
    },
    {
      metric_key: 'expansion_rate',
      title: 'Customer Expansion Rate',
      subtitle: 'Customer dengan spending naik vs bulan lalu',
      link: '/customer-metrics',
      format: 'percent',
      chart_type: 'line',
      summary: { current_value: 41.2, previous_value: 43.0, change_percent: -4.2, trend: 'down' },
      monthly_trend: makeTrend(35, 41),
    },
    {
      metric_key: 'dormant_rate',
      title: 'Dormant Customer Rate',
      subtitle: 'Existing customer yang tidak aktif (threshold: 3 bln)',
      link: '/dormant-rate',
      format: 'percent',
      chart_type: 'line',
      summary: { current_value: 8.5, previous_value: 9.2, change_percent: -7.6, trend: 'down' },
      monthly_trend: makeTrend(12, 8.5),
    },
    {
      metric_key: 'dormant_value',
      title: 'Dormant Customer Value',
      subtitle: 'Estimasi potensi omset hilang dari customer dormant',
      link: '/dormant-value',
      format: 'currency',
      chart_type: 'bar',
      summary: { current_value: 850000000, previous_value: 920000000, change_percent: -7.6, trend: 'down' },
      monthly_trend: makeTrend(1200000000, 850000000),
    },
    {
      metric_key: 'reactivation_rate',
      title: 'Customer Reactivation Rate',
      subtitle: 'Customer dormant yang kembali aktif bulan ini',
      link: '/reactivation-rate',
      format: 'percent',
      chart_type: 'bar',
      summary: { current_value: 12.3, previous_value: 10.5, change_percent: 17.1, trend: 'up' },
      monthly_trend: makeTrend(8, 12.3),
    },
  ],
};

export const dashboardHandlers = [
  http.get(`${BASE_URL}/dashboard`, () => {
    return HttpResponse.json<ApiResponse<DashboardData>>({
      message: 'Dashboard data berhasil dimuat',
      data: MOCK_DASHBOARD,
    }, { status: 200 });
  }),
];
