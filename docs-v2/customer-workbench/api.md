# customer-workbench/api.md

> Endpoint API untuk Customer Workbench (Group 2).
> Baca juga: `customer-workbench/overview.md`, `shared/api-conventions.md`

---

## Endpoint yang Sudah Ada di API_SPEC.md

### `GET /customers` 🔒 `[customers:read]`

Daftar customer dengan filter.

**Query params:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `company_id` | integer \| `"all"` | Filter per entitas |
| `status` | `"active"` \| `"dormant"` | Filter status customer |
| `search` | string | Cari nama atau kode customer |
| `page` | integer | Default: 1 |
| `per_page` | integer | Default: 50 |

**Response 200:**
```json
{
  "data": [...],
  "meta": { "page": 1, "per_page": 50, "total": 320 }
}
```

---

### `GET /customers/:id` 🔒 `[customers:read]`

Detail customer — histori faktur dan ringkasan metrik.

---

## Endpoint Baru — Perlu Didesain

Halaman **2.1 Customer 360 & Segmentation** membutuhkan data yang tidak bisa dipenuhi oleh `GET /customers` yang sudah ada karena:
- Tidak ada filter `business_unit`
- Tidak ada field `avg_monthly_revenue`, `lifetime_value`, `category_count`
- Tidak ada sorting per kolom analitik

### `GET /customers/360` 🔒 `[customers:read]` _(Baru)_

Master customer table untuk halaman 2.1 — satu baris per customer, data agregat dari invoice history.

**Query params:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `company_id` | integer \| `"all"` | Filter per entitas |
| `business_unit` | `"b2b_dc"` \| `"b2b_project"` \| `"b2c"` \| `"manufacturing"` | Filter BU — opsional |
| `status` | `"active"` \| `"dormant"` \| `"new"` | Filter status customer |
| `search` | string | Cari nama atau kode customer |
| `sort_by` | string | `avg_monthly_revenue` \| `lifetime_value` \| `category_count` \| `last_invoice_date` |
| `sort_dir` | `"asc"` \| `"desc"` | Default: `"desc"` |
| `page` | integer | Default: 1 |
| `per_page` | integer | Default: 50 |

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "customer_code": "CUST-001",
      "name": "PT ABC Sejahtera",
      "company": { "id": 1, "name": "PT ABC" },
      "business_unit": "b2b_dc",
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

**Catatan implementasi:**
- `category_count` = `COUNT(DISTINCT product_category_id)` dari semua `invoice_items` customer ini, filter `is_service = false`
- `avg_monthly_revenue` = `total_lifetime_revenue / bulan_aktif` — bulan aktif dihitung dari `first_invoice_date` sampai `last_invoice_date`
- `lifetime_value` = `SUM(total_revenue)` dari semua `invoices` customer ini
- `status` dihitung dari `last_invoice_date` vs `dormant_threshold_months` dari `app_configs`
- `business_unit` berasal dari field `customers.business_unit` (field baru, lihat DATA_MODEL.md gap)

---

### `GET /customers/:id/360` 🔒 `[customers:read]` _(Baru)_

Detail lengkap satu customer untuk Customer 360 view — dipakai sebagai drill-down dari tabel 2.1.

**Response 200:**
```json
{
  "data": {
    "id": 1,
    "customer_code": "CUST-001",
    "name": "PT ABC Sejahtera",
    "company": { "id": 1, "name": "PT ABC" },
    "business_unit": "b2b_dc",
    "status": "active",
    "first_invoice_date": "2022-03-15",
    "last_invoice_date": "2024-01-20",
    "lifetime_value": 540000000,
    "avg_monthly_revenue": 15000000,
    "category_count": 3,
    "categories_bought": ["Scanner", "Printer", "Ribbon"],
    "monthly_revenue_trend": [
      { "month": "2023-03", "revenue": 12000000, "gp": 3600000 }
    ],
    "recent_invoices": [
      {
        "invoice_number": "INV-2024-001",
        "invoice_date": "2024-01-20",
        "total_revenue": 18000000,
        "total_gp": 5400000
      }
    ]
  }
}
```

---

### `GET /metrics/expansion-rate/detail` 🔒 `[metrics:read]` _(Baru)_

Detail per customer untuk halaman **2.2 Expansion & Upsell Targets** — customer mana yang spending-nya naik, datar, atau turun.

**Query params:** sama dengan query metrik standar + paginasi + filter `business_unit`

**Response 200:**
```json
{
  "data": [
    {
      "customer_code": "CUST-001",
      "customer_name": "PT ABC Sejahtera",
      "business_unit": "b2b_dc",
      "revenue_current": 18000000,
      "revenue_previous": 12000000,
      "change_percent": 50.0,
      "avg_gp": 5400000,
      "status": "up"
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 120 }
}
```

**Catatan**: endpoint ini melengkapi `GET /metrics/expansion-rate` (summary + trend). Detail ini khusus untuk tabel drill-down di halaman 2.2.

---

## Endpoint yang Sudah Cukup (Tidak Perlu Endpoint Baru)

| Halaman | Endpoint yang Dipakai |
|---------|----------------------|
| 2.3 Churn Risk & Dormant | `GET /metrics/dormant-rate`, `GET /metrics/dormant-value`, `GET /metrics/reactivation-rate` |
| 2.4 Cross-sell Matrix | `GET /metrics/cross-selling`, `GET /metrics/cross-selling/detail` |

Halaman 2.3 dan 2.4 sudah selesai diimplementasi di frontend dan data endpoint-nya sudah didefinisikan di `API_SPEC.md`.

---

## Field Baru yang Dibutuhkan di Schema

`customers.business_unit` — field ini belum ada di schema saat ini. Perlu ditambahkan ke tabel `customers` sebelum endpoint `GET /customers/360` bisa diimplementasi.

Nilai yang valid: `"b2b_dc"`, `"b2b_project"`, `"b2c"`, `"manufacturing"`, atau `NULL` jika belum diklasifikasikan.

Cara pengisian `business_unit` belum diputuskan — kemungkinan: (a) manual dari halaman Customer 360, (b) diimport bersama data faktur jika Accurate punya field ini, atau (c) diinfer dari tipe transaksi. Ini perlu dikonfirmasi sebelum implementasi.
