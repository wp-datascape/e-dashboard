# admin/api.md

> Endpoint API untuk Admin Group (Group 5).
> Sumber: `API_SPEC.md` bagian Import, Users, RBAC, Config, Audit Log.
> Baca juga: `admin/overview.md`, `admin/decisions.md`, `shared/api-conventions.md`

## Ringkasan Endpoint per Halaman

| Halaman | Endpoint | Status |
|---------|----------|--------|
| 5.1 Import | POST /import/file, POST /import/accurate, GET /import/logs, GET /import/logs/:id/errors | Sudah didesain |
| 5.2 Users | GET /users, POST /users, PUT /users/:id, DELETE /users/:id, PUT /rbac/users/:userId/roles | Sudah didesain |
| 5.3 RBAC | GET /rbac/roles, POST /rbac/roles, PUT /rbac/roles/:id, DELETE /rbac/roles/:id, PUT /rbac/roles/:id/permissions, GET /rbac/permissions, POST /rbac/permissions | Sudah didesain |
| 5.4 Config | GET /config, PUT /config/:key, GET /product-categories, PUT /product-categories/:id | Sudah didesain |
| 5.5 Audit Log | GET /audit-logs | Sudah didesain |

Semua endpoint di bawah sudah ada di `API_SPEC.md`. File ini merangkum ulang yang relevan untuk Admin UI — tidak ada endpoint baru kecuali yang ditandai _(Baru)_.

---

## 5.1 Import

### `POST /import/file` [import:write] CSRF

Upload file CSV atau Excel.

**Request**: `multipart/form-data` — field: `file`, `company_id` (integer), `period_month` (YYYY-MM)

**Response 200:**
```json
{
  "data": {
    "import_log_id": 42,
    "status": "partial",
    "total_invoices": 200,
    "success_invoices": 198,
    "error_rows": 2,
    "error_summary": "2 baris gagal: duplikasi nomor invoice"
  }
}
```

**Error codes:** `INVALID_FILE_FORMAT` (400), `FILE_TOO_LARGE` (413), `IMPORT_PROCESSING_ERROR` (422), `DUPLICATE_IMPORT` (409)

---

### `POST /import/accurate` [import:write] CSRF

Trigger fetch dari Accurate Online API.

**Request:** `{ "company_id": 1, "period_month": "2024-01" }`

**Response 200:** sama dengan `/import/file`

**Error codes:** `ACCURATE_API_ERROR` (502) jika Accurate tidak bisa dihubungi

---

### `GET /import/logs` [import:read]

Riwayat semua import. Query: `?company_id=1&page=1&per_page=20`

**Response 200:**
```json
{
  "data": [
    {
      "id": 42,
      "company": { "id": 1, "name": "PT ABC" },
      "source": "file",
      "filename": "faktur-jan-2024.xlsx",
      "period_month": "2024-01",
      "status": "partial",
      "total_invoices": 200,
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

### `GET /import/logs/:id/errors` [import:read]

Detail baris error dari satu import.

**Response 200:**
```json
{
  "data": [
    {
      "id": 1,
      "row_number": 45,
      "raw_data": "INV-001,15/01/2024,CUST-001,...",
      "error_message": "invoice_number sudah ada di periode ini"
    }
  ]
}
```

---

## 5.2 Users

### `GET /users` [users:manage]

Query: `?page=1&per_page=20&search=budi&role=manager`

### `POST /users` [users:manage] CSRF

**Request:**
```json
{
  "name": "Sari Dewi",
  "email": "sari@company.com",
  "password": "tempPassword123",
  "role_ids": [3],
  "company_ids": [1, 2]
}
```

### `PUT /users/:id` [users:manage] CSRF

**Request:** `{ "name": "...", "role_ids": [...], "company_ids": [...], "is_active": true }`

### `DELETE /users/:id` [users:manage] CSRF

Soft delete. Hanya superadmin bisa hapus user superadmin lain.

### `PUT /rbac/users/:userId/roles` [users:manage] CSRF

Assign role ke user (replace all). **Request:** `{ "role_ids": [2, 4] }`

### `GET /users/me`

Data user yang sedang login — roles, permissions, companies.

---

## 5.3 RBAC

### `GET /rbac/roles` [roles:manage]

Daftar semua role + permission masing-masing.

**Response 200:**
```json
{
  "data": [
    {
      "id": 1, "name": "superadmin", "is_system": true,
      "permissions": [{ "id": 1, "name": "metrics:read", "group_name": "Metrics" }]
    }
  ]
}
```

### `POST /rbac/roles` [roles:manage] CSRF

**Request:** `{ "name": "auditor", "description": "Hanya lihat audit log" }`

### `PUT /rbac/roles/:id` [roles:manage] CSRF

Role `is_system=true` tidak bisa diubah namanya. **Request:** `{ "description": "..." }`

### `DELETE /rbac/roles/:id` [roles:manage] CSRF

Role `is_system=true` tidak bisa dihapus. Error: `SYSTEM_RESOURCE` (403).

### `PUT /rbac/roles/:id/permissions` [roles:manage] CSRF

Set permission untuk role (replace all). **Request:** `{ "permission_ids": [1, 2, 3] }`

### `GET /rbac/permissions` [roles:manage]

Daftar semua permission digroup per `group_name`.

**Response 200:**
```json
{
  "data": {
    "Metrics":   [{ "id": 1, "name": "metrics:read" }],
    "Customers": [{ "id": 2, "name": "customers:read" }],
    "Import":    [{ "id": 3, "name": "import:write" }, { "id": 4, "name": "import:read" }],
    "Users":     [{ "id": 5, "name": "users:manage" }],
    "RBAC":      [{ "id": 6, "name": "roles:manage" }],
    "Config":    [{ "id": 7, "name": "config:read" }, { "id": 8, "name": "config:write" }],
    "Transactions": [{ "id": 9, "name": "invoices:read" }]
  }
}
```

### `POST /rbac/permissions` [roles:manage] CSRF

**Request:** `{ "name": "audit:read", "description": "Lihat audit log", "group_name": "Audit" }`

---

## 5.4 Config

### `GET /config` [config:read]

**Response 200:**
```json
{
  "data": [
    { "key": "dormant_threshold_months", "value": "3", "company_id": null, "is_secret": false, "description": "..." },
    { "key": "accurate_api_key", "value": "***", "company_id": 1, "is_secret": true }
  ]
}
```

Nilai `is_secret=true` selalu di-mask sebagai `"***"` — UI tidak pernah menerima value aslinya.

### `PUT /config/:key` [config:write] CSRF

**Request:** `{ "value": "6", "company_id": null }`

### `GET /product-categories` [config:read]

Query: `?company_id=1`

### `PUT /product-categories/:id` [config:write] CSRF

**Request:** `{ "is_high_margin": true, "is_service": false }`

---

## 5.5 Audit Log

### `GET /audit-logs` [roles:manage]

Query: `?company_id=1&action=invoice.import&actor_id=2&date_from=2024-01-01&date_to=2024-01-31&page=1&per_page=50`

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

## Catatan Tambahan

### CSRF Token
Semua endpoint mutasi (POST/PUT/PATCH/DELETE) wajib kirim header `X-CSRF-Token`. Token didapat dari response `/auth/login` atau `/auth/refresh`. Frontend axios interceptor sudah menangani ini secara otomatis (`src/api/axios.ts`).

### companies endpoint (dipakai di form User dan Import)
`GET /companies` — tidak butuh permission khusus, hanya JWT. Dipakai untuk dropdown company selector di form create user dan form import.
