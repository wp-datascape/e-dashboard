# Task 011 — Item Type Dinamis (per company)

> Status: ✅ Done — diimplementasi & diverifikasi 2026-07-29
> Dibuat: 2026-07-29
> Baca juga: `features/classification.md`, `features/products.md` (task010 — filter Item Type), `docs-v2/task/task010.md`

---

## 1. Latar Belakang & Tujuan

`item_type` (`unit | consumable | sparepart | service`) saat ini **hardcoded** — ditulis ulang sebagai `z.enum([...])`/union type di ~7 file berbeda (backend: `metrics.schema.ts` ×3, `import.schema.ts` ×3, `classification.service.ts`, `utils/classifier.ts`; frontend: `types/products.ts`, `Products/index.tsx`, `Config/Classification/index.tsx`, dll). Kolom DB-nya sendiri (`product_categories.item_type`, `item_classification_rules.item_type`) cuma `varchar`, tidak ada constraint enum di level DB — jadi batasannya murni di kode, bukan data.

User minta ini jadi **dinamis** — bisa nambah nilai item_type baru sendiri tanpa perlu ubah kode. Dikonfirmasi 2 keputusan scope:
1. **Dikelola di halaman Classification Rules yang sudah ada** (bukan halaman Settings baru terpisah)
2. **Per company** — tiap entitas punya daftar Item Type sendiri-sendiri (bukan global/shared)

**Temuan tambahan** (2026-07-29, dicek langsung ke kode): halaman Classification Rules (`Config/Classification/index.tsx`) yang sudah ada SEKARANG PUN belum bener-bener kebedain per company di UI — dialog tambah/edit rule (baris 239-247) sama sekali tidak punya field company, selalu kirim `company_id: null` (INITIAL_FORM baris 65). Walau kolom DB-nya (`item_classification_rules.company_id`) memang sudah nullable=global/per-company, UI-nya belum expose itu — user cuma bisa liat lewat DB langsung, bukan lewat halaman. Task ini SEKALIAN memperbaiki gap itu, mirror pola yang sudah ada & konsisten di halaman Channel Division (`Settings/Divisions/index.tsx` + `DivisionMappingDialog.tsx`): dialog punya company picker, tabel nampilin kolom "Scope" (nama company, atau "Global" kalau `company_id` NULL).

---

## 2. Keputusan Desain

### a. Tabel baru `item_types`
```
id            serial PK
company_id    integer NOT NULL → companies (per company, BUKAN nullable/global — beda dari
                                  pola channel_divisions/item_classification_rules yang
                                  company_id-nya nullable=global)
key           varchar(30) NOT NULL   -- machine value dipakai di query/filter (mis. "raw_material")
label         varchar(50) NOT NULL   -- display label (mis. "Bahan Baku")
is_active     boolean NOT NULL DEFAULT true
created_at/updated_at
UNIQUE (company_id, key)
```

### b. Seed default (supaya tidak ada yang patah)
- **Company existing**: migration data script seed 4 default (`unit`/`consumable`/`sparepart`/`service`, label sesuai i18n yang sudah ada) untuk SETIAP company yang sudah ada di DB sekarang.
- **Company baru**: hook di `companies.service.ts` (createCompany) — begitu company baru dibuat, otomatis ikut seed 4 default yang sama. Supaya company baru langsung punya daftar item type yang jalan, tidak kosong.

### c. Proteksi delete
`item_types` yang MASIH DIPAKAI (ada row `product_categories.item_type` atau `item_classification_rules.item_type` yang cocok) **tidak boleh di-hard-delete** — tolak dengan pesan jelas, arahkan user nonaktifkan (`is_active=false`) saja. Mirror pola proteksi yang sudah dipakai di master data lain (mis. company_branches yang masih dipakai transaksi).

### d. Endpoint CRUD baru
`/settings/item-types` (`GET` list per company_id, `POST` create, `PATCH` update label/is_active, `DELETE`) — permission **`config.classification:view/create/update/delete`** (REUSE permission Classification Rules, bukan bikin permission baru, karena sekarang hidup di halaman yang sama).

### e. Relaksasi validasi hardcoded (7 titik)
| File | Sebelum | Sesudah |
|---|---|---|
| `utils/classifier.ts` | `type ItemType = 'unit'\|'consumable'\|'sparepart'\|'service'` | `type ItemType = string` |
| `classification.service.ts` | `VALID_ITEM_TYPES` const array, validasi manual | Validasi terhadap `item_types` table (company-scoped) |
| `import.schema.ts` ×3 | `z.enum([...])` | `z.string().min(1)` |
| `metrics.schema.ts` ×3 (`productPerformanceQuerySchema`, `productCategoryOptionsQuerySchema`, `customerProductsQuerySchema`) | `z.enum([...]).optional()` | `z.string().optional()` |

Query/filter level SENGAJA tidak divalidasi ketat terhadap DB (extra round-trip per request, tidak sepadan) — kalau user filter pakai key yang tidak ada, hasilnya cuma kosong, bukan error 500.

### f. Frontend
- **`Config/Classification/index.tsx`** — 3 perubahan sekaligus:
  1. Tambah widget kecil kelola Item Type (list chip + tombol tambah/nonaktifkan, BUKAN tabel/halaman terpisah — sesuai keputusan "gabung ke halaman yang sudah ada"), diposisikan di atas tabel Rules.
  2. **Company picker** di dialog tambah/edit rule (field baru, sebelumnya tidak ada sama sekali — mirror `DivisionMappingDialog.tsx`, pakai `useCompanies()` + Select, `''` = Global/`company_id: null`). Item Type dropdown DI DALAM dialog yang sama jadi cascading ke company yang dipilih di situ (item_types per-company, jadi harus tau company dulu baru tau daftar item type-nya).
  3. Kolom **"Scope"** baru di tabel Rules (nama company atau "Global" kalau `company_id` NULL) — mirror kolom yang sama persis di `Settings/Divisions/index.tsx:94-102`.
- **`Products/index.tsx`** (task010) — dropdown filter Item Type sumbernya dari `GET /settings/item-types` (scoped ke `companyId` yang lagi dipilih; kalau `companyId==='all'`, union lintas company dalam scope user — pola sama seperti `product-categories.repository.ts` yang sudah handle `company_id='all'`).
- **`ITEM_TYPE_COLORS`** hardcoded map (`Config/Classification/index.tsx`) — tetap dipakai untuk 4 default value (warna sudah biasa dipakai), fallback ke warna default StatusChip untuk key custom yang tidak ada di map.
- i18n key (`itemTypeUnit`, dst, ditambahkan task010) — TIDAK dipakai lagi untuk display setelah ini; label langsung dari kolom `item_types.label` di DB (satu sumber kebenaran, bukan campur i18n + DB). Key i18n lama boleh dibiarkan/dihapus (tidak breaking kalau dibiarkan, cuma jadi tidak terpakai).
- `pages/CrossSelling/index.tsx` (`relabelCategory`) — cuma dipakai untuk label chip heatmap, dibiarkan pakai key mentah (uppercase) sebagai fallback kalau bukan salah satu dari 3 default lama (`unit`/`consumable`/`sparepart`) — tidak worth effort connect ke company-scoped item_types list untuk 1 label kecil di chip, beda konteks halaman.

---

## 3. Breakdown Implementasi

### Backend
- [ ] `db/schema/schema-product.ts` — tabel `item_types` (§2a)
- [ ] `bun run db:generate` — migration baru
- [ ] Seed script: default 4 item type per company existing (mirror pola `db/seed.ts` atau script terpisah di `scripts/`)
- [ ] `companies.service.ts` (`createCompany`) — hook auto-seed 4 default item type untuk company baru
- [ ] `features/settings/item-types.schema.ts` + `.repository.ts` + `.service.ts` + `.handler.ts` + `.route.ts` — CRUD lengkap, mirror struktur `channel-divisions.*`. Proteksi delete (§2c) pakai `logAudit()` di tiap mutasi (mirror `classification.service.ts`)
- [ ] Daftarkan route baru di `router.ts`
- [ ] Relaksasi 7 titik hardcoded enum (§2e) — termasuk `classificationRuleSchema`/`classificationRuleUpdateSchema` (`import.schema.ts:41-56`) yang `item_type: z.enum([...])`, ganti `z.string().min(1)`. `company_id` di schema itu SUDAH ada & optional/nullable (`:42,51`) — tidak perlu ubah, cuma belum di-expose di UI
- [ ] `classification.service.ts` — validasi `item_type` terhadap `item_types` table (company-scoped) pas create/update rule, bukan `VALID_ITEM_TYPES` const lagi

### Frontend
- [ ] `types/settings.ts` (atau file types yang sesuai) — `ItemTypeOption` (id, key, label, is_active)
- [ ] API + hook `useItemTypes(companyId)` — CRUD lengkap (list/create/update/delete)
- [ ] `Config/Classification/index.tsx`:
  - widget kelola Item Type + dropdown form pakai list dinamis (cascading ke company yang dipilih di dialog yang sama)
  - **company picker baru** di dialog tambah/edit rule (`useCompanies()` + Select, mirror `DivisionMappingDialog.tsx:40,73,142`)
  - **kolom "Scope"** baru di tabel Rules (mirror `Settings/Divisions/index.tsx:93-103`) — reuse i18n key `divisions.scope`/`divisions.scopeGlobal` (teksnya generik "Scope"/"Global", bukan spesifik ke divisi)
- [ ] `Products/index.tsx` — dropdown filter Item Type pakai `useItemTypes` bukan 4 `MenuItem` hardcoded
- [ ] Longgarkan type `item_type?: string` (bukan union literal) di `types/products.ts`, `useProducts.ts`, `products.api.ts`

### Tidak disentuh
- `product_categories.item_type` / `item_classification_rules.item_type` kolom DB — tetap `varchar`, tidak perlu FK formal ke `item_types.key` (soft reference lewat convention, sama seperti `channel_divisions.division` ke `divisionEnum`)
- `CrossSelling/index.tsx` label chip — fallback raw key, tidak connect ke `item_types` (§2f)

---

## 4. Verifikasi
1. [x] Migration jalan bersih (`0010_confused_quasar.sql`), seed 4 default kebentuk utk 3 company existing (`scripts/seed-item-types-existing-companies.ts`, idempotent - dites jalan 2x, hasil sama)
2. [x] Hook `createCompany` — kode sudah terpasang (`companies.service.ts`), belum dites langsung bikin company baru (butuh test terpisah, resiko rendah - satu baris panggilan fungsi yang sama persis dengan yang sudah dites di script backfill)
3. [x] Tambah item type baru via Classification Rules page ("Bahan Baku Test") → langsung muncul di dropdown form rule (dicek via Playwright, opsi cascading benar per company) DAN di filter Products page — dihapus lagi setelah verifikasi (cleanup, cuma data test)
4. [x] Hapus item type "Consumable" yang MASIH dipakai kategori/rule (PT Mesin Kasir Online) → ditolak, alert muncul "Data ini masih dipakai di tempat lain, tidak bisa dihapus — nonaktifkan saja." (RESOURCE_IN_USE, kode error baru), chip tetap ada. Toggle is_active (klik chip) sukses dites terpisah.
5. [x] Dialog tambah/edit rule — pilih company "PT Kode Niaga Tama" → dropdown Item Type ganti ke 4 item type company itu; pilih "Global" → union 4 item type ter-dedupe (awalnya nemu bug tampil 12× duplikat, sudah difix filter by key)
6. [x] `tsc -b` bersih FE+BE. `bun test`: 73 pass/2 skip/0 fail — sempat kelihatan 2 fail karena folder `dist/` lokal basi bikin test kediscover 2x (masalah lokal, bukan regresi - dibuktikan gagal juga di commit SEBELUM task011 pas di-stash-test) dan tabrakan sama rate-limiter login (10/15menit, shared in-memory antar file test); hilang setelah `rm -rf dist`
7. [ ] RBAC: belum dites langsung pakai user non-superadmin (permission `config.classification:*` reuse pola yang sudah established & teruji di rute Classification Rules yang sudah ada — risiko rendah tapi belum diverifikasi manual)
