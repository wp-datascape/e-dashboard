# Feature: Companies

> Status: ✅ Complete — CRUD backend live
> Last updated: 2026-06-22
> Baca juga: `shared/data-model.md`, `shared/api-conventions.md`

---

## Overview

Companies feature mengelola entitas perusahaan dalam holding group. Setiap user bisa memiliki akses ke satu atau lebih perusahaan.

**Saat ini ada 3 perusahaan (seed):**
- PT Mesin Kasri Online (MKO)
- PT Kode Niaga Tama (KNT)  
- PT Solusi Kartu Indonesia (SKI)

---

## File Structure

```
src/features/companies/
├── companies.schema.ts      — Zod DTO (request & response types)
├── companies.repository.ts  — Drizzle queries (DB layer)
├── companies.service.ts     — Business logic + audit logging
└── companies.route.ts       — HTTP handlers + route definitions
```

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/companies`

> **Catatan:** Saat ini aktif **tanpa auth** (sementara).

---

### `GET /api/v1/companies`

List semua perusahaan.

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "code": "PT MKO",
      "name": "PT Mesin Kasri Online",
      "createdAt": "2026-06-21T08:00:00.000Z",
      "updatedAt": "2026-06-21T08:00:00.000Z"
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
    "name": "PT Mesin Kasri Online",
    "createdAt": "2026-06-21T08:00:00.000Z",
    "updatedAt": "2026-06-21T08:00:00.000Z"
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
    "createdAt": "2026-06-22T08:00:00.000Z",
    "updatedAt": "2026-06-22T08:00:00.000Z"
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

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Field tidak valid |
| 404 | `NOT_FOUND` | Company tidak ditemukan |
| 409 | `DUPLICATE_ENTRY` | Code sudah digunakan |
| 500 | `INTERNAL_ERROR` | Server/DB error |

---

## Implementation Notes

- **Audit trail**: Semua mutasi dicatat via `logAudit()` dengan action `company.create`, `company.update`, `company.delete`
- **Cascade**: Delete company akan otomatis menghapus relasi di `user_companies`
- **Seed**: 3 perusahaan default di-seed via `seedCompanies()`

---

## References

- **Backend API**: `src/features/companies/`
- **Database Schema**: `src/db/schema/companies.ts`
- **Frontend Types**: `frontend/src/types/companies.ts`
- **Seed Data**: `src/db/seed.ts`

---

**Last Updated**: 2026-06-22
**Status**: ✅ Production Ready