# Feature: Metrics (KPI 1–8)

> Status: 🟡 In Progress — M3–M7 backend live (perlu revisi denominator); M1–M2 & M8–M10 masih MSW mock
> Last updated: 2026-06-27
> Baca juga: `executive-dashboard/metrics.md` ⚠️ (definisi bisnis lengkap), `shared/backend.md`, `features/high-margin-products.md`

---

## Overview

Fitur metrics menghitung 10 KPI bisnis dari data faktur penjualan yang sudah diimport ke DB.
Semua kalkulasi dilakukan **backend-only**, tidak ada kalkulasi di frontend.

Sumber data tunggal: tabel `invoices` + `invoice_items` + `customers` + `high_margin_products`.

---

## File Structure

```
backend/src/features/metrics/
  metrics.schema.ts     ← Zod validation: company_id, period_month
  metrics.repository.ts ← Raw SQL (CTE) untuk tren M3–M7
  metrics.service.ts    ← Business logic, baca active_window dari DB config
  metrics.types.ts      ← TypeScript interfaces response
  metrics.handler.ts    ← Thin handler
  metrics.route.ts      ← GET /api/v1/metrics/customer-metrics

frontend/src/
  api/metrics.api.ts          ← axios calls
  hooks/useMetrics.ts         ← React Query hooks
  pages/CustomerMetrics/      ← Halaman M3–M7
  pages/CrossSelling/         ← Halaman M1–M2 (masih MSW)
  pages/DormantCustomer/      ← Halaman M8–M10 (masih MSW)
  mocks/handlers/metrics.handler.ts ← MSW: cross-selling + dormant masih mock
```

---

## Endpoint yang Sudah Live (Real DB)

### `GET /api/v1/metrics/customer-metrics`

Query params:
| Param | Tipe | Default | Keterangan |
|---|---|---|---|
| `company_id` | integer \| `"all"` | `"all"` | Filter per entitas |
| `period_month` | `YYYY-MM` | Bulan berjalan | Bulan referensi |

> **Tidak ada** param `active_window` — dibaca otomatis dari `business_configs.active_window_months`.

Response: `CustomerMetricsData` — lihat `metrics.types.ts`

### Endpoint Pendukung (Juga Live)

| Endpoint | Fungsi |
|---|---|
| `GET /api/v1/metrics/gp-breakdown` | Gross Profit breakdown detail |
| `GET /api/v1/metrics/hm-breakdown` | High Margin breakdown detail |
| `GET /api/v1/metrics/ror-breakdown` | Repeat Order Rate breakdown detail |

---

## Endpoint Masih Mock (MSW)

| Endpoint | KPI | File |
|---|---|---|
| `GET /api/v1/metrics/cross-selling` | M1, M1.1, M2 | `mocks/handlers/metrics.handler.ts` → `crossSellingHandlers` |
| `GET /api/v1/metrics/dormant-customer` | M8, M9, M10 | `mocks/handlers/metrics.handler.ts` → `dormantHandlers` |

Untuk mengaktifkan real backend, buat route di `metrics.route.ts` dan hapus handler dari MSW.

---

## Status Customer (Definisi Berlaku)

> Sumber kebenaran: `executive-dashboard/metrics.md`

| Status | Kondisi |
|---|---|
| **Aktif** | Ada invoice di bulan berjalan (`period_month`) |
| **Existing** | `first_invoice_date < period_start` AND tidak dormant |
| **Dormant** | `last_invoice_date < period_end - 90 hari` |
| **New** | `first_invoice_date` dalam `period_month` |

Threshold dormant = **90 hari tetap** — tidak dari config.

---

## Implementasi Saat Ini vs Definisi Bisnis (Gap)

> ⚠️ Backend M3–M7 yang sudah live BELUM sesuai definisi bisnis terbaru.
> Jangan dianggap final sampai 4 open questions di `executive-dashboard/metrics.md` terjawab.

| Gap | Kode Sekarang | Definisi Baru |
|---|---|---|
| M5/M6/M7 denominator | `active_existing` (punya transaksi dalam `active_window_months`) | **Total existing** customer |
| KPI 8 denominator | — (belum live) | **All customer** (bukan hanya existing) |
| Period window | Bulan kalender via `period_month` | Perlu konfirmasi: 30 hari rolling atau tetap kalender? |

---

## Cara Baca `active_window_months` dari DB

Service membaca threshold dari `business_configs` — konsisten dengan customers feature:

```ts
const configs = await findAllConfigs()
const activeWindow = parseInt(
  configs.find(c => c.key === 'active_window_months')?.value ?? '6'
)
```

> Catatan: `active_window_months` di DB saat ini masih dipakai untuk CTE `active_existing`.
> Setelah revisi (M5/M6/M7 denominator → total existing), parameter ini tidak lagi dibutuhkan di metrics.

---

## High Margin Products

M5 bergantung pada tabel `high_margin_products`. Kalkulasi high_margin_ratio = 0% selama tabel ini kosong.

Admin mengisi data via **Settings → High Margin Products** (`features/high-margin-products.md`).

Join di repository menggunakan:
```sql
JOIN high_margin_products hmp ON (
  hmp.product_category_id = ii.product_category_id
  OR hmp.product_id = ii.product_id
)
WHERE hmp.effective_from <= i.invoice_date
  AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
```

---

## Halaman Frontend

### `/customer-metrics` — M3–M7

Filter tersedia: **Entitas** (company selector) + **Periode** (month picker).

Charts:
| Widget | KPI | Data key |
|---|---|---|
| ComboChartWidget | M3 avg revenue | `trend[].avg_revenue` |
| BarChartWidget (stacked) | M4 avg GP tier | `trend[].gp_tier1/2/3` |
| DonutChartWidget | M5 snapshot | `high_margin_current` |
| RadialBarWidget | M6 snapshot | `repeat_order_current` |
| BarChartWidget (horizontal) | M7 trend | `trend[].expansion_rate` |

### `/cross-selling` — M1–M2 (MSW)
### `/dormant-customer` — M8–M10 (MSW)
