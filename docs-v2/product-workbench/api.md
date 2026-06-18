# product-workbench/api.md

> Endpoint API untuk Product & Portfolio Workbench (Group 3).
> Baca juga: `product-workbench/overview.md`, `product-workbench/decisions.md`, `shared/api-conventions.md`

## Status Endpoint per Halaman

| Halaman | Endpoint | Status |
|---------|----------|--------|
| 3.1 Product Performance Ledger | `GET /products` | Blocked — tabel `products` belum ada, gap SKU/qty |
| 3.2 High Margin Push List | `GET /metrics/high-margin-penetration` + detail baru | Partial — summary sudah ada |
| 3.3 Product Trend & Velocity | `GET /metrics/avg-category` | Sudah ada — reuse dari CrossSelling |
| 3.4 Dormant Product / Dead Stock | `GET /product-categories/inactive` | Blocked — lihat overview.md |

---

## Endpoint yang Sudah Ada (Reuse)

### `GET /metrics/high-margin-penetration` [metrics:read]

Summary M5 High Margin Product Penetration. Sudah didefinisikan di `executive-dashboard/api.md`.
Dipakai di 3.2 untuk StatCard + DonutChartWidget summary.

### `GET /metrics/avg-category` [metrics:read]

Summary M2 Avg Category per Customer. Sudah didefinisikan di `executive-dashboard/api.md`.
Dipakai di 3.3 untuk AreaChartWidget trend.

---

## Endpoint Baru — 3.2 High Margin Push List

### `GET /metrics/high-margin-penetration/detail` [metrics:read] _(Baru)_

Drill-down per kategori high margin — berapa persen customer yang beli kategori ini di period.

**Query params:** sama dengan metric standar (company_id, period_month, active_window) + paginasi
```
?company_id=1&period_month=2024-03&active_window=6&page=1&per_page=50
```

**Response 200:**
```json
{
  "data": [
    {
      "category_id": 3,
      "category_name": "Scanner",
      "is_high_margin": true,
      "customer_count": 28,
      "total_active_customers": 95,
      "penetration_rate": 29.5,
      "total_revenue": 420000000,
      "total_gp": 168000000,
      "gp_margin_percent": 40.0
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 5 }
}
```

**Catatan:** hanya kembalikan kategori dengan `is_high_margin = true`. Penetration rate = customer yang beli kategori ini / total existing customer aktif.

---

### `GET /metrics/high-margin-penetration/customers` [metrics:read] _(Baru)_

Daftar customer yang belum beli produk high margin di period — target push/upsell.

**Query params:** company_id, period_month, active_window, business_unit (opsional), page, per_page

**Response 200:**
```json
{
  "data": [
    {
      "customer_code": "CUST-045",
      "customer_name": "PT Maju Bersama",
      "business_unit": "b2b_dc",
      "last_invoice_date": "2024-01-10",
      "avg_monthly_revenue": 8000000,
      "categories_bought": ["Ribbon", "Label"],
      "missing_high_margin_categories": ["Scanner", "Printer"]
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 67 }
}
```

**Catatan:** `missing_high_margin_categories` = high margin categories yang belum pernah dibeli customer ini dalam `active_window` bulan terakhir.

---

## Endpoint Blocked — 3.1 dan 3.4

### `GET /products` [products:read] _(Blocked)_

Tidak bisa diimplementasi sampai:
1. Tabel `products` dibuat di schema
2. Format import CSV/Excel dikonfirmasi punya kolom SKU dan quantity
3. Backfill strategy untuk data historis diputuskan

Lihat `product-workbench/decisions.md` dan `product-workbench/overview.md` untuk detail blocker.

### `GET /product-categories/inactive` [metrics:read] _(Blocked)_

Deteksi kategori yang tidak terjual dalam N bulan. Ini feasible tanpa tabel products — berbasis `invoice_items` saja.

**Unblocked condition:** hanya butuh konfirmasi bahwa scope 3.4 adalah "kategori tidak terjual" (bukan "stok menumpuk" yang butuh data inventori).

**Query params (tentative):**
```
?company_id=1&period_month=2024-03&inactive_months=3
```

**Response (tentative):**
```json
{
  "data": [
    {
      "category_id": 7,
      "category_name": "POS Terminal",
      "last_sold_month": "2023-09",
      "inactive_months": 6,
      "last_revenue": 95000000
    }
  ]
}
```
