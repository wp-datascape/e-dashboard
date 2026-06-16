// ─── Common ───────────────────────────────────────────────────────────────────
export interface MonthlyTrendPoint {
  month: string; // "YYYY-MM"
  value: number;
}

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
  summary: MetricSummary;
  monthly_trend: MonthlyTrendPoint[];
  color: string;               // chart color
}

// ─── Dashboard overview response ─────────────────────────────────────────────
export interface DashboardData {
  period_month: string;        // "YYYY-MM"
  active_window: number;       // 3 | 6 | 12
  metrics: MetricCard[];
}
