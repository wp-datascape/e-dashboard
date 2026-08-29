export interface MonthlyTrendPoint {
  month: string
  value: number
  // 3 tier GP (Atas/Tengah/Bawah) per bulan - HANYA diisi utk metric_key
  // 'avg_gross_profit' (chart_type 'stacked-bar', task026 §9 lanjutan,
  // 2026-08-09), field lain (`value`) tetap dipakai spt biasa utk
  // ringkasan/YoY. Sumber: customer.trend[].gp_tier1/2/3 (SAMA dgn yang
  // dipakai CustomerGrossProfit/index.tsx).
  tier1?: number
  tier2?: number
  tier3?: number
  // Rebuild Overview jadi 3-kartu+1-chart per section (2026-08-29, task029.md
  // §46) — chart Growth (combo bar+line) butuh count "Active Transacting"
  // per bulan, bukan cuma `ratio`. HANYA diisi utk metric_key
  // 'cross_selling_ratio', dari `cross.trend[].total_active`
  // (m1.repository.ts `fetchCrossSellingTrend`, SUDAH difetch dashboard.
  // service.ts, sebelumnya dibuang saat map ke monthly_trend).
  total_active?: number
  // Chart Value (stacked bar Revenue Reguler + High Margin, line Avg
  // Revenue/Customer) — HANYA diisi utk metric_key 'avg_revenue', dari
  // `customer.trend[].total_revenue_existing`/`hm_revenue`
  // (CustomerMetricsTrendPoint, SUDAH difetch, sebelumnya dibuang).
  // `hm_revenue_raw` (bukan `hm_revenue`) supaya tidak bentrok makna dgn
  // field `detail.dormantCount` dkk yang sudah ada di card lain.
  total_revenue_existing?: number
  hm_revenue_raw?: number
}

// Jenis mini-chart di StatCard Overview - dipetakan per SIFAT metrik
// (bukan per nomor KPI, krn urutan metric_key kita beda dari referensi
// executive-kpi-dashboard/OverviewView.tsx), task026 §9 lanjutan:
// - 'bar'          : metrik ratio/magnitude yang dibaca sbg perbandingan
//                    titik-per-titik (cross_selling_ratio, avg_revenue,
//                    repeat_order_rate, dormant_value, reactivation_rate)
// - 'area'         : rata-rata per customer yang dibaca sbg tren mengalir
//                    (avg_category)
// - 'line'         : rate/persentase yang dibaca sbg tren halus
//                    (high_margin_penetration, expansion_rate, dormant_rate)
// - 'stacked-bar'  : avg_gross_profit - satu-satunya yang punya breakdown
//                    3 tier per bulan (tier1/2/3 di atas)
export type ChartType = 'bar' | 'area' | 'line' | 'stacked-bar'

export interface MetricSummary {
  current_value: number
  // Nilai YoY (periode yang sama, 1 tahun lalu) — BUKAN bulan sebelumnya lagi
  // (task026 §9, 2026-08-09): dulu MoM (trend.at(-1) vs trend.at(-2)), diganti
  // YoY biar mental model-nya sama dgn 10 halaman KPI individual (semua sudah
  // pakai pembanding YoY, bukan MoM).
  previous_value: number
  change_percent: number
  trend: 'up' | 'down' | 'stable'
}

export interface MetricCard {
  metric_key: string
  title: string
  subtitle: string
  link: string
  format: 'percent' | 'number' | 'currency'
  chart_type: ChartType
  summary: MetricSummary
  monthly_trend: MonthlyTrendPoint[]
  // `color` DIHAPUS (task026 §9) - dulu hex hardcode per metric_key, sama
  // sekali tidak ikut palet yang dipilih user. Warna sekarang murni urusan
  // frontend (StatCard fallback ke theme.palette.primary.main / theme.custom.rank
  // utk stacked-bar).
  // Angka numerator/denominator PERSIS (bukan hasil bagi rate×denominator,
  // supaya TIDAK pernah beda dgn angka yang sama di halaman detail KPI-nya
  // — task026 §9 lanjutan, 2026-08-09, koreksi user "detail isi card
  // referensi juga tidak ada di dashboard ku"). HANYA diisi utk metric_key
  // yang datanya SUDAH tersedia exact dari service lain tanpa hitungan baru
  // (cross_selling_ratio, avg_category, avg_gross_profit, dormant_rate,
  // dormant_value, reactivation_rate) - 4 metrik lain (avg_revenue,
  // high_margin_penetration, repeat_order_rate, expansion_rate) BELUM,
  // krn count exact-nya butuh query baru di repository (bukan cuma wiring),
  // sengaja TIDAK didekati via rate×existing_customers (bisa beda dgn angka
  // asli di halaman detail krn pembulatan - lihat task026.md §9 lanjutan).
  detail?: Record<string, number>
}

// Threshold yang dipakai buat alert banner di Overview - sumber tunggal
// `loadThresholds()` (features/config/threshold.ts), diekspos di sini biar
// frontend bisa render teks alert sendiri (i18n-aware), BUKAN backend yang
// generate string Bahasa Indonesia hardcode.
export interface DashboardThresholds {
  repeat_order_target_pct: number
  dormant_rate_alert_pct: number
  reactivation_target_low_pct: number
  // Ditambahkan (task026 §9 lanjutan, 2026-08-09) - dipakai badge kartu
  // reactivation_rate ("Target Min: {{low}}–{{high}}%"), pola persis
  // referensi executive-kpi-dashboard/OverviewView.tsx.
  reactivation_target_high_pct: number
}

export interface DashboardData {
  period_month: string
  // Bulan acuan pembanding YoY (period_month - 1 tahun) - dipakai frontend
  // utk label "Pembanding YoY" (task026 §9).
  comparison_period_month: string
  // True kalau ADA customer sama sekali di scope/periode ini - dipakai
  // frontend utk suppress alert banner (2026-08-09): company yang belum
  // punya data (0 invoice/customer) selalu 0% di semua rate, yang secara
  // matematis "di bawah target manapun" tapi menyesatkan kalau ditampilkan
  // sbg peringatan performa.
  has_data: boolean
  active_window: number
  thresholds: DashboardThresholds
  metrics: MetricCard[]
}
