# customer-workbench/api.md

> Endpoint API untuk Customer Workbench (Group 2).
> Baca juga: `customer-workbench/overview.md`, `shared/api-conventions.md`

---

## Endpoint yang Sudah Diimplementasi

### `GET /api/v1/customers` 🔒 `[customers:read]`

Daftar customer dengan filter dan agregat.

**Query params:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `company_id` | integer \| `"all"` | Filter per entitas |
| `status` | `"new"` \| `"active"` \| `"dormant"` \| `"existing"` | Filter status customer |
| `business_unit` | `"distribution"` \| `"project"` \| `"e_commerce"` \| `"intercompany"` \| `"freelancer"` \| `"support"` | Filter division — via JOIN `channel_divisions` |
| `search` | string | Cari nama customer |
| `sort_by` | `"last_invoice_date"` \| `"lifetime_value"` \| `"avg_monthly_revenue"` \| `"category_count"` | Sort field |
| `sort_dir` | `"asc"` \| `"desc"` | Default: `"desc"` |
| `page` | integer | Default: 1 |
| `per_page` | integer | Default: 50 |
| `as_of_date` | string (YYYY-MM-DD) | Tanggal referensi untuk status kalkulasi |

**Response 200:**
```json
{
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

**Catatan implementasi:**
- `division` = `channel_divisions.division` dari JOIN via `invoices.channel_name` terbaru per customer
- `business_unit` = `customers.business_unit` (field di tabel customers — mungkin null untuk data historis)
- Filter `business_unit` difilter via `channel_divisions.division` (bukan `customers.business_unit` yang null)
- `status` dihitung runtime dari `business_configs` threshold (bukan disimpan di DB)
- `category_count` = `COUNT(DISTINCT product_category_id)` dari invoice_items
- `avg_monthly_revenue` = total revenue / jumlah bulan aktif

---

### `GET /api/v1/customers/:id` 🔒 `[customers:read]`

Detail lengkap satu customer — histori faktur dan ringkasan metrik.

**Response 200:**
```json
{
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
      { "month": "2023-03", "revenue": 12000000, "gp": 3600000 }
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

**Catatan implementasi:**
- `channel` = `invoices.channel_name` dari invoice terbaru (nama channel Accurate, misal "DC WEST", "TOKOPEDIA")
- `division` = lookup ke `channel_divisions.division` via `channel_name`
- `monthly_revenue_trend` = 12 bulan terakhir via `generate_series` PostgreSQL (bulan tanpa transaksi = 0)

---

## Channel Division Concept

Kolom "Nama Tenaga Penjual" di export Accurate Online BUKAN nama orang — melainkan nama channel penjualan.

**Naming di codebase:**
- DB kolom: `invoices.channel_name` + `channel_divisions.channel_name`
- Response field: `channel` (nama asli, e.g. "DC WEST") + `division` (kategori, e.g. "distribution")
- Query param filter: `business_unit` (nama lama dipertahankan untuk API compatibility)

**Mapping division:**
| Division | Channel Examples |
|----------|-----------------|
| `distribution` | DC WEST, DC EAST, DC WEST HEAD, DC EAST HEAD, DC EAST CARD |
| `project` | SDR B2B WEST, B2B EAST, KAE WEST, NAS B2B EAST, NAS B2B WEST |
| `e_commerce` | KASSEN OFFICIAL STORE, TOKOPEDIA, TIKTOKSHOP, LAZADA |
| `intercompany` | KODE NIAGA TAMA, CODESHOP |
| `freelancer` | SBY UDIN |
| `support` | SALES SUPPORT, SALES SUPPORT JKT |

---

## Endpoint yang Belum Diimplementasi

### `GET /metrics/expansion-rate/detail` 🔒 `[metrics:read]` _(Pending)_

Detail per customer untuk halaman **2.2 Expansion & Upsell Targets**.

**Response 200:**
```json
{
  "data": [
    {
      "customer_code": "CUST-001",
      "customer_name": "PT ABC SEJAHTERA",
      "division": "distribution",
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

---

## Endpoint yang Sudah Cukup (Tidak Perlu Endpoint Baru)

| Halaman | Endpoint yang Dipakai |
|---------|----------------------|
| 2.3 Churn Risk & Dormant | `GET /metrics/dormant-rate`, `GET /metrics/dormant-value`, `GET /metrics/reactivation-rate` |
| 2.4 Cross-sell Matrix | `GET /metrics/cross-selling`, `GET /metrics/cross-selling/detail` |
