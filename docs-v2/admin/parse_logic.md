# Parse & Classification Logic

Dokumentasi teknis untuk pipeline import faktur: parsing file, klasifikasi barang, dan pemetaan divisi.

---

## 1. Parsing Faktur

**File:** `backend/src/utils/parser.ts`

Tidak menggunakan AI/ML — murni rule-based string matching dan library parsing standar.

### 1.1 CSV (`parseCsv`)

Library: **PapaParse**

**Header detection:**
Header dideteksi via `COLUMN_ALIASES` — setiap kolom canonical punya daftar alias nama (Inggris + Indonesia). Semua header di-normalize ke format `lowercase_underscore` sebelum di-compare.

Kolom canonical dan alias-nya:

| Canonical | Contoh alias |
|---|---|
| `invoice_number` | `no faktur`, `nomor faktur`, `invoice no`, `inv_no` |
| `invoice_date` | `tanggal`, `tgl`, `tanggal faktur`, `transaction date` |
| `customer_code` | `kode customer`, `kode pelanggan`, `cust_id` |
| `customer_name` | `nama customer`, `nama pelanggan`, `pelanggan` |
| `product_category` | `kategori produk`, `nama barang`, `item_name`, `barang` |
| `revenue` | `total harga`, `jumlah`, `penjualan`, `dpp` |
| `gross_profit` | `laba`, `laba kotor`, `margin`, `profit` |

**Partial success:** Baris yang gagal di-parse dikumpulkan di `result.errors`, baris valid tetap dikembalikan.

---

### 1.2 Excel — format Accurate Online (`parseExcel`)

Library: **SheetJS (xlsx)**

Format yang didukung: export `"Rincian Faktur Penjualan"` dari Accurate Online.

**Header detection (dinamis):**
Scanner memeriksa maksimal 10 baris pertama. Header row dikenali bila mengandung **`"Tanggal"` DAN `"Sales Invoice"`** secara bersamaan. Pendekatan ini toleran terhadap perubahan posisi header di file export.

**Kolom wajib:**

| Key internal | Label di Accurate |
|---|---|
| `date` | `Tanggal` |
| `invoice_number` | `Sales Invoice` |
| `customer_name` | `Pelanggan` |
| `product_category` | `Nama Kategori Barang Barang & Jasa` |
| `item_name` | `Nama Barang` |
| `quantity` | `Kuantitas` |
| `unit_price` | `@Harga` |
| `revenue` | `Total Harga` |
| `gross_profit` | `Laba` |

**Kolom opsional:**

| Key internal | Label di Accurate |
|---|---|
| `branch_name` | `Nama Cabang` |
| `channel_name` | `Nama Tenaga Penjual` |

**Validasi template:** Jika ada kolom yang tidak dikenali, import dibatalkan. Ini mencegah penggunaan template yang salah.

**Filter baris data (`isDataRow`):**

Baris dianggap data invoice hanya jika:
1. Kolom `Sales Invoice` tidak kosong
2. Nomor faktur diawali `SI.` atau `INV-`
3. Tidak mengandung teks footer Accurate: `ACCURATE Accounting System`, `Tercetak pada`, `Halaman`

**Konversi format tanggal (`formatDateFromExport`):**

| Format input | Contoh | Output |
|---|---|---|
| `DD MMM YYYY` (Accurate) | `02 Jun 2026` | `02/06/2026` |
| `YYYY-MM-DD` (ISO) | `2026-06-02` | `02/06/2026` |
| `DD/MM/YYYY` | `02/06/2026` | `02/06/2026` (as-is) |

Nama bulan dalam bahasa Indonesia didukung: `jan, feb, mar, apr, mei, jun, jul, agu, sep, okt, nov, des`.

---

## 2. Klasifikasi Barang

**File:** `backend/src/utils/classifier.ts`

Klasifikasi menggunakan **priority-based rule matching** dari database — tidak ada hardcoded keyword di kode.

### 2.1 Flow

```
Input: item_name + category_name + unit_price + company_id
          ↓
  DB query: item_classification_rules
  Filter: is_active = true
  Scope: company_id = X  OR  company_id IS NULL (global)
  Urutan: ORDER BY priority DESC
          ↓
  Iterasi tiap rule → cek match_type:
    keyword_item_name  → item_name.toUpperCase().includes(pattern)
    keyword_category   → category.toUpperCase().includes(pattern)
    exact_item_name    → item_name.toUpperCase() === pattern
    exact_category     → category.toUpperCase() === pattern
    price_range        → JSON {min?, max?} vs unit_price
          ↓
  Ambil rule dengan priority tertinggi yang match
          ↓
  Tidak ada match?
    → item_type = 'unit', needsReview = true
```

### 2.2 Tipe item

| Nilai | Arti |
|---|---|
| `unit` | Barang (alat/mesin) |
| `consumable` | Habis pakai (toner, ribbon, kertas) |
| `sparepart` | Suku cadang |
| `service` | Jasa |

### 2.3 Priority otomatis per match_type

Makin spesifik pencocokan → makin tinggi priority. Nilai ini di-assign otomatis saat rule dibuat.

| match_type | priority |
|---|---|
| `exact_item_name` | 100 |
| `exact_category` | 90 |
| `keyword_item_name` | 70 |
| `keyword_category` | 50 |
| `price_range` | 30 |

### 2.4 Scope rule: company-specific vs global

- Rule dengan `company_id` terisi → hanya berlaku untuk perusahaan tersebut
- Rule dengan `company_id = NULL` → berlaku global (fallback untuk semua perusahaan)
- Jika ada dua rule yang sama match, rule company-specific **tidak otomatis menang** — yang menang adalah rule dengan **priority lebih tinggi**

### 2.5 Fallback & review flag

Jika tidak ada rule yang cocok, sistem:
- Menetapkan `item_type = 'unit'`
- Menandai `needsReview = true`

Item dengan `needsReview = true` muncul di halaman **Unclassified Items** untuk di-review manual.

---

## 3. Klasifikasi Divisi (Business Unit)

**File:** `backend/src/features/import/import.repository.ts`
**Tabel:** `channel_divisions`

Pemetaan `channel_name` → `division` menggunakan **exact-match lookup**.

```
channel_name (dari kolom "Nama Tenaga Penjual" di file Accurate)
    ↓  UPPER()
SELECT division FROM channel_divisions
WHERE channel_name = UPPER(channel_name)
    ↓
Hasil → disimpan sebagai business_unit di record invoice
```

Jika `channel_name` tidak ditemukan di tabel `channel_divisions`, `business_unit` akan `null`.

Mapping channel → divisi dikonfigurasi di **Settings → Channel & Divisi** di UI.

---

## 4. Konfigurasi Rules

### Classification rules

Dikelola via **Settings → Klasifikasi** di UI, atau import massal via CSV/XLSX.

Format template XLSX (diunduh dari UI):

| match_type | match_pattern | item_type |
|---|---|---|
| `keyword_item_name` | `CARTRIDGE` | `consumable` |
| `keyword_category` | `PRINTER` | `unit` |
| `price_range` | `{"min": 500000}` | `unit` |
| `price_range` | `{"max": 50000}` | `sparepart` |

Untuk `price_range`, `match_pattern` adalah JSON dengan field opsional `min` dan/atau `max`.

Import rules bersifat **idempotent**: duplikat (same `match_type` + `match_pattern` + `company_id`) di-skip, tidak di-error.

### Channel–divisi mapping

Dikelola via **Settings → Channel & Divisi**.

---

## 5. Ringkasan Arsitektur

| Komponen | Teknik | File |
|---|---|---|
| Parse CSV | PapaParse + alias lookup table | `utils/parser.ts` |
| Parse Excel | SheetJS + dynamic header scan | `utils/parser.ts` |
| Klasifikasi barang | Priority rule matching dari DB | `utils/classifier.ts` |
| Klasifikasi divisi | Exact-match lookup dari DB | `import.repository.ts` |
| Manajemen rules | CRUD + import CSV/XLSX | `features/import/classification.service.ts` |

Semua logika **deterministik** — tidak ada ML/AI. Rules dikonfigurasi sepenuhnya dari UI oleh admin.
