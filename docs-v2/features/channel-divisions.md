# Feature: Divisions & Channel Divisions

> Status: ✅ Complete — Division jadi katalog dinamis per company/branch (task004), filter dropdown dinamis (Session A), halaman admin "Divisions" (Session B), RBAC picker dinamis (Session C), warna chip dinamis (Session D), import bulk branch-aware via auto-derive dari invoice
> Last updated: 2026-07-09 (task004/task005)
> Baca juga: `features/customers.md`, `features/import.md`, `shared/data-model.md`, `task/task004.md`, `task/task005.md`

---

## Overview

Fitur ini sekarang terdiri dari **2 tabel yang saling terkait**, bukan 1:

1. **`divisions`** — **katalog master** divisi per company (+ opsional per branch). Ini yang mendefinisikan divisi APA SAJA yang valid untuk sebuah company/branch (mis. KNT punya "Sales Counter"/"U-Card", MKO punya "Distribution"/"Project"/dst — **beda taksonomi per company**, bukan enum global tetap).
2. **`channel_divisions`** — **mapping** antara **channel_name** (nilai dari kolom "Nama Tenaga Penjual" di Accurate) → **kode divisi** (harus salah satu kode yang terdaftar di `divisions` untuk company/branch yang sama).

Sebelum task004 (2026-07-09), division adalah **enum hardcode 7-nilai global** (`distribution|project|e_commerce|intercompany|freelancer|support|other`) yang dipakai sama untuk semua company holding — padahal taksonomi itu spesifik milik PT Mesin Kasir Online (MKO). Sekarang setiap company (dan opsional tiap branch) punya daftar kode divisinya sendiri, disimpan di tabel `divisions`.

`channel_divisions` (via join ke invoice) dipakai `customers`/`transactions`/`metrics` feature untuk menentukan `division`/`business_unit` seorang customer/invoice dan menghitung threshold dormant yang tepat (lewat `divisions.dormant_bucket`).

---

## Tabel `divisions` (katalog master)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `company_id` | integer NOT NULL → companies | **Wajib** — setiap divisi milik 1 company spesifik |
| `branch_id` | integer NULL → company_branches | `NULL` = company-wide (berlaku semua branch); diisi = spesifik 1 branch |
| `name` | varchar(100) NOT NULL | Label tampilan, mis. "Sales Counter" |
| `code` | varchar(50) NOT NULL | Kode internal (lowercase), mis. `counter` — inilah yang disimpan di `channel_divisions.division` & `user_divisions.division` |
| `dormant_bucket` | varchar(20) NOT NULL DEFAULT `'b2b_dc'` | Salah satu dari `b2b_dc \| b2b_project \| b2c \| manufacturing` — dipakai `threshold.ts` nentuin threshold dormant customer. **Bisa diubah kapan saja lewat UI**, tidak perlu deploy kode |
| `is_active` | boolean NOT NULL DEFAULT true | Soft-delete — divisi nonaktif tidak hilang dari histori, cuma tidak muncul lagi di dropdown/validasi |
| `created_at`, `updated_at` | timestamptz | |

Constraint: `UNIQUE(company_id, branch_id, code)` + partial unique index `(company_id, code) WHERE branch_id IS NULL` (cegah duplikat kode baik yang company-wide maupun yang branch-spesifik).

**Kenapa `code` bukan FK dari `channel_divisions.division`**: sengaja tetap `varchar` biasa (bukan `division_id` numerik) supaya 24 call site RBAC scope (`utils/scope.ts`) yang sudah ada tidak perlu diubah — mereka membandingkan string, dan sumber string yang valid sekarang dinamis per company/branch alih-alih enum tetap. Detail lengkap: `task/task004.md`.

---

## Tabel `channel_divisions` (mapping)

| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | |
| `company_id` | integer NOT NULL → companies | **Wajib sejak task004** (dulu nullable, ada konsep "rule global" — sudah dihapus, mapping HARUS dimiliki 1 company mengikuti alur hirarki Company→Branch→Division) |
| `branch_id` | integer NULL → company_branches | `NULL` = company-wide; diisi = spesifik 1 branch. Relasi **eksplisit** (bukan disimpulkan dari format string `channel_name`) |
| `channel_name` | varchar(255) NOT NULL | UPPERCASE — cocok dengan `invoices.channel_name` |
| `division` | varchar(50) NOT NULL | Kode divisi. Kalau kode belum terdaftar di katalog `divisions` untuk `(company_id, branch_id)` yang sama, **otomatis didaftarkan** (`ensureDivisionCode()`) — mapping ini SENDIRI adalah SSOT keputusan admin soal kode divisi apa yang berlaku, tidak perlu didaftarkan terpisah dulu |
| `created_at`, `updated_at` | timestamptz | |

---

## File Structure

```
src/features/settings/
├── divisions.schema.ts              — Zod DTOs katalog divisions
├── divisions.repository.ts          — findDivisions (+JOIN company/branch name), findDivisionById,
│                                       createDivision, updateDivision, deactivateDivision (soft delete),
│                                       findActiveDivisionCodesForScope, findDivisionCodesForFilter, findDormantBucket
├── divisions.service.ts             — CRUD + validateDivisionCode() (STRICT, tolak kode tak dikenal — dipakai
│                                       HANYA user RBAC assignment) + ensureDivisionCode() (auto-create kode
│                                       belum ada — dipakai channel-divisions create/update/import)
├── divisions.handler.ts             — thin handler
├── divisions.route.ts               — mount /settings/divisions, permission settings.division:*
│
├── channel-divisions.schema.ts      — Zod DTOs mapping (division: string dinamis, company_id wajib)
├── channel-divisions.repository.ts  — findChannelDivisions, findByName, findByNameAndCompany, CRUD,
│                                       findConsistentBranchIdForChannel (auto-derive branch dari invoice)
├── channel-divisions.service.ts     — CRUD (pakai ensureDivisionCode — auto-create kode divisi) +
│                                       listDivisionValuesService + importChannelDivisionsService +
│                                       getChannelDivisionsTemplate
├── channel-divisions.handler.ts     — thin handler
└── channel-divisions.route.ts       — GET /values (no permission) / GET / POST / PATCH /:id / DELETE /:id / POST /import / GET /template
```

---

## API Endpoints — `/settings/divisions` (katalog)

Base URL: `http://localhost:3000/api/v1/settings/divisions`

| Method | Path | Permission | Keterangan |
|---|---|---|---|
| GET | `/` | `settings.division:view` | List, filter opsional `company_id`, `branch_id`, `is_active` — response ikut `company_name`/`branch_name` (JOIN) |
| GET | `/:id` | `settings.division:view` | Detail 1 divisi |
| POST | `/` | `settings.division:create` | Buat divisi baru — `company_id` wajib, `branch_id` opsional, `code`+`name` wajib, `dormant_bucket` default `b2b_dc` |
| PATCH | `/:id` | `settings.division:update` | Update partial (company_id immutable, tidak bisa diubah setelah dibuat) |
| DELETE | `/:id` | `settings.division:delete` | **Soft delete** (`is_active=false`) — beda dari `channel_divisions` yang hard-delete, karena divisi direferensikan RBAC (`user_divisions`) dan histori |

Rate limit mutasi: 20/5menit per user (mirror `channel-divisions`).

---

## API Endpoints — `/settings/channel-divisions` (mapping)

Base URL: `http://localhost:3000/api/v1/settings/channel-divisions`

### `GET /settings/channel-divisions`

List semua channel divisions, opsional filter. **Butuh `settings.channel.division:view`.**

**Query params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `division` | string | — | Filter per kode divisi |
| `company_id` | integer \| `"all"` | `"all"` | `"all"` = tampilkan semua, integer = company itu |
| `branch_id` | integer | — | Opsional — filter tambahan per branch |
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
      "company_id": 1,
      "company_name": "PT Mesin Kasir Online",
      "branch_id": null,
      "created_at": "2026-06-01T00:00:00Z",
      "updated_at": "2026-06-01T00:00:00Z"
    }
  ]
}
```

---

### `GET /settings/channel-divisions/values`

Cuma balikin kode `division` unik (bukan mapping `channel_name` lengkap) — **tidak butuh permission apa pun** selain login. Dipakai `useDivisionOptions()` sebagai dropdown filter divisi di 9+ halaman laporan/metric.

**Kenapa endpoint terpisah, bukan melonggarkan `GET /` yang sudah ada:** `GET /` balikin `channel_name` **asli** (nama channel penjualan riil dari invoice) — melonggarkan permission-nya berarti nama channel penjualan jadi terlihat semua role yang login. Endpoint `/values` sengaja dirancang untuk TIDAK pernah mengembalikan `channel_name`, cuma daftar kode divisi kategoris — data yang tidak sensitif.

**Sumber data**: diambil dari katalog `divisions` (bukan lagi `DISTINCT channel_divisions.division`) via `findDivisionCodesForFilter()` — kode divisi yang sudah terdaftar di katalog tapi belum ada channel_name yang di-mapping tetap muncul.

**Query params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `company_id` | integer \| `"all"` | `"all"` | `"all"` = union lintas semua company; integer = scope company itu |
| `branch_id` | integer | — (opsional) | Diisi: union divisi branch itu + company-wide. Kosong: union SEMUA branch di company itu |

**Response 200:**
```json
{ "message": "Success", "data": ["counter", "other", "u_card"] }
```
(Contoh di atas untuk `company_id=2`/KNT — kode divisinya beda dari MKO, bukan 1 daftar tetap yang sama untuk semua company.)

---

### `POST /settings/channel-divisions`

Tambah mapping baru.

**Body:**
```json
{
  "channel_name": "NEW CHANNEL",
  "division": "distribution",
  "company_id": 1,
  "branch_id": null
}
```

- `channel_name` di-uppercase + trim otomatis (transform Zod)
- `company_id` **wajib** — mengikuti alur hirarki Company→Branch→Division, tidak ada lagi "rule global" tanpa company
- `division`: kalau kode belum terdaftar di katalog `divisions` untuk `(company_id, branch_id)` ini, **otomatis didaftarkan** (`ensureDivisionCode()`) — tidak ditolak. Form mapping ini sendiri adalah keputusan admin soal kode divisi apa yang berlaku
- Jika `channel_name` sudah ada → `409 DUPLICATE_ENTRY`

**Response 201:**
```json
{ "message": "Created", "data": { "id": 22, "channel_name": "NEW CHANNEL", "division": "distribution", "branch_id": null, ... } }
```

---

### `PATCH /settings/channel-divisions/:id`

Update partial — semua field opsional (`channel_name`, `division`, `company_id`, `branch_id`). `division` baru tetap dijamin ada di katalog untuk scope company/branch final (existing atau yang baru diisi) lewat `ensureDivisionCode()` — auto-create kalau belum terdaftar, sama seperti create.

---

### `DELETE /settings/channel-divisions/:id`

Hard delete (tidak ada FK dari invoices — `invoices.channel_name` varchar biasa). Customer yang tadinya punya channel ini akan kehilangan division mapping → tampil `null`.

---

### `GET /settings/channel-divisions/template` & `POST /settings/channel-divisions/import`

Import massal (CSV/XLSX): kolom `channel_name`, `division` — **tidak ada kolom branch**, dan memang sengaja tidak ada. `branch_id` di-**derive otomatis** dari histori invoice riil: `findConsistentBranchIdForChannel(channelName, companyId)` cek `invoices.branch_id` distinct untuk channel itu — kalau channel konsisten cuma pernah muncul di 1 branch, otomatis dipakai (SSOT dari data faktur, tanpa kolom manual yang rawan typo/duplikat kode cabang); kalau channel belum pernah ada di invoice atau nyebar ke >1 branch (ambigu), fallback company-wide (`branch_id = NULL`), tidak pernah menebak. Detail keputusan desain: `task/task005.md` §6.

Kode divisi per baris: kalau belum terdaftar di katalog `divisions` untuk `(company_id, branch_id yang ter-derive)`, **otomatis didaftarkan** (`ensureDivisionCode()`) — baris import tidak pernah gagal karena "kode divisi belum ada", karena file/template import inilah yang jadi SSOT keputusan kode apa yang berlaku (task004.md §8).

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Body/param tidak valid. **Catatan**: kode divisi tak dikenal TIDAK lagi menghasilkan error ini di `channel-divisions` (auto-create via `ensureDivisionCode`) — cuma masih berlaku di RBAC assign user (`validateDivisionCode`, strict) |
| 404 | `NOT_FOUND` | ID tidak ditemukan |
| 409 | `DUPLICATE_ENTRY` | `channel_name` sudah ada (channel_divisions), atau kode+company+branch sudah ada (divisions) |
| 500 | `INTERNAL_ERROR` | DB error |

---

## Seed Data

**`seedDivisions()` DIHAPUS TOTAL dari `seed.ts` (2026-07-09, task004 §8).** Katalog `divisions` tidak lagi punya bootstrap hardcode — murni terisi dari pemakaian nyata: `ensureDivisionCode()` otomatis mendaftarkan kode divisi baru begitu ada mapping `channel_divisions` dibuat/diupdate/diimpor dengan kode itu. Alasan: mapping channel_name→division SUDAH berisi keputusan admin soal kode apa yang berlaku (tertulis eksplisit di form/file import) — tidak masuk akal ada langkah terpisah "daftarkan dulu kode divisinya" (baik lewat seed maupun fitur bulk-import Divisions) sebelum bisa membuat mapping.

Di DB yang benar-benar kosong (fresh install), katalog `divisions` kosong sampai mapping channel pertama dibuat — ini disengaja, bukan bug (`seedUserAssignments()` juga otomatis meng-grant 0 baris `user_divisions` ke akun test dalam kondisi ini, karena memang belum ada kategorisasi bisnis apa pun untuk di-grant).

Kondisi katalog MKO saat ini (setelah koreksi 2026-07-09, lewat API — bukan seed):

```
PT MKO:
  distribution × {Jakarta, Surabaya} — dipecah per-cabang, terbukti dari data faktur
                                        (channel "DC WEST"=Jakarta, "DC EAST"=Surabaya, dst,
                                        konsisten 100% tidak pernah campur cabang)
  project      × {Jakarta, Surabaya} — pola sama (SDR B2B WEST/KAE WEST=Jakarta,
                                        B2B EAST/NAS B2B EAST=Surabaya)
  e_commerce, intercompany, freelancer, support, other — tetap company-wide
                                        (marketplace online & transaksi antar-entitas
                                        tidak terikat 1 cabang fisik)

PT KNT (branch-spesifik — channel_name Accurate sudah unik per cabang):
  counter × {Surabaya, Jakarta, Semarang}
  u_card  × {Surabaya, Jakarta, Semarang}
  other   (company-wide)

PT SKI (company-wide — cuma 1 branch: Pusat):
  sales, marketing, other
```

⚠️ **Catatan penting**: pemecahan `distribution`/`project` MKO di atas didasarkan pada data faktur yang **sempat ada lalu di-reset** (DB transaksional kosong per 2026-07-09) — `freelancer`/`support` sengaja TIDAK dipecah dulu karena pola cabangnya kurang jelas dari data lama (ada indikasi campuran, mis. "SALES SUPPORT" polos vs "SALES SUPPORT JKT"). **Begitu data faktur diimpor ulang, verifikasi ulang pola channel→cabang dengan query nyata** sebelum menganggap struktur ini final — lihat `task/task004.md` untuk detail keputusan.

`channel_divisions` (mapping riil channel_name → kode) diisi manual lewat UI (form "Edit Mapping" di halaman Divisions) atau import CSV/XLSX per company — **tidak** di-seed hardcode (dulu 21 entries global `company_id=NULL` di versi awal fitur ini, sudah tidak relevan sejak `company_id` jadi wajib, dan sejak `branch_id` di-auto-derive dari histori invoice).

`dormant_bucket` tiap divisi **bisa diubah kapan saja** lewat halaman Divisions (Edit) tanpa perlu deploy — nilai di seed cuma titik awal.

---

## Implementation Notes

- **`code` di `divisions` bukan FK dari `channel_divisions.division`/`user_divisions.division`** — sengaja tetap varchar, lihat penjelasan di §Tabel `divisions` di atas
- **Pre-check duplikat di service (CRUD channel_divisions)**: `findChannelDivisionByName()` sebelum INSERT
- **`channel_name` UPPERCASE**: normalisasi di Zod schema
- **Soft delete `divisions`, hard delete `channel_divisions`**: divisi direferensikan RBAC & histori (soft delete), mapping channel tidak (hard delete aman)
- **Channel baru dari Accurate**: kalau ada channel_name baru yang belum di-map, customer tampil `division = null` — admin perlu tambah mapping manual atau import
- **`GET /values` tanpa permission**: sengaja, cuma balikin kode kategoris (tidak sensitif), beda dari `GET /` yang balikin `channel_name` asli dan tetap terproteksi

---

## Halaman Frontend

**`/settings/divisions`** — 1 halaman, 2 lapis (mirror pola Companies + Branch):

- **List utama** = katalog `divisions` (Code, Name, Company, Branch, Dormant Bucket, Status) — permission `settings.division:*`
- **Tombol "Add Division"** → dialog `DivisionDialog.tsx` (Company → Branch opsional → Code → Name → Dormant Bucket → Active)
- **Row action "Edit Mapping"** → dialog nested `DivisionMappingSection.tsx`, scoped ke 1 divisi (company+branch+code sudah fix dari row) — kelola `channel_divisions` (list channel_name + delete, inline-add dari channel belum ter-mapping) — permission `settings.channel.division:*`

Filter dropdown Division di 9+ halaman laporan/metric (`useScopedCompanyFilter`/`ScopeFilterFields`) dan RBAC picker assign user (`AssignmentTreePicker`) sama-sama konsumsi `useDivisionOptions(companyId, branchId)` → `GET /settings/channel-divisions/values` — dinamis mengikuti company+branch yang dipilih.

---

## References

- **Backend**: `backend/src/features/settings/{divisions,channel-divisions}.*`
- **DB Schema**: `backend/src/db/schema/schema-company.ts` (`divisions`), `schema-product.ts` (`channel_divisions`)
- **Digunakan oleh**: `features/customers.md` (status logic + division filter), `config/threshold.ts` (dormant bucket)
- **Frontend Page**: `frontend/src/pages/Settings/Divisions/{index.tsx,components/DivisionDialog.tsx,components/DivisionMappingSection.tsx}`
- **Frontend API**: `frontend/src/api/{divisions,channelDivisions}.api.ts`
- **Frontend Hook**: `frontend/src/hooks/{useDivisions,useChannelDivisions,useDivisionOptions,useScopedCompanyFilter}.ts`
- **RBAC picker**: `frontend/src/pages/Users/components/AssignmentTreePicker.tsx`
- **Seed**: TIDAK ADA lagi — `seedDivisions()` dihapus total (task004 §8), katalog auto-create dari mapping channel
- **Task docs**: `docs-v2/task/task004.md` (backend dinamis), `docs-v2/task/task005.md` (frontend, 4 session)

---

**Last Updated**: 2026-07-09
**Status**: ✅ Production Ready (backend + frontend Session A/B/C/D, import bulk branch-aware via auto-derive branch + auto-create kode divisi, `seedDivisions()` dihapus). Backlog: bulk import user belum dukung branch/division (ditunda atas keputusan user).
