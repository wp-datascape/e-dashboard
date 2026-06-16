# API_SPEC.md — Spesifikasi API Executive Dashboard

**Base URL**: `http://localhost:3000/api/v1`  
**Format**: JSON  
**Auth**: JWT di `httpOnly` cookie  
**CSRF**: Setiap mutasi (POST/PUT/PATCH/DELETE) wajib sertakan header `X-CSRF-Token`

---

## Format Response Standar

```json
{ "message": "Success", "data": { } }
```
```json
{ "message": "Success", "data": [], "meta": { "page": 1, "per_page": 20, "total": 100 } }
```
```json
{ "error": "KODE_ERROR", "message": "Pesan yang bisa ditampilkan ke user" }
```

---

## Legend

| Simbol | Arti |
|--------|------|
| 🔒 | Butuh autentikasi (JWT cookie) |
| `[permission]` | Permission yang dibutuhkan |
| 🛡️ | Butuh CSRF token |

---

## Auth

### `POST /auth/login` 🛡️
**Request:** `{ "email": "user@company.com", "password": "password123" }`

**Response 200:**
```json
{
  "message": "Login berhasil",
  "data": {
    "csrf_token": "tok_abc123",
    "user": {
      "id": 1, "name": "Budi", "email": "budi@company.com",
      "roles": ["manager"],
      "permissions": ["metrics:read", "customers:read", "companies:read"],
      "companies": [{ "id": 1, "code": "PT_ABC", "name": "PT ABC Sejahtera" }]
    }
  }
}
```

> `permissions` direturn saat login agar frontend bisa cek akses tanpa extra request.

---

### `POST /auth/logout` 🔒 🛡️
**Response 200:** `{ "message": "Logout berhasil" }`

---

### `POST /auth/refresh` 🔒 🛡️
**Response 200:** `{ "message": "Token diperbarui", "data": { "csrf_token": "...", "permissions": [...] } }`

---

## Users

### `GET /users/me` 🔒
**Response 200:**
```json
{
  "data": {
    "id": 1, "name": "Budi", "email": "budi@company.com",
    "roles": [{ "id": 2, "name": "manager" }],
    "permissions": ["metrics:read", "customers:read"],
    "companies": [{ "id": 1, "code": "PT_ABC", "name": "PT ABC Sejahtera" }]
  }
}
```

---

### `GET /users` 🔒 `[users:manage]`
Query: `?page=1&per_page=20&search=budi&role=manager`

---

### `POST /users` 🔒 🛡️ `[users:manage]`
**Request:**
```json
{
  "name": "Sari Dewi", "email": "sari@company.com",
  "password": "tempPassword123",
  "role_ids": [3],
  "company_ids": [1, 2]
}
```

---

### `PUT /users/:id` 🔒 🛡️ `[users:manage]`
**Request:**
```json
{ "name": "Sari Dewi Updated", "role_ids": [3, 4], "company_ids": [1, 2, 3], "is_active": true }
```

---

### `DELETE /users/:id` 🔒 🛡️ `[users:manage]`
Soft delete. Hanya superadmin yang bisa hapus user lain superadmin (cek di service layer).

---

## RBAC — Role & Permission (Dinamis)

### `GET /rbac/roles` 🔒 `[roles:manage]`
Daftar semua role beserta permission-nya.

**Response 200:**
```json
{
  "data": [
    {
      "id": 1, "name": "superadmin", "description": "Akses penuh", "is_system": true,
      "permissions": [{ "id": 1, "name": "metrics:read", "group_name": "Metrics" }]
    }
  ]
}
```

---

### `POST /rbac/roles` 🔒 🛡️ `[roles:manage]`
Buat role baru.

**Request:** `{ "name": "auditor", "description": "Hanya bisa lihat audit log" }`

---

### `PUT /rbac/roles/:id` 🔒 🛡️ `[roles:manage]`
Update role. Role dengan `is_system = true` tidak bisa diubah namanya.

**Request:** `{ "description": "Deskripsi baru" }`

---

### `DELETE /rbac/roles/:id` 🔒 🛡️ `[roles:manage]`
Hapus role. Role dengan `is_system = true` tidak bisa dihapus.

---

### `PUT /rbac/roles/:id/permissions` 🔒 🛡️ `[roles:manage]`
Set permission untuk role (replace all).

**Request:** `{ "permission_ids": [1, 2, 3, 5] }`

---

### `GET /rbac/permissions` 🔒 `[roles:manage]`
Daftar semua permission, digroup per `group_name`.

**Response 200:**
```json
{
  "data": {
    "Metrics":   [{ "id": 1, "name": "metrics:read",   "description": "Lihat dashboard metrik" }],
    "Customers": [{ "id": 2, "name": "customers:read", "description": "Lihat detail customer" }],
    "Import":    [{ "id": 3, "name": "import:write",   "description": "Import faktur" },
                  { "id": 4, "name": "import:read",    "description": "Lihat log import" }],
    "Users":     [{ "id": 5, "name": "users:manage",   "description": "CRUD user" }],
    "RBAC":      [{ "id": 6, "name": "roles:manage",   "description": "Manage role & permission" }]
  }
}
```

---

### `POST /rbac/permissions` 🔒 🛡️ `[roles:manage]`
Tambah permission baru (hanya superadmin praktisnya).

**Request:** `{ "name": "audit:read", "description": "Lihat audit log", "group_name": "Audit" }`

---

### `PUT /rbac/users/:userId/roles` 🔒 🛡️ `[users:manage]`
Assign role ke user (replace all).

**Request:** `{ "role_ids": [2, 4] }`

---

## Companies

### `GET /companies` 🔒
Daftar entitas yang boleh diakses user yang login.

**Response 200:**
```json
{
  "data": [
    { "id": 1, "code": "PT_ABC", "name": "PT ABC Sejahtera" },
    { "id": 2, "code": "PT_XYZ", "name": "PT XYZ Mandiri" },
    { "id": 3, "code": "PT_DEF", "name": "PT DEF Utama" }
  ]
}
```

---

## Import Faktur

### `POST /import/file` 🔒 🛡️ `[import:write]`
Upload file CSV atau Excel faktur penjualan dari Accurate Online.

**Request**: `multipart/form-data`

| Field | Tipe | Keterangan |
|-------|------|------------|
| `file` | file | `.csv` atau `.xlsx`, max 10MB |
| `company_id` | integer | Entitas perusahaan |
| `period_month` | string | Format `YYYY-MM` |

**Response 200:**
```json
{
  "message": "Import berhasil diproses",
  "data": {
    "import_log_id": 42,
    "status": "partial",
    "total_invoices": 200,
    "total_items": 500,
    "success_invoices": 198,
    "error_rows": 2,
    "error_summary": "2 baris gagal: duplikasi nomor invoice"
  }
}
```

---

### `POST /import/accurate` 🔒 🛡️ `[import:write]`
Trigger fetch faktur penjualan langsung dari Accurate Online API.

**Request:**
```json
{
  "company_id": 1,
  "period_month": "2024-01"
}
```

**Response 200:**
```json
{
  "message": "Import dari Accurate berhasil",
  "data": {
    "import_log_id": 43,
    "status": "success",
    "total_invoices": 185,
    "total_items": 420,
    "success_invoices": 185,
    "error_rows": 0
  }
}
```

**Response 502** (Accurate API tidak bisa dihubungi):
```json
{ "error": "ACCURATE_API_ERROR", "message": "Tidak dapat terhubung ke Accurate Online" }
```

---

### `GET /import/logs` 🔒 `[import:read]`
Riwayat semua import.

**Query**: `?company_id=1&page=1&per_page=20`

**Response 200:**
```json
{
  "data": [
    {
      "id": 42,
      "company": { "id": 1, "name": "PT ABC Sejahtera" },
      "source": "file",
      "filename": "faktur-jan-2024.xlsx",
      "period_month": "2024-01",
      "status": "partial",
      "total_invoices": 200,
      "total_items": 500,
      "success_invoices": 198,
      "error_rows": 2,
      "imported_by": { "id": 2, "name": "Admin User" },
      "created_at": "2024-02-01T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 15 }
}
```

---

### `GET /import/logs/:id/errors` 🔒 `[import:read]`
Detail baris error dari satu import.

---

## Metrics

> Semua endpoint metrik menerima query params:
> - `company_id` — integer atau `"all"` (holding view)
> - `period_month` — format `YYYY-MM`
> - `active_window` — `3`, `6`, atau `12`

### `GET /metrics/summary` 🔒 `[metrics:read]`
Semua 10 metrik sekaligus — untuk halaman dashboard overview.

**Response 200:**
```json
{
  "data": {
    "cross_selling_ratio":     { "current_value": 22.5, "trend": "up" },
    "avg_category":            { "current_value": 1.8,  "trend": "up" },
    "avg_revenue":             { "current_value": 5500000, "trend": "stable" },
    "avg_gross_profit":        { "current_value": 1150000, "trend": "up" },
    "high_margin_penetration": { "current_value": 22.0, "trend": "up" },
    "repeat_order_rate":       { "current_value": 65.0, "trend": "stable" },
    "expansion_rate":          { "current_value": 40.0, "trend": "up" },
    "dormant_rate":            { "current_value": 12.7, "trend": "down" },
    "dormant_value_total":     { "current_value": 850000000, "trend": "down" },
    "reactivation_rate":       { "current_value": 20.0, "trend": "up" }
  }
}
```

---

### `GET /metrics/cross-selling` 🔒 `[metrics:read]`
**Response 200:**
```json
{
  "data": {
    "metric": "cross_selling_ratio",
    "summary": { "current_value": 22.5, "previous_value": 20.0, "change_percent": 12.5, "trend": "up" },
    "monthly_trend": [
      { "month": "2024-01", "value": 20.0, "total_active": 100, "multi_product": 20 }
    ]
  }
}
```

---

### `GET /metrics/cross-selling/detail` 🔒 `[metrics:read]`
Detail per customer — tabel lintas kategori.

**Query tambahan**: `?page=1&per_page=50&search=PT+ABC`

**Response 200:**
```json
{
  "data": {
    "categories": ["Scanner", "Printer", "Label", "Ribbon", "POS"],
    "customers": [
      {
        "customer_code": "CUST-001", "customer_name": "PT ABC",
        "categories": { "Scanner": true, "Printer": true, "Label": true, "Ribbon": false, "POS": false },
        "category_count": 3
      }
    ]
  },
  "meta": { "page": 1, "per_page": 50, "total": 120 }
}
```

---

### `GET /metrics/avg-category` 🔒 `[metrics:read]`
Metrik 2: Average Product Category per Customer.

### `GET /metrics/avg-revenue` 🔒 `[metrics:read]`
Metrik 3: Average Revenue per Existing Customer.

### `GET /metrics/avg-gross-profit` 🔒 `[metrics:read]`
Metrik 4: Average Gross Profit per Existing Customer.

### `GET /metrics/high-margin-penetration` 🔒 `[metrics:read]`
Metrik 5: High Margin Product Penetration.

### `GET /metrics/repeat-order-rate` 🔒 `[metrics:read]`
Metrik 6: Repeat Order Rate.

### `GET /metrics/expansion-rate` 🔒 `[metrics:read]`
Metrik 7: Customer Expansion Rate.

### `GET /metrics/dormant-rate` 🔒 `[metrics:read]`
Metrik 8: Dormant Customer Rate.

### `GET /metrics/dormant-value` 🔒 `[metrics:read]`
Metrik 9: Dormant Customer Value.

**Query tambahan**: `?page=1&per_page=50&sort_by=lost_value&sort_dir=desc`

**Response 200:**
```json
{
  "data": [
    {
      "customer_code": "CUST-099", "customer_name": "PT ABC",
      "avg_monthly_revenue": 20000000,
      "dormant_months": 6,
      "estimated_lost_value": 120000000,
      "last_invoice_date": "2023-08-15"
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 45 }
}
```

### `GET /metrics/reactivation-rate` 🔒 `[metrics:read]`
Metrik 10: Customer Reactivation Rate.

---

## Customers

### `GET /customers` 🔒 `[customers:read]`
**Query**: `?company_id=1&status=dormant&search=PT+ABC&page=1&per_page=50`

### `GET /customers/:id` 🔒 `[customers:read]`
Detail customer — histori faktur dan ringkasan metrik.

---

## Config

### `GET /config` 🔒 `[config:read]`
**Response 200:**
```json
{
  "data": [
    { "key": "dormant_threshold_months", "value": "3", "company_id": null, "description": "..." },
    { "key": "accurate_api_key", "value": "***", "company_id": 1, "is_secret": true }
  ]
}
```
> Nilai dengan `is_secret: true` selalu di-mask sebagai `"***"` di response.

### `PUT /config/:key` 🔒 🛡️ `[config:write]`
**Request:** `{ "value": "6", "company_id": null }`

---

## Product Categories

### `GET /product-categories` 🔒 `[config:read]`
**Query**: `?company_id=1`

### `PUT /product-categories/:id` 🔒 🛡️ `[config:write]`
**Request:** `{ "is_high_margin": true, "is_service": false }`

---

## Audit Log

### `GET /audit-logs` 🔒 `[roles:manage]`
Riwayat aksi mutasi dari semua user.

**Query**: `?company_id=1&action=invoice.import&actor_id=2&page=1&per_page=50`

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "actor": { "id": 2, "name": "Admin User" },
      "action": "invoice.import",
      "entity": "import_logs",
      "entity_id": 42,
      "meta": { "company_id": 1, "source": "file", "total_invoices": 200 },
      "ip_address": "192.168.1.1",
      "created_at": "2024-02-01T10:00:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 320 }
}
```

---

## Error Codes

| HTTP | Kode Error | Keterangan |
|------|------------|------------|
| 400 | `VALIDATION_ERROR` | Input tidak valid |
| 400 | `INVALID_FILE_FORMAT` | Format file salah / kolom tidak lengkap |
| 401 | `UNAUTHORIZED` | Tidak login / token expired |
| 403 | `FORBIDDEN` | Tidak punya permission |
| 403 | `COMPANY_ACCESS_DENIED` | Tidak punya akses ke company ini |
| 403 | `CSRF_INVALID` | CSRF token tidak valid |
| 403 | `SYSTEM_RESOURCE` | Mencoba hapus role/permission is_system |
| 404 | `NOT_FOUND` | Data tidak ditemukan |
| 409 | `DUPLICATE_IMPORT` | Data periode ini sudah pernah diimport |
| 413 | `FILE_TOO_LARGE` | Ukuran file melebihi batas |
| 422 | `IMPORT_PROCESSING_ERROR` | File valid tapi ada error saat proses |
| 429 | `RATE_LIMITED` | Terlalu banyak request |
| 502 | `ACCURATE_API_ERROR` | Accurate Online tidak bisa dihubungi |
| 500 | `INTERNAL_ERROR` | Kesalahan server |
