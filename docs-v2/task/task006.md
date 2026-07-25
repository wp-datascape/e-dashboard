# Task 006 — Kontribusi High Margin di Drill-Down M3

> Status: 📝 Planning — belum mulai implementasi
> Dibuat: 2026-07-25
> Baca juga: `executive-dashboard/metrics.md` (M3, M5), `features/high-margin-products.md`, `shared/metrics_docs.md`

---

## 1. Latar Belakang & Tujuan

User minta tambahan di dialog drill-down M3 (Customer Metrics → Average Revenue per Existing Customer): tampilkan berapa besar (value + persentase) kontribusi revenue dari produk **High Margin** terhadap total revenue M3 di bulan yang di-klik.

Contoh perhitungan dari user: total revenue 100jt, 10jt di antaranya dari produk High Margin → value kontribusi = Rp 10jt, persentase = **10% dari TOTAL revenue semua produk** (bukan dari subtotal High Margin saja).

**Riset (2026-07-25) menemukan:**
- M3 (`fetchRevenueBreakdown`, `backend/src/features/metrics/repository/m3m7.repository.ts:358-449`) murni berbasis revenue per customer — **tidak ada dimensi produk sama sekali** hari ini.
- "High Margin" di sistem ini = tabel `high_margin_products` (daftar produk/kategori yang ditandai admin secara manual — bukan dihitung otomatis dari margin aktual, lihat `features/high-margin-products.md`).
- Sudah ada query sejenis persis yang dibutuhkan di M5 (`fetchHmBreakdown`, `backend/src/features/metrics/repository/m5.repository.ts`) — bedanya M5 breakdown per-customer dengan persentase dari subtotal HM saja, sedangkan yang diminta di sini cuma 1 angka ringkasan dengan persentase dari total keseluruhan.
- Tidak ada UI pattern "matrix" lain di app ini selain Cross-Selling Matrix (M1) — kata "matrix" di request user kemungkinan besar cuma istilah umum utk "breakdown/tabel", bukan referensi ke heatmap M1.

**Tujuan task ini:** tambah 1 baris ringkasan baru "Kontribusi High Margin" (value + persentase) di summary box dialog drill-down M3 yang sudah ada — tanpa tabel/tab baru.

---

## 2. Keputusan Desain (dikonfirmasi user via AskUserQuestion)

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Lokasi fitur | Dialog drill-down M3 yang sudah ada | User pilih ini dari 3 opsi (drill-down M3 / halaman High Margin Products / matrix baru) |
| Bentuk data | 1 angka ringkasan (value + %), BUKAN tabel breakdown per produk/kategori | User pilih ini dari 2 opsi setelah melihat contoh perhitungannya cuma 1 angka |
| Definisi persentase | hm_revenue ÷ **total_revenue** (semua produk) × 100 | Dikonfirmasi eksplisit lewat contoh: "100jt total, 10jt HM = 10%" — bukan dibagi subtotal HM saja |
| Populasi yang dihitung | Existing customers only (established_customers), sama seperti populasi `total_revenue` M3 saat ini | Supaya value & persentase apple-to-apple dengan angka M3 lain di dialog yang sama |

---

## 3. Desain Teknis

Tambah 2 CTE baru di `fetchRevenueBreakdown` (mirror pola JOIN `high_margin_products` yang sudah dipakai `fetchHmBreakdown` M5, termasuk syarat `effective_from`/`effective_until`), reuse variable filter yang sudah ada di function (branch/division/company/exclude-intercompany):

```sql
hm_inv_active AS (
  SELECT i.customer_id, SUM(ii.revenue::numeric) AS hm_revenue
  FROM invoices i
  JOIN invoice_items ii ON ii.invoice_id = i.id
  JOIN high_margin_products hmp ON (
    hmp.company_id = i.company_id
    AND (hmp.product_id = ii.product_id OR hmp.product_category_id = ii.product_category_id)
  )
  LEFT JOIN channel_divisions cd ON cd.channel_name = i.channel_name AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
  WHERE i.deleted_at IS NULL
    AND i.invoice_date > <window sama seperti existing_revenue>
    AND <company/division/branch/exclude-intercompany cond sama>
    AND hmp.effective_from <= i.invoice_date
    AND (hmp.effective_until IS NULL OR hmp.effective_until >= i.invoice_date)
  GROUP BY i.customer_id
),
existing_hm_revenue AS (
  SELECT ec.id, hia.hm_revenue
  FROM established_customers ec
  JOIN hm_inv_active hia ON hia.customer_id = ec.id
)
```

`total` CTE tambah 1 kolom: `(SELECT COALESCE(SUM(hm_revenue),0) FROM existing_hm_revenue) AS hm_revenue`. Field baru ini diteruskan lewat repository → service → frontend type, lalu di frontend persentase dihitung inline (`hm_revenue / total_revenue * 100`) — pola sama seperti `avg_revenue` yang juga dihitung client-side dari `total_revenue/total_existing`.

---

## 4. Breakdown Implementasi

### Backend
- [ ] `m3m7.repository.ts` — tambah CTE `hm_inv_active`/`existing_hm_revenue`, tambah kolom `hm_revenue` ke `total` CTE dan SELECT akhir, update return type + mapping (termasuk early-return path saat `rawRows.length === 0`)
- [ ] `metrics.types.ts` — tambah `hm_revenue: number` ke `RevenueBreakdownData`
- [ ] `metrics.service.ts` (`getRevenueBreakdown`) — teruskan `hm_revenue` ke response

### Frontend
- [ ] `types/metrics.ts` — tambah `hm_revenue: number` ke `RevenueBreakdownData`
- [ ] `pages/CustomerMetrics/M3Revenue.tsx` — tambah 1 baris baru di summary box dialog (setelah "Median threshold"): label `dialogHmContribution`, value `${fmtRpDetail(hm_revenue)} (${pct}%)`
- [ ] i18n: key `customerMetrics.m3.dialogHmContribution` di `en` + `id`

---

## 5. Verifikasi

1. `bunx tsc --noEmit` (backend & frontend) bersih, `bun test` backend tetap pass.
2. `GET /metrics/revenue-breakdown?period_end=...&company_id=...` — response ada field `hm_revenue`, dibandingkan manual ke query `high_margin_products`+`invoice_items` company/period yang sama (mirror cara verifikasi M5 `fetchHmBreakdown` yang sudah ada).
3. Manual di browser: klik bar M3 → dialog buka → baris baru "Kontribusi High Margin" tampil format `Rp X (Y%)`, Y masuk akal (≤100%, 0% kalau tidak ada penjualan produk HM di bulan itu).
