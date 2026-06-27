# Feature: Item Classification Rules

> Status: ✅ Complete — Full CRUD, priority auto-assign, global + per-company rules
> Last updated: 2026-06-27
> Baca juga: `features/import.md`, `shared/data-model.md`

---

## Overview

`item_classification_rules` adalah tabel aturan untuk mengklasifikasi setiap baris item faktur (dari Accurate atau file CSV) ke dalam 4 tipe produk: `unit` | `consumable` | `sparepart` | `service`.

Klasifikasi digunakan saat proses import untuk mengisi kolom `item_type` di `invoice_items`.

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

---

## File Structure

```
src/features/import/
├── import.schema.ts              — classificationRuleSchema + classificationRuleUpdateSchema + MATCH_TYPE_PRIORITY map
├── import.repository.ts          — findClassificationRules, createClassificationRule, update, delete
├── classification.service.ts     — wrap CRUD + auto-priority inject + NOT_FOUND check
├── classification.handler.ts     — thin handler (validateBody/Param/Query)
└── classification.route.ts       — GET / POST / PUT /:id / DELETE /:id
```

**Tabel DB:** `item_classification_rules`

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `company_id` | integer NULL → companies | null = global |
| `match_type` | varchar(50) NOT NULL | Enum lihat bawah |
| `match_pattern` | varchar(255) NOT NULL | Keyword (UPPERCASE) atau JSON range |
| `item_type` | varchar(20) NOT NULL | unit \| consumable \| sparepart \| service |
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

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Body tidak valid (enum salah, match_pattern kosong) |
| 404 | `NOT_FOUND` | ID tidak ditemukan saat UPDATE |
| 500 | `INTERNAL_ERROR` | DB error |

---

## Implementation Notes

- **Priority auto-assign di service**: `MATCH_TYPE_PRIORITY[data.match_type] ?? 50` — inject sebelum passing ke repository
- **Tidak ada unique constraint**: Dua rule dengan `match_pattern` sama bisa ada — engine pakai `priority` untuk tie-break
- **`price_range` match_pattern**: Disimpan sebagai JSON string, contoh `{"min": 500000}` atau `{"min": 100000, "max": 499999}` — parsing dilakukan oleh classification engine di import service
- **`is_active = false`**: Rule tidak dihapus tapi diabaikan saat klasifikasi — berguna untuk debug / A-B testing rule

---

## References

- **Backend**: `backend/src/features/import/classification.*`
- **DB Schema**: `backend/src/db/schema/item_classification_rules.ts`
- **Schema + Priority Map**: `backend/src/features/import/import.schema.ts`
- **Frontend Page**: `frontend/src/pages/Settings/Classification/`

---

**Last Updated**: 2026-06-27
**Status**: ✅ Production Ready
