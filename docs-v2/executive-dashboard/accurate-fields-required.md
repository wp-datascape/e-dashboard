# Data Requirements: 10 Metrics from Accurate Online

> **Tujuan:** Dokumentasi field/data yang diperlukan dari Accurate Online (CSV/Excel maupun API) untuk menghitung 10 metrik bisnis M1–M10.
> **Last updated:** 2026-06-24

---

## 1. Prerequisite — Data dari Accurate

### 1.1 Via CSV/Excel (File Export)

Report: **"Rincian Faktur Penjualan Laba"**

| No | Kolom Accurate | Field Internal | Tipe | Contoh |
|----|----------------|----------------|------|--------|
| 1 | Tanggal | `invoice_date` | Date | 2026-06-02 |
| 2 | Sales Invoice | `invoice_number` | String | SI.2026.06.02.007 |
| 3 | Pelanggan | `customer_name` | String | MITRA SATU SOLUSINDO, PT |
| 4 | Nama Kategori Barang & Jasa | `product_category` | String | MOBILE PRINTER RECEIPT KASSEN |
| 5 | Nama Barang | `product_name` | String | KASSEN MT 200VL |
| 6 | Total Harga | `revenue` | Number | 5648662 |
| 7 | Laba | `gross_profit` | Number | 1620879.169943 |

> **Catatan:** Kolom Kuantitas (7), @Harga (8), BPP/HPP (10), dan Cabang (4) tidak langsung digunakan di 10 metrik, tapi berguna untuk workbench lain (Product/Transaction) dan untuk klasifikasi item type.

### 1.2 Via API (Synchronous)

| Endpoint | Scope | Data yang Diambil |
|----------|-------|-------------------|
| `/api/sales-invoice` (list) | `sales_invoice_view` | Daftar faktur penjualan |
| `/api/item` (list) | `item_view` | Detail barang & kategori |
| `/api/customer` (list) | `customer_view` | Detail pelanggan & kode |

Mapping field API ke database:

| Field Database | API `/api/sales-invoice` | API `/api/item` | API `/api/customer` |
|----------------|------------------------|-----------------|---------------------|
| `invoice_number` | `number` | — | — |
| `invoice_date` | `transDate` | — | — |
| `customer_name` | `customerName` | — | `name` |
| `customer_code` | `customerNo` | — | `customerNo` |
| `product_category` | `detailItem[].itemCategoryName` | `itemCategoryName` | — |
| `product_name` | `detailItem[].detailName` | `name` | — |
| `item_type` | `detailItem[].itemType` | `itemType` (INVENTORY/SERVICE/GROUP) | — |
| `revenue` | `detailItem[].totalPrice` | — | — |
| `gross_profit` | hitung: `totalPrice - cost` | — | — |
| `quantity` | `detailItem[].quantity` | — | — |
| `unit_price` | `detailItem[].unitPrice` | `unitPrice` | — |

---

## 2. Per Metrik — Field yang Diperlukan

### M1 — Cross Selling Ratio

**Rumus:** Customer beli >1 kategori di period / Total Customer Aktif

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Filter period |
| `customer_name` | Pelanggan | `customerName` | Group per customer |
| `product_category` | Nama Kategori | `detailItem[].itemCategoryName` | Count distinct kategori per customer |
| **Tambahan sistem:** | | | |
| `item_type != consumable AND item_type != sparepart` | Klasifikasi 4-layer | `itemType != SERVICE` | Filter kategori non-jasa & non-consumable |
| `last_invoice_date` | Dihitung dari transaksi | Dihitung dari transaksi | Menentukan "Customer Aktif" |

### M2 — Average Product Category per Customer

**Rumus:** Total kategori unik terjual di period / Total Customer Aktif

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Filter period |
| `product_category` | Nama Kategori | `detailItem[].itemCategoryName` | Count distinct kategori |
| **Tambahan sistem:** | | | |
| `item_type != consumable AND item_type != sparepart` | Klasifikasi 4-layer | `itemType != SERVICE` | Filter non-jasa & non-consumable |
| `last_invoice_date` | Dihitung | Dihitung | Customer Aktif |

### M3 — Average Revenue per Existing Customer

**Rumus:** Total revenue existing customer di period / Jumlah existing customer yang transaksi

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Filter period |
| `customer_name` | Pelanggan | `customerName` | Group per customer |
| `revenue` | Total Harga | `detailItem[].totalPrice` | SUM revenue |
| **Tambahan sistem:** | | | |
| `first_invoice_date` | Dihitung | Dihitung | Menentukan "Existing" |

> **Catatan:** M3 menghitung SEMUA produk + jasa (tidak ada filter kategori).

### M4 — Average Gross Profit per Existing Customer

**Rumus:** Total gross_profit existing customer di period / Jumlah existing customer

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Filter period |
| `customer_name` | Pelanggan | `customerName` | Group per customer |
| `gross_profit` | Laba | `totalPrice - cost` | SUM gross_profit |
| **Tambahan sistem:** | | | |
| `first_invoice_date` | Dihitung | Dihitung | Existing customer |

### M5 — High Margin Product Penetration

**Rumus:** Existing customer aktif yang beli produk high margin / Total existing customer aktif

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Filter period |
| `customer_name` | Pelanggan | `customerName` | Identifikasi customer |
| `product_category` | Nama Kategori | `detailItem[].itemCategoryName` | Cocokkan kategori high margin |
| **Tambahan sistem:** | | | |
| `is_high_margin = true` | Set manual | Set manual | Dari `app_configs.high_margin_category_ids` |
| `first_invoice_date` | Dihitung | Dihitung | Existing |
| `last_invoice_date` | Dihitung | Dihitung | Aktif |

### M6 — Repeat Order Rate

**Rumus:** Existing customer aktif yang transaksi di period / Total existing customer aktif

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Filter period |
| `customer_name` | Pelanggan | `customerName` | Count distinct customer |
| **Tambahan sistem:** | | | |
| `first_invoice_date` | Dihitung | Dihitung | Existing |
| `last_invoice_date` | Dihitung | Dihitung | Aktif |

### M7 — Customer Expansion Rate

**Rumus:** Existing customer aktif dengan spending naik vs period sebelumnya / Total existing customer aktif

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Filter period saat ini & sebelumnya |
| `customer_name` | Pelanggan | `customerName` | Group per customer |
| `revenue` | Total Harga | `detailItem[].totalPrice` | SUM revenue 2 periode |
| **Tambahan sistem:** | | | |
| `first_invoice_date` | Dihitung | Dihitung | Hanya existing (customer baru excluded) |

> **PENTING:** Butuh data transaksi dari 2 periode bulan (current + previous). Hanya hitung customer yang transaksi di KEDUA periode.

### M8 — Dormant Customer Rate

**Rumus:** Jumlah existing customer dormant / Total existing customer

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Menentukan `last_invoice_date` |
| `customer_name` | Pelanggan | `customerName` | Per-customer |
| **Tambahan sistem:** | | | |
| `dormant_threshold_months` | `app_configs` (default 3) | Sama | Ambang batas dormant |

### M9 — Dormant Customer Value

**Rumus per customer:** AVG monthly revenue (histori sebelum dormant) × Jumlah bulan dormant

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Histori & hitung bulan dormant |
| `customer_name` | Pelanggan | `customerName` | Per-customer |
| `revenue` | Total Harga | `detailItem[].totalPrice` | AVG monthly revenue |
| **Tambahan sistem:** | | | |
| `dormant_threshold_months` | `app_configs` | Sama | Ambang batas dormant |

### M10 — Customer Reactivation Rate

**Rumus:** Customer dormant (period sebelumnya) yang kembali transaksi di period ini / Total customer dormant period sebelumnya

| Data | CSV/Excel | API | Kegunaan |
|------|-----------|-----|----------|
| `invoice_date` | Tanggal | `transDate` | Period saat ini & sebelumnya |
| `customer_name` | Pelanggan | `customerName` | Identifikasi dormant vs re-aktif |
| **Tambahan sistem:** | | | |
| `dormant_threshold_months` | `app_configs` | Sama | Ambang batas dormant |

---

## 3. Ringkasan — Field Minimum

### Dari Accurate

| Field Accurate | CSV Source | API Source | Dipakai di Metrik |
|----------------|-----------|------------|-------------------|
| `invoice_date` | Tanggal | `transDate` | **Semua M1–M10** |
| `customer_name` | Pelanggan | `customerName` | **Semua M1–M10** |
| `revenue` | Total Harga | `detailItem[].totalPrice` | M3, M4, M7, M9 |
| `gross_profit` | Laba | `totalPrice - cost` | M4 |
| `product_category` | Nama Kategori | `detailItem[].itemCategoryName` | M1, M2, M5 |
| `product_name` | Nama Barang | `detailItem[].detailName` | Klasifikasi item type (Layer 1-2) |
| `unit_price` | @Harga | `detailItem[].unitPrice` | Klasifikasi item type (Layer 3) |
| `invoice_number` | Sales Invoice | `number` | Deduplikasi (semua metrik) |

### Dari Sistem (Bukan Accurate)

| Data | Sumber | Dipakai di |
|------|--------|------------|
| `item_type = unit/consumable/sparepart` | DB (`product_categories`) — hasil klasifikasi 4-layer + override | M1, M2 (filter non-consumable & non-sparepart) |
| `is_high_margin = true` | DB (`product_categories`) — set dari `high_margin_category_ids` | M5 |
| `dormant_threshold_months` | `app_configs` — default 3 | M8, M9, M10 |
| `active_window` | Parameter input user (3/6/12) | Semua metrik (definisi "Customer Aktif") |
| `high_margin_threshold` | `app_configs` — default 40 (%) | M5 (auto-calc is_high_margin) |
| `salesperson_name` | `invoices.salesperson_name` | Filter dashboard masa depan |
| `business_unit` | `invoices.business_unit` (B2B_DC/B2B_PROJECT/B2C/MANUFACTURING) | Filter dashboard masa depan |

---

## 4. Perbandingan: CSV Import vs API Sync

| Aspek | CSV/Excel (File) | API (Synchronous) |
|-------|-----------------|-------------------|
| **Kompleksitas Parser** | Tinggi — multi-row header, summary rows, empty rows | Rendah — JSON terstruktur |
| **Kualitas data** | Rendah — perlu dedup nama customer, klasifikasi item type manual | Tinggi — ada `customerNo`, `itemType` |
| **Auto-detect item type?** | ❌ — perlu 4-layer classification + optional override | ✅ — `itemType = SERVICE` untuk jasa, INVENTORY untuk produk |
| **Customer dedup** | Manual — nama bisa beda tipis | Akurat — pakai `customerNo` |
| **Data realtime?** | Tergantung user export | Bisa realtime / terjadwal |
| **Struktur tabel final** | **SAMA** | **SAMA** |

### Kapan Pakai Apa?

| Situasi | Rekomendasi |
|---------|-------------|
| Belum ada akses API / developer access | CSV import |
| Hanya butuh data historis satu kali | CSV import |
| Ingin auto-sync bulanan | API |
| Butuh deteksi service vs produk otomatis | API |
| Multi-branch (KNT: 3 DB terpisah) | API (per-branch credentials) |

---

## 5. Mapping ke Database (Final)

### invoices
| Field | CSV Source | API Source | Normalisasi |
|-------|-----------|------------|-------------|
| `company_id` | Dari form user | Dari form user | — |
| `branch_id` | Dari kolom Cabang / form | `branchId` | — |
| `customer_id` | Dari `customer_name` → lookup/upsert customers | `customerNo` → lookup customers | — |
| `invoice_number` | Sales Invoice | `number` | **UPPERCASE** |
| `invoice_date` | Tanggal | `transDate` | — |
| `total_revenue` | SUM Total Harga | SUM `detailItem[].totalPrice` | — |
| `total_gp` | SUM Laba | SUM (`totalPrice - cost`) | — |
| `salesperson_name` | ❌ Tidak ada (nullable) | `salesmanListNumber` (detailItem) | **UPPERCASE** — filter masa depan |
| `business_unit` | ❌ Tidak ada — copy dari customers | Copy dari `customers.business_unit` | — filter masa depan |

### invoice_items
| Field | CSV Source | API Source | Normalisasi |
|-------|-----------|------------|-------------|
| `invoice_id` | FK ke invoices | FK ke invoices | — |
| `product_category_id` | Dari `product_category` → lookup/upsert `product_categories` | `itemCategoryName` → lookup | — |
| `product_name` | Nama Barang | `detailName` | **UPPERCASE** + trim |
| `revenue` | Total Harga | `totalPrice` | — |
| `gross_profit` | Laba | `totalPrice - cost` | — |

### customers (upsert)
| Field | CSV Source | API Source | Normalisasi |
|-------|-----------|------------|-------------|
| `customer_code` | ❌ Tidak ada (nullable) | `customerNo` | **UPPERCASE** |
| `customer_name` | Pelanggan | `customerName` | **UPPERCASE** + trim |
| `company_id` | Dari form | Dari form | — |
| `first_invoice_date` | Dihitung dari transaksi (MIN invoice_date) | Dihitung dari transaksi | — |
| `last_invoice_date` | Dihitung dari transaksi (MAX invoice_date) | Dihitung dari transaksi | — |

### product_categories (upsert) — ***UPDATED***
| Field | CSV Source | API Source | Keterangan |
|-------|-----------|------------|------------|
| `name` | Nama Kategori (cleaned — strip V./Z.) | `itemCategoryName` | — |
| `company_id` | Dari form | Dari form | — |
| `item_type` | Klasifikasi 4-layer → `unit`/`consumable`/`sparepart`/`service` | `itemType == SERVICE` → `service`; INVENTORY → 4-layer klasifikasi | **BARU** — menggantikan `is_service` boolean |
| `is_high_margin` | Set manual via konfigurasi | Set manual via konfigurasi | Dari `app_configs.high_margin_category_ids` |

---

## 6. Product Classification Logic — 4 Layer Tanpa Pivot Code

Data dari Accurate tidak selalu punya prefix pivot seperti `V.` atau `Z.`. Untuk mengklasifikasi item type (`unit`/`consumable`/`sparepart`/`service`) secara otomatis, sistem menggunakan **4 layer berurutan**:

### Flowchart Keputusan

```
Input: Nama Kategori + Nama Item + Harga per Unit
                          │
                          ▼
            ┌─ Layer 1: Keyword di Nama Item? ────✅ → Return item_type
            │           ❌
            │           ▼
            └─ Layer 1: Keyword di Nama Kategori? ──✅ → Return item_type
                        ❌
                        ▼
                  ┌─ Layer 2: Price Range Heuristic? ──✅ → Return + needs_review=true
                  │           ❌
                  │           ▼
                  └─ Layer 3: DB Lookup Table Override ──✅ → Return item_type
                              ❌
                              ▼
                        Layer 4: Return 'unit' + needs_review=true (fallback)
```

### Layer 1 — Keyword Classification (Prioritas Tertinggi)

> **Normalisasi UPPERCASE:** Semua teks (nama item, nama kategori, nama customer) dikonversi ke **UPPERCASE** saat proses import. Keyword aturan di tabel `item_classification_rules` juga disimpan dalam UPPERCASE. Dengan ini, pencocokan jadi case-insensitive secara default — `cartridge`, `Cartridge`, `CARTRIDGE` semuanya match dengan aturan `CARTRIDGE`.

Cocokkan kata kunci di **Nama Item** terlebih dahulu, lalu **Nama Kategori**:

| Keyword (UPPERCASE) | Item Type | Contoh Match (UPPERCASE) |
|----------------------|-----------|--------------------------|
| `CARTRIDGE`, `INK `, `RIBBON`, `TONER` | **consumable** | INK CARTRIDGE HK 400 |
| `PAPER`, `LABEL`, `STICKER`, `THERMAL PAPER` | **consumable** | PAPER ROLL 80x80 |
| `PART `, `CABLE`, `ADAPTOR`, `POWER SUPPLY` | **sparepart** | PART CPU POWER CABLE |
| `PRINTER`, `SCANNER`, `MONEY COUNTER`, `DISPLAY`, `MONITOR` | **unit** | MOBILE PRINTER RECEIPT KASSEN |
| `SERVICE`, `INSTALASI`, `MAINTENANCE`, `JASA`, `LABOR` | **service** | — |

### Layer 2 — Price Range Heuristic (Fallback)

Jika Layer 1 tidak menghasilkan klasifikasi:

| Harga per Unit (unit_price) | Kecenderungan | Item Type Default |
|----------------------------|--------------|-------------------|
| `>= 500.000` | Perangkat keras | **unit** |
| `50.000 – 499.999` | Konsumable / aksesoris | **consumable** |
| `< 50.000` | Part kecil | **sparepart** |

### Layer 3 — Lookup Table Override (Database-Driven)

> Semua `match_pattern` di tabel ini disimpan dalam **UPPERCASE**. Input user di UI otomatis di-UPPERCASE-kan sebelum disimpan.

Buat tabel `item_classification_rules` untuk override per company:

| Field | Tipe | Keterangan |
|-------|------|------------|
| `id` | serial PK | — |
| `company_id` | FK companies nullable | null = global rule |
| `match_type` | varchar | `keyword_item_name` / `keyword_category` / `price_range` / `exact_item_name` / `exact_category` |
| `match_pattern` | varchar | Keyword atau JSON range |
| `item_type` | varchar | `unit` / `consumable` / `sparepart` / `service` |
| `priority` | integer | Higher = more priority |
| `is_active` | boolean | — |

Data seed dari analisis MKO:

| match_type | match_pattern | item_type | priority |
|-----------|---------------|-----------|----------|
| `keyword_item_name` | `CARTRIDGE` | consumable | 100 |
| `keyword_item_name` | `INK ` | consumable | 100 |
| `keyword_item_name` | `PART ` | sparepart | 100 |
| `keyword_category` | `PRINTER` | unit | 80 |
| `keyword_category` | `SCANNER` | unit | 80 |
| `keyword_category` | `MONEY COUNTER` | unit | 80 |
| `keyword_category` | `SPARE PART` | sparepart | 90 |
| `keyword_category` | `CARTRIDGE` | consumable | 90 |
| `price_range` | `{"min": 500000}` | unit | 10 |
| `price_range` | `{"max": 50000}` | sparepart | 10 |

User dapat menambah/mengubah aturan via UI Config tanpa deploy kode.

### Layer 4 — Flag for Review (Last Resort)

Jika semua layer gagal:
- `item_type = 'unit'` (default aman)
- Set `needs_review = true` di baris import
- Muncul di halaman Import → "Unclassified Items" untuk review manual

### Contoh Penerapan (Data Nyata Tanpa Prefix V./Z.)

| Kategori | Nama Item | Harga | Layer 1 | Layer 2 | Hasil |
|----------|-----------|-------|---------|---------|-------|
| MOBILE PRINTER RECEIPT KASSEN | KASSEN MT 200VL | 297.298 | Printer → unit | — | **unit** |
| RECEIPT PRINTER THERMAL KASSEN | KASSEN BTP 3100 BT | 576.577 | Printer → unit | — | **unit** |
| BARCODE SCANNER OMNIDIRECTIONAL | KASSEN RS 720 BLACK | 563.063 | Scanner → unit | — | **unit** |
| MONEY COUNTER KASSEN | KASSEN MC 20 | 689.190 | Money counter → unit | — | **unit** |
| CARTRIDGE HANDHELD PRINTER | INK CARTRIDGE HK 400 | 1.036.037 | Cartridge → consumable | — | **consumable** |
| SPARE PART BARCODE PRINTER | PART CPU POWER CABLE | 54.054 | Part → sparepart | — | **sparepart** |
| BARCODE PRINTER THERMAL TRANSFER | POSTEK C 168 200DPI | 2.680.181 | Printer → unit | — | **unit** |
| BARCODE PRINTER DIRECT THERMAL | KASSEN DT 369 | 486.487 | Printer → unit | — | **unit** |
| (new category) | UNKNOWN ITEM | 25.000 | — | <50k → sparepart | **sparepart** + review |
| (new category) | CABUTAN BARU | 750.000 | — | >=500k → unit | **unit** + review |

---

## 7. Implementation Tasks — Step by Step

Berikut rincian task yang harus dikerjakan secara berurutan:

### Phase 1: Schema & Database
- [ ] **1.1** Tambah kolom `item_type VARCHAR(20)` di tabel `product_categories` (unit/consumable/sparepart/service)
- [ ] **1.2** Buat tabel baru `item_classification_rules` (company_id, match_type, match_pattern, item_type, priority, is_active)
- [ ] **1.3** Seed data `item_classification_rules` dari analisis MKO (10+ rules)
- [ ] **1.4** Update `docs-v2/shared/data-model.md` — tambah dokumentasi 2 tabel di atas
- [ ] **1.5** Buat migration SQL untuk perubahan schema

### Phase 2: Backend — Classification Engine
- [ ] **2.1** Buat service `ItemClassifier` di `backend/src/utils/classifier.ts`
  - Implementasi Layer 1: keyword classification (nama item + nama kategori)
  - Implementasi Layer 2: price range heuristic
  - Implementasi Layer 3: lookup ke tabel `item_classification_rules`
  - Layer 4: fallback ke 'unit' + needs_review
  - Integrasi semua layer dengan priority system
- [ ] **2.2** Export function: `classifyItemType(categoryName, itemName, unitPrice, companyId) → { itemType, needsReview }`
- [ ] **2.3** Unit test untuk classification engine dengan data MKO

### Phase 3: Backend — CSV Parser (Update)
- [ ] **3.1** Update `backend/src/utils/parser.ts`:
  - Skip multi-row header (3 baris pertama + footer)
  - Parse serial date Excel → Date
  - Parse numeric dengan koma desimal
  - Extraksi nama kategori, nama item, quantity, unit_price, revenue, gross_profit
- [ ] **3.2** Integrasi `ItemClassifier` di parser: setiap baris data → klasifikasi item type
- [ ] **3.3** Upsert `product_categories` otomatis dengan item_type hasil klasifikasi
- [ ] **3.4** Normalisasi UPPERCASE: semua teks (nama item, nama kategori, nama customer) dikonversi ke UPPERCASE + trim + strip redundant suffix
- [ ] **3.5** Flag baris yang needs_review = true untuk ditampilkan di UI

### Phase 4: Backend — Import Service
- [ ] **4.1** Buat endpoint `POST /api/v1/import/csv` — upload file CSV/Excel
  - Validasi format file
  - Parse + klasifikasi + store ke DB dalam 1 transaksi
  - Return summary: total rows, success, error, unclassified items
- [ ] **4.2** Buat endpoint `GET /api/v1/import/unclassified` — daftar item yang needs_review
- [ ] **4.3** Buat endpoint `PUT /api/v1/import/unclassified/:id` — override item_type
- [ ] **4.4** Buat CRUD endpoint `item-classification-rules` — kelola aturan klasifikasi

### Phase 5: Backend — Invoice & Customer Aggregation
- [ ] **5.1** Update `invoices` upsert logic: hitung `total_revenue` dan `total_gp` dari items
- [ ] **5.2** Update `customers` upsert logic: update `first_invoice_date` dan `last_invoice_date`
- [ ] **5.3** Deduplikasi customer: normalisasi nama + lookup existing sebelum insert
- [ ] **5.4** Validasi: cek duplikat invoice_number + company_id

### Phase 6: Frontend — Import UI
- [ ] **6.1** Halaman Import: upload form (drag & drop file Excel/CSV)
- [ ] **6.2** Halaman Import: progress bar & result summary setelah upload
- [ ] **6.3** Halaman "Unclassified Items": daftar item dengan dropdown override item_type
- [ ] **6.4** Halaman Classification Rules: CRUD tabel `item_classification_rules`
  - Tambah aturan: pilih match_type + isi pattern + pilih item_type + priority
  - Tabel menampilkan aturan existing dan efeknya
- [ ] **6.5** Integration test: upload file MKO sample → verifikasi hasil klasifikasi

### Phase 7: Dashboard — Metrik Kalkulasi
- [ ] **7.1** Implementasi kalkulasi M1–M10 sebagai service layer
- [ ] **7.2** Query filter: `WHERE item_type != 'consumable' AND item_type != 'sparepart'` untuk M1/M2
- [ ] **7.3** Endpoint API metrik dengan format response sesuai docs
- [ ] **7.4** Caching: simpan hasil kalkulasi ke `metric_cache`

### Phase 8: Testing & Dokumentasi
- [ ] **8.1** Test dengan file sample MKO (417 rows — sudah ada)
- [ ] **8.2** Test edge cases: item tanpa kategori, harga 0, tanggal invalid
- [ ] **8.3** Test multi-company: pastikan klasifikasi per company_id
- [ ] **8.4** Update `docs-v2/CURRENT_STATE.md` — update status
- [ ] **8.5** Update `docs-v2/CURRENT_STATE_BACKEND.md` — update status backend

---

## 8. Kesimpulan

1. **8 kolom dari Accurate** diperlukan: invoice_date, customer_name, revenue, gross_profit, product_category, product_name, unit_price, invoice_number
2. **4-layer classification** menangani data tanpa pivot code: keyword layer → price heuristic → DB lookup table → flag review
3. **Item type** (`unit`/`consumable`/`sparepart`/`service`) menggantikan `is_service` boolean — lebih granular
4. **Parser berbeda, tabel final sama** — CSV import dan API sync menyimpan ke struktur DB yang identik
5. **Override per company** via tabel `item_classification_rules` — user bisa kustomisasi tanpa deploy
6. **Filter masa depan** — `salesperson_name` dan `business_unit` sudah disiapkan di schema `invoices` untuk filter dashboard per sales/divisi
