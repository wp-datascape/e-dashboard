# high-margin-products.md — Fitur Product High Margin (Dynamic)

> Status: **DONE** — Implementasi selesai 2026-06-26.
> Dibuat: 2026-06-26 | Sesi: 17 | Updated: 2026-06-26

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
| GET | `/` | List semua mapping (filter: company_id, period YYYY-MM, active_only) |
| POST | `/` | Tambah mapping baru |
| PATCH | `/:id` | Update (effective_until, note) |
| PATCH | `/:id/deactivate` | Set effective_until = hari ini |
| DELETE | `/:id` | Hapus mapping |

**Endpoints pendukung (untuk dropdown di form):**

| Method | Path | Deskripsi |
|--------|------|-----------|
| GET | `/api/v1/products` | List produk lokal per company |
| GET | `/api/v1/products/categories` | List kategori lokal per company |

---

## 5. Frontend — Halaman `/settings/high-margin`

**Filter bar:** Company (Select) + Period bulan (type=month) + Active Only (Switch)

**Tabel:** target (nama produk/kategori + ikon tipe), tipe chip, effective_from, effective_until (italic "ongoing" jika null), status chip (active/inactive), note, action menu

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
| Drawer riwayat beli | `frontend/src/pages/ProductsHighMargin/components/UpsellCustomerDrawer.tsx` |

### 8.3 Catatan penting — jangan tertukar dua jenis "margin"

| | Sumber | Fungsi |
|---|---|---|
| **Status "High Margin"** (kategori/produk ditandai target upsell) | Setting manual admin di `high_margin_products` (§2.2) | Menentukan kategori mana yang jadi acuan "belum dibeli" di atas |
| **`gp_margin_percent`** yang tampil di tabel/drawer (mis. chip warna di `UpsellCustomerDrawer.tsx`) | Dihitung real-time dari data invoice (`total_gp / total_revenue`) | Cuma informasi tampilan, **tidak mempengaruhi** apakah kategori dianggap "High Margin" |

Produk dengan margin aktual tinggi sekalipun **tidak akan** muncul sebagai target upsell kalau tidak pernah didaftarkan admin di Settings → High Margin. Sebaliknya, produk yang sudah didaftarkan tetap dianggap "High Margin" walau margin aktualnya sedang turun — sampai admin men-deactivate mapping-nya.
