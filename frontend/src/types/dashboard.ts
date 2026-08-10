// ─── Common ───────────────────────────────────────────────────────────────────
export interface MonthlyTrendPoint {
  month: string; // "YYYY-MM"
  value: number;
  // 3 tier GP (Atas/Tengah/Bawah) per bulan — HANYA diisi utk metric_key
  // 'avg_gross_profit' (chart_type 'stacked-bar'), task026 §9 lanjutan.
  tier1?: number;
  tier2?: number;
  tier3?: number;
}

// Jenis mini-chart di StatCard Overview — dipetakan per SIFAT metrik (lihat
// dashboard.service.ts utk penjelasan lengkap tiap kategori).
export type ChartType = 'bar' | 'area' | 'line' | 'stacked-bar';

export interface MetricSummary {
  current_value: number;
  // Nilai YoY (periode sama, 1 tahun lalu) — BUKAN bulan sebelumnya lagi
  // (task026 §9, 2026-08-09), samakan mental model dgn 10 halaman KPI
  // individual yang semua sudah pakai pembanding YoY.
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
  // `color` DIHAPUS (task026 §9) - dulu hex hardcode dari backend, sama
  // sekali tidak ikut palet. StatCard sekarang fallback ke
  // theme.palette.primary.main (lihat StatCard.tsx).
  // Angka numerator/denominator PERSIS (bukan pendekatan rate×denominator) —
  // HANYA ada utk 6 dari 10 metric_key (lihat dashboard.service.ts), dipakai
  // Dashboard/index.tsx utk deskripsi kartu spt referensi (task026 §9 lanjutan).
  detail?: Record<string, number>;
}

export interface DashboardThresholds {
  repeat_order_target_pct: number;
  dormant_rate_alert_pct: number;
  reactivation_target_low_pct: number;
  reactivation_target_high_pct: number;
}

// ─── Dashboard overview response ─────────────────────────────────────────────
export interface DashboardData {
  period_month: string;        // "YYYY-MM"
  comparison_period_month: string; // "YYYY-MM" — YoY, period_month - 1 tahun
  // True kalau ada customer sama sekali di scope/periode ini — dipakai utk
  // suppress alert banner kalau company memang belum punya data sama
  // sekali (0 invoice), lihat Dashboard/index.tsx.
  has_data: boolean;
  active_window: number;       // 3 | 6 | 12
  thresholds: DashboardThresholds;
  metrics: MetricCard[];
}
