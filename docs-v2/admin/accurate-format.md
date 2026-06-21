# Accurate Online Export Format — Rincian Faktur Penjualan Laba

> Last updated: 2026-06-22
> Source: File export dari Accurate Online — PT Mesin Kasri Online (Jun 2026)

---

## File Structure

**Report:** Rincian Faktur Penjualan Laba (Sales Invoice Profit Detail)
**Periode:** 01 Jun 2026 s/d 18 Jun 2026
**Entity:** PT MESIN KASRI ONLINE
**Cabang:** PUSAT, JAKARTA, SURABAYA

### Header (3 baris pertama)
1. Nama perusahaan
2. Judul report
3. Periode + cabang

### Columns

| No | Kolom | Contoh | Tipe Data | Mapping ke DB |
|----|-------|--------|-----------|---------------|
| 1 | Tanggal | 2026-06-02 | Date | `invoices.invoice_date` |
| 2 | Sales Invoice | SI.2026.06.02.007 | String | `invoices.invoice_number` |
| 3 | Pelanggan | MITRA SATU SOLUSINDO, PT | String | `customers.name` |
| 4 | Nama Cabang Faktur Penjualan | JAKARTA | String | `invoices.branch_code` |
| 5 | Nama Kategori Barang Barang & Jasa | MOBILE PRINTER RECEIPT KASSEN | String | `product_categories.name` |
| 6 | Nama Barang | KASSEN MT 200VL | String | `invoice_items.product_name` |
| 7 | Kuantitas | 19 | Integer | `invoice_items.quantity` |
| 8 | @Harga | 297298 | Number | `invoice_items.unit_price` |
| 9 | Total Harga | 5648662 | Number | `invoice_items.total_price` |
| 10 | BPP (HPP) | 4027782.830057 | Number | `invoice_items.cost` |
| 11 | Laba | 1620879.169943 | Number | Dihitung (total_price - cost) |
| 12 | Laba (duplicate?) | 1620879.169943 | Number | Sama dengan laba |

**Note:** Kolom 11 & 12 isinya sama — laba = total_harga - BPP

### Sample Row
```
2026-06-02 | SI.2026.06.02.007 | MITRA SATU SOLUSINDO, PT | JAKARTA | MOBILE PRINTER RECEIPT KASSEN | KASSEN MT 200VL | 19 | 297298 | 5648662 | 4027782.830057 | 1620879.169943 | 1620879.169943
```

### Footer per Tanggal
Setiap tanggal punya summary row:
```
Total: 532 items | 218,438,738 total harga | 158,431,242 BPP | 60,007,495 laba
```

---

## Data Quality Notes

1. **Nama Customer** — ada yang dengan tanda koma (PT), ada yang tanpa
2. **Nama Barang** — termasuk kode produk (KASSEN MT 200VL), perlu dipisah?
3. **Kategori Barang** — prefix `V.`, `Z.` untuk spare parts? Perlu dibersihkan
4. **BPP** — ada yang 0 atau 1 (barang tidak punya cost)
5. **Cabang** — PUSAT, JAKARTA, SURABAYA — dari file ini MKO punya 3 cabang?
6. **Harga** — ada yang pakai desimal (18 Jun), ada yang integer

---

## Import Parser Requirements

Parser harus handle:

1. **Multi-row header** (3 baris pertama + kolom header di baris 6)
2. **Summary rows** per tanggal (skip)
3. **Empty rows** (baris kosong antar tanggal)
4. **Duplicate invoice items** — invoice_number + product_name sebagai unique key
5. **Branch code extraction** — dari kolom "Nama Cabang"
6. **Customer deduplication** — nama customer bisa berbeda tipis
7. **Category mapping** — dari "Nama Kategori" ke `product_categories`

---

## Recommended Table Mapping

### invoices
| Field | Source |
|-------|--------|
| invoice_number | Sales Invoice |
| invoice_date | Tanggal |
| company_id | Dari form (user pilih) |
| branch_id | Dari "Nama Cabang" → lookup ke company_branches |
| customer_id | Dari "Pelanggan" → upsert customers |

### invoice_items
| Field | Source |
|-------|--------|
| invoice_id | FK ke invoices |
| product_name | Nama Barang |
| category_name | Nama Kategori Barang |
| quantity | Kuantitas |
| unit_price | @Harga |
| total_price | Total Harga |
| cost | BPP |
| profit | Laba |

### customers (upsert)
| Field | Source |
|-------|--------|
| name | Pelanggan |
| company_id | Dari form |
| branch_id | Dari "Nama Cabang" |

---

## Status

⏸ **Menunggu konfirmasi:**
- [ ] File ini dari MKO — apakah format sama untuk KNT & SKI?
- [ ] MKO ternyata punya 3 cabang (PUSAT, JAKARTA, SURABAYA) — perlu update branch list?
- [ ] Endpoint & auth Accurate Online API — butuh developer access?