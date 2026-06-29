# Feature: Metrics (KPI 1–10)

> Status: 🟢 M1–M2 & M8–M10 backend live · M3–M7 backend live
> Last updated: 2026-06-30
> Baca juga: `executive-dashboard/metrics.md` (definisi bisnis), `shared/backend.md`, `features/high-margin-products.md`

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
  metrics.repository.ts ← Raw SQL (CTE): fetchCrossSellingKPI/Trend/Detail/Heatmap,
                           fetchCustomerMetricsTrend, fetchGpBreakdown, fetchHmBreakdown,
                           fetchRorBreakdown, fetchDormantTrend, fetchDormantValueRanking
  metrics.service.ts    ← Business logic + catch → AppError
  metrics.types.ts      ← TypeScript interfaces response
  metrics.handler.ts    ← Thin handlers (validate → service → success)
  metrics.route.ts      ← GET /api/v1/metrics/*
  segment.helper.ts     ← SegmentParams interface, CTE builder (sqlExistingCustomers,
                           sqlDormantCustomers), monthEndDate()

frontend/src/
  api/metrics.api.ts              ← axios calls (semua params sudah dikirim)
  hooks/useMetrics.ts             ← React Query hooks (params → queryKey reaktif)
  types/metrics.ts                ← Frontend interface types
  pages/CrossSelling/             ← Halaman M1–M2 (real backend)
  pages/CustomerMetrics/          ← Halaman M3–M7 (real backend)
  pages/DormantCustomer/          ← Halaman M8–M10 (real backend)
  mocks/handlers/metrics.handler.ts ← Semua handler DISABLED (komentar)
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
| `GET /api/v1/metrics/gp-breakdown` | M4 Gross Profit detail per customer | `month` (YYYY-MM) |
| `GET /api/v1/metrics/hm-breakdown` | M5 High Margin detail per customer | `month` (YYYY-MM) |
| `GET /api/v1/metrics/ror-breakdown` | M6 Repeat Order Rate detail | `month` (YYYY-MM) |

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

**M8** = dormant_rate_current.value (% dormant bulan terakhir)
**M9** = value_ranking → estimated_lost_value = avg_monthly_revenue × months_dormant (pakai `::bigint`)
**M10** = reactivation_current.value (% reactivation bulan terakhir)

Dormant threshold (dormantDays) dibaca dari `business_configs.dormant_threshold_months.*` via `resolveSegmentParams()`.

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

---

## MSW Mock Status

Semua handler dinonaktifkan (komentar `// DISABLED`):
- `crossSellingHandlers` — real backend aktif
- `customerMetricsHandlers` — real backend aktif
- `dormantHandlers` — real backend aktif
