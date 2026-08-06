# Feature: Item Classification Rules

> Status: ✅ Complete — Full CRUD, priority auto-assign, company-scoped import via XLSX template, Item Type dinamis per company (task011)
> Last updated: 2026-07-29 (task011 — Item Type dinamis, lihat §Item Type Dinamis)
> Baca juga: `features/import.md`, `shared/data-model.md`

---

## Overview

`item_classification_rules` adalah tabel aturan untuk mengklasifikasi kategori produk (bukan per-baris invoice_items — `invoice_items` TIDAK punya kolom `item_type` sama sekali) ke dalam tipe produk. Klasifikasi ini mengisi kolom `product_categories.item_type` saat proses import (`upsertProductCategory`, `import.repository.ts` — di-sync ulang ke klasifikasi terbaru tiap ada invoice baru untuk kategori itu, lihat `features/import.md` §Implementation Notes).

**Task011 (2026-07-29) — Item Type sekarang DINAMIS per company**, bukan 4 nilai tetap (`unit`/`consumable`/`sparepart`/`service`) lagi. Nilai-nilai itu sekarang cuma DEFAULT SEED — user bisa tambah/nonaktifkan Item Type sendiri lewat widget di halaman ini (lihat §Item Type Dinamis di bawah). `item_type` di tabel ini tetap `varchar` biasa (bukan FK formal ke `item_types.key` — soft reference lewat konvensi, sama seperti `channel_divisions.division`).

---

## Classification Engine (4 Layer)

```
Layer 1: keyword_item_name  — cocokkan keyword di nama item (UPPERCASE)
Layer 2: keyword_category   — cocokkan keyword di nama kategori (UPPERCASE)
Layer 3: price_range        — heuristic berdasarkan unit price
Layer 4: fallback → 'unit' + needs_review = true
```

Rule dengan **priority lebih tinggi** menang jika ada banyak yang match. Priority auto-assign saat create berdasarkan `match_type`:

| match_type | Auto-Priority |
|---|---|
| `exact_item_name` | 100 |
| `exact_category` | 90 |
| `keyword_item_name` | 70 |
| `keyword_category` | 50 |
| `price_range` | 30 |

Priority bisa di-override manual (0–1000) saat create.

---

## Global vs Company-Specific Rules

`company_id` nullable, sama seperti `channel_divisions`:

| `company_id` | Berlaku untuk |
|---|---|
| `NULL` | Semua company (global rule) |
| `integer` | Hanya company tersebut |

> **Import via UI selalu company-scoped**: saat import dari halaman Import, `company_id` wajib dipilih — rule dimasukkan dengan `company_id` tersebut, bukan NULL.

---

## Item Type Dinamis (task011, 2026-07-29)

Beda dari `company_id` rule di atas (nullable = global), tabel baru `item_types` **SENGAJA `company_id` NOT NULL** — setiap company kelola daftar Item Type sendiri-sendiri, tidak ada konsep "global Item Type". Dikelola lewat widget di bagian atas halaman Classification Rules (`frontend/src/pages/Config/Classification/index.tsx`) — bukan halaman terpisah.

**Tabel `item_types`:**

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `company_id` | integer NOT NULL → companies | WAJIB, tidak nullable |
| `key` | varchar(30) NOT NULL | Machine value, di-derive otomatis dari `label` (slugify) — dipakai di `product_categories.item_type` & `item_classification_rules.item_type` |
| `label` | varchar(50) NOT NULL | Teks tampilan, sumber kebenaran TUNGGAL untuk UI (bukan campur i18n) |
| `is_active` | boolean default true | |

Unique constraint `(company_id, key)`.

- **Seed default**: 4 Item Type (`unit`/`consumable`/`sparepart`/`service`) di-seed otomatis untuk company baru (hook di `companies.service.ts` `createCompanyService`) dan company existing (`backend/scripts/seed-item-types-existing-companies.ts`, idempotent, one-time backfill).
- **Endpoint**: `GET/POST/PATCH/DELETE /settings/item-types` (permission **reuse** `config.classification:*` — hidup di halaman yang sama). `GET /settings/item-types/values` khusus TANPA `requirePermission` (mirror pola `channel-divisions/values`) — dipakai dropdown filter Item Type di halaman Products (task010) yang cuma butuh `product:view`, bukan `config.classification:view`.
  > **Fix RBAC (2026-08-06, [[task022]])**: "tanpa `requirePermission`" TIDAK berarti tanpa scope check — `company_id` eksplisit tetap wajib divalidasi terhadap akses company user via `resolveCompanyScope()`. Sebelumnya validasi ini kelewat sama sekali (bukan cuma di endpoint ini, juga `channel-divisions/values` dan `divisions/values`), jadi user company A bisa lihat label item type company B lewat `?company_id=<company B>` — dan karena endpoint ini tanpa permission gate, SIAPA PUN yang login bisa, bukan cuma role tertentu. Sekarang company eksplisit di luar akses → `403`.
- **Proteksi delete**: Item Type yang masih dipakai `product_categories.item_type` ATAU `item_classification_rules.item_type` (termasuk rule global) tidak bisa dihapus — error `RESOURCE_IN_USE` (409), harus nonaktifkan (`is_active=false`) saja.
- **Validasi saat create/update classification rule**: `item_type` rule di-cek terhadap `item_types` aktif company itu (`classification.service.ts` `isValidItemType()`) — KECUALI rule GLOBAL (`company_id` NULL), yang tidak divalidasi ketat karena Item Type tidak punya konsep global untuk dicocokkan.
- **File**: `backend/src/features/settings/item-types.{schema,repository,service,handler,route}.ts`, `frontend/src/{types,api,hooks}/itemTypes*`.

---

## File Structure

```
src/features/import/
├── import.schema.ts              — classificationRuleSchema + classificationRuleUpdateSchema + MATCH_TYPE_PRIORITY map
├── import.repository.ts          — findClassificationRules, createClassificationRule, update, delete
├── classification.service.ts     — CRUD + auto-priority + importClassificationRulesService + getClassificationRulesTemplate
├── classification.handler.ts     — thin handler: CRUD + handleImportClassificationRules + handleDownloadClassificationTemplate
└── classification.route.ts       — GET / POST / PUT /:id / DELETE /:id / POST /import / GET /template
```

**Tabel DB:** `item_classification_rules`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `company_id` | integer NULL → companies | null = global |
| `match_type` | varchar(50) NOT NULL | Enum lihat bawah |
| `match_pattern` | varchar(255) NOT NULL | Keyword (UPPERCASE) atau JSON range |
| `item_type` | varchar(20) NOT NULL | Key dinamis per company (task011) — lihat §Item Type Dinamis di atas |
| `priority` | integer NOT NULL default 50 | Lebih tinggi = lebih diprioritaskan |
| `is_active` | boolean NOT NULL default true | Rule diaktifkan/nonaktifkan |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/classification-rules`

---

### `GET /classification-rules`

List semua rules.

**Query params:**
| Param | Tipe | Keterangan |
|-------|------|------------|
| `company_id` | integer (opsional) | Filter per company. Tanpa param = semua rules |

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 1,
      "company_id": null,
      "match_type": "keyword_item_name",
      "match_pattern": "SPARE PART",
      "item_type": "sparepart",
      "priority": 70,
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

---

### `POST /classification-rules`

Tambah rule baru.

**Body:**
```json
{
  "company_id": null,
  "match_type": "keyword_item_name",
  "match_pattern": "RIBBON",
  "item_type": "consumable",
  "is_active": true
}
```

- `priority` opsional — jika tidak dikirim, auto-assign dari `MATCH_TYPE_PRIORITY[match_type]`
- `match_pattern` sebaiknya UPPERCASE (tidak ada transform otomatis di schema — konsistensi harus dijaga manual)

**Response 201:**
```json
{
  "message": "Rule created",
  "data": { "id": 10, "match_type": "keyword_item_name", "priority": 70, ... }
}
```

---

### `PUT /classification-rules/:id`

Update rule — semua field opsional (partial update).

**Path param:** `id` integer positive

**Body (semua opsional):**
```json
{
  "match_pattern": "RIBBON CARTRIDGE",
  "is_active": false
}
```

- Jika `id` tidak ditemukan → 404 `NOT_FOUND`

---

### `DELETE /classification-rules/:id`

Hapus rule.

**Response 204 No Content**

- Jika `id` tidak ditemukan → service memanggil delete → tidak ada error (soft behavior di DB layer)

---

### `GET /classification-rules/template`

Download template XLSX untuk import massal.

**Response:** File `.xlsx` attachment `classification_rules_template.xlsx`

Template terdiri dari:
- Row 1: Judul
- Row 2: Deskripsi tiap kolom (tinggi 80pt, multi-line — jelaskan semua match_type + price_range JSON format + item_type options)
- Row 3: Header: `match_type`, `match_pattern`, `item_type`
- Row 4–19: 16 baris contoh (keyword_item_name, keyword_category, price_range)

---

### `POST /classification-rules/import`

Import massal classification rules dari file CSV atau XLSX.

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Tipe | Keterangan |
|-------|------|------------|
| `file` | File | `.csv` atau `.xlsx` |
| `company_id` | integer | ID company — wajib, rules dimasukkan per company ini |

**Behavior:**
- Parser mendeteksi header row secara dinamis (scan kolom yang mengandung `match_type`)
- Dedup: skip baris yang `match_type + match_pattern + company_id` sudah ada
- `priority` auto-assign dari `MATCH_TYPE_PRIORITY` (tidak perlu di file)
- `match_pattern` di-uppercase otomatis kecuali `price_range`

**Response 200:**
```json
{
  "message": "Import selesai",
  "data": { "added": 10, "skipped": 3, "errors": [] }
}
```

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Body tidak valid (enum salah, match_pattern kosong) |
| 404 | `NOT_FOUND` | ID tidak ditemukan saat UPDATE |
| 500 | `INTERNAL_ERROR` | DB error |

---

## Implementation Notes

- **Priority auto-assign di service**: `MATCH_TYPE_PRIORITY[data.match_type] ?? 50` — inject sebelum passing ke repository
- **Tidak ada unique constraint**: Dua rule dengan `match_pattern` sama bisa ada — engine pakai `priority` untuk tie-break; dedup saat import hanya cek `match_type + match_pattern + company_id`
- **`price_range` match_pattern**: Disimpan sebagai JSON string, contoh `{"min": 500000}` atau `{"min": 100000, "max": 499999}` — parsing dilakukan oleh classification engine di import service
- **`is_active = false`**: Rule tidak dihapus tapi diabaikan saat klasifikasi — berguna untuk debug / A-B testing rule
- **Template XLSX format**: `getClassificationRulesTemplate()` di `classification.service.ts` — return `ArrayBuffer` (bukan `Buffer` / `Uint8Array`), agar langsung diterima `new Response()`

---

## References

- **Backend**: `backend/src/features/import/classification.*`
- **DB Schema**: `backend/src/db/schema/schema-product.ts` (table `item_classification_rules`)
- **Schema + Priority Map**: `backend/src/features/import/import.schema.ts`
- **Frontend Page (CRUD)**: `frontend/src/pages/Config/Classification/`
- **Frontend Import**: `frontend/src/pages/Import/components/UploadFileCard.tsx` (tipe `klasifikasi`)
- **Frontend API**: `frontend/src/api/classification.api.ts`

---

**Last Updated**: 2026-06-30
**Status**: ✅ Production Ready
