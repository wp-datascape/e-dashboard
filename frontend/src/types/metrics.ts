// src/types/metrics.ts
// ─── Tipe data untuk semua endpoint /metrics/* ────────────────────────────────

// ── Cross Selling (M1, M1.1, M2) ─────────────────────────────────────────────

export interface CrossSellingTrendPoint {
  // Nama field TETAP `month` tapi isinya sekarang period_key sesuai granularitas
  // request (task029.md §30, 2026-08-20) — 'YYYY-MM' default (monthly), atau
  // 'YYYY-QN'/'YYYY-SN'/'YYYY' kalau period_type diisi quarter/semester/annual.
  month: string;
  total_active: number;
  multi_product: number;
  ratio: number;
  avg_category: number;
}

export interface CrossSellingDetailRow {
  customer_id: number;
  customer_code: string | null;
  customer_name: string;
  category_count: number;
  has_unit: boolean;
  has_consumable: boolean;
  has_sparepart: boolean;
  total_revenue: number;
  // Branch/Division/Channel (task029.md §28.10, 2026-08-21) — dari invoice
  // TERBARU customer itu DI DALAM periode laporan.
  branch: string | null;
  division: string | null;
  channel: string | null;
  // Map dinamis, key = item_type asli ('unit'/'card'/'accesories'/dst — apa pun
  // yang ada di data company itu, TIDAK di-hardcode 3 tipe lagi, 2026-08-21).
  type_breakdown: Record<string, { qty: number; revenue: number }>;
}

export interface HeatmapRow {
  customer: string;
  customer_id: number;
  values: Record<string, number>;
  revenues: Record<string, number>;
  total_revenue: number;
}

// Versi ringan CrossSellingData — cuma kpi1/kpi2, TANPA trend/detail/heatmap
// (2026-08-28). Dipakai section "Ringkasan Cross-Selling" di Overview, lihat
// komentar getCrossSellingSummary (backend metrics.service.ts).
export interface CrossSellingSummaryData {
  period: { start: string; end: string; active_months: number; type: string; key: string };
  kpi1: { multi_cat_count: number; active_count: number; rate: number };
  kpi2: { avg_categories: number; total_distinct_cats: number };
}

export interface CrossSellingData {
  // type/key (task029.md §30) — granularitas & period_key yang BENAR-BENAR
  // dipakai backend, buat cross-check label FE tanpa hitung ulang.
  period: { start: string; end: string; active_months: number; type: string; key: string };
  kpi1: { multi_cat_count: number; active_count: number; rate: number };
  kpi2: { avg_categories: number; total_distinct_cats: number };
  trend: CrossSellingTrendPoint[];
  detail: CrossSellingDetailRow[];
  heatmap: HeatmapRow[];
  categories: string[];
  // categories = scope heatmap (top-30 customer). detail_categories = SEMUA
  // customer (tabel Breakdown) — sengaja beda, 2026-08-21 (lihat backend
  // metrics.types.ts).
  detail_categories: string[];
}

// ── M3 Revenue Drill-down ───────────────────────────────────────────────────────

export interface RevenueBreakdownRow {
  ranking: number;
  customer_code: string | null;
  customer_name: string;
  revenue: number;
  revenue_pct: number;
  tier: 'Atas' | 'Tengah' | 'Bawah';
  hm_revenue: number;
  hm_pct: number;
}

export interface RevenueBreakdownData {
  period_end: string;
  total_revenue: number;
  median_threshold: number;
  // "Existing" YANG AKTIF (riwayat sebelum periode DAN masih beli periode
  // ini, task029.md §36) — bukan lagi fixed cohort.
  total_existing: number;
  hm_revenue: number;
  rows: RevenueBreakdownRow[];
}

// ── M7 Expansion Drill-down ───────────────────────────────────────────────────

export interface ExpansionBreakdownRow {
  ranking: number;
  customer_code: string | null;
  customer_name: string;
  branch: string | null;
  division: string | null;
  channel: string | null;
  cur_revenue: number;
  prev_revenue: number;
  change_pct: number | null;
  // 4-way (2026-08-21, koreksi user "datamu tidak valid jika tanpa
  // transaksi kamu beri label stabil") — 'inactive' (cur=prev=0, tidak
  // ada transaksi sama sekali) dipisah dari 'flat' (cur=prev DAN > 0).
  status: 'up' | 'flat' | 'inactive' | 'down';
}

export interface ExpansionBreakdownData {
  period_end: string;
  up_count: number;
  flat_count: number;
  inactive_count: number;
  down_count: number;
  // Total customer dgn cur_revenue > 0 (2026-08-25) — TANPA syarat naik/
  // turun/flat vs periode sebelumnya, murni "genuinely bertransaksi
  // periode ini". Beda dari up_count (mensyaratkan cur>prev).
  active_count: number;
  total_existing: number;
  rows: ExpansionBreakdownRow[];
}

// ── M4 GP Drill-down ─────────────────────────────────────────────────────────

export interface GpBreakdownRow {
  ranking: number;
  customer_code: string | null;
  customer_name: string;
  gp: number;
  gp_pct: number;
  tier: 'Atas' | 'Tengah' | 'Bawah';
}

export interface GpBreakdownData {
  period_end: string;
  total_gp: number;
  median_threshold: number;
  total_existing: number;
  rows: GpBreakdownRow[];
}

// ── M5 HM Drill-down ─────────────────────────────────────────────────────────

export interface HmBreakdownRow {
  ranking: number;
  customer_name: string;
  customer_code: string | null;
  // Basis ranking (task029.md §36) — unit/quantity produk High Margin terjual.
  hm_qty: number;
  hm_revenue: number;
  hm_pct: number;
}

export interface HmBreakdownData {
  period_end: string;
  total_hm_revenue: number;
  hm_buyer_count: number;
  total_existing: number;
  rows: HmBreakdownRow[];
}

// ── M6 ROR Drill-down ─────────────────────────────────────────────────────────

export interface RorBreakdownRow {
  ranking: number;
  customer_name: string;
  customer_code: string | null;
  invoice_count: number;
  total_revenue: number;
}

export interface RorBreakdownData {
  period_end: string;
  repeat_count: number;
  total_existing: number;
  rows: RorBreakdownRow[];
}

// ── Customer Metrics (M3–M7) ──────────────────────────────────────────────────

export interface CustomerMetricsTrendPoint {
  month: string;
  existing_customers: number;
  total_revenue_existing: number;
  avg_revenue: number;
  avg_gross_profit: number;
  gp_tier1: number;
  gp_tier2: number;
  gp_tier3: number;
  top_gp_customer_id: number | null;
  top_gp_customer_name: string | null;
  top_gp_revenue: number;
  top_gp_pct: number;
  is_gp_concentrated: boolean;
  high_margin_ratio: number;
  // Angka mentah numerator high_margin_ratio (task029.md §36) — bar chart trend M5.
  high_margin_buyer_count: number;
  repeat_order_rate: number;
  expansion_rate: number;
  up_rate: number;
  flat_down_rate: number;
  // 4-way split (existing customer naik/stabil/tidak-aktif/turun spend vs
  // periode sebelumnya, eksak, bukan didekati) — dipakai chart diverging
  // M7Expansion. inactive_rate (2026-08-21, koreksi user "datamu tidak
  // valid jika tanpa transaksi kamu beri label stabil") dipisah dari
  // flat_rate — flat_rate sekarang cuma cur=prev DAN cur>0 (genuinely
  // tidak berubah), inactive_rate = cur=prev=0 (tidak ada transaksi sama
  // sekali di kedua window).
  flat_rate: number;
  inactive_rate: number;
  down_rate: number;
  // Jumlah customer mentah per kategori (2026-08-22, user: "Aku butuh
  // data jumlah nya selain dari persentase") — pasangan raw-count dari
  // up_rate/flat_rate/inactive_rate/down_rate di atas.
  up_count: number;
  flat_count: number;
  inactive_count: number;
  down_count: number;
  // Populasi M7 (2026-08-25, task029.md §34-lanjutan) — existing yang
  // BELUM lewat ambang dormant (ambang sama persis M8, per kategori
  // bisnis divisi). Pembagi expansion_rate/flat_rate/inactive_rate/
  // down_rate — GANTI dari existing_customers kumulatif. Dipakai kartu
  // "Total Existing" M7ExpansionGrowth.tsx supaya konsisten dgn 4-way
  // split (yang keduanya harus sum ke 100% dari populasi yang SAMA).
  existing_not_dormant_count: number;
  // M3 enrichment
  active_existing_count: number;
  active_new_count: number;
  median_revenue: number;
  top_customer_id: number | null;
  top_customer_name: string | null;
  top_customer_revenue: number;
  top_customer_pct: number;
  is_concentrated: boolean;
  hm_revenue: number;
}

export interface HighMarginCurrent {
  bought_pct: number;
  not_bought_pct: number;
}

export interface RepeatOrderCurrent {
  value: number;
  target_pct: number;
}

export interface CustomerMetricsData {
  trend: CustomerMetricsTrendPoint[];
  detail: unknown[];
  /** Rentang tanggal periode aktif SETELAH resolveTrendPeriod backend
   * (2026-08-23) — lihat CustomerMetricsData di backend metrics.types.ts. */
  period: { start: string; end: string };
  high_margin_current: HighMarginCurrent;
  repeat_order_current: RepeatOrderCurrent;
}

// ── Dormant Customer (M8–M10) ─────────────────────────────────────────────────

export interface DormantTrendPoint {
  month: string;
  total_customers: number;
  dormant_count: number;
  // active_count/dormant_light_count/dormant_severe_count (2026-08-24) —
  // backend SUDAH kirim field ini di tiap titik trend sejak lama (task027
  // §8e, DormantTrendRow), tipe FE sebelumnya belum deklarasikan (gap
  // ketikan, bukan field baru) — dibutuhkan sekarang utk kartu ringkasan
  // dialog drilldown M8 ("info tambahan seperti total pelanggan").
  active_count: number;
  dormant_light_count: number;
  dormant_severe_count: number;
  dormant_rate: number;
  prev_dormant_count: number;
  reactivated_count: number;
  reactivation_rate: number;
}

export interface DormantValueRankingRow {
  // ranking (2026-08-24, endpoint breakdown M8 baru) — ROW_NUMBER() by
  // estimated_lost_value DESC, sudah ditambahkan di query backend M9 juga
  // (unconditional, dipakai bareng breakdown).
  ranking: number;
  customer_id: number;
  customer_name: string;
  customer_code: string | null;
  // division_label (2026-08-25, drilldown M9 — instruksi user: "info Nama
  // customer, divisi, berapa lama dia dormant, tanggal transaksi terakhir").
  division_label: string | null;
  last_invoice_date: string;
  months_dormant: number;
  avg_monthly_revenue: number;
  estimated_lost_value: number;
  // avg_monthly_gp/estimated_lost_gp (2026-08-26, task029.md §36.12 — SSOT
  // M9 sebut "Historical Gross Profit" sbg komponen paralel Historical
  // Revenue, keputusan user: "Tambah versi Gross Profit paralel"). Ranking
  // (urutan baris) TETAP basis revenue, field ini tampilan tambahan.
  avg_monthly_gp: number;
  estimated_lost_gp: number;
}

// Riwayat revenue bulanan per customer (2026-08-25, drilldown M9 — klik bar
// ranking "Potensi Omset Hilang"). Window SAMA PERSIS avg_monthly_revenue.
export interface DormantValueHistoryRow {
  month: string; // 'YYYY-MM'
  revenue: number;
}

export interface DormantValueHistoryData {
  customer_id: number;
  rows: DormantValueHistoryRow[];
}

// Breakdown drill-down M8 (2026-08-24, instruksi user: "Buatkan end poin
// dril down breakdown singkat, lengkapnya nanti di tabel laporan") — pola
// sama persis RorBreakdownData (M6), row shape reuse DormantValueRankingRow.
export interface DormantBreakdownData {
  period_end: string;
  rows: DormantValueRankingRow[];
}

// Status per customer (2026-08-24, susulan pertanyaan user soal ambiguitas
// reaktivasi: "datanya juga butuh existing, dormant, active, reactive, dan
// yang active tapi dormant lagi dalam periode tersebut... tercatat kapan
// masuk active kapan masuk dormant, tapi dalam perhitungan masukkan status
// terakhir saja"). Lihat JSDoc backend CustomerDormantStatusRow.
// 'inactive' (2026-08-26, task029.md §36.28 — Kamus Penamaan Pelanggan
// §36.27, instruksi user "pisahkan existing aktif dan inaktif") — 'active'
// SEBELUMNYA menggabung "ada transaksi periode ini" + "belum transaksi
// tapi masih masa tenggang", sekarang dipisah: 'active' = Existing Aktif
// (ADA transaksi periode ini), 'inactive' = Existing Inaktif (TIDAK ada
// transaksi periode ini, masih masa tenggang).
// 'newlyDormant' — dormant di awal periode, sempat order dalam periode
// (reaktivasi), TAPI dormant LAGI di akhir periode. NAMA BARU (2026-08-26,
// task029.md §36.43, koreksi user: "Dormant kembali itu diganti nama
// menjadi newlydormant, hanya itu") dari status lama 'relapsed' — logika
// TIDAK berubah, cuma key/labelnya.
export type DormantCustomerStatus = 'active' | 'inactive' | 'dormant' | 'newlyDormant' | 'reactivated';

export interface CustomerDormantStatusRow {
  customer_id: number;
  customer_name: string;
  customer_code: string | null;
  company_name: string;
  status: DormantCustomerStatus;
  last_invoice_before_period: string | null;
  reactivation_date: string | null;
  last_invoice_in_period: string | null;
  avg_monthly_revenue: number;
  dormant_since_date: string | null;
}

export interface DormantStatusBreakdownData {
  period_start: string;
  period_end: string;
  rows: CustomerDormantStatusRow[];
}

export interface DormantRateCurrent {
  value: number;
  dormant_count: number;
  total_customers: number;
  alert_pct: number;
  // comparison_value (2026-08-24, YoY, sudah dihitung backend sejak lama —
  // dulu tidak pernah disambung ke UI, sekarang dipakai KpiHeader M8/M10
  // pola sama persis M7 Growth, ditegur user "sudah bilang Growth standar
  // layout").
  comparison_value: number;
}

export interface ReactivationCurrent {
  value: number;
  target_low: number;
  target_high: number;
  comparison_value: number;
}

export interface DormantData {
  trend: DormantTrendPoint[];
  value_ranking: DormantValueRankingRow[];
  dormant_rate_current: DormantRateCurrent;
  reactivation_current: ReactivationCurrent;
  // Total estimated_lost_value dari SEMUA dormant customer (2026-08-24,
  // sudah dihitung backend sejak lama, YATIM — sekarang dipakai KpiHeader
  // M9, "Tata layout M9 seperti layout lainnya"; DIPERBAIKI 2026-08-26,
  // task029.md §36.12 — SEBELUMNYA cuma jumlah top-20 ranking, understated
  // ~93%), current vs setahun lalu.
  value_ranking_total_current: number;
  value_ranking_total_comparison: number;
  // value_ranking_total_gp_current/_comparison (2026-08-26, §36.12) — versi
  // Gross Profit paralel, SAMA PERSIS pola di atas cuma basis GP.
  value_ranking_total_gp_current: number;
  value_ranking_total_gp_comparison: number;
  // Daftar customer reaktivasi periode berjalan (2026-08-24, susulan "buatkan
  // juga 3 card summary diatas cart, dan top 5" M10) — top 20 by tanggal
  // reaktivasi terbaru, sudah difilter status reactivated+newlyDormant di backend.
  reactivated_customers: CustomerDormantStatusRow[];
}
