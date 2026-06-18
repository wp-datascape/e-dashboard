# transaction-workbench/api.md

> Endpoint API untuk Transaction & Revenue Workbench (Group 4).
> Baca juga: `transaction-workbench/overview.md`, `transaction-workbench/decisions.md`, `shared/api-conventions.md`

## Status Endpoint per Halaman

| Halaman | Endpoint | Status |
|---------|----------|--------|
| 4.1 Order Ledger | `GET /invoices` | Baru — perlu didesain |
| 4.2 Project Milestone | `GET /projects` | Blocked — tabel `projects` belum ada |
| 4.3 Repeat Order & Loyalty | `GET /metrics/repeat-order-rate` | Sudah ada |

---

## Endpoint yang Sudah Ada (Reuse)

### `GET /metrics/repeat-order-rate` [metrics:read]

Summary M6 Repeat Order Rate. Sudah didefinisikan di `executive-dashboard/api.md`.
Dipakai di 4.3 untuk RadialBarWidget + StatCard.

---

## Endpoint Baru — 4.1 Order Ledger

### `GET /invoices` [invoices:read] _(Baru)_

Tabel semua invoice dengan filter BU, period, customer. Berbeda dari `/customers/360` yang agregat per customer — ini satu baris per invoice.

**Query params:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `company_id` | integer \| `"all"` | Filter per entitas |
| `business_unit` | string | `b2b_dc` \| `b2b_project` \| `b2c` \| `manufacturing` — opsional |
| `date_from` | string YYYY-MM-DD | Awal range tanggal invoice |
| `date_to` | string YYYY-MM-DD | Akhir range tanggal invoice |
| `customer_search` | string | Cari nama atau kode customer |
| `sort_by` | string | `invoice_date` \| `total_revenue` \| `total_gp` — default: `invoice_date` |
| `sort_dir` | `"asc"` \| `"desc"` | Default: `"desc"` |
| `page` | integer | Default: 1 |
| `per_page` | integer | Default: 50 |

**Response 200:**
```json
{
  "data": [
    {
      "id": 1001,
      "invoice_number": "INV-2024-001",
      "invoice_date": "2024-01-20",
      "customer": {
        "id": 5,
        "code": "CUST-001",
        "name": "PT ABC Sejahtera",
        "business_unit": "b2b_dc"
      },
      "company": { "id": 1, "name": "PT ABC" },
      "total_revenue": 18000000,
      "total_gp": 5400000,
      "gp_margin_percent": 30.0,
      "category_count": 2,
      "import_source": "file"
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 1240 }
}
```

**Catatan implementasi:**
- `business_unit` diambil dari `customers.business_unit` — filter BU tidak akan berfungsi penuh sampai field itu ditambahkan ke schema
- `category_count` = COUNT(DISTINCT product_category_id) dari `invoice_items` untuk invoice ini, filter `is_service = false`
- `import_source` dari `import_logs.source` yang terhubung ke invoice ini

---

### `GET /invoices/:id` [invoices:read] _(Baru)_

Detail satu invoice — header + line items.

**Response 200:**
```json
{
  "data": {
    "id": 1001,
    "invoice_number": "INV-2024-001",
    "invoice_date": "2024-01-20",
    "customer": { "id": 5, "code": "CUST-001", "name": "PT ABC Sejahtera" },
    "company": { "id": 1, "name": "PT ABC" },
    "total_revenue": 18000000,
    "total_gp": 5400000,
    "items": [
      {
        "id": 2001,
        "product_name": "Zebra ZT411",
        "category": { "id": 3, "name": "Printer", "is_high_margin": true },
        "revenue": 12000000,
        "gross_profit": 4200000
      },
      {
        "id": 2002,
        "product_name": "Label 100x50",
        "category": { "id": 5, "name": "Label", "is_high_margin": false },
        "revenue": 6000000,
        "gross_profit": 1200000
      }
    ]
  }
}
```

---

## Endpoint Blocked — 4.2 Project Milestone

### `GET /projects` [projects:read] _(Blocked)_

Tidak bisa diimplementasi sampai:
1. Keputusan apakah 4.2 masuk MVP dibuat (lihat `transaction-workbench/decisions.md`)
2. Tabel `projects` + `project_milestones` didesain dan di-migrate
3. Business logic milestone (nilai kontrak, progress billing, status) dikonfirmasi dengan tim

### `GET /projects/:id/milestones` [projects:read] _(Blocked)_

Detail milestone per project. Bergantung pada keputusan yang sama di atas.

---

## Permission Baru yang Dibutuhkan

| Permission | Group | Keterangan |
|------------|-------|------------|
| `invoices:read` | Transactions | Lihat tabel invoice + detail |
| `projects:read` | Transactions | Lihat project + milestone (jika 4.2 in-scope) |
| `projects:manage` | Transactions | CRUD project milestone (jika 4.2 in-scope) |

Permission `invoices:read` belum ada di daftar permission di `API_SPEC.md`. Perlu ditambahkan ke seed data `permissions` table saat backend dibangun.
