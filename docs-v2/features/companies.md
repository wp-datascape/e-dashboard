# Feature: Companies

> Status: ✅ Complete — CRUD backend live + Branch Management. `GET /` dilonggarkan (cukup login) sesi 32.
> Last updated: 2026-07-04 (sesi 32)
> Baca juga: `shared/data-model.md`, `shared/api-conventions.md`

---

## Overview

Companies feature mengelola entitas perusahaan dalam holding group. Setiap user bisa memiliki akses ke satu atau lebih perusahaan.

Setiap perusahaan dapat memiliki satu atau lebih **cabang (branches)**. Cabang digunakan untuk:
- Isolasi data kredensial Accurate (per cabang punya koneksi sendiri)
- Filter data transaksi berdasarkan cabang
- Manajemen status aktif/nonaktif cabang

**Saat ini ada 3 perusahaan + 5 cabang (seed):**
| Company | Cabang | Status |
|---------|--------|--------|
| PT Mesin Kasir Online (MKO) | Pusat | ✅ Aktif |
| PT Kode Niaga Tama (KNT) | Surabaya, Jakarta, Semarang | ✅ Aktif |
| PT Solusi Kartu Indonesia (SKI) | Pusat | ✅ Aktif |

---

## File Structure

```
src/features/companies/
├── companies.schema.ts         — Zod DTO (request & response types)
├── companies.repository.ts     — Drizzle queries (DB layer), includes branch_count
├── companies.service.ts        — Business logic + audit logging
├── companies.route.ts          — HTTP handlers + route definitions
├── branch.schema.ts            — Zod DTO for branch create/update/params
├── branch.service.ts           — Business logic for branches
└── branch.repository.ts        — Drizzle queries for branches
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/companies`

> **Catatan:** `GET /:id`, `POST`, `PATCH`, `DELETE` butuh `settings.company:view`/`create`/`update`/`delete`. `GET /` (list) **tidak wajib permission apa pun** selain login — lihat catatan sesi 32 di bawah.

---

### `GET /api/v1/companies`

List semua perusahaan dengan jumlah cabang.

**Permission (fix sesi 32):** sebelumnya wajib `settings.company:view` — dipakai 12+ halaman sebagai dropdown filter perusahaan (`useCompanies()`), sehingga role dengan permission halaman yang benar tetap 403 begitu halaman itu coba isi dropdown company. Dilonggarkan jadi cukup login (authMiddleware) — aman karena handler sudah filter hasil ke `companyIds` user dari JWT (`isSuperAdmin ? undefined : companyIds`), tidak ada company di luar akses user yang pernah bocor. `GET /:id` dan mutasi CRUD tetap terproteksi `settings.company:*` seperti biasa (`GET /:id` tidak di-scope ke `companyIds`, jadi tetap perlu permission eksplisit untuk mencegah probing company lain).

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "code": "PT MKO",
      "name": "PT Mesin Kasir Online",
      "created_at": "2026-06-21T08:00:00.000Z",
      "updated_at": "2026-06-21T08:00:00.000Z",
      "branch_count": 1
    }
  ]
}
```

---

### `GET /api/v1/companies/:id`

Ambil satu perusahaan berdasarkan ID.

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 1,
    "code": "PT MKO",
    "name": "PT Mesin Kasir Online",
    "created_at": "2026-06-21T08:00:00.000Z",
    "updated_at": "2026-06-21T08:00:00.000Z"
  }
}
```

**Error:**
```json
{ "error": "NOT_FOUND", "message": "Company not found" }
```

---

### `POST /api/v1/companies`

Buat perusahaan baru.

**Request body:**
```json
{
  "code": "PT ABC",
  "name": "PT Abadi Cemerlang"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `code` | string | min 2, max 50, unique |
| `name` | string | min 2, max 255 |

**Response 201:**
```json
{
  "message": "Company created",
  "data": {
    "id": 4,
    "code": "PT ABC",
    "name": "PT Abadi Cemerlang",
    "created_at": "2026-06-22T08:00:00.000Z",
    "updated_at": "2026-06-22T08:00:00.000Z"
  }
}
```

---

### `PATCH /api/v1/companies/:id`

Update data perusahaan.

**Request body:**
```json
{
  "name": "PT Abadi Cemerlang Tbk"
}
```

| Field | Type | Rules |
|-------|------|-------|
| `code` | string? | min 2, max 50, unique |
| `name` | string? | min 2, max 255 |

**Response 200:** Sama seperti GET detail.

---

### `DELETE /api/v1/companies/:id`

Hapus perusahaan.

**Response:** `204 No Content`

---

## Branch Endpoints

Base URL: `http://localhost:3000/api/v1/companies`

---

### `GET /api/v1/companies/:id/branches`

List cabang untuk satu perusahaan.

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "company_id": 1,
      "name": "Pusat",
      "code": "PUSAT",
      "is_active": true,
      "created_at": "2026-06-24T08:00:00.000Z",
      "updated_at": "2026-06-24T08:00:00.000Z"
    }
  ]
}
```

---

### `POST /api/v1/companies/:id/branches`

Buat cabang baru.

**Request body:**
```json
{
  "name": "Cabang Bandung",
  "code": "BDG",
  "is_active": true
}
```

| Field | Type | Rules |
|-------|------|-------|
| `name` | string | min 2, max 100 |
| `code` | string | min 2, max 50, uppercase |
| `is_active` | boolean | required |

**Response 201:** Branch data.

---

### `PATCH /api/v1/companies/branches/:branchId?company_id=...`

Update cabang (edit nama/kode, toggle aktif/nonaktif).

**Query params:**
| Param | Type | Rules |
|-------|------|-------|
| `company_id` | number | required — validasi FK |

**Request body (partial):**
```json
{
  "name": "Cabang Bandung Updated",
  "is_active": false
}
```

**Response 200:** Updated branch data.

---

### `DELETE /api/v1/companies/branches/:branchId?company_id=...`

Hapus cabang.

**Query params:**
| Param | Type | Rules |
|-------|------|-------|
| `company_id` | number | required — validasi FK |

**Response:** `204 No Content`

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Field tidak valid |
| 403 | `FORBIDDEN` | Branch tidak milik company yg dimaksud |
| 404 | `NOT_FOUND` | Company/branch tidak ditemukan |
| 409 | `DUPLICATE_ENTRY` | Code sudah digunakan |
| 500 | `INTERNAL_ERROR` | Server/DB error |

---

## Implementation Notes

- **Audit trail**: Semua mutasi company (`create`, `update`, `delete`) dan branch dicatat via `logAudit()` dengan action `company.*` / `config.update`
- **Cascade**: Delete company akan otomatis menghapus relasi di `user_companies` dan `company_branches`
- **Branch count**: `GET /companies` menggunakan LEFT JOIN + COUNT untuk menampilkan jumlah cabang per perusahaan
- **Branch isolation**: Validasi `company_id` di setiap endpoint branch untuk memastikan cabang milik perusahaan yang benar (403 jika mismatch)
- **Seed**: 3 perusahaan default + 5 cabang di-seed via `seedCompanies()`, `companies:manage` permission, `companies` page setting

---

## References

- **Backend API**: `src/features/companies/`
- **Database Schema**: `src/db/schema/schema-company.ts` (tables `companies`, `company_branches`)
- **Frontend Types**: `frontend/src/types/companies.ts`
- **Frontend Page**: `frontend/src/pages/Companies/`
- **Seed Data**: `src/db/seed.ts`

---

**Last Updated**: 2026-07-04 (sesi 32)
**Status**: ✅ Production Ready