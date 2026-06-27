# Feature: Channel Divisions

> Status: ✅ Complete — Full CRUD, global + per-company rules, division filter
> Last updated: 2026-06-27
> Baca juga: `features/customers.md`, `shared/data-model.md`

---

## Overview

`channel_divisions` adalah tabel mapping antara **channel_name** (nilai dari kolom "Nama Tenaga Penjual" di Accurate) → **division** (kategori saluran penjualan bisnis).

Tabel ini digunakan customers feature untuk menentukan `business_unit` seorang customer dan menghitung threshold dormant yang tepat.

Nilai division yang valid:
- `distribution` — DC (Distribution Channel) fisik
- `project` — B2B / KAE / NAS channel
- `e_commerce` — marketplace online
- `intercompany` — transaksi antar entitas holding
- `freelancer` — salesperson freelance
- `support` — sales support / internal

---

## Global vs Company-Specific Rules

`company_id` pada tabel bersifat nullable:

| `company_id` | Berlaku untuk |
|---|---|
| `NULL` | Semua company (global rule) — seed data default |
| `integer` | Hanya company tersebut (company-specific override) |

Saat query dengan `company_id` tertentu, endpoint mengembalikan:
- Semua rule global (`company_id IS NULL`) **+**
- Rule khusus company itu

---

## File Structure

```
src/features/settings/
├── channel-divisions.schema.ts      — Zod DTOs + DIVISION_VALUES constant
├── channel-divisions.repository.ts  — findChannelDivisions, findByName, CRUD
├── channel-divisions.service.ts     — isDuplicateError + pre-check, NOT_FOUND
├── channel-divisions.handler.ts     — thin handler (no try-catch)
└── channel-divisions.route.ts       — GET / POST / PATCH /:id / DELETE /:id
```

**Tabel DB:** `channel_divisions`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `company_id` | integer NULL → companies | null = global |
| `channel_name` | varchar(255) NOT NULL | UPPERCASE — cocok dengan `invoices.channel_name` |
| `division` | varchar(50) NOT NULL | Enum division |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/settings/channel-divisions`

---

### `GET /settings/channel-divisions`

List semua channel divisions, opsional filter.

**Query params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `division` | enum | — | Filter per division |
| `company_id` | integer \| `"all"` | `"all"` | `"all"` = tampilkan semua, integer = global + company itu |
| `search` | string | — | Search `channel_name` case-insensitive |

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "channel_name": "DC WEST",
      "division": "distribution",
      "company_id": null,
      "company_name": null,
      "created_at": "2026-06-01T00:00:00Z",
      "updated_at": "2026-06-01T00:00:00Z"
    }
  ]
}
```

---

### `POST /settings/channel-divisions`

Tambah mapping baru.

**Body:**
```json
{
  "channel_name": "NEW CHANNEL",
  "division": "distribution",
  "company_id": null
}
```

- `channel_name` di-uppercase + trim otomatis (transform Zod)
- Jika `channel_name` sudah ada → 409 `DUPLICATE_ENTRY`

**Response 201:**
```json
{
  "message": "Created",
  "data": { "id": 22, "channel_name": "NEW CHANNEL", "division": "distribution", ... }
}
```

---

### `PATCH /settings/channel-divisions/:id`

Update partial — semua field opsional.

**Path param:** `id` integer positive

**Body (semua opsional):**
```json
{
  "channel_name": "UPDATED NAME",
  "division": "project"
}
```

- Jika `channel_name` baru sama dengan channel lain → 409
- Jika `id` tidak ditemukan → 404 `NOT_FOUND`

---

### `DELETE /settings/channel-divisions/:id`

Hapus satu mapping.

- Jika `id` tidak ditemukan → 404 `NOT_FOUND`
- Jika dihapus, customer yang awalnya punya channel ini akan kehilangan division mapping → tampil sebagai `null`

**Response 200:**
```json
{ "message": "Success", "data": { "id": 22 } }
```

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Body/param tidak valid |
| 404 | `NOT_FOUND` | ID tidak ditemukan |
| 409 | `DUPLICATE_ENTRY` | channel_name sudah ada |
| 500 | `INTERNAL_ERROR` | DB error |

---

## Seed Data (21 entries)

```
DC WEST, DC EAST, DC WEST HEAD, DC EAST HEAD, DC EAST CARD → distribution
SDR B2B WEST, B2B EAST, KAE WEST, NAS B2B EAST, NAS B2B WEST → project
KASSEN OFFICIAL STORE, TOKOPEDIA, TIKTOKSHOP, LAZADA → e_commerce
KODE NIAGA TAMA, CODESHOP → intercompany
SBY UDIN → freelancer
SALES SUPPORT, SALES SUPPORT JKT → support
SAMPLE ORDER → distribution
```

Semua seed data: `company_id = NULL` (global rule).

---

## Implementation Notes

- **Pre-check duplikat di service**: Service memanggil `findChannelDivisionByName()` sebelum INSERT — lebih user-friendly daripada mengandalkan unique constraint DB yang menghasilkan pesan error generik
- **`channel_name` UPPERCASE**: Normalisasi dilakukan di Zod schema via `.transform((v) => v.toUpperCase().trim())` — tidak perlu manual di service/repository
- **Soft delete tidak dipakai**: Channel division bisa dihapus hard (tidak ada relasi yang broken karena `invoices.channel_name` adalah varchar, bukan FK)
- **Impor baru**: Jika ada channel baru dari Accurate yang belum di-map, customer akan muncul dengan `division = null` — admin perlu tambahkan mapping baru di halaman ini

---

## References

- **Backend**: `backend/src/features/settings/channel-divisions.*`
- **DB Schema**: `backend/src/db/schema/channel_divisions.ts`
- **Digunakan oleh**: `features/customers.md` (status logic + division filter)
- **Frontend Page**: `frontend/src/pages/Settings/Divisions/`
- **Seed**: `backend/src/db/seed.ts`

---

**Last Updated**: 2026-06-27
**Status**: ✅ Production Ready
