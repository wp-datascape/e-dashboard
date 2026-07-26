# Feature: Metrics (KPI 1–10)

> Status: 🟢 Semua endpoint live (real DB). Permission per endpoint diperbaiki sesi 32 (lihat §Permission).
> Last updated: 2026-07-04 (sesi 32)
> Baca juga: `executive-dashboard/metrics.md` (definisi bisnis), `shared/backend.md`, `features/high-margin-products.md`, `features/permissions.md`, `product-workbench/api.md`

---

## ⚠️ Permission per Endpoint (fix sesi 32)

Sebelum sesi 32, **semua 12 endpoint** di file ini pakai `requirePermission('metrics:view')` — permission yang sudah dipindah ke `OLD_PERMISSION_NAMES` (deprecated) sejak migrasi skema granular sesi 24 dan **tidak pernah di-seed lagi** ke tabel `permissions`. Akibatnya `metrics:view` mustahil di-assign ke role manapun lewat RBAC UI, dan **semua role non-superadmin selalu 403** di halaman manapun yang datanya lewat endpoint-endpoint ini — apa pun permission yang sudah diberikan. Dashboard (`GET /dashboard`, fitur terpisah) tidak kena karena pakai permission sendiri (`dashboard:view`), jadi gejalanya kelihatan seolah cuma sebagian halaman yang bermasalah.

Fix: permission tiap endpoint disamakan dengan `permissionKey` halaman frontend yang benar-benar memakainya (ditelusuri dari kode, bukan tebakan):

| Endpoint | Permission (baru) | Halaman frontend |
|---|---|---|
| `GET /cross-selling` | `cross.selling:view` | CrossSelling |
| `GET /customer-metrics` | `expansion:view` | CustomerMetrics |
| `GET /gp-breakdown`, `/hm-breakdown`, `/ror-breakdown` | `expansion:view` | CustomerMetrics (drill-down M4/M5/M6 — halaman yang sama) |
| `GET /dormant-customer` | `churn.risk:view` | DormantCustomer |
| `GET /category-performance`, `/category-products` | `product:view` | Products |
| `GET /high-margin-penetration/detail`, `/high-margin-penetration/customers`, `/customer-products` | `high.margin:view` | ProductsHighMargin |
| `GET /avg-category` | `product.trend:view` | ProductsTrend |

`avg-category` sebelumnya punya OR-fallback ke `metrics:view` (`requirePermission('product.trend:view', 'metrics:view')`) — fallback yang mati ini dihapus, sekarang cuma `product.trend:view`.

---

## Overview

Fitur metrics menghitung 10 KPI bisnis dari data faktur penjualan yang sudah diimport ke DB.
Semua kalkulasi dilakukan **backend-only**, tidak ada kalkulasi di frontend.

Sumber data: `invoices` + `invoice_items` + `customers` + `product_categories` + `high_margin_products`.

---

## File Structure

```
backend/src/features/metrics/
  metrics.schema.ts     ← Zod schemas: semua query params (company_id, period_end, division, dll)
  metrics.repository.ts ← Barrel re-export dari repository/*.ts
  metrics.service.ts    ← Business logic + catch → AppError
  metrics.types.ts      ← TypeScript interfaces response
  metrics.handler.ts    ← Thin handlers (validate → service → success)
  metrics.route.ts      ← GET /api/v1/metrics/*
  segment.helper.ts     ← SegmentParams interface, CTE builder (sqlExistingCustomers,
                           sqlDormantCustomers), monthEndDate()
  repository/
    m1.repository.ts                    ← fetchCrossSellingKPI/Trend/Detail/Heatmap (M1, M1.1, M2)
    m3m7.repository.ts                  ← fetchCustomerMetricsTrend (M3–M7)
    m4.repository.ts, m5.repository.ts, m6.repository.ts ← fetchGpBreakdown, fetchHmBreakdown, fetchRorBreakdown
    m8m10.repository.ts                 ← fetchDormantTrend, fetchDormantValueRanking
    category-performance.repository.ts  ← fetchCategoryPerformance (3.1)
    category-products.repository.ts     ← fetchCategoryProducts (drill-down 3.1). Param
                                           onlyHighMargin + kolom is_high_margin per baris +
                                           summary agregat terfilter — detail lengkap di
                                           features/high-margin-products.md §9 (task008)
    high-margin-penetration.repository.ts ← fetchHmDetail, fetchUpsellTargets (3.2). Resolusi
                                           HM level-kategori vs level-produk — lihat
                                           features/high-margin-products.md §9 (task008)
    customer-products.repository.ts     ← fetchCustomerProducts (drill-down customer)
    avg-category.repository.ts          ← fetchAvgCategoryTrend (3.3 Product Trend)

frontend/src/
  api/metrics.api.ts, api/products.api.ts ← axios calls (semua params sudah dikirim)
  hooks/useMetrics.ts, hooks/useProducts.ts ← React Query hooks (params → queryKey reaktif)
  types/metrics.ts, types/products.ts     ← Frontend interface types
  pages/CrossSelling/             ← Halaman M1–M2 (real backend)
  pages/CustomerMetrics/          ← Halaman M3–M7 (real backend)
  pages/DormantCustomer/          ← Halaman M8–M10 (real backend)
  pages/ProductsTrend/            ← Halaman 3.3 Product Trend (real backend, avg-category)
  mocks/handlers/metrics.handler.ts ← Semua handler DISABLED (komentar)
  mocks/handlers/products.handler.ts ← avgCategoryHandlers DISABLED (tidak lagi di-spread ke productsHandlers)
```

---

## Semua Endpoint Sudah Live (Real DB)

### `GET /api/v1/metrics/cross-selling` — M1, M1.1, M2

Query params:
| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `company_id` | integer \| `"all"` | `"all"` | Filter per entitas |
| `period_end` | `YYYY-MM-DD` | Hari ini | Tanggal akhir window 30 hari |
| `division` | enum | — | Filter channel division |

Window selalu **30 hari mundur** dari `period_end`. Bukan per-bulan kalender.

Response shape:
```ts
{
  period:     { start: string; end: string }
  kpi1:       { multi_cat_count: number; active_count: number; rate: number }
  kpi2:       { avg_categories: number; total_distinct_cats: number }
  trend:      CrossSellingTrendRow[]      // 12 bulan × 30-day rolling window
  detail:     CrossSellingDetailRow[]     // semua customer aktif, no LIMIT
  heatmap:    CrossSellingHeatmapRow[]    // top 30 customer × item_type
  categories: string[]                    // ['unit','sparepart','consumable'] urut frekuensi
}
```

**KPI 1** = customers beli >1 `product_category_id` / total customer aktif (%)
**KPI 2** = SUM(distinct categories per customer) / active customers = avg

Heatmap kolom = **item_type** (`unit` / `consumable` / `sparepart`), bukan nama kategori.
Hal ini memberikan 3 kolom bersih yang langsung menunjukkan cross-sell per tipe produk.

`CrossSellingHeatmapRow` (fix 2026-07-23): `{ customer, customer_id, values, revenues,
total_revenue }`. Seleksi + urutan 30 customer sekarang murni **total revenue DESC**
(dulu `type_count DESC, tx_count DESC` — customer dengan 1 transaksi di 3 kategori bisa
ranking di atas customer dengan 13 transaksi tapi cuma 2 kategori, tidak masuk akal
secara bisnis). `revenues` = revenue per kategori (dulu cuma transaction count di
`values`), `total_revenue` = total semua kategori, dipakai kolom tambahan + tooltip di
frontend. Klik sel yang sudah ada transaksi membuka dialog detail produk via
`GET /metrics/customer-products?item_type=...` (filter `item_type` baru, selain
`category_id` yang sudah ada sebelumnya).

Chart M1 (Active vs Multi-Category vs Cross-Selling Ratio) digabung jadi 1
`ComboChartWidget` (2 bar + 1 line), sebelumnya 2 chart terpisah berdampingan.

---

### `GET /api/v1/metrics/customer-metrics` — M3–M7

Query params:
| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `company_id` | integer \| `"all"` | `"all"` | Filter per entitas |
| `period_month` | `YYYY-MM` | Bulan berjalan | Bulan referensi |
| `division` | enum | — | Filter channel division |

Response: `CustomerMetricsData` — lihat `metrics.types.ts`

### Endpoint Pendukung Customer Metrics

| Endpoint | Fungsi | Params tambahan |
|---|---|---|
| `GET /api/v1/metrics/revenue-breakdown` | M3 Avg Revenue detail per customer *(baru 2026-07-23)* | `period_end` (YYYY-MM-DD) |
| `GET /api/v1/metrics/gp-breakdown` | M4 Gross Profit detail per customer | `month` (YYYY-MM) |
| `GET /api/v1/metrics/hm-breakdown` | M5 High Margin detail per customer | `month` (YYYY-MM) |
| `GET /api/v1/metrics/ror-breakdown` | M6 Repeat Order Rate detail | `month` (YYYY-MM) |
| `GET /api/v1/metrics/expansion-breakdown` | M7 Expansion Rate detail per customer (up vs flat/down) *(baru 2026-07-23)* | `period_end` (YYYY-MM-DD) |

M3 dan M7 sebelumnya tidak punya drill-down modal sama sekali (beda dengan M4/M5/M6) —
kedua endpoint ini mengisi gap itu, mirror pola `gp-breakdown` persis. Detail formula
di `shared/metrics_docs.md`.

---

### `GET /api/v1/metrics/dormant-customer` — M8, M9, M10

Query params:
| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `company_id` | integer \| `"all"` | `"all"` | Filter per entitas |
| `period_month` | `YYYY-MM` | Bulan berjalan | Bulan referensi (→ end-of-month) |
| `division` | enum | — | Filter channel division |

Response shape:
```ts
{
  trend:         DormantTrendRow[]      // 12 bulan tren dormant + reactivation
  value_ranking: DormantValueRow[]      // top 20 customer dormant, urut estimated_lost_value
  dormant_rate_current: {
    value: number; dormant_count: number; total_customers: number;
    alert_pct: number   // dari business_configs.dormant_rate_alert_pct
  }
  reactivation_current: {
    value: number;
    target_low: number;   // dari business_configs.reactivation_target_low_pct
    target_high: number;  // dari business_configs.reactivation_target_high_pct
  }
}
```

**M8** = dormant_rate_current.value (% dormant **bulan berjalan** — titik terakhir trend 12
bulan, label frontend "Dormant Rate — Bulan Berjalan"/"Current Month", diperbaiki 2026-07-23
dari label lama "Bulan Terakhir"/"Last Month" yang menyesatkan karena bukan bulan sebelumnya)

**M9** = value_ranking → `estimated_lost_value = avg_monthly_revenue × months_dormant` (pakai
`::bigint`). `avg_monthly_revenue` (fix 2026-07-23) = total revenue **12 bulan kalender
terakhir SEBELUM customer dormant** (bukan `last_invoice_date` customer itu, bukan
`filterDate` global) dibagi **fixed 12** — sebelumnya dibagi jumlah bulan yang benar-benar
ada transaksi ("active_months" per customer), sehingga customer yang belanja jarang/borongan
mendapat rata-rata yang melambung jauh dari kenyataan (`fetchDormantValueRanking`,
`m8m10.repository.ts`).

**M10** = reactivation_current.value (% reactivation bulan terakhir)

Dormant threshold (dormantDays) dibaca dari `business_configs.dormant_threshold_months.*` via `resolveSegmentParams()`.

---

### `GET /api/v1/metrics/avg-category` — 3.3 Product Trend (reuse M2)

Query params:
| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `company_id` | integer \| `"all"` | `"all"` | Filter per entitas |
| `period_month` | `YYYY-MM` | Bulan berjalan | Dinormalisasi ke akhir bulan (pola sama dengan `category-performance`) |
| `active_window` | integer (1–24) | `business_configs.active_window_months` | Window bulan untuk hitung avg kategori per customer — lihat catatan di bawah |

Permission: `product.trend:view` (lihat §Permission per Endpoint di atas — OR-fallback lama ke `metrics:view` sudah dihapus sesi 32).

Response shape:
```ts
{
  company_id:   number | 'all'
  period_month: string
  trend:        { month: string; avg_category: number }[]  // 12 titik bulan
  current_avg:  number        // trend[-1].avg_category
  prev_avg:     number | null // trend[-2].avg_category, null jika trend < 2 titik
  change_pct:   number | null // (current - prev) / prev * 100, null jika prev null/0
}
```

Query rolling-window sama pola dengan `fetchCrossSellingTrend` (M2 di `m1.repository.ts`) — per titik bulan, hitung `COUNT(DISTINCT product_category_id)` per customer dalam window `active_window` bulan ke belakang, lalu `AVG()` across customer aktif. **Beda dari M2 asli**: tidak ada filter `division`/`channel_divisions`, karena `ProductTrendParams` di frontend tidak punya field itu — endpoint ini murni turunan M2 tanpa filter tambahan.

Reuse relationship: dulu 3.3 direncanakan "reuse M2 endpoint" (`GET /metrics/cross-selling`), tapi karena frontend sudah terlanjur memanggil path `/metrics/avg-category` dengan shape response berbeda (bukan bagian dari `CrossSellingMetricsData`), dibuat endpoint terpisah dengan logic query yang mirip, bukan literal reuse endpoint yang sama.

### `active_window` — default dari business config, bukan hardcode (fix 2026-07-02)

Awalnya `active_window` default `6` (hardcode di Zod schema DAN di frontend `ProductsTrend/index.tsx`). Ini bikin titik trend jadi **rolling 6-bulan** — misal titik "2026-07" isinya rata-rata Feb–Jun (karena Juli belum ada data), bukan murni aktivitas Juli. User bingung karena label bulan terlihat seperti "hasil bulan itu" padahal representasinya rolling window.

Fix: `avgCategoryQuerySchema.active_window` sekarang cuma `.optional()` (tanpa `.default(6)`), dan `getAvgCategoryTrend()` fallback ke `(await loadThresholds()).activeMonths` (`business_configs.active_window_months`) kalau caller tidak eksplisit kirim `active_window`. Frontend `ProductsTrend/index.tsx` juga sudah hapus hardcode `active_window: 6` dari pemanggilan `useProductTrend()`.

Efeknya: dengan `active_window_months` default `1`, tiap titik trend sekarang **self-contained per bulan kalender** (sama seperti M2 di halaman Cross Selling), bukan rolling multi-bulan — titik bulan berjalan yang belum ada transaksi akan benar-benar tampil `0`, bukan angka dari bulan-bulan sebelumnya. Kalau admin ubah `active_window_months` di **Settings → Threshold**, chart Product Trend otomatis ikut berubah tanpa redeploy. Override manual via query param `?active_window=N` masih didukung (dipakai kalau suatu saat ada UI dropdown window seperti di halaman Category Performance).

---

## Konfigurasi Threshold (business_configs)

| Key | Default | Dipakai di |
|---|---|---|
| `active_window_months` | 6 | M3–M7: window customer aktif |
| `dormant_threshold_months.b2b_dc` | 3 | M8–M10: threshold dormant B2B DC |
| `dormant_threshold_months.b2b_project` | 6 | M8–M10: threshold dormant B2B Project |
| `dormant_threshold_months.b2c` | 1 | M8–M10: threshold dormant B2C |
| `dormant_threshold_months.manufacturing` | 3 | M8–M10: threshold dormant Manufacturing |
| `repeat_order_target_pct` | 40 | M6: target repeat order rate |
| `dormant_rate_alert_pct` | 10 | M8: ambang zona merah di grafik |
| `reactivation_target_low_pct` | 15 | M10: batas bawah target (zona kuning) |
| `reactivation_target_high_pct` | 20 | M10: batas atas target (zona hijau) |

Semua threshold dapat diedit dari **Settings → Threshold** (`/settings/threshold`).
Tiga threshold baru (dormant alert + reactivation target) muncul di section "Target KPI".

---

## Division Filter — Pola JOIN

Division **bukan** kolom di `invoices`. Join dilakukan via `channel_divisions`:

```sql
LEFT JOIN channel_divisions cd
  ON  cd.channel_name  = i.channel_name
  AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
WHERE (${division}::text IS NULL OR cd.division = ${division}::text)
```

Pattern ini konsisten di seluruh repository metrics.

---

## Dormant Trend — Metode Perhitungan (M8 & M10)

Menggunakan CROSS JOIN customers × months (12 bulan) dengan `MAX(invoice_date) FILTER` per titik waktu:

- `last_at_me` = last invoice customer as-of akhir bulan M (bukan current last_invoice_date)
- `last_at_prev_me` = last invoice as-of akhir bulan M-1
- `active_in_month` = BOOL_OR invoice dalam bulan M
- **Dormant di M** = `last_at_me < me - dormantDays`
- **Reactivated di M** = dormant di M-1 AND active_in_month

Ini memberikan histori yang akurat — customer yang sekarang aktif bisa saja terhitung dormant di bulan lalu.

---

## Status Customer (Definisi Berlaku)

| Status | Kondisi |
|---|---|
| **Aktif (cross-selling)** | Ada invoice dalam window 30 hari sebelum `period_end` |
| **Existing** | `first_invoice_date < period_start` AND tidak dormant |
| **Dormant** | `last_invoice_date < period_end - dormantDays` (per division config) |
| **Reactivated** | Dormant bulan lalu + ada invoice bulan ini |

---

## Halaman Frontend

### `/cross-selling` — M1, M1.1, M2

Filter: **Entitas** + **Divisi** + **Tanggal Akhir** (date picker, default hari ini)

| Section | Widget | Data |
|---|---|---|
| KPI 1 — Cross-Sell Rate | KpiCard | `kpi1.rate` (%) |
| KPI 2 — Avg Kategori | KpiCard | `kpi2.avg_categories` |
| Customer Aktif | KpiCard | `kpi1.active_count` |
| Cross-Sell Rate bulan ini | KpiCard | `trend[-1].ratio` |
| M1 Trend bar + ratio | BarChartWidget × 2 | `trend[].total_active`, `multi_product`, `ratio` |
| M1.1 Heatmap | HeatmapWidget | `heatmap` × `categories` (item_type) |
| M2 Trend area (full width) | AreaChartWidget | `trend[].avg_category` |
| Detail Table | ResponsiveListView / DetailCard | `detail[]` — all customers, DataGrid paginated |

### `/customer-metrics` — M3–M7

Filter: **Entitas** + **Divisi** + **Periode** (month picker)

### `/dormant-customer` — M8–M10

Filter: **Entitas** + **Divisi** + **Periode** (month picker)

| Section | Widget | Data |
|---|---|---|
| M8 Line Chart + stat card | LineAlertWidget | `trend[].dormant_rate`, threshold = `alert_pct` |
| M9 Horizontal Bar | BarChartWidget | `value_ranking[].estimated_lost_value` |
| M10 Bullet + Line | BulletChartWidget + LineAlertWidget | `reactivation_current`, `trend[].reactivation_rate` |

Semua threshold (alert_pct, target_low, target_high) dibaca dari response backend — bukan hardcode.

### `/products/trend` — 3.3 Product Trend

Filter: **Entitas** (default `'all'`), `period_month` default bulan berjalan (`todayMonth()`, sebelumnya hardcode `'2024-01'`). `active_window` tidak dikirim dari FE — backend fallback ke `business_configs.active_window_months` (lihat catatan "default dari business config" di atas).

| Section | Widget | Data |
|---|---|---|
| KPI Current Avg | StatCard | `current_avg` |
| KPI Prev Avg | StatCard | `prev_avg` |
| KPI Change % | StatCard + trend icon | `change_pct` |
| Trend Chart | AreaChartWidget | `trend[].avg_category`, xKey `month` |

---

## MSW Mock Status

Semua handler dinonaktifkan (komentar `// DISABLED`):
- `crossSellingHandlers` — real backend aktif
- `customerMetricsHandlers` — real backend aktif
- `dormantHandlers` — real backend aktif
- `avgCategoryHandlers` (di `mocks/handlers/products.handler.ts`) — real backend aktif (`GET /metrics/avg-category`)
