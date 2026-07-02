# Feature: Dashboard

> Status: ✅ Complete — GET summary, real DB (sebelumnya MSW mock)
> Last updated: 2026-07-02 (sesi 27 — FE title/subtitle override, lihat catatan di bawah)
> Baca juga: `features/metrics.md`, `executive-dashboard/overview.md`, `executive-dashboard/api.md`

---

## Overview

Dashboard feature menyajikan ringkasan 10 KPI (M1–M10) dalam satu response untuk halaman utama (`/dashboard`, landing page setelah login). Tidak ada query params — selalu company scope `'all'` dan tanggal referensi hari ini.

Bukan sumber kalkulasi baru — endpoint ini murni **agregator**: memanggil ulang service metrics yang sudah live (`getCrossSellingMetrics`, `getCustomerMetrics`, `getDormantCustomerMetrics`) dan menyusun ulang hasilnya jadi 10 `MetricCard` seragam. Satu-satunya kalkulasi baru adalah `dormant_value` (lihat di bawah).

---

## File Structure

```
backend/src/features/dashboard/
├── dashboard.types.ts       — MonthlyTrendPoint, MetricSummary, MetricCard, DashboardData
├── dashboard.repository.ts  — fetchDormantValueTrend() (satu-satunya query SQL baru)
├── dashboard.service.ts     — getDashboard(): reuse 3 service metrics + buildCard()/buildSummary()
├── dashboard.handler.ts     — handleGetDashboard (tanpa validateQuery — tidak ada query params)
└── dashboard.route.ts       — GET /, permission dashboard:view

frontend/src/
├── api/dashboard.api.ts            — dashboardApi.getDashboard()
├── hooks/useDashboard.ts           — useDashboard(), queryKey ['dashboard']
├── types/dashboard.ts              — DashboardData, MetricCard, MetricSummary, MonthlyTrendPoint
├── pages/Dashboard/index.tsx       — 10 StatCard (Row 1) + 7 chart widget (Row 2, subset metric_key)
└── mocks/handlers/dashboard.handler.ts — DISABLED, tidak lagi di-spread ke handlers.ts
```

Tidak ada `dashboard.schema.ts` — tidak ada query params dari frontend (`api.get('/dashboard')` polos), pola sama dengan `GET /api/v1/permissions`.

---

## API Endpoint

### `GET /api/v1/dashboard`

Permission: `dashboard:view`

**Tidak ada query params.** Selalu `company_id = 'all'`, tanggal referensi = hari ini (`todayDate()`).

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "period_month": "2026-07",
    "active_window": 1,
    "metrics": [
      {
        "metric_key": "cross_selling_ratio",
        "title": "Cross Selling Ratio",
        "subtitle": "Customer beli >1 kategori / Total customer aktif",
        "link": "/cross-selling",
        "format": "percent",
        "color": "#3B82F6",
        "summary": {
          "current_value": 36.3,
          "previous_value": 33.2,
          "change_percent": 9.3,
          "trend": "up"
        },
        "monthly_trend": [
          { "month": "2025-08", "value": 39.9 },
          { "month": "2026-06", "value": 36.3 }
        ]
      }
    ]
  }
}
```

`metrics[]` selalu berisi 10 item, urutan tetap (dipakai FE untuk urutan Row 1 stat card apa adanya — lihat tabel di bawah).

---

## 10 Metric Card — Sumber Data

| # | `metric_key` | format | link | Sumber |
|---|---|---|---|---|
| 1 | `cross_selling_ratio` | percent | `/cross-selling` | `getCrossSellingMetrics().trend[].ratio` |
| 2 | `avg_category` | number | `/cross-selling` | `getCrossSellingMetrics().trend[].avg_category` |
| 3 | `avg_revenue` | currency | `/customer-metrics` | `getCustomerMetrics().trend[].avg_revenue` |
| 4 | `avg_gross_profit` | currency | `/customer-metrics` | `getCustomerMetrics().trend[].avg_gross_profit` |
| 5 | `high_margin_penetration` | percent | `/customer-metrics` | `getCustomerMetrics().trend[].high_margin_ratio` |
| 6 | `repeat_order_rate` | percent | `/customer-metrics` | `getCustomerMetrics().trend[].repeat_order_rate` |
| 7 | `expansion_rate` | percent | `/customer-metrics` | `getCustomerMetrics().trend[].expansion_rate` |
| 8 | `dormant_rate` | percent | `/dormant-customer` | `getDormantCustomerMetrics().trend[].dormant_rate` |
| 9 | `dormant_value` | currency | `/dormant-customer` | **Baru** — `fetchDormantValueTrend()` (`dashboard.repository.ts`) |
| 10 | `reactivation_rate` | percent | `/dormant-customer` | `getDormantCustomerMetrics().trend[].reactivation_rate` |

Card #1–2 datang dari SATU pemanggilan `getCrossSellingMetrics()`, card #3–7 dari SATU `getCustomerMetrics()`, card #8+#10 dari SATU `getDormantCustomerMetrics()` — masing-masing dipanggil sekali (paralel via `Promise.all`), lalu di-derive ke beberapa card sekaligus. Total 3 pemanggilan service metrics + 1 query baru per request.

---

## Implementation Notes

### `current_value` / `previous_value` / `change_percent` — dihitung dari titik trend, bukan field terpisah

Service metrics existing (`getCrossSellingMetrics`, `getCustomerMetrics`, `getDormantCustomerMetrics`) hanya mengembalikan `trend[]` 12 titik bulan (+ kadang `xxx_current` untuk satu metric saja, tanpa `previous`/`change_percent`). Tidak ada helper shared untuk itu. `dashboard.service.ts` menambahkan helper sendiri:

```ts
function buildSummary(current: number, previous: number): MetricSummary {
  const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0
  return {
    current_value: current,
    previous_value: previous,
    change_percent: parseFloat(change.toFixed(1)),
    trend: current > previous ? 'up' : current < previous ? 'down' : 'stable',
  }
}
```

`current` = `trend.at(-1).value`, `previous` = `trend.at(-2).value` — pola yang sama persis dengan `getAvgCategoryTrend()` di `features/metrics.md`.

### `dormant_value` — query baru, bukan reuse

`fetchDormantValueRanking()` (M9, di `metrics/repository/m8m10.repository.ts`) sengaja `LIMIT 20` (untuk tabel ranking di halaman Dormant Customer) — tidak bisa dipakai untuk agregat total karena men-`SUM` hasilnya cuma menjumlah top-20 customer, bukan seluruh customer dormant.

`fetchDormantValueTrend()` (`dashboard/dashboard.repository.ts`) menghitung ulang **12 titik bulan** total estimated lost value dari **SEMUA** customer dormant (tanpa `LIMIT`), pakai formula per-customer yang sama (`avg_monthly_revenue × months_dormant`) tapi di-`SUM` per titik waktu, dengan pola CTE `cxm` (cap tanggal `me` per bulan) yang sama dengan `fetchDormantTrend()` (M8/M10) — supaya definisi "dormant" dan month grid konsisten dengan card `dormant_rate`/`reactivation_rate`.

### `resolveSegmentParams` di-export dari `metrics.service.ts`

Sebelumnya private (`async function resolveSegmentParams`). Diubah jadi `export async function resolveSegmentParams` supaya `dashboard.service.ts` bisa reuse logic threshold+segment yang sama (SSOT), bukan duplikasi.

### Month grid otomatis align antar 3 service metrics

`getCrossSellingMetrics` menormalkan `period_end` ke akhir bulan sebelum dipakai; `getCustomerMetrics`/`getDormantCustomerMetrics` memakai tanggal hari ini apa adanya. Keduanya tetap menghasilkan grid bulan yang sama karena query trend selalu `date_trunc('month', filterDate)` — truncate ke awal bulan menghilangkan perbedaan tanggal presisi, jadi 12 titik bulan di ketiga service align tanpa perlu penyesuaian manual.

### Titik bulan berjalan bisa 0 — ini bukan bug

Kalau request dilakukan di awal bulan (misal tanggal 2), titik trend bulan berjalan sering menunjukkan `0` (window aktif 30 hari belum terisi penuh) — sehingga `change_percent` bisa muncul `-100%`. Ini perilaku yang **sama** dengan halaman `/cross-selling` asli (`GET /metrics/cross-selling` juga menunjukkan titik bulan berjalan = 0 pada kondisi yang sama) — bukan sesuatu yang diperkenalkan endpoint dashboard ini.

### `title`/`subtitle` di response API adalah teks Indonesia hardcode backend — FE tidak lagi merender apa adanya (sesi 27)

`buildCard()` menyusun `title`/`subtitle` sebagai literal string Indonesia langsung di `dashboard.service.ts` (contoh field response di atas: `"subtitle": "Customer beli >1 kategori / Total customer aktif"`). Field ini **bukan** hasil i18n — backend tidak locale-aware. Awalnya FE (`pages/Dashboard/index.tsx`) merender `metric.title`/`metric.subtitle` apa adanya, sehingga saat locale FE di-set ke English, subtitle 10 KPI card tetap tampil Indonesia (ditemukan saat verifikasi manual, sesi 27).

Fix: FE mengabaikan `metric.title`/`metric.subtitle` dan override via mapping lokal `METRIC_LABEL_KEYS: Record<metric_key, {title, desc}>` di `Dashboard/index.tsx`, memetakan ke namespace `metrics.*` di `i18n/locales/{en,id}.json` (10 pasang `metrics.<key>`/`metrics.<key>Desc` — sudah ada di locale sebelum sesi ini tapi orphaned/tidak pernah dipakai). Response API **tidak diubah** — `title`/`subtitle` backend tetap dikirim apa adanya untuk backward-compat (dipakai contoh di dokumen ini), FE cukup tidak lagi mengonsumsinya untuk teks yang dirender ke UI.

### Tidak ada company scoping eksplisit

Endpoint ini selalu query `company_id = 'all'` tanpa `resolveCompanyScope()` — konsisten dengan keterbatasan yang sudah ada di seluruh fitur metrics (`resolveCompanyScope` dipanggil di handler lain hanya untuk cek otorisasi, hasilnya tidak dipakai untuk membatasi query aktual). Non-superadmin yang di-assign ke satu company tertentu tetap melihat agregat SEMUA company di dashboard. Ini bukan regresi baru — sudah jadi keterbatasan arsitektur metrics secara keseluruhan, di luar scope endpoint ini untuk diperbaiki.

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 500 | `INTERNAL_ERROR` | Server/DB error (termasuk error dari service metrics yang di-reuse) |

---

## MSW Mock Status

`dashboardHandlers` — **DISABLED**. Import dikomentari di `frontend/src/mocks/handlers.ts`, tidak lagi di-spread ke `handlers`.

---

## References

- **Backend**: `backend/src/features/dashboard/`
- **Router mount**: `backend/src/router.ts` — `protectedApi.route('/dashboard', dashboardRoutes)`
- **Reused services**: `backend/src/features/metrics/metrics.service.ts` (`getCrossSellingMetrics`, `getCustomerMetrics`, `getDormantCustomerMetrics`, `resolveSegmentParams`)
- **Permission seed**: `backend/src/db/seed.ts` (`dashboard:menu`, `dashboard:view` — sudah ada, tidak berubah)
- **Frontend Types**: `frontend/src/types/dashboard.ts`
- **Frontend Page**: `frontend/src/pages/Dashboard/`
- **Frontend Hooks**: `frontend/src/hooks/useDashboard.ts`
- **Planning doc**: `executive-dashboard/overview.md`, `executive-dashboard/api.md` (endpoint direncanakan sebagai `GET /metrics/summary` — implementasi aktual jadi `GET /dashboard`, planning doc belum di-update)

---

**Last Updated**: 2026-07-02
**Status**: ✅ Production Ready
