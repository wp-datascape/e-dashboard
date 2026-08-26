export interface CustomerMetricsTrendPoint {
  month: string
  existing_customers: number
  total_revenue_existing: number
  avg_revenue: number
  avg_gross_profit: number
  gp_tier1: number
  gp_tier2: number
  gp_tier3: number
  top_gp_customer_id: number | null
  top_gp_customer_name: string | null
  top_gp_revenue: number
  top_gp_pct: number
  is_gp_concentrated: boolean
  high_margin_ratio: number
  // Angka mentah numerator high_margin_ratio (2026-08-25, task029.md §36) —
  // dipakai bar chart trend M5.
  high_margin_buyer_count: number
  repeat_order_rate: number
  expansion_rate: number
  up_rate: number
  flat_down_rate: number
  // 3-way split (koreksi user 2026-08-10) — flat_down_rate TETAP ada
  // (dipakai M7Expansion.tsx chart tren kanan, 2-way), flat_rate/down_rate
  // BARU utk cards+chart kiri CustomerExpansion/index.tsx yang butuh pisah
  // Flat (cur==prev) vs Turun (cur<prev) eksak.
  //
  // 4-way (koreksi user 2026-08-21, "datamu tidak valid jika tanpa
  // transaksi kamu beri label stabil") — flat_rate sekarang HANYA cur=prev
  // DAN cur>0 (genuinely tidak berubah, customer masih order). Customer
  // yang cur=prev=0 (tidak ada transaksi sama sekali di kedua window)
  // dipisah ke inactive_rate, BUKAN lagi bagian dari flat_rate.
  flat_rate: number
  inactive_rate: number
  down_rate: number
  // Populasi M7 (2026-08-25, task029.md §34-lanjutan) — existing yang
  // BELUM lewat ambang dormant (ambang sama persis M8, per kategori
  // bisnis divisi). Pembagi expansion_rate/flat_rate/inactive_rate/
  // down_rate — GANTI dari existing_customers kumulatif.
  existing_not_dormant_count: number
  // M3 enrichment
  active_existing_count: number
  active_new_count: number
  median_revenue: number
  top_customer_id: number | null
  top_customer_name: string | null
  top_customer_revenue: number
  top_customer_pct: number
  is_concentrated: boolean
  // Task006 — kontribusi revenue High Margin bulan itu (tooltip hover M3)
  hm_revenue: number
}

// ── M3 Revenue Drill-down ───────────────────────────────────────────────────────

export interface RevenueBreakdownRow {
  ranking: number
  customer_code: string | null
  customer_name: string
  revenue: number
  revenue_pct: number
  tier: 'Atas' | 'Tengah' | 'Bawah'
  // Task006 follow-up — revenue High Margin milik customer ini + persentase relatif
  // ke total_revenue keseluruhan (denominator sama dengan revenue_pct di atas)
  hm_revenue: number
  hm_pct: number
}

export interface RevenueBreakdownData {
  period_end: string
  total_revenue: number
  median_threshold: number
  // "Existing" YANG AKTIF (riwayat sebelum periode DAN masih beli periode
  // ini, task029.md §36) — SAMA populasi dgn total_revenue di atas.
  total_existing: number
  // Task006 — total revenue produk yang terdaftar di high_margin_products,
  // dalam populasi & window yang sama dengan total_revenue di atas.
  hm_revenue: number
  rows: RevenueBreakdownRow[]
}

// ── M7 Expansion Drill-down ─────────────────────────────────────────────────────

export interface ExpansionBreakdownRow {
  ranking: number
  customer_code: string | null
  customer_name: string
  // Branch/Division/Channel (2026-08-21, samakan §28.10 — kolom sama yang
  // dipunya M1/M3-M6/M8-M10) — dari invoice TERBARU customer itu DI DALAM
  // window "current", pola sama persis `latest_inv` M1 (m1.repository.ts).
  branch: string | null
  division: string | null
  channel: string | null
  cur_revenue: number
  prev_revenue: number
  change_pct: number | null
  // 4-way (koreksi user 2026-08-10 lalu direvisi 2026-08-21) — dulu
  // 'up' | 'flat_down', lalu 'up' | 'flat' | 'down', sekarang 'inactive'
  // (cur_revenue === prev_revenue === 0, tidak ada transaksi sama sekali)
  // dipisah dari 'flat' (cur_revenue === prev_revenue DAN > 0) — user:
  // "datamu tidak valid jika tanpa transaksi kamu beri label stabil".
  status: 'up' | 'flat' | 'inactive' | 'down'
}

export interface ExpansionBreakdownData {
  period_end: string
  up_count: number
  flat_count: number
  inactive_count: number
  down_count: number
  // Total customer dgn cur_revenue > 0 (2026-08-25) — TANPA syarat naik/
  // turun/flat vs periode sebelumnya, murni "genuinely bertransaksi
  // periode ini". Beda dari up_count (mensyaratkan cur>prev).
  active_count: number
  total_existing: number
  rows: ExpansionBreakdownRow[]
}

// ── M4 Drill-down ─────────────────────────────────────────────────────────────

export interface GpBreakdownRow {
  ranking: number
  customer_code: string | null
  customer_name: string
  gp: number
  gp_pct: number
  /** Total revenue customer ini dalam window aktif — ditambah 2026-08-09
   * (mockup "Revenue 30D") supaya margin_pct bisa dihitung, bukan cuma gp. */
  revenue: number
  /** gp/revenue*100 — BEDA dari gp_pct (gp/total_gp*100, porsi thd total GP
   * semua existing customer). margin_pct = margin kotor customer ybs sendiri. */
  margin_pct: number
  tier: 'Atas' | 'Tengah' | 'Bawah'
}

export interface GpBreakdownData {
  period_end: string
  total_gp: number
  median_threshold: number
  total_existing: number
  rows: GpBreakdownRow[]
}

// ── M5 HM Drill-down ──────────────────────────────────────────────────────────

export interface HmBreakdownRow {
  ranking: number
  customer_name: string
  customer_code: string | null
  // hm_qty (2026-08-25, task029.md §36) — basis ranking SEKARANG (koreksi
  // user: "Top 5 itu harusnya jumlah terbanyak bukan value nya") — unit/
  // quantity produk High Margin terjual, BUKAN hm_revenue.
  hm_qty: number
  hm_revenue: number
  hm_pct: number
}

export interface HmBreakdownData {
  period_end: string
  total_hm_revenue: number
  hm_buyer_count: number
  total_existing: number
  rows: HmBreakdownRow[]
}

// ── M6 ROR Drill-down ─────────────────────────────────────────────────────────

export interface RorBreakdownRow {
  ranking: number
  customer_name: string
  customer_code: string | null
  invoice_count: number
  total_revenue: number
}

export interface RorBreakdownData {
  period_end: string
  repeat_count: number
  total_existing: number
  rows: RorBreakdownRow[]
}

// ── M8–M10 Dormant Customer ───────────────────────────────────────────────────

export interface DormantTrendRow {
  month: string
  total_customers: number
  dormant_count: number
  // Severity split (koreksi user 2026-08-10, opsi A: 4 kartu Total/Aktif/
  // Dormant Ringan/Dormant Kronis) — active_count + dormant_light_count +
  // dormant_severe_count SELALU persis total_customers; dormant_light_count
  // + dormant_severe_count SELALU persis dormant_count (angka lama).
  active_count: number
  dormant_light_count: number
  dormant_severe_count: number
  dormant_rate: number
  prev_dormant_count: number
  reactivated_count: number
  reactivation_rate: number
}

export interface DormantValueRow {
  // ranking (2026-08-24, endpoint breakdown M8 baru) — ROW_NUMBER() by
  // estimated_lost_value DESC, unconditional (M9 top-20 tidak pernah pakai
  // field ini, tapi ditambahkan di query yang sama, bukan query terpisah).
  ranking: number
  customer_id: number
  customer_name: string
  customer_code: string | null
  // company_name (task025 lanjutan §8/§9, 2026-08-07): template tabel §7
  // "SATU template untuk semua menu/halaman" WAJIB kolom Perusahaan sebagai
  // kolom pertama — sebelumnya tidak ada di query ini, ditambah (murni
  // penarikan data, bukan perubahan aturan bisnis).
  company_name: string
  // division_label (2026-08-25, drilldown M9 — instruksi user: "info Nama
  // customer, divisi, berapa lama dia dormant, tanggal transaksi terakhir")
  // — resolve dari COALESCE(division_override_id, cust_division) sama pola
  // m3m7.repository.ts/hm-customers.repository.ts, bukan logic baru.
  division_label: string | null
  last_invoice_date: string
  months_dormant: number
  avg_monthly_revenue: number
  estimated_lost_value: number
  // avg_monthly_gp/estimated_lost_gp (2026-08-26, task029.md §36.12 —
  // SSOT M9 sebut "Historical Gross Profit" sbg komponen paralel Historical
  // Revenue, keputusan user: "Tambah versi Gross Profit paralel") — rumus
  // SAMA PERSIS avg_monthly_revenue/estimated_lost_value, basis GP bukan
  // revenue. Ranking (ORDER BY) TETAP basis revenue, field ini murni
  // tampilan tambahan paralel.
  avg_monthly_gp: number
  estimated_lost_gp: number
}

// Riwayat revenue bulanan per customer (2026-08-25, drilldown M9) — dipakai
// list "revenue 12 bulan terakhir" di dialog klik-bar ranking, window SAMA
// PERSIS `recent_12m_rev` di fetchDormantValueRanking.
export interface DormantValueHistoryRow {
  month: string // 'YYYY-MM'
  revenue: number
}

export interface DormantValueHistoryData {
  customer_id: number
  rows: DormantValueHistoryRow[]
}

// Breakdown drill-down M8 (2026-08-24, instruksi user: "Buatkan end poin
// dril down breakdown singkat, lengkapnya nanti di tabel laporan") — SEMUA
// customer dormant di 1 periode (period_end, hasil klik titik chart),
// bukan cuma top 20 by value spt DormantValueRow/value_ranking. Row shape
// SAMA PERSIS DormantValueRow (reuse fetchDormantValueRanking limit=null,
// bukan query terpisah) — versi "singkat", kolom lebih lengkap (revenue
// history dst) menyusul di halaman Laporan nanti.
export interface DormantBreakdownData {
  period_end: string
  rows: DormantValueRow[]
}

// Status log per customer (2026-08-24, susulan pertanyaan user soal
// ambiguitas reaktivasi: "datanya juga butuh existing, dormant, active,
// reactive, dan yang active tapi dormant lagi dalam periode tersebut...
// tercatat kapan masuk active kapan masuk dormant, tapi dalam perhitungan
// masukkan status terakhir saja"). Ini PEMBONGKARAN per-customer dari angka
// agregat fetchDormantTrend (dormant_count/reactivated_count TETAP net
// status akhir saja, TIDAK berubah) — dipakai drill-down + bahan laporan.
//
// - 'active'      — belum lewat ambang dormant DAN ADA transaksi di dalam
//                    periode ini ("Existing Aktif" per Kamus Penamaan
//                    Pelanggan, task029.md §36.28/§36.27).
// - 'inactive'     — belum lewat ambang dormant TAPI TIDAK ADA transaksi
//                    di dalam periode ini (masih masa tenggang, cuma
//                    belum beli lagi) — "Existing Inaktif" per kamus.
//                    Status BARU (2026-08-26, task029.md §36.28) — SEBELUMNYA
//                    digabung ke 'active' (bug klasifikasi kamus: "Aktif"
//                    dulu tidak bedakan "beli bulan ini" vs "belum lewat
//                    ambang tapi belum beli bulan ini"), dipisah krn
//                    instruksi user eksplisit: "buat endpoint nya
//                    pisahkan existing aktif dan inaktif".
// - 'dormant'     — sedang dormant, TIDAK ada order di antaranya (bukan
//                    hasil reaktivasi-lalu-dormant-lagi — itu 'newlyDormant'
//                    di bawah).
// - 'reactivated' — dormant di awal periode, order dalam periode, DAN masih
//                    aktif di akhir periode (net transisi dormant->aktif).
// - 'newlyDormant' — dormant di awal periode, sempat order dalam periode
//                    (reaktivasi), TAPI dormant LAGI di akhir periode
//                    (lebar bucket > ambang dormant). NAMA BARU (2026-08-26,
//                    task029.md §36.43, koreksi user: "Dormant kembali itu
//                    diganti nama menjadi newlydormant, hanya itu") dari
//                    status lama 'relapsed' — logikanya TIDAK berubah, cuma
//                    key/labelnya. TIDAK ada padanan di Kamus Penamaan
//                    Pelanggan (cuma 6 kategori dasar). Instruksi user
//                    eksplisit: "Dormant lagi tetap pertahankan sebagai
//                    informasi detail tambahan" (§36.27/§36.28) —
//                    dipertahankan sbg status EKSTRA di luar kamus.
export type DormantCustomerStatus = 'active' | 'inactive' | 'dormant' | 'newlyDormant' | 'reactivated'

export interface CustomerDormantStatusRow {
  customer_id: number
  customer_name: string
  customer_code: string | null
  company_name: string
  status: DormantCustomerStatus
  // Invoice terakhir SEBELUM periode ini (null kalau belum pernah beli sama sekali)
  last_invoice_before_period: string | null
  // Invoice PERTAMA dalam periode ini SETELAH sebelumnya dormant (null kalau
  // tidak ada order sama sekali dalam periode, atau tidak sedang dormant di awal periode)
  reactivation_date: string | null
  // Invoice TERAKHIR sampai akhir periode ini
  last_invoice_in_period: string | null
  // Rata-rata revenue bulanan 12 bulan trailing SEBELUM customer dormant
  // (2026-08-24, instruksi user: "urutkan berdasarkan avg revenue nya
  // tertinggi diantara reactivation lainnya" — dipakai sortir Top 5 M10,
  // definisi SAMA PERSIS avg_monthly_revenue di fetchDormantValueRanking/M9).
  avg_monthly_revenue: number
  // Tanggal pasti melewati ambang dormant (last_invoice_in_period + ambang
  // bulan) — hanya terisi kalau status akhir 'dormant'/'newlyDormant'
  dormant_since_date: string | null
}

export interface DormantStatusBreakdownData {
  period_start: string
  period_end: string
  rows: CustomerDormantStatusRow[]
}

export interface DormantValueTrendPoint {
  month: string
  value: number
}

export interface DormantMetricsData {
  trend: DormantTrendRow[]
  value_ranking: DormantValueRow[]
  // Tren 12-bulan estimasi total nilai hilang dari SELURUH customer dormant
  // (bukan cuma top-20 seperti value_ranking) — task025 §18/§19, 2026-08-07.
  // Reuse fetchDormantValueTrend (sebelumnya cuma dipakai Dashboard) supaya
  // KPI9 bisa pakai averageLastMonths yang sama dgn KPI8/KPI10, BUKAN
  // perhitungan baru — formula & threshold dormant PERSIS sama dgn
  // value_ranking (avg_monthly_revenue × months_dormant, dormantMonths dari
  // business_configs).
  value_trend: DormantValueTrendPoint[]
  dormant_rate_current: {
    value: number
    dormant_count: number
    total_customers: number
    alert_pct: number
    // comparison_value (task025 lanjutan, 2026-08-07): nilai dormant_rate
    // pada tanggal YANG SAMA setahun lalu — dipakai KpiSummaryStrip di
    // frontend (pola "apple to apple" dgn halaman Revenue/Retention).
    // Dihitung dari fetchDormantTrend KEDUA dgn filterDate digeser -1 tahun,
    // BUKAN perubahan business rule apa pun (threshold dormant tetap sama).
    comparison_value: number
    // Severity split (koreksi user 2026-08-10, opsi A) — snapshot current +
    // comparison (setahun lalu), pola SAMA persis dgn dormant_count/
    // comparison_value di atas.
    active_count: number
    dormant_light_count: number
    dormant_severe_count: number
    active_count_comparison: number
    dormant_light_count_comparison: number
    dormant_severe_count_comparison: number
  }
  reactivation_current: {
    value: number
    target_low: number
    target_high: number
    comparison_value: number
  }
  // Total estimated_lost_value dari SEMUA dormant customer (2026-08-26,
  // task029.md §36.12 — DIPERBAIKI, SEBELUMNYA cuma jumlah top-20 ranking,
  // understated ~93% — lihat komentar di metrics.service.ts), current vs
  // setahun lalu (dihitung ULANG di tanggal pembanding, bukan snapshot yang
  // sama) — dipakai KpiSummaryStrip halaman Nilai Hilang (KPI9).
  value_ranking_total_current: number
  value_ranking_total_comparison: number
  // value_ranking_total_gp_current/_comparison (2026-08-26, §36.12) — versi
  // Gross Profit paralel, SAMA PERSIS pola di atas cuma basis GP.
  value_ranking_total_gp_current: number
  value_ranking_total_gp_comparison: number
  // Daftar customer yang reaktivasi di periode berjalan (KPI10 top 5/tabel,
  // top 20 by tanggal reaktivasi terbaru) — REUSE fetchCustomerDormantStatusLog
  // pada bucket TERAKHIR trend (2026-08-24, susulan "buatkan juga 3 card
  // summary diatas cart, dan top 5" M10), filter status reactivated+newlyDormant
  // di service layer. Granularitas-aware (dulu fetchReactivatedCustomers,
  // hardcode window 1 bulan kalender — DIHAPUS, sudah tidak dipakai lagi).
  reactivated_customers: CustomerDormantStatusRow[]
}

export interface CustomerMetricsData {
  trend: CustomerMetricsTrendPoint[]
  detail: unknown[]
  /** Rentang tanggal periode aktif SETELAH resolveTrendPeriod (2026-08-23) —
   * dipakai display kartu KPI (mis. "Existing Customer") supaya baca tanggal
   * yang SUDAH di-clamp backend, bukan echo periodEnd mentah dari filter
   * frontend (bug: M7ExpansionGrowth sempat tampil tanggal beda dari M1/M2
   * krn baca periodEnd mentah, bukan hasil clamp). Mirror `period` di
   * CrossSellingMetricsData. */
  period: { start: string, end: string }
  high_margin_current: {
    bought_pct: number
    not_bought_pct: number
  }
  repeat_order_current: {
    value: number
    target_pct: number
  }
}

// ── M1, M1.1, M2 — Cross Selling ──────────────────────────────────────────────

export interface CrossSellingTrendRow {
  // Nama field TETAP `month` (hindari rename massal di FE) tapi ISI-nya sekarang
  // period_key sesuai granularitas request (task029.md §30, 2026-08-20) —
  // 'YYYY-MM' utk monthly (default, backward compatible), 'YYYY-QN'/'YYYY-SN'/
  // 'YYYY' utk quarter/semester/annual.
  month: string
  total_active: number
  multi_product: number
  ratio: number
  avg_category: number
}

export interface CrossSellingDetailRow {
  customer_id: number
  customer_code: string | null
  customer_name: string
  category_count: number
  has_unit: boolean
  has_consumable: boolean
  has_sparepart: boolean
  total_revenue: number
  // Branch/Division/Channel (task029.md §28.10, 2026-08-21) — dari invoice
  // TERBARU customer itu DI DALAM periode laporan (bukan all-time), null
  // kalau customer tidak py invoice ter-mapping channel_divisions.
  branch: string | null
  division: string | null
  channel: string | null
  // Breakdown per tipe produk (task029.md §28.10, koreksi 2026-08-21 — SEBELUMNYA
  // 6 field hardcode unit/consumable/sparepart, TERNYATA item_type per company
  // bervariasi (KNT 6 tipe termasuk 'card' Rp43.8M yang sebelumnya hilang dari
  // tabel). Sekarang map dinamis, key = item_type asli (bisa 'unit', 'card',
  // 'accesories', dst — apa pun yang ada di data), qty = SUM(quantity) asli
  // invoice_items (bukan COUNT(*) baris kayak heatmap M1.1, yang ambigu).
  type_breakdown: Record<string, { qty: number; revenue: number }>
}

export interface CrossSellingHeatmapRow {
  customer: string
  customer_id: number
  values: Record<string, number>
  revenues: Record<string, number>
  total_revenue: number
}

export interface CrossSellingMetricsData {
  // type/key (task029.md §30, 2026-08-20) — granularitas & period_key yang
  // BENAR-BENAR dipakai (bukan cuma echo param request), berguna FE cross-check
  // label tanpa hitung ulang periodKey sendiri.
  period: { start: string; end: string; active_months: number; type: string; key: string }
  kpi1: { multi_cat_count: number; active_count: number; rate: number }
  kpi2: { avg_categories: number; total_distinct_cats: number }
  trend: CrossSellingTrendRow[]
  detail: CrossSellingDetailRow[]
  // categories (heatmap) discovered dari top-30-customer scope heatmap SAJA —
  // detail_categories dari SEMUA customer (fetchCrossSellingDetail) — sengaja
  // 2 field terpisah (2026-08-21), supaya tabel breakdown tidak kehilangan tipe
  // produk yang cuma dibeli customer di luar top-30 heatmap.
  heatmap: CrossSellingHeatmapRow[]
  categories: string[]
  detail_categories: string[]
}

// ── 3.3 Product Trend (avg-category) ──────────────────────────────────────────

export interface AvgCategoryTrendPoint {
  month: string
  avg_category: number
}

export interface ProductTrendData {
  company_id: number | 'all'
  period_month: string
  trend: AvgCategoryTrendPoint[]
  current_avg: number
  prev_avg: number | null
  change_pct: number | null
}
