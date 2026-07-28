# Feature: Products

> Status: ✅ Complete — Local products + categories dari DB, Accurate API proxy (categories + products)
> Last updated: 2026-06-27
> Baca juga: `features/accurate.md`, `features/high-margin-products.md`, `shared/data-model.md`

---

## Overview

Products feature menyediakan dua sumber data produk:

1. **Local DB** — `products` dan `product_categories` dari data faktur yang sudah diimport (upsert saat import)
2. **Accurate API Proxy** — fetch langsung dari Accurate Online via branch context

Local products dipakai untuk menampilkan data yang sudah masuk ke sistem. Accurate API proxy dipakai untuk keperluan referensi atau saat user mau set high-margin products.

---

## Data Model

### `product_categories`

Kategori produk yang diturunkan dari kolom "Nama Kategori" di faktur Accurate. Satu baris per nama kategori unik per company.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `company_id` | integer NOT NULL → companies | Isolasi per entitas |
| `name` | varchar(255) NOT NULL | UPPERCASE — dedup key |
| `item_type` | varchar(20) | unit \| consumable \| sparepart \| service |
| `is_high_margin` | boolean | Deprecated (statis). Gunakan `high_margin_products` |
| `avg_margin_percent` | numeric | Auto-computed dari invoice_items |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

### `products`

Nama produk individual dari kolom "Nama Barang" di faktur. Satu baris per nama produk unik per company, dikelompokkan dalam kategori.

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `company_id` | integer NOT NULL → companies | |
| `product_name` | varchar(255) NOT NULL | UPPERCASE — dedup key |
| `product_category_id` | integer NULL → product_categories | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

Unique constraint: `(company_id, product_name)`.

---

## File Structure

```
src/features/products/
├── products.schema.ts              — branchQuerySchema, fetchProductsQuerySchema, localProductsQuerySchema
├── products.repository.ts          — findProducts(companyId, categoryId?)
├── products.service.ts             — getLocalProducts(), getLocalCategories()
├── accurate-products.service.ts    — fetchCategoriesFromAccurate(), fetchProductsFromAccurate()
├── products.handler.ts             — 4 handlers (thin, no try-catch)
└── products.route.ts               — GET /, /categories, /accurate/categories, /accurate
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/products`

---

### `GET /products`

List produk dari local DB, opsional filter per kategori.

**Query params:**
| Param | Tipe | Required | Keterangan |
|-------|------|----------|------------|
| `company_id` | integer | ✅ | Filter per entitas |
| `category_id` | integer | — | Filter per kategori |

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "product_name": "TM-T82 SERIES THERMAL RECEIPT PRINTER",
      "product_category_id": 5,
      "company_id": 1,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### `GET /products/categories`

List kategori produk dari local DB. Permission `settings.product:view` (Administration/Product Settings) — **BUKAN** dipakai untuk filter kategori di halaman Products Workbench (lihat `GET /metrics/product-categories` di `features/metrics.md`, permission `product:view`, tujuannya persis supaya role tanpa akses Settings tetap bisa filter kategori di halaman bisnis inti).

**Query params:**
| Param | Tipe | Required |
|-------|------|----------|
| `company_id` | integer | ✅ |

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 5,
      "company_id": 1,
      "name": "THERMAL RECEIPT PRINTER",
      "item_type": "unit",
      "is_high_margin": false,
      "avg_margin_percent": "28.50",
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### `GET /products/accurate/categories`

Fetch kategori dari Accurate API (bukan dari DB lokal).

**Query params:**
| Param | Tipe | Required | Keterangan |
|-------|------|----------|------------|
| `branch_id` | integer | ✅ | Branch ID Accurate |

**Response 200:** format sesuai response Accurate API (diproxy langsung).

---

### `GET /products/accurate`

Fetch daftar produk dari Accurate API.

**Query params:**
| Param | Tipe | Default |
|-------|------|---------|
| `branch_id` | integer | Required |
| `page` | integer | 1 |
| `per_page` | integer (max 100) | 50 |
| `keywords` | string | — |

**Response 200:** format sesuai response Accurate API.

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | company_id / branch_id missing |
| 500 | `INTERNAL_ERROR` | DB error atau Accurate API error |

---

## Implementation Notes

### Dua Service Berbeda

- **`products.service.ts`** — `getLocalProducts()` dan `getLocalCategories()` dari DB lokal. Wrap repository + error translation.
- **`accurate-products.service.ts`** — `fetchCategoriesFromAccurate()` dan `fetchProductsFromAccurate()` — call Accurate HTTP API via utils/accurate. Memerlukan branch context (bukan company_id).

### Kenapa `branch_id` untuk Accurate, `company_id` untuk Local?

Accurate menggunakan konsep **branch** (cabang dalam satu account). Satu company di sistem kita bisa punya multiple branches di Accurate. Branch ID berbeda dari company ID internal.

Mapping `company_id → branch_id` tersimpan di tabel `companies` atau `app_configs` (lihat `features/accurate.md`).

### `is_high_margin` di `product_categories` — Deprecated

Field `is_high_margin` boolean di `product_categories` adalah desain lama (statis). Gunakan tabel `high_margin_products` untuk manajemen high margin produk secara dinamis dengan time-range. Lihat `features/high-margin-products.md`.

### Halaman `/products` — Flat List Produk (task010, 2026-07-29)

Sebelumnya halaman `/products` menampilkan grid **kategori** (`GET /metrics/category-performance`) — klik baris buka popup daftar produk. Sekarang (task010) diganti **flat list produk langsung** (`GET /metrics/product-performance` — lihat `features/metrics.md`) — tiap baris = 1 produk, kolom Kategori cuma teks biasa. Filter urutannya: **Item Type dulu, baru Kategori di bawahnya** (kategori cascading — opsinya cuma nampilin kategori yang `item_type`-nya cocok sama Item Type yang dipilih, reset tiap ganti Item Type). Popup drill-down (`CategoryProductsDialog`) **dihapus dari halaman ini** (baris sudah level produk, tidak perlu drill lagi).

Dropdown filter Kategori sumbernya `GET /metrics/product-categories` (SENGAJA endpoint terpisah dari `/products/categories` di bawah karena beda permission — lihat catatan di §API Endpoints). Dropdown filter **Item Type** sumbernya `GET /settings/item-types/values` (task011 — dinamis per company, lihat `features/classification.md` §Item Type Dinamis; BUKAN 4 nilai hardcoded lagi).

### Drill-down Produk per Kategori (dialog `CategoryProductsDialog`) — masih dipakai di ProductsHighMargin

Tab "Penetrasi Kategori" + "Target Upsell" di `/products/high-margin` masih pakai dialog drill-down yang sama (`frontend/src/pages/Products/components/CategoryProductsDialog.tsx`), didukung endpoint `GET /metrics/category-products` (bukan endpoint di file ini — lihat `features/metrics.md`). Endpoint ini punya param opsional `only_high_margin` + field `is_high_margin` per produk, dipakai KHUSUS di tab "Penetrasi Kategori" supaya drill-down cuma tampilkan produk yang benar-benar ditandai high margin. Detail lengkap: `features/high-margin-products.md` §9.

### `avg_margin_percent`

Dihitung dari rata-rata `(total_gp / total_revenue)` per kategori saat ada invoice baru diimport. Berguna untuk tampilan analytics kategori produk.

---

## References

- **Backend**: `backend/src/features/products/`
- **DB Schema**: `backend/src/db/schema/schema-product.ts` (tables `products`, `product_categories`)
- **Accurate Integration**: `features/accurate.md`
- **High Margin**: `features/high-margin-products.md`
- **Frontend Page**: `frontend/src/pages/Products/`

---

**Last Updated**: 2026-07-29 (task011 — filter Item Type di halaman /products jadi dinamis per company, urutan filter Item Type sebelum Kategori)
**Status**: ✅ Production Ready
