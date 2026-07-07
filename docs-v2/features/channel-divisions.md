# Feature: Channel Divisions

> Status: ✅ Complete — Full CRUD, company-scoped import via XLSX template, division filter, endpoint `/values` tanpa permission (sesi 32)
> Last updated: 2026-07-04 (sesi 32)
> Baca juga: `features/customers.md`, `features/import.md`, `shared/data-model.md`

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

> **Import via UI selalu company-scoped**: saat import dari halaman Import, `company_id` wajib dipilih — entri dimasukkan dengan `company_id` tersebut, dedup juga per `channel_name + company_id`.

---

## File Structure

```
src/features/settings/
├── channel-divisions.schema.ts      — Zod DTOs + DIVISION_VALUES constant
├── channel-divisions.repository.ts  — findChannelDivisions, findDistinctDivisions (baru), findByName, findByNameAndCompany, CRUD
├── channel-divisions.service.ts     — CRUD + listDivisionValuesService (baru) + importChannelDivisionsService + getChannelDivisionsTemplate
├── channel-divisions.handler.ts     — thin handler: CRUD + handleListDivisionValues (baru) + handleImportChannelDivisions + handleDownloadChannelDivisionsTemplate
└── channel-divisions.route.ts       — GET /values (baru, no permission) / GET / POST / PATCH /:id / DELETE /:id / POST /import / GET /template
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

List semua channel divisions, opsional filter. **Butuh `settings.channel.division:view`.**

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

### `GET /settings/channel-divisions/values` (baru, sesi 32)

Cuma balikin nilai `division` unik (bukan mapping `channel_name` lengkap) — **tidak butuh permission apa pun** selain login (authMiddleware). Dipakai `useDivisionOptions()` sebagai dropdown filter divisi di 8+ halaman.

**Kenapa endpoint terpisah, bukan melonggarkan `GET /` yang sudah ada:** `GET /` balikin `channel_name` **asli** (nama channel penjualan riil dari invoice) — melonggarkan permission-nya berarti nama channel penjualan jadi terlihat semua role yang login, bukan cuma yang punya `settings.channel.division:view`. Endpoint `/values` sengaja dirancang untuk TIDAK pernah mengembalikan `channel_name`, cuma daftar nilai divisi kategoris (`distribution`, `project`, dst) — data yang tidak sensitif — supaya aman dibuka lebar.

**Query params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `company_id` | integer \| `"all"` | `"all"` | Sama seperti `GET /` — scope company rule + global |

**Response 200:**
```json
{
  "message": "Success",
  "data": ["distribution", "e_commerce", "freelancer", "intercompany", "project", "support"]
}
```

Route: `channelDivisionsRoutes.get('/values', handleListDivisionValues)` — didaftarkan **sebelum** `GET /` di file route (urutan tidak masalah di sini karena keduanya path statis, tidak ada konflik `:id`).

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

### `GET /settings/channel-divisions/template`

Download template XLSX untuk import massal.

**Response:** File `.xlsx` attachment `channel_divisions_template.xlsx`

Template terdiri dari:
- Row 1: Judul
- Row 2: Deskripsi tiap kolom (termasuk semua nilai division yang valid)
- Row 3: Header: `channel_name`, `division`
- Row 4–13: 10 baris contoh

---

### `POST /settings/channel-divisions/import`

Import massal channel divisions dari file CSV atau XLSX.

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Tipe | Keterangan |
|-------|------|------------|
| `file` | File | `.csv` atau `.xlsx` |
| `company_id` | integer | ID company — wajib, entri dimasukkan per company ini |

**Behavior:**
- Parser mendeteksi header row secara dinamis (scan kolom yang mengandung `channel_name`)
- Dedup: skip baris yang `channel_name + company_id` sudah ada
- `channel_name` di-uppercase + trim otomatis

**Response 200:**
```json
{
  "message": "Import selesai",
  "data": { "added": 5, "skipped": 1, "errors": [] }
}
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

## Seed Data (21 entries, company_id = NULL / global)

```
DC WEST, DC EAST, DC WEST HEAD, DC EAST HEAD, DC EAST CARD → distribution
SDR B2B WEST, B2B EAST, KAE WEST, NAS B2B EAST, NAS B2B WEST → project
KASSEN OFFICIAL STORE, TOKOPEDIA, TIKTOKSHOP, LAZADA → e_commerce
KODE NIAGA TAMA, CODESHOP → intercompany
SBY UDIN → freelancer
SALES SUPPORT, SALES SUPPORT JKT → support
SAMPLE ORDER → distribution
```

Seed data di-load via `bun run db:seed` → `backend/src/db/seed.ts`. Data ini bersifat global (company_id = NULL) dan dapat dioverride dengan import per-company dari halaman Import.

---

## Implementation Notes

- **Pre-check duplikat di service (CRUD)**: Service memanggil `findChannelDivisionByName()` sebelum INSERT — lebih user-friendly daripada mengandalkan unique constraint DB
- **Pre-check duplikat saat import**: `findChannelDivisionByNameAndCompany(name, companyId)` — dedup per `channel_name + company_id` (bukan global)
- **`channel_name` UPPERCASE**: Normalisasi di Zod schema via `.transform((v) => v.toUpperCase().trim())`; saat import, di-uppercase manual di service
- **Soft delete tidak dipakai**: Channel division bisa dihapus hard (tidak ada FK dari invoices — `invoices.channel_name` adalah varchar)
- **Template XLSX format**: `getChannelDivisionsTemplate()` di service — return `ArrayBuffer` langsung diterima `new Response()`
- **Channel baru dari Accurate**: Jika ada channel_name baru di file import yang belum di-map, customer akan tampil dengan `division = null` — admin perlu tambah mapping di halaman Settings/Divisions atau import via template

---

## References

- **Backend**: `backend/src/features/settings/channel-divisions.*`
- **DB Schema**: `backend/src/db/schema/schema-product.ts` (table `channel_divisions`)
- **Digunakan oleh**: `features/customers.md` (status logic + division filter)
- **Frontend Page (CRUD)**: `frontend/src/pages/Settings/Divisions/`
- **Frontend Import**: `frontend/src/pages/Import/components/UploadFileCard.tsx` (tipe `divisi`)
- **Frontend API**: `frontend/src/api/channelDivisions.api.ts` (`listDivisionValues()` baru)
- **Frontend Hook**: `frontend/src/hooks/useChannelDivisions.ts` (`useDivisionValues()` baru), `frontend/src/hooks/useDivisionOptions.ts` (dialihkan ke `useDivisionValues()` sesi 32)
- **Seed**: `backend/src/db/seed.ts`

---

**Last Updated**: 2026-07-04 (sesi 32)
**Status**: ✅ Production Ready
