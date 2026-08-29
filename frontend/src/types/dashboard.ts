// ─── Common ───────────────────────────────────────────────────────────────────
export interface MonthlyTrendPoint {
  month: string; // "YYYY-MM"
  value: number;
  // 3 tier GP (Atas/Tengah/Bawah) per bulan — cuma diisi utk metric_key
  // 'avg_gross_profit' (chart_type 'stacked-bar'). Sinkron dgn backend
  // dashboard.types.ts (dibawa dari dev-legacy, task029).
  tier1?: number;
  tier2?: number;
  tier3?: number;
  // Rebuild Overview 3-kartu+1-chart (2026-08-29, task029.md §46) — lihat
  // JSDoc backend dashboard.types.ts. `total_active`: cuma diisi utk
  // cross_selling_ratio (count Active Transacting per bulan, chart combo
  // Growth). `total_revenue_existing`/`hm_revenue_raw`: cuma diisi utk
  // avg_revenue (stacked bar Reguler+High Margin, chart combo Value).
  total_active?: number;
  total_revenue_existing?: number;
  hm_revenue_raw?: number;
}

export type ChartType = 'bar' | 'area' | 'line' | 'stacked-bar';

export interface MetricSummary {
  current_value: number;
  previous_value: number;
  change_percent: number;
  trend: 'up' | 'down' | 'stable';
}

// ─── Metric types (1-10) ──────────────────────────────────────────────────────
export interface MetricCard {
  metric_key: string;          // e.g. "cross_selling_ratio"
  title: string;
  subtitle: string;
  link: string;                // route path to detail page
  format: 'percent' | 'number' | 'currency'; // how to display value
  chart_type: ChartType;
  summary: MetricSummary;
  monthly_trend: MonthlyTrendPoint[];
  // Angka numerator/denominator PERSIS — cuma diisi utk metric_key yang
  // datanya sudah exact dari service lain (mis. dormant_rate: dormantCount/
  // totalCustomers). `color` sudah DIHAPUS dari backend (bukan lagi hex
  // hardcode per metric_key) — warna murni urusan frontend sekarang.
  detail?: Record<string, number>;
}

// Threshold yang dipakai buat alert Key Alerts di Overview.
export interface DashboardThresholds {
  repeat_order_target_pct: number;
  dormant_rate_alert_pct: number;
  reactivation_target_low_pct: number;
  reactivation_target_high_pct: number;
}

// ─── Dashboard overview response ─────────────────────────────────────────────
export interface DashboardData {
  period_month: string;        // "YYYY-MM"
  comparison_period_month: string;
  // True kalau ADA customer sama sekali di scope/periode ini — dipakai utk
  // suppress alert Key Alerts kalau company belum punya data sama sekali.
  has_data: boolean;
  active_window: number;       // 3 | 6 | 12
  thresholds: DashboardThresholds;
  metrics: MetricCard[];
}
