# high-margin-products.md — Fitur Product High Margin (Dynamic)

> Status: **DONE** — Implementasi selesai 2026-06-26. Filter default "All Companies" + company scoping ditambah sesi 34. Drill-down produk (klik baris kategori tab Penetrasi) + fix resolusi level-kategori vs level-produk ditambah 2026-07-26 (task007/task008, lihat §9).
> Dibuat: 2026-06-26 | Sesi: 17 | Updated: 2026-07-26 (task008)

---

## 1. Latar Belakang & Tujuan

`product_categories.is_high_margin` sebelumnya adalah boolean **statis** — sekali di-set, tidak ada histori kapan berubah dan tidak bisa berbeda antar periode.

Kebutuhan bisnis:
- Product A bisa high margin di bulan Juni, tapi bukan di Agustus
- Product B bisa jadi high margin di Agustus menggantikan A
- **Histori tidak boleh hilang** — semua penanda high margin per periode harus bisa di-query ulang

Solusi: tabel `products` (normalisasi nama produk dari faktur) + tabel `high_margin_products` (time-based mapping) + halaman setting untuk input dinamis dari user.

---

## 1.1 Prinsip Arsitektur Data

Aplikasi memiliki **dua sumber data** yang mengalir melalui **pipeline upsert yang sama**:

| Sumber | Cara Kerja |
|--------|-----------|
| **Import manual** | Upload file CSV/Excel sesuai template faktur penjualan |
| **Sinkron Accurate** | Fetch via Accurate API (jika digunakan) |

### Aturan Dedup — Invoice
- Jika nomor SI belum ada → **INSERT**
- Jika nomor SI sudah ada → **UPDATE** header + hapus items lama + insert items baru
- Tidak ada duplikat — satu nomor SI = satu baris di `invoices`

### Aturan ID — Master Data
**Semua ID di-generate oleh sistem kita, bukan dari Accurate.** Data Accurate tidak clean.

| Entitas | Dedup Key | ID Accurate |
|---------|-----------|-------------|
| `customers` | `UPPER(customer_name) + company_id` | Diabaikan |
| `product_categories` | `UPPER(name) + company_id` | Diabaikan |
| `products` | `UPPER(product_name) + company_id` | Tidak disimpan |
| `invoices` | `invoice_number + company_id` | Diabaikan |

### Insight Data Accurate
Kategori di Accurate sangat granular — satu kategori = satu model perangkat.
Contoh: `Z. SPARE PART RECEIPT PRINTER THERMAL MATRIX POINT TM P3250` adalah **kategori**, bukan nama produk.
Produk individual = item baris faktur (kolom "Nama Barang") di dalam kategori tersebut.

---

## 2. Perubahan Database

### 2.1 Tabel Baru: `products`

```sql
CREATE TABLE products (
  id                  serial PRIMARY KEY,
  company_id          integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_name        varchar(255) NOT NULL,
  product_category_id integer REFERENCES product_categories(id) ON DELETE SET NULL,
  created_at          timestamp with time zone DEFAULT now() NOT NULL,
  updated_at          timestamp with time zone DEFAULT now() NOT NULL
);
CREATE UNIQUE INDEX uq_products_name_company ON products (company_id, product_name);
```

Diisi oleh import parser — setiap baris item faktur upsert ke sini. ID sistem, bukan Accurate.

### 2.2 Tabel Baru: `high_margin_products`

```sql
CREATE TABLE high_margin_products (
  id                   serial PRIMARY KEY,
  company_id           integer NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  product_id           integer REFERENCES products(id) ON DELETE CASCADE,
  product_category_id  integer REFERENCES product_categories(id) ON DELETE CASCADE,
  effective_from       date NOT NULL,
  effective_until      date,           -- null = masih aktif
  note                 text,
  created_by           integer REFERENCES users(id) ON DELETE SET NULL,
  created_at           timestamp with time zone DEFAULT now() NOT NULL,
  updated_at           timestamp with time zone DEFAULT now() NOT NULL,
  CHECK (product_id IS NOT NULL OR product_category_id IS NOT NULL)
);
```

**Logika query "high margin periode bulan X":**
```sql
WHERE company_id = :company_id
  AND effective_from <= :last_day_of_month
  AND (effective_until IS NULL OR effective_until >= :first_day_of_month)
```

### 2.3 Modifikasi: `invoice_items`

- `product_id integer NOT NULL` ditambahkan — wajib, tidak nullable
- `product_name varchar` **dihapus** — redundan dengan JOIN ke tabel `products`

### 2.4 Modifikasi: `product_categories`

- `is_high_margin boolean` **dihapus** — semua logika high margin pindah ke `high_margin_products`

---

## 3. Backend — Import Service Flow

```
Terima baris (CSV parser atau Accurate API response)

  → upsertProductCategory(category_name, company_id)            → product_category_id
  → upsertProduct(item_name, company_id, product_category_id)   → product_id  ← BARU
  → upsertCustomer(customer_name, company_id)                   → customer_id

  → invoiceKey = UPPER(invoice_number)
  → invoiceId  = batchInvoiceCache.get(invoiceKey)

  if invoiceId not in cache:
    existingInvoice = findInvoiceByNumber(companyId, invoiceNumber)

    if existingInvoice:
      updateInvoice(existingInvoice.id, headerData)
      if invoiceId not in resetItemsCache:
        deleteInvoiceItemsByInvoiceId(existingInvoice.id)  ← hapus items lama sekali
        resetItemsCache.add(invoiceId)
      invoiceId = existingInvoice.id
    else:
      invoice = createInvoice(...)
      invoiceId = invoice.id

    batchInvoiceCache.set(invoiceKey, invoiceId)

  → createInvoiceItem({ invoice_id: invoiceId, product_id, product_category_id, ... })
  → updateInvoiceTotals(invoiceId)
```

**batchInvoiceCache** — handle multi-item dalam satu file (baris ke-2+ SI yang sama langsung pakai invoiceId dari cache)

**resetItemsCache** — pastikan `deleteInvoiceItemsByInvoiceId` dipanggil tepat **sekali** per invoiceId saat re-import, meski ada N baris produk untuk SI yang sama

---

## 4. Backend — Settings High Margin

**Endpoints:** `/api/v1/settings/high-margin`

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/` | List mapping (filter: `company_id` — `number\|'all'`, default `'all'`; `period` YYYY-MM; `active_only`) |
| POST | `/` | Tambah mapping baru |
| PATCH | `/:id` | Update (effective_until, note) |
| PATCH | `/:id/deactivate` | Set effective_until = hari ini |
| DELETE | `/:id` | Hapus mapping |

**Company scoping (sesi 34):** `GET /` dan `POST /` pakai `resolveCompanyScope()` (`backend/src/middleware/auth.ts`, helper yang sama dipakai customers/transactions/metrics/products). Superadmin + `company_id='all'` → tanpa filter (lihat semua company). Non-superadmin + `'all'` → otomatis di-scope ke `companyIds` miliknya sendiri. `company_id` spesifik di luar akses (baik di query GET maupun body POST) → `403 FORBIDDEN`. Response `GET /` sekarang include `company_name` (JOIN ke `companies`) supaya frontend bisa tampilkan kolom Company saat data gabungan lintas company.

Sebelum sesi 34: `company_id` di GET wajib angka (tidak ada mode `'all'`), dan `POST /` sama sekali tidak divalidasi terhadap akses company user (siapa pun yang punya permission `settings.product:create` bisa create mapping untuk company mana pun).

**Endpoints pendukung (untuk dropdown di form):**

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/v1/products` | List produk lokal per company |
| GET | `/api/v1/products/categories` | List kategori lokal per company |

---

## 5. Frontend — Halaman `/settings/high-margin`

**Filter bar:** Company (Select, default **"All Companies"** — buka halaman langsung tampil data sesuai company yang jadi hak akses user, tidak perlu pilih manual) + Period bulan (type=month) + Active Only (Switch)

**Tabel:** company (nama company, kolom baru sesi 34), target (nama produk/kategori + ikon tipe), tipe chip, effective_from, effective_until (italic "ongoing" jika null), status chip (active/inactive), note, action menu

Tombol "Add Mapping" otomatis disabled saat filter "All Companies" dipilih — create mapping butuh company spesifik (dropdown produk/kategori di dialog juga bergantung pada satu company).

**Action menu per baris:** Edit (effective_until + note), Deactivate (set effective_until = today), Delete

**Dialog Form (Create):**
- Company selector
- Target: MUI `Autocomplete` dengan `disablePortal`, grouped (Kategori / Produk), searchable, maxHeight 220px — tidak ada "Target Type" selector terpisah, type di-derive dari option yang dipilih
- Effective From (date input)

**Dialog Form (Edit):**
- Readonly info: target name + effective_from
- Editable: effective_until (date input), note

---

## 6. Keputusan yang Diambil

| # | Keputusan |
|---|-----------|
| 1 | `product_id` dan `product_category_id` tidak boleh keduanya null — CHECK constraint di DB |
| 2 | Overlap periode untuk produk/kategori yang sama: tidak dicegah di DB, validasi di service layer jika diperlukan |
| 3 | `product_name` di `invoice_items` **dihapus** (bukan disimpan sebagai backup) — JOIN ke `products` adalah satu-satunya source of truth |
| 4 | `invoice_settings` tidak jadi dibuat — `high_margin_products` IS the setting, tidak perlu tabel terpisah |
| 5 | Halaman masuk Group 5 Admin, route `/settings/high-margin`, key `settings-high-margin` |
| 6 | Products diisi via import parser, bukan Accurate sync terpisah |

---

## 7. Yang Tidak Berubah

- `business_configs` — tidak dihapus, tetap untuk konfigurasi generik (dormant threshold, Accurate credentials, dll)
- `item_classification_rules` — tidak berubah, untuk klasifikasi item_type (unit/consumable/dll), bukan high margin
- Pattern `Route → Handler → Service → Repository` — konsisten dengan pola yang sudah ada
- `batchInvoiceCache` untuk multi-item dalam satu batch — tidak berubah, hanya ditambah `resetItemsCache`

---

## 8. Fitur "Upsell Targets" — Logika Rekomendasi

Halaman `/products/high-margin` punya 2 tab: **Penetrasi Kategori** dan **Upsell Targets**. Tab kedua menghasilkan daftar customer yang direkomendasikan untuk ditawari produk high margin. Endpoint: `GET /metrics/high-margin-penetration/customers`.

### 8.1 Konsep sederhana (bahasa awam)

Anggap ada 3 kategori yang sudah ditandai "High Margin" oleh admin: **A, B, C**.

1. **Cek riwayat belanja tiap customer** — kategori apa yang sudah/belum dibeli dalam window aktif (3/6/12 bulan terakhir).

   | Customer | Sudah beli | Belum beli |
   |---|---|---|
   | Budi | A | B, C |
   | Sari | A, B | C |
   | Andi | A, B, C | — (sudah lengkap → **tidak dimunculkan**) |

2. **Cari tahu jenis customer yang biasa beli tiap kategori** — dari data transaksi riil: kategori B paling banyak dibeli oleh business unit "Toko Retail", kategori C paling banyak dibeli oleh "Proyek". Ini seperti pola "customer yang mirip kamu biasanya beli barang ini juga".

3. **Cocokkan jenis customer dengan kategori yang belum dia beli**:
   - Budi jenisnya "Toko Retail", belum beli B & C. B memang biasa dibeli "Toko Retail" (jenis Budi) → **tawaran B masuk akal buat Budi**. C biasa dibeli "Proyek" (bukan jenisnya) → kurang nyambung, tidak dihitung sebagai peluang kuat.
   - Sari jenisnya "Proyek", belum beli C. C memang biasa dibeli "Proyek" (jenis Sari) → **cocok, peluang kuat**.

4. **Urutkan** — customer dengan paling banyak "tawaran yang masuk akal" (cocok dengan jenisnya) ditaruh di atas. Kalau nilainya sama, yang belanjanya paling besar per bulan didahulukan.

Intinya cuma dua hal digabung: **"dia belum beli apa"** + **"barang itu cocok tidak dengan jenis customer-nya"**.

### 8.2 Alur teknis

Sama seperti tab Penetrasi Kategori, langkah pertama tetap resolusi `hm_cats` (lihat §2.2) — kategori HM aktif untuk periode & company yang difilter.

```
1. hm_cats            → daftar kategori HM aktif (dari high_margin_products, lihat §2.2)
2. customer_data       → per customer: kategori apa yang sudah dibeli (cat_ids_bought)
                          dalam window aktif, + avg_monthly_revenue, last_invoice_date
3. hm_affinity         → per kategori HM: top-2 business_unit dengan jumlah distinct
                          buyer terbanyak (dari data invoice riil)
4. missing categories  = hm_cats MINUS cat_ids_bought
5. relevance_score     = COUNT(missing categories yang business_unit top-buyer-nya
                          == business_unit customer ini)
                          → dipakai untuk ORDER BY saja, TIDAK dikirim ke response
6. exclude customer yang cat_ids_bought sudah mencakup semua hm_cats (tidak ada yang missing)
7. ORDER BY relevance_score DESC, avg_monthly_revenue DESC
```

**File terkait:**

| Layer | File |
|---|---|
| Query | `backend/src/features/metrics/repository/high-margin-penetration.repository.ts` → `fetchUpsellTargets()` |
| Service | `backend/src/features/metrics/metrics.service.ts` → `getUpsellTargets()` (strip `relevance_score` sebelum dikirim) |
| Route | `backend/src/features/metrics/metrics.route.ts` → `GET /high-margin-penetration/customers` |
| Frontend tab | `frontend/src/pages/ProductsHighMargin/index.tsx` → `UpsellTargetsTab` |
| Dialog riwayat beli | `frontend/src/pages/ProductsHighMargin/components/UpsellCustomerDialog.tsx` (dulu `UpsellCustomerDrawer.tsx`, dikonversi drawer→dialog sesi 34) |

### 8.3 Catatan penting — jangan tertukar dua jenis "margin"

| | Sumber | Fungsi |
|---|---|---|
| **Status "High Margin"** (kategori/produk ditandai target upsell) | Setting manual admin di `high_margin_products` (§2.2) | Menentukan kategori mana yang jadi acuan "belum dibeli" di atas |
| **`gp_margin_percent`** yang tampil di tabel/dialog (mis. chip warna di `UpsellCustomerDialog.tsx`) | Dihitung real-time dari data invoice (`total_gp / total_revenue`) | Cuma informasi tampilan, **tidak mempengaruhi** apakah kategori dianggap "High Margin" |

Produk dengan margin aktual tinggi sekalipun **tidak akan** muncul sebagai target upsell kalau tidak pernah didaftarkan admin di Settings → High Margin. Sebaliknya, produk yang sudah didaftarkan tetap dianggap "High Margin" walau margin aktualnya sedang turun — sampai admin men-deactivate mapping-nya.

---

## 9. Drill-down Produk di Tab "Penetrasi Kategori" + Fix Resolusi Level Kategori vs Level Produk (task007/task008, 2026-07-26)

> Baca juga: `docs-v2/task/task007.md`, `docs-v2/task/task008.md`

### 9.1 Dua Level Penandaan HM — Kenapa Penting

`high_margin_products` (§2.2) bisa ditandai di **dua level berbeda**, dibedakan dari kolom mana yang diisi:

| Level | Kolom diisi | Efek |
|---|---|---|
| **Kategori** | `product_category_id` | **SEMUA** produk di kategori itu otomatis dianggap High Margin |
| **Produk** | `product_id` | **HANYA** produk spesifik itu — produk sibling lain di kategori yang sama **TIDAK** ikut, meski kategorinya sendiri tetap muncul di laporan penetrasi (karena laporan grouping by kategori, cukup 1 produk ditandai supaya kategori itu "punya" penetrasi HM) |

Sebelum diperbaiki, beberapa query (baris kategori di tabel utama tab Penetrasi, drill-down klik kategori) menyamakan **"kategori punya ≥1 produk yang ditandai HM"** dengan **"anggap semua produk kategori itu HM"** — benar untuk kasus penandaan level-kategori, tapi salah untuk kasus level-produk (ikut menjumlah transaksi produk sibling yang sama sekali tidak ditandai).

### 9.2 Fix — Resolusi Mirror di Dua Tempat

**`backend/src/features/metrics/repository/high-margin-penetration.repository.ts`** (`fetchHmDetail`, angka baris kategori di tabel utama tab Penetrasi):
- `hmCatsCte` dipecah jadi 3 CTE: `hm_cats` (union semua, tetap dipakai `fetchUpsellTargets` — grouping per kategori, tidak kena bug ini), `hm_cat_level` (kategori ditandai langsung), `hm_product_level` (produk spesifik ditandai).
- Filter transaksi (`hm_items`) jadi `ii.product_category_id IN (hm_cat_level) OR ii.product_id IN (hm_product_level)` — bukan lagi `product_category_id IN (hm_cats)` tunggal.

**`backend/src/features/metrics/repository/category-products.repository.ts`** (`fetchCategoryProducts`, drill-down daftar produk saat klik baris kategori):
- CTE `hm_products` resolve ke `product_id` (bukan `product_category_id` seperti CTE di atas) — union dari: produk ditandai langsung, ATAU kategorinya sendiri ditandai (semua produk ikut).
- Param baru `onlyHighMargin` (service/handler: `only_high_margin`, query opsional boolean) — kalau `true`, filter `ii.product_id IN (SELECT product_id FROM hm_products)`. Default `false`/tidak dikirim → perilaku lama (semua produk kategori), supaya 2 pemakai lain dialog **tidak berubah**:

| Pemakai `CategoryProductsDialog` | `onlyHighMargin`? |
|---|---|
| Tab "Penetrasi Kategori" (klik baris kategori) | **`true`** — cuma tampilkan produk yang benar-benar ditandai HM |
| Tab "Target Upsell", chip "Belum Beli High Margin" | `false` (tidak diubah, di luar scope) |
| Halaman `/products` — drill-down kategori umum | `false` (tidak terkait high margin) |

- Kolom `is_high_margin` (boolean) ditambah ke tiap baris hasil query (pakai CTE `hm_products` yang sama, terlepas dari `onlyHighMargin` aktif atau tidak) — badge "High Margin" muncul per produk di tabel drill-down, berguna khususnya di mode `onlyHighMargin=false` yang menampilkan produk campuran (HM & bukan).
- Response `fetchCategoryProducts` sekarang `{ rows, summary }` — `summary` dihitung query **terpisah** (CTE sama, tanpa `GROUP BY` per produk) supaya tetap balikin 0 (bukan hilang/undefined) kalau hasil per-produk kosong. Diteruskan sampai ke frontend lewat `PaginationMeta.summary` (generik, opsional — `backend/src/utils/response.ts`, `frontend/src/types/api.ts`).

**Frontend (`CategoryProductsDialog.tsx`)** — kalau `highMarginOnly` prop aktif, kartu summary (Total Revenue/GP/Margin/dst di atas tabel drill-down) pakai `meta.summary` (agregat produk yang sudah difilter), **bukan** `category.total_revenue` dkk yang dikirim caller (itu angka kategori UTUH, semua produk — beda dari daftar produk terfilter di bawahnya, sebelumnya kartu & tabel kelihatan tidak sinkron).

### 9.3 Verifikasi

Cross-check manual lewat query SQL langsung ke DB: kategori "RECEIPT PRINTER THERMAL KASSEN" (10 produk, cuma 1 — `KASSEN BTP 3050 UE` — ditandai HM di level produk). Angka versi lama (semua 10 produk) vs versi fix (cuma 1 produk) beda signifikan (mis. revenue Rp1.8M → Rp115.6jt), mengonfirmasi bug & fix-nya. `bunx tsc --noEmit` backend+frontend bersih, `bun test` backend 73 pass/0 fail.
