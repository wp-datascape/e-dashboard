# Feature: Import

> Status: ✅ Complete — File upload (CSV/Excel), SSE streaming progress, import logs, template download, import terpusat (faktur + divisi + klasifikasi)
> Last updated: 2026-06-30
> Baca juga: `features/classification.md`, `features/channel-divisions.md`, `features/accurate.md`, `shared/data-model.md`

---

## Overview

Import page adalah entry point terpusat untuk semua jenis data import. Tiga tipe import tersedia dari satu halaman via dropdown selector:

| Tipe | Endpoint | Keterangan |
|------|----------|------------|
| **Faktur** | `POST /import/csv` | Upload invoice dari Accurate — butuh company_id + period_month |
| **Channel Divisions** | `POST /settings/channel-divisions/import` | Mapping channel_name → division, butuh company_id |
| **Klasifikasi Item** | `POST /classification-rules/import` | Aturan klasifikasi item_type, butuh company_id |

Setiap tipe punya **Download Template** yang mengunduh file XLSX siap pakai (title row + deskripsi kolom + contoh data).

Mode import faktur:
1. **File upload** (`POST /import/csv`) — one-shot atau streaming SSE
2. **Accurate API sync** — fetch langsung dari Accurate (lihat `features/accurate.md`)

---

## Import Pipeline

```
Upload file (CSV/Excel)
    ↓
Parse via utils/parser (parseCsv / parseExcel)
    ↓
Validate baris: field wajib, format tanggal, numerik
    ↓
Classify item_type via item_classification_rules
    ↓
DEDUP + UPSERT per invoice_number + company_id:
  - Jika baru      → INSERT invoices + items
  - Jika ada lagi  → UPDATE header + DELETE items lama + INSERT items baru
    ↓
Upsert master data:
  - customers (dedup: UPPER(name) + company_id)
  - product_categories (dedup: UPPER(name) + company_id)
  - products (dedup: UPPER(name) + company_id)
    ↓
Tulis import_log + import_errors (untuk baris gagal)
    ↓
Return summary / stream SSE progress
```

---

## File Format — Faktur

File yang diterima: `.csv` atau `.xlsx` (max 10MB)

Kolom wajib yang diparse (nama persis di template):
| Kolom di File | Maps To | Keterangan |
|---|---|---|
| `Tanggal` | `invoices.invoice_date` | Format YYYY-MM-DD |
| `Sales Invoice` | `invoices.invoice_number` | Dedup key |
| `Pelanggan` | `customers.name` (UPPER) | Upsert key |
| `Nama Kategori Barang Barang & Jasa` | `product_categories.name` (UPPER) | Upsert key |
| `Nama Barang` | `products.product_name` (UPPER) | Upsert key |
| `Kuantitas` | `invoice_items.qty` | |
| `@Harga` | `invoice_items.unit_price` | |
| `Total Harga` | `invoice_items.total_revenue` | |
| `Laba` | `invoice_items.total_gp` | |
| `Nama Cabang` | `invoices.branch_name` | Opsional |
| `Nama Tenaga Penjual` | `invoices.channel_name` (UPPER) | Lookup `channel_divisions` |

Parser mendeteksi baris header secara dinamis (scan 10 baris pertama) — file boleh punya metadata/baris judul di atas header tanpa memengaruhi parsing.

---

## File Structure

```
src/features/import/
├── import.schema.ts          — importFileSchema, importAccurateSchema, importLogQuerySchema, classificationRuleSchema
├── import.repository.ts      — createImportLog, createImportError, findClassificationRules, CRUD rules
├── import.service.ts         — importFile() — pipeline utama, onProgress callback untuk SSE
├── import.handler.ts         — handleImportFile, handleImportFileStream, handleGetImportLogs, handleGetImportLogDetail, handleGetFakturTemplate
├── import.route.ts           — POST /csv, POST /csv/stream, GET /logs, GET /logs/:id, GET /template
├── classification.service.ts — listClassificationRules, CRUD, importClassificationRulesService, getClassificationRulesTemplate
├── classification.handler.ts — handleListRules, handleCreateRule, handleUpdateRule, handleDeleteRule, handleImportClassificationRules, handleDownloadClassificationTemplate
└── classification.route.ts   — GET /, POST /, PUT /:id, DELETE /:id, POST /import, GET /template
```

**Tabel DB yang dipakai:**

| Tabel | Peran |
|-------|-------|
| `import_logs` | Satu baris per operasi import. Status: success/partial/failed |
| `import_errors` | Detail baris yang gagal per import log |
| `invoices` | Header faktur — INSERT atau UPDATE |
| `invoice_items` | Item baris faktur — DELETE + INSERT setiap reimport |
| `customers` | Upsert dari nama customer |
| `product_categories` | Upsert dari nama kategori |
| `products` | Upsert dari nama barang |
| `item_classification_rules` | Dibaca saat klasifikasi item_type |
| `channel_divisions` | Dibaca untuk resolve division dari channel_name |

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/import`

---

### `GET /import/template`

Download template XLSX untuk import faktur.

**Response:** File `.xlsx` (Content-Disposition: attachment)

Template terdiri dari:
- Row 1: Judul "Template Import Faktur Penjualan"
- Row 2: Deskripsi tiap kolom (multi-line)
- Row 3: Header kolom yang dipakai parser
- Row 4–6: Contoh data

---

### `POST /import/csv`

Upload file, one-shot response setelah selesai diproses.

**Content-Type:** `multipart/form-data`

**Form fields:**
| Field | Tipe | Keterangan |
|-------|------|------------|
| `file` | File | `.csv` atau `.xlsx`, max 10MB |
| `company_id` | integer | ID company |
| `period_month` | string `YYYY-MM` | Bulan periode import |

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "import_log_id": 12,
    "status": "partial",
    "total_invoices": 150,
    "success_invoices": 147,
    "error_rows": 3,
    "error_summary": ["Row 45: Tanggal tidak valid", "Row 112: Harga satuan kosong"]
  }
}
```

**Status values:** `success` | `partial` | `failed`

---

### `POST /import/csv/stream`

Upload file, progress via **Server-Sent Events (SSE)**. Frontend dapat menampilkan progress bar real-time.

**Content-Type:** `multipart/form-data` (sama dengan endpoint di atas)

**SSE Event Stream:**

```
data: {"event":"progress","processed":50,"total":150,"success":50,"errors":0}
data: {"event":"progress","processed":100,"total":150,"success":99,"errors":1}
data: {"event":"progress","processed":150,"total":150,"success":147,"errors":3}
data: {"event":"done","result":{"import_log_id":12,"status":"partial","total_invoices":150,...}}
```

Jika terjadi error fatal:
```
data: {"event":"error","message":"Import gagal: ..."}
```

**Frontend usage:**
```ts
const es = new EventSource(url)  // atau fetch dengan streaming
es.onmessage = (e) => {
  const data = JSON.parse(e.data)
  if (data.event === 'progress') setProgress(data.processed / data.total)
  if (data.event === 'done') setResult(data.result)
  if (data.event === 'error') setError(data.message)
}
```

---

### `GET /import/logs`

Riwayat operasi import.

**Query params:**
| Param | Tipe | Default |
|-------|------|---------|
| `company_id` | integer (opsional) | — |
| `page` | integer | 1 |
| `per_page` | integer (1–100) | 20 |

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 12,
      "company_id": 1,
      "source": "file",
      "filename": "faktur_juni_2026.xlsx",
      "period_month": "2026-06",
      "status": "partial",
      "total_invoices": 150,
      "total_items": 820,
      "success_invoices": 147,
      "error_rows": 3,
      "imported_by": 2,
      "created_at": "2026-06-27T08:30:00Z"
    }
  ],
  "meta": { "page": 1, "per_page": 20, "total": 45 }
}
```

---

### `GET /import/logs/:id`

Detail satu import log — termasuk daftar baris error.

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "log": { "id": 12, "status": "partial", ... },
    "errors": [
      { "row_number": 45, "message": "Tanggal tidak valid: '32/06/2026'" },
      { "row_number": 112, "message": "Harga satuan kosong" }
    ]
  }
}
```

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | company_id / period_month tidak valid |
| 400 | `FILE_TOO_LARGE` | File > 10MB |
| 400 | `INVALID_FILE_FORMAT` | Bukan CSV/XLSX, atau header tidak ditemukan |
| 404 | `NOT_FOUND` | Import log ID tidak ditemukan |
| 422 | `IMPORT_PROCESSING_ERROR` | Parse / DB error saat processing |
| 500 | `INTERNAL_ERROR` | Server error |

---

## Import UI — UploadFileCard

`frontend/src/pages/Import/components/UploadFileCard.tsx` mengelola semua tipe import dari satu UI:

- **Dropdown "Tipe Import"**: pilih `faktur` | `divisi` | `klasifikasi`
- **Download Template**: tombol selalu tampil, mengunduh template XLSX sesuai tipe yang dipilih
- **Company selector**: tampil untuk semua tipe; faktur juga butuh period_month
- **Dropzone**: upload file `.csv` atau `.xlsx`
- **Hasil non-faktur**: ditampilkan sebagai Alert (misal: `3 ditambahkan, 1 dilewati, 0 error`)
- **Hasil faktur**: SSE progress bar + summary

Halaman `Settings/Divisions` dan `Config/Classification` **tidak punya** tombol import — semua import terpusat di halaman Import.

---

## Implementation Notes

### Dedup Invoice

```
Jika invoice_number + company_id sudah ada:
  UPDATE invoices header
  DELETE FROM invoice_items WHERE invoice_id = ...
  INSERT invoice_items (baru)
```

Tidak ada duplikat — reimport file yang sama aman, tidak akan membuat duplikasi data.

### onProgress Callback

`importFileService()` menerima opsional `onProgress` callback. SSE handler menggunakan ini untuk stream progress setiap N baris:

```ts
onProgress: async ({ processed, total, success, errors }) => {
  await stream.writeSSE({ data: JSON.stringify({ event: 'progress', ... }) })
}
```

Tanpa `onProgress` (one-shot mode) callback tidak dipanggil dan function berjalan normal sampai selesai.

### Import Handler — Exception

`handleImportFile` adalah satu-satunya handler yang masih punya try-catch karena:
1. Parse `multipart/form-data` tidak bisa lewat `validateBody()`
2. File validation logic perlu return error response awal sebelum memanggil service

Ini adalah pengecualian yang disengaja, bukan pelanggaran arsitektur.

---

## References

- **Backend**: `backend/src/features/import/`
- **DB Schema**: `backend/src/db/schema/import_logs.ts`
- **Utils**: `backend/src/utils/parser.ts` (parseCsv, parseExcel)
- **Classification Rules + Import**: `features/classification.md`
- **Channel Divisions + Import**: `features/channel-divisions.md`
- **Accurate Sync**: `features/accurate.md`
- **Frontend Page**: `frontend/src/pages/Import/`

---

**Last Updated**: 2026-06-30
**Status**: ✅ Production Ready
