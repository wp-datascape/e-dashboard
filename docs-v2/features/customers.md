# Feature: Customers

> Status: ✅ Complete — GET list + GET detail, status logic, channel division filter
> Last updated: 2026-06-27
> Baca juga: `shared/data-model.md`, `customer-workbench/api.md`, `features/config-page.md`

---

## Overview

Customers feature menyajikan data master customer yang diturunkan otomatis dari data impor faktur. Tidak ada form input manual — customer di-upsert setiap kali faktur baru diimpor.

Setiap customer memiliki:
- **Status** (new/active/dormant/existing) — dihitung runtime dari threshold di `business_configs`
- **Division** — diambil dari kolom "Nama Tenaga Penjual" di Accurate export, di-lookup via tabel `channel_divisions`
- **Agregat keuangan** — `lifetime_value`, `avg_monthly_revenue`, `category_count`, `total_invoices`

---

## Channel Division Concept

Kolom "Nama Tenaga Penjual" di export Accurate Online **bukan nama orang** — melainkan nama channel penjualan (e.g. "DC WEST", "TOKOPEDIA"). Nilai ini disimpan di `invoices.channel_name` (UPPERCASE).

Mapping channel_name → division dilakukan via tabel `channel_divisions` (21 baris seed):

| Division | Contoh Channel |
|----------|----------------|
| `distribution` | DC WEST, DC EAST, DC WEST HEAD, DC EAST HEAD, DC EAST CARD |
| `project` | SDR B2B WEST, B2B EAST, KAE WEST, NAS B2B EAST, NAS B2B WEST |
| `e_commerce` | KASSEN OFFICIAL STORE, TOKOPEDIA, TIKTOKSHOP, LAZADA |
| `intercompany` | KODE NIAGA TAMA, CODESHOP |
| `freelancer` | SBY UDIN |
| `support` | SALES SUPPORT, SALES SUPPORT JKT |

---

## Customer Status Logic

Status dihitung dari `last_invoice_date` vs threshold dari tabel `business_configs`:

| Status | Kondisi |
|--------|---------|
| `new` | `last_invoice_date IS NULL` ATAU `first_invoice_date >= NOW - active_window_months` |
| `active` | `last_invoice_date >= NOW - active_window_months` (dan bukan new) |
| `dormant` | `last_invoice_date < NOW - dormant_threshold_months.{division}` |
| `existing` | Antara dormant threshold dan active window |

Threshold config dari `business_configs`:
- `active_window_months` — default 1 bulan
- `dormant_threshold_months.b2b_dc` — untuk distribution + support
- `dormant_threshold_months.b2b_project` — untuk project + intercompany
- `dormant_threshold_months.b2c` — untuk e_commerce + freelancer

Ubah threshold di halaman **Config → Business Rules** → status customer berubah real-time tanpa deploy.

---

## File Structure

```
src/features/customers/
├── customers.schema.ts      — Zod DTO (customersQuerySchema, customerIdParamSchema)
├── customers.repository.ts  — findCustomers() + findCustomerDetail() dengan Drizzle
├── customers.handler.ts     — handleGetCustomers + handleGetCustomerDetail
└── customers.route.ts       — GET / + GET /:id
```

**Tabel DB yang dipakai:**
- `customers` — master customer
- `companies` — nama perusahaan
- `invoices` — aggregate revenue, tanggal, channel_name
- `invoice_items` — category_count
- `product_categories` — nama kategori
- `channel_divisions` — lookup division dari channel_name
- `business_configs` — threshold dormant + active_window

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/customers`

> **Catatan:** Saat ini aktif **tanpa auth guard** (sementara, pending authMiddleware).

---

### `GET /api/v1/customers`

List customer dengan filter, sort, dan paginasi.

**Query params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `company_id` | integer \| `"all"` | `"all"` | Filter per entitas |
| `status` | `"new"` \| `"active"` \| `"dormant"` \| `"existing"` | — | Filter status customer |
| `business_unit` | division value (lihat bawah) | — | Filter division via `channel_divisions` |
| `search` | string | — | Cari nama customer (`ILIKE %term%`) |
| `sort_by` | `"last_invoice_date"` \| `"lifetime_value"` \| `"avg_monthly_revenue"` \| `"category_count"` | `"last_invoice_date"` | Kolom sort |
| `sort_dir` | `"asc"` \| `"desc"` | `"desc"` | Arah sort |
| `page` | integer | 1 | Halaman |
| `per_page` | integer (1–200) | 50 | Jumlah per halaman |
| `as_of_date` | string (YYYY-MM-DD) | CURRENT_DATE | Tanggal referensi — membatasi status, first/last_invoice_date, DAN 4 field agregat (`total_invoices`, `lifetime_value`, `avg_monthly_revenue`, `category_count`). *(Fix 2026-07-23: sebelumnya 4 field agregat itu cuma filter `deleted_at`, sama sekali tidak dibatasi `as_of_date` — filter tahun lampau tetap menampilkan angka current. `avg_monthly_revenue` juga dibatasi ke window 12 bulan kalender sebelum `as_of_date` dibagi fixed 12, bukan lagi all-time dibagi jumlah bulan aktif — match persis dengan window trend chart 12 bulan di dialog detail.)* Customer tanpa invoice sama sekali as of tanggal ini disembunyikan dari list. |

Nilai valid `business_unit`: `distribution` \| `project` \| `e_commerce` \| `intercompany` \| `freelancer` \| `support`

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "customer_code": "CUST-001",
      "name": "PT ABC SEJAHTERA",
      "company": { "id": 1, "name": "PT MKO" },
      "business_unit": "distribution",
      "division": "distribution",
      "status": "active",
      "first_invoice_date": "2022-03-15",
      "last_invoice_date": "2024-01-20",
      "category_count": 3,
      "avg_monthly_revenue": 15000000,
      "lifetime_value": 540000000,
      "total_invoices": 36
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 320 }
}
```

**Error:**
```json
{ "error": "INTERNAL_ERROR", "message": "Gagal mengambil data customer" }
```

---

### `GET /api/v1/customers/:id`

Detail lengkap satu customer — metrik agregat + trend bulanan + invoice terbaru.

**Path params:**
| Param | Tipe | Rules |
|-------|------|-------|
| `id` | integer | Positive integer |

**Query params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `as_of_date` | string (YYYY-MM-DD) | CURRENT_DATE | *(Baru 2026-07-23)* Membatasi trend chart 12 bulan, daftar invoice terbaru, dan kategori — dialog detail sekarang ikut filter `as_of_date` yang sama dengan list (dulu selalu `CURRENT_DATE`, tidak sinkron dengan filter tanggal di halaman list). |

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 1,
    "customer_code": "CUST-001",
    "name": "PT ABC SEJAHTERA",
    "company": { "id": 1, "name": "PT MKO" },
    "business_unit": "distribution",
    "division": "distribution",
    "channel": "DC WEST",
    "status": "active",
    "first_invoice_date": "2022-03-15",
    "last_invoice_date": "2024-01-20",
    "lifetime_value": 540000000,
    "avg_monthly_revenue": 15000000,
    "category_count": 3,
    "categories_bought": ["Scanner", "Printer", "Ribbon"],
    "monthly_revenue_trend": [
      { "month": "2025-07", "revenue": 12000000, "gp": 3600000 },
      { "month": "2025-08", "revenue": 0, "gp": 0 }
    ],
    "recent_invoices": [
      {
        "invoice_number": "SI.2024.01.00001",
        "invoice_date": "2024-01-20",
        "total_revenue": 18000000,
        "total_gp": 5400000
      }
    ]
  }
}
```

**Error:**
```json
{ "error": "NOT_FOUND", "message": "Customer dengan id 99 tidak ditemukan" }
```

---

## Implementation Notes

### Query Architecture

**`findCustomers()`** — dua query paralel via `Promise.all`:

1. **COUNT query** — `COUNT(DISTINCT customers.id)` dengan JOIN ke `channel_divisions` (diperlukan untuk division filter)
2. **Main SELECT** — aggregate per customer: `SUM(total_revenue)`, `COUNT(invoices)`, `COUNT(DISTINCT product_category_id)`

Division di-resolve lewat subquery `latest_sp`:
```sql
SELECT DISTINCT ON (customer_id) customer_id, channel_name
FROM invoices
WHERE deleted_at IS NULL
ORDER BY customer_id, invoice_date DESC
```
Kemudian LEFT JOIN ke `channel_divisions` via `channel_name`.

**PENTING:** Filter `business_unit` diapply via `channel_divisions.division`, **bukan** `customers.business_unit`. Data historis di `customers.business_unit` mungkin null. JOIN ke `channel_divisions` di kedua query (COUNT + main SELECT) wajib ketika filter division aktif.

**`findCustomerDetail()`** — sequential:
1. Ambil `channel_name` dari invoice terbaru
2. Lookup `division` dari `channel_divisions`
3. Aggregate query (lifetime_value, avg_monthly_revenue, category_count)
4. `SELECT DISTINCT` categories_bought
5. `generate_series` CTE untuk monthly_revenue_trend 12 bulan (bulan tanpa transaksi = 0)
6. 5 recent invoices

### generate_series untuk Monthly Trend

Menggunakan PostgreSQL CTE agar semua 12 bulan selalu muncul:

```sql
WITH months AS (
  SELECT TO_CHAR(m, 'YYYY-MM') AS month
  FROM generate_series(
    DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months'),
    DATE_TRUNC('month', CURRENT_DATE),
    INTERVAL '1 month'
  ) AS m
),
actuals AS (
  SELECT TO_CHAR(invoice_date::date, 'YYYY-MM') AS month,
         SUM(total_revenue) AS revenue,
         SUM(total_gp) AS gp
  FROM invoices
  WHERE customer_id = $1 AND deleted_at IS NULL ...
  GROUP BY 1
)
SELECT m.month, COALESCE(a.revenue, 0), COALESCE(a.gp, 0)
FROM months m LEFT JOIN actuals a ON a.month = m.month
```

### Drizzle Quirks

- `selectDistinctOn` hanya bisa dipakai di subquery — tidak kompatibel dengan `GROUP BY` di query utama Drizzle v0.31
- Integer params di `CASE THEN` perlu `::int` cast eksplisit agar tidak dianggap text oleh PostgreSQL

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Query param tidak valid |
| 404 | `NOT_FOUND` | Customer ID tidak ada |
| 500 | `INTERNAL_ERROR` | Server/DB error |

---

## References

- **Backend**: `backend/src/features/customers/`
- **DB Schema**: `backend/src/db/schema/schema-transaction.ts` (table `customers`), `schema-product.ts` (table `channel_divisions`)
- **Config**: `backend/src/features/config/config.repository.ts` (`findAllConfigs`)
- **Frontend Types**: `frontend/src/types/customers.ts`
- **Frontend Page**: `frontend/src/pages/Customers/`
- **Frontend Hooks**: `frontend/src/hooks/useCustomers.ts`
- **Seed Data**: `backend/src/db/seed.ts` (channel_divisions 21 baris)

---

**Last Updated**: 2026-06-27
**Status**: ✅ Production Ready
