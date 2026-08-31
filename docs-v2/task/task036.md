# Task 036 — Bulk Import Mapping High Margin Products

> **STATUS: SELESAI (lokal) — sudah diimplementasi dan diverifikasi end-to-end**
> **via browser + query DB langsung (2026-08-31). Belum di-commit/deploy,**
> **menunggu instruksi eksplisit.**

## Context

Halaman Settings → High Margin (`/settings/high-margin`, lihat
`docs-v2/features/high-margin-products.md`) cuma bisa tambah 1 mapping
produk/kategori per aksi lewat dialog form. User butuh cara lebih efisien
untuk input banyak mapping sekaligus ("produk fokus").

## Temuan riset (diverifikasi via kode, bukan tebakan)

**Endpoint create saat ini** — `POST /settings/high-margin`
(`highMarginMutationRateLimit` di `high-margin.route.ts`) dibatasi rate
limit per user. Looping banyak request dari frontend untuk bulk create
akan lambat dan bisa kena limit — bukan pendekatan yang tepat, perlu
endpoint bulk tersendiri (satu request, satu transaksi DB).

**Data model** (`high_margin_products` + `high_margin_product_divisions`,
`docs-v2/features/high-margin-products.md` §2.2/§10.1):
- Satu mapping = `product_id` ATAU `product_category_id` (CHECK constraint,
  tidak boleh dua-duanya kosong), keduanya FK ke tabel yang **company-scoped**
  (`products.company_id`/`product_categories.company_id`).
- WAJIB minimal 1 divisi ter-assign lewat junction table
  `high_margin_product_divisions` — tidak ada state "company-wide tanpa
  divisi spesifik" (keputusan final task017, jangan ditanya ulang).
- Divisi `key='intercompany'` DI-EXCLUDE dari pilihan assignment.
- `effective_from` wajib, `effective_until` opsional (null = masih aktif).

**Konsekuensi langsung ke desain bulk import** (instruksi user, 2026-08-31):
1. **Company wajib dipilih dulu** — mapping ini company-scoped total (produk/
   kategori & divisi keduanya milik 1 company), sama seperti tombol "Add
   Mapping" yang sudah ada sekarang (`disabled={companyId === 'all'}`
   di `Settings/HighMargin/index.tsx`). Import HARUS punya syarat sama:
   tidak bisa jalan tanpa company spesifik dipilih.
2. **Isian pakai NAMA, bukan ID** — user tidak tahu/tidak perlu tahu
   `product_id`/`category_id` internal. Validasi by-name, case-insensitive,
   pola SAMA PERSIS dedup existing di seluruh app (`UPPER(name) + company_id`,
   `docs-v2/features/high-margin-products.md` §1.1).
3. **Template harus ada legend daftar divisi** — supaya user tahu persis
   nama divisi valid apa saja yang boleh diisi di kolom Divisi (per company,
   karena set divisi bisa beda antar company/beda antar sesi konfigurasi).

**Precedent yang di-mirror SEBAGIAN** — Import Klasifikasi
(`backend/src/features/import/classification.{route,handler,service}.ts`,
`docs-v2/features/import.md`): pola bulk-import "kecil" (bukan skala
invoice/SSE streaming) yang cocok untuk parsing+validasi-nya:
- `GET /import/classification/template` → download XLSX kosong siap isi.
- `POST /import/classification` (multipart: `file` + `company_id`) →
  parse (XLSX via `xlsx` lib atau CSV via `papaparse`, cari baris header
  dulu, bukan asumsi baris 1), validasi per baris terhadap "kamus" yang
  di-fetch SEKALI di luar loop (`validItemTypeKeys` di kode itu — pola yang
  sama persis dipakai untuk kamus nama produk/kategori/divisi di sini).

Fitur ini SENGAJA MENYIMPANG dari precedent itu di satu hal (instruksi
user, 2026-08-31): classification langsung commit begitu file di-upload
(1 langkah). Fitur ini WAJIB 2 langkah terpisah — preview (parse+validasi
saja, TANPA tulis ke DB) lalu commit (baru insert, setelah user review) —
lihat §"Alur UI" & §"Backend" di bawah.

**Lokasi entry point — REUSE menu Import yang sudah ada, bukan halaman
Settings High Margin** (dikonfirmasi user, 2026-08-31). Ditemukan lewat
riset kode: `frontend/src/pages/Import/components/UploadFileCard.tsx`
SUDAH jadi hub terpusat multi-tipe import — `type ImportType = 'faktur' |
'divisi' | 'klasifikasi' | 'user'`, satu dropdown pilih tipe, tiap tipe
punya Company selector + tombol Download Template + mutation sendiri
dalam SATU komponen. Ini persis infrastruktur yang dibutuhkan — cukup
tambah 1 `ImportType` baru (draft: `'high_margin'`), BUKAN bikin tombol
upload terpisah di `Settings/HighMargin/index.tsx` (hindari duplikasi UI
pola import, sudah ditegur user 2x soal ini di sesi-sesi lalu — lihat
`[[feedback_centralize_ui_no_duplication]]`).

## Desain (draft, BELUM final — direview lagi sebelum eksekusi)

### Kolom template Excel

| Kolom | Wajib? | Keterangan |
|---|---|---|
| Tipe | Ya | `Produk` atau `Kategori` (menentukan target `product_id` vs `product_category_id`) |
| Nama | Ya | Nama persis produk/kategori (case-insensitive, dicocokkan ke company yang dipilih) |
| Divisi | Ya | Nama divisi, pisah koma kalau lebih dari 1 (mis. `Distribution, Project`) — dicocokkan ke legend |
| Tanggal Mulai | Ya | `effective_from`, format YYYY-MM-DD |
| Tanggal Selesai | Tidak | `effective_until`, kosong = masih aktif |
| Catatan | Tidak | `note` |

**Sheet ke-2 (legend)** — daftar nama divisi valid untuk company yang
dipilih (exclude `intercompany`), reference read-only, bukan kolom yang
diisi. Konsekuensi: template TIDAK generik lagi (beda per company, sama
seperti template harus tahu company dulu) — download template WAJIB
lewat endpoint yang terima `company_id`, bukan file statis.

### Alur UI — 2 TAHAP: preview lalu commit (instruksi user, 2026-08-31)

Beda dari 3 tipe import lain di `UploadFileCard.tsx` (langsung commit
begitu upload) — tipe `high_margin` WAJIB berhenti dulu di tampilan
review, tidak langsung tulis ke DB begitu file dipilih.

1. Di `/import`, dropdown tipe: tambah opsi baru (draft label
   "Mapping High Margin").
2. Pilih tipe itu → field Company muncul (WAJIB dipilih, sama pola field
   company utk tipe divisi/klasifikasi — tidak bisa lanjut tanpa company
   spesifik, karena produk/kategori/divisi yang dicocokkan semuanya
   company-scoped).
3. Tombol "Download Template" → fetch `company_id` aktif, dapat XLSX
   dengan sheet ke-2 berisi legend nama divisi company itu.
4. Upload file terisi → **BUKAN langsung commit** — submit ke endpoint
   preview, hasilnya tabel review muncul di halaman (bukan dialog
   terpisah, supaya baris bisa banyak & butuh scroll/paginasi seperti
   tabel lain di app ini — pakai `ResponsiveListView`).
5. Tabel review: 1 baris per baris file, kolom Tipe/Nama/Divisi/Tanggal
   sama seperti file + kolom Status:
   - **Sukses** (hijau) — nama & divisi valid, tidak ada mapping aktif
     yang bentrok.
   - **Konflik** (kuning/warning) — nama & divisi valid, TAPI ada mapping
     AKTIF lain dengan produk/kategori+divisi yang sama, periode overlap.
     Baris ini tampil **2-baris-berdampingan** (data lama yang sudah ada
     di sistem vs data baru dari file), dengan pilihan per baris
     (radio/toggle, default: **Pertahankan yang Lama** — fail-safe, tidak
     mengubah apa pun kalau user tidak sadar/tidak sempat pilih):
     - **Pertahankan yang Lama** — baris file ini di-SKIP total, tidak
       ada perubahan ke DB sama sekali utk kombinasi ini.
     - **Pakai yang Baru** — mapping baru dari file di-INSERT, DAN
       mapping lama yang bentrok otomatis di-NONAKTIFKAN: `effective_until`
       mapping lama di-set ke 1 hari sebelum `effective_from` mapping
       baru (pola sama persis tombol "Deactivate" yang sudah ada di
       `Settings/HighMargin/index.tsx`, cuma tanggalnya bukan "hari ini"
       tapi "sehari sebelum mapping baru mulai" — riwayat mapping lama
       TETAP tersimpan/tidak dihapus, cuma ditutup, konsisten dgn prinsip
       "histori tidak boleh hilang" §1 `high-margin-products.md`).
   - **Error** (merah) — nama produk/kategori/divisi tidak ditemukan,
     atau tanggal tidak valid. Baris ini TIDAK BISA di-terapkan sampai
     file diperbaiki & di-upload ulang.
6. Tombol "Terapkan" (aktif kalau minimal 1 baris Sukses, ATAU minimal 1
   baris Konflik yang sudah dipilih "Pakai yang Baru", ada) — klik →
   commit ke DB sesuai pilihan tiap baris (Sukses selalu masuk, Konflik
   sesuai toggle-nya, Error selalu di-skip). Tampilkan ringkasan hasil
   akhir (`X mapping ditambahkan, Y mapping lama dinonaktifkan`).
7. Refetch tabel mapping di halaman Settings High Margin
   (`useHighMargins` invalidate) supaya kalau user pindah ke sana
   langsung lihat data baru.

### Backend

- Route baru di bawah `high-margin.route.ts` (atau route import
  tersendiri, cek konvensi saat eksekusi):
  `GET /settings/high-margin/import/template?company_id=X`,
  `POST /settings/high-margin/import/preview` (multipart: file +
  company_id, TANPA tulis DB — return array baris + status),
  `POST /settings/high-margin/import/commit` (terima baris yang sudah
  divalidasi dari preview, WAJIB divalidasi ULANG di backend sebelum
  insert — jangan percaya begitu saja payload dari client, terutama
  karena ada jeda waktu antara preview & klik Terapkan yang bisa
  membuat data sudah berubah).
- Permission SAMA dengan create mapping biasa (`settings.product:create`)
  untuk endpoint commit; preview cukup `settings.product:view` (baca
  saja, belum menulis apa pun).
- Rate limit terpisah dari `highMarginMutationRateLimit` (didesain utk 1
  record per klik) — butuh limit sendiri yang wajar utk 1 file per klik.
- Validasi per baris (di luar loop, fetch sekali per request preview
  MAUPUN commit): kamus nama produk + kategori company itu (dari
  `products`/`product_categories`), kamus nama divisi company itu
  (exclude intercompany), DAN daftar mapping aktif company itu (utk
  deteksi status Konflik — overlap produk/kategori+divisi+periode).

## Keputusan final (hasil implementasi, 2026-08-31)

- Endpoint: `GET /settings/high-margin/import/template`,
  `POST /settings/high-margin/import/preview`,
  `POST /settings/high-margin/import/commit` — didaftarkan sebelum route
  `/` dan `/:id` di `high-margin.route.ts`.
- Payload commit: frontend kirim ulang baris hasil preview yang sudah
  dipilih user (bukan token staging). Backend commit tetap validasi ulang
  penuh (`target_id`/`division_ids`/`supersede_id` harus benar-benar milik
  `company_id` yang dikirim) sebagai pertahanan terhadap payload basi/
  dimodifikasi.
- Rate limit: preview 20x/5 menit per user (read-only, boleh longgar),
  commit 5x/5 menit per user (nulis ke DB, lebih ketat).
- Pesan error per baris: `"Baris N: <pesan>"` mengikuti gaya
  classification.service.ts.
- i18n: key baru di `import.json` namespace `form.hm*` (bukan
  `highMargin.json`, karena UI-nya berada di halaman Import, bukan halaman
  Settings High Margin).
- Definisi overlap (Konflik): produk/kategori sama + minimal 1 divisi
  beririsan + rentang tanggal beririsan (`effective_until IS NULL` =
  tak terbatas ke depan). Diverifikasi lewat kasus nyata: mapping lama
  `2026-01-01 s/d 2026-12-31` vs baris baru `2026-06-01 s/d 2026-06-30`
  terdeteksi Konflik dengan benar.
- Diverifikasi end-to-end via browser (Playwright) + query DB langsung:
  upload 3 baris (Sukses/Konflik/Error) → preview tampil benar → pilih
  "Pakai yang Baru" pada baris konflik → commit → DB menunjukkan mapping
  lama otomatis di-supersede (`effective_until` diset ke 1 hari sebelum
  `effective_from` baris baru) dan mapping baru masuk dengan benar, audit
  log tercatat lengkap termasuk `supersede_id`.
