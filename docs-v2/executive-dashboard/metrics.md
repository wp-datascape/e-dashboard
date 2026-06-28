# executive-dashboard/metrics.md — Definisi Bisnis KPI 1–8

> WAJIB dibaca sebelum mengerjakan fitur kalkulasi metrik apapun.
> Sumber kebenaran tunggal untuk definisi bisnis.
> Last updated: 2026-06-27 (direvisi dari klarifikasi owner)

---

## Sumber Data

Semua KPI diturunkan dari **data faktur penjualan** yang diimport ke DB.
Tidak ada kalkulasi dari sumber lain.

```
Faktur Accurate / File CSV
  → Import ke DB (invoices + invoice_items)
  → KPI dihitung on-demand dari tabel invoices
```

---

## Parameter Global (semua KPI)

| Param | Tipe | Keterangan |
|---|---|---|
| `company_id` | integer \| `"all"` | Filter per entitas; "all" = holding view |
| `period_month` | string `YYYY-MM` | Bulan referensi periode berjalan |

> **Dihapus**: `active_window` tidak lagi jadi query param.
> Threshold diambil dari `business_configs` (aktif = 30 hari, dormant = 90 hari).

---

## Definisi Status Customer (REVISED)

Semua status dihitung relatif terhadap **tanggal akhir periode berjalan** (`period_end = akhir bulan dari period_month`).

| Status | Kondisi | Threshold |
|---|---|---|
| **Aktif** | Punya invoice di periode berjalan (bulan = period_month) | 30 hari / 1 bulan kalender |
| **Existing** | `first_invoice_date < period_start` AND `last_invoice_date >= period_end - 90 hari` | Pernah beli sebelumnya + belum dormant |
| **Dormant** | `last_invoice_date < period_end - 90 hari` | 90 hari tanpa transaksi |
| **New** | `first_invoice_date` jatuh dalam period_month | Pertama kali beli di bulan ini |

> **Catatan perbedaan dari versi lama:**
> - "Aktif" bukan lagi rolling window (3/6/12 bln) — cukup ada invoice di bulan berjalan
> - "Existing" = pernah beli sebelum periode + belum masuk dormant
> - Threshold dormant = **90 hari** (bukan bulan kalender)
> - `active_window_months` di `business_configs` tidak lagi relevan untuk definisi status ini

---

## KPI 1 — Cross Selling (Multi Product)

**Definisi:** Customer aktif yang dalam 1 atau lebih invoice-nya memiliki > 1 produk/kategori berbeda.

**Sumber:** `invoices` + `invoice_items`

**Scope:** Customer aktif = yang punya invoice di period_month

**Cara hitung:**
1. Ambil semua invoice di period_month
2. Per customer, deteksi apakah ada ≥ 2 `product_category_id` berbeda dalam invoice-nya
3. Multi kategori **tidak akumulasi lintas bulan** — dilihat dari invoice dalam periode berjalan saja
4. Hasil = COUNT customer yang lolos / COUNT total customer aktif

**Matrix window (konfirmasi pending — lihat open questions):**
Ditampilkan untuk 4 window: **30 / 90 / 180 / 360 hari**

```
Numerator   : COUNT DISTINCT customer_id yang punya ≥ 2 kategori dalam invoice periode
Denominator : COUNT DISTINCT customer_id yang ada di invoice periode
```

**Chart:** BarChartWidget di `/cross-selling`
**Detail (KPI 1.1):** HeatmapWidget — Customer × Kategori

---

## KPI 2 — Average Category per Customer

**Definisi:** Rata-rata jumlah jenis kategori produk yang dibeli per customer aktif.

**Sumber:** `invoices` + `invoice_items` + `product_categories`

**Cara hitung:**
```
Total jenis item (kategori unik) yang terjual di period
÷ Jumlah customer aktif di period (yang ada di faktur bulan berjalan)
```

**Catatan:** "Total jenis item terjual" = COUNT DISTINCT product_category_id dari semua invoice di period, bukan per customer.

**Chart:** AreaChartWidget di `/cross-selling`

---

## KPI 3 — Existing Customer Active (Revenue)

**Definisi:** Jumlah existing customer yang melakukan transaksi di periode berjalan + rata-rata revenue mereka.

**Existing customer** = `first_invoice_date < period_start` AND `last_invoice_date >= period_end - 90 hari`

**Cara hitung:**
```
Count   : COUNT existing customer yang punya invoice di period_month
Avg Rev : SUM(total_revenue) existing di period ÷ COUNT existing yang transaksi di period
```

**Yang ditampilkan di chart:**
- Jumlah existing customer yang transaksi (count)
- Rata-rata revenue per existing customer yang transaksi

**Scope:** Semua produk + jasa, tidak difilter kategori.

**Chart:** ComboChartWidget di `/customer-metrics`
(Batang = total revenue existing, Garis = avg revenue per customer)

---

## KPI 4 — Existing Customer Active (Gross Profit)

**Definisi:** Sama persis dengan KPI 3, tapi kolom yang dihitung adalah **gross profit**.

```
Avg GP : SUM(total_gp) existing di period ÷ COUNT existing yang transaksi di period
```

**Chart:** BarChartWidget stacked (3 tier: top/mid/long-tail) di `/customer-metrics`

---

## KPI 5 — High Margin Product Penetration

**Definisi:** Proporsi existing customer yang membeli produk high margin di periode berjalan.

**High Margin Product:** Ditentukan via **memo entitas** — admin input produk/kategori mana yang dianggap high margin untuk periode tertentu. Tersimpan di tabel `high_margin_products` (dengan `effective_from` / `effective_until`).

**Cara hitung:**
```
Numerator   : COUNT existing customer yang punya ≥ 1 invoice_item dari produk high margin di period
Denominator : COUNT TOTAL existing customer (bukan hanya yang transaksi di period ini)
```

**Chart:** DonutChartWidget snapshot bulan ini di `/customer-metrics`

---

## KPI 6 — Repeat Order Rate

**Definisi:** Proporsi existing customer yang melakukan lebih dari 1 transaksi di **active window 30 hari** periode berjalan.

**Cara hitung:**
```
Numerator   : COUNT existing customer dengan COUNT(DISTINCT invoice) > 1 dalam 30 hari terakhir
Denominator : COUNT TOTAL existing customer
```

> **Perbedaan dari versi lama:**
> - Denominator = **total existing** (bukan "active existing")
> - Numerator = customer yang order **lebih dari 1x** (bukan sekadar punya invoice)
> - "Repeat order" berarti minimal 2 transaksi berbeda dalam 30 hari aktif

**Threshold target:** Dikonfigurasi via `business_configs.repeat_order_target_pct` (default 80%). Dapat diubah di halaman Settings → Threshold → Target KPI.

**Chart:** RadialBarWidget di `/customer-metrics`
- Lingkaran penuh = target `repeat_order_target_pct` (bukan 100%)
- Hijau: nilai ≥ target (pct ≥ 100% dari target)
- Kuning: ≥ 75% dari target
- Merah: < 75% dari target
- Klik chart → modal drill-down daftar customer repeat order bulan itu

---

## KPI 7 — Customer Expansion Rate

**Definisi:** Proporsi existing customer yang spend-nya naik dibanding **30 hari sebelum active window**.

**Cara hitung:**
```
Window aktif (cur) : SUM(revenue) existing customer dalam 30 hari terakhir periode
Window sebelumnya (prev): SUM(revenue) existing customer dalam 30 hari SEBELUM window aktif
  (yaitu: [period_end - 60 hari, period_end - 30 hari])

Numerator   : COUNT existing dimana COALESCE(cur.rev, 0) > COALESCE(prev.rev, 0)
Denominator : COUNT TOTAL existing customer
```

> **Perbedaan dari versi lama:**
> - Window sebelumnya = **30 hari sebelum window aktif** (bukan bulan kalender sebelumnya)
> - Customer yang tidak order di periode sebelumnya (prev.rev = 0) tapi order sekarang **dihitung** sebagai "spending naik"
> - Denominator = **semua existing**, termasuk yang tidak aktif sama sekali

**Chart:** BarChartWidget 100% stacked horizontal di `/customer-metrics`

---

## KPI 8 — Dormant Customer Rate

**Definisi:** Proporsi customer yang tidak bertransaksi selama 90 hari dari **seluruh customer** (bukan hanya existing).

**Dormant:** `last_invoice_date < period_end - 90 hari`

**Cara hitung:**
```
Numerator   : COUNT customer dengan last_invoice_date < period_end - 90 hari
Denominator : COUNT ALL customer (seluruh data customer di DB, bukan hanya existing)
```

> **Perbedaan dari versi lama:** Denominator = **ALL customer**, bukan hanya existing customer.

**Butuh data:** Seluruh tabel `customers` + tanggal transaksi terakhir dari `invoices`.

**Chart:** LineAlertWidget (threshold 10%) di `/dormant-customer`

---

## KPI 9 — Dormant Customer Value (tidak berubah)

Estimasi value yang hilang per customer dormant:
```
AVG monthly revenue (histori sebelum dormant) × Jumlah bulan dormant
```

**Chart:** BarChartWidget horizontal ranking di `/dormant-customer`

---

## KPI 10 — Customer Reactivation Rate (tidak berubah)

```
Customer dormant (period sebelumnya) yang kembali transaksi di period ini
÷ Total customer dormant period sebelumnya
```

Target minimum: 15–20%

**Chart:** BulletChartWidget di `/dormant-customer`

---

## Perbandingan: Definisi Lama vs Baru

| Aspek | Versi Lama | Versi Baru (Revised) |
|---|---|---|
| Threshold aktif | Rolling 3/6/12 bulan (configurable) | 30 hari = 1 bulan kalender |
| Threshold dormant | `dormant_threshold_months` dari config | Fixed 90 hari |
| `active_window` param | Ada di query param | Dihapus |
| KPI 1 window | 12 bulan rolling trend | 30/90/180/360 hari (multi-window) |
| KPI 5,6,7 denominator | Active existing | Total existing |
| KPI 8 denominator | Total existing | **All customer** |
| Definisi "existing" | first_invoice_date < period_start | + syarat belum dormant (< 90 hari) |

---

## ⚠️ Open Questions — Perlu Konfirmasi Owner

Pertanyaan ini muncul dari sesi klarifikasi 2026-06-27 dan **belum terjawab**. Harus dikonfirmasi sebelum implementasi KPI 1, 3, 6, 7.

**Q1 — "Periode berjalan" = 30 hari rolling atau bulan kalender?**
User menyebut "threshold per 30 hari" dan "bulan berjalan" bergantian.
- Opsi A: Bulan kalender (Jan 1–31, Feb 1–28) — filter tetap `period_month` YYYY-MM
- Opsi B: 30 hari rolling dari tanggal hari ini ke belakang
- Implikasi: jika rolling, filter di halaman harus date-range picker, bukan month picker

**Q2 — KPI 1 "matrix per 30/90/180/360 hari":**
Apakah ini berarti:
- Opsi A: User bisa **pilih** salah satu window (dropdown filter)?
- Opsi B: **4 angka ditampilkan sekaligus** dalam satu tabel/chart?

**Q3 — KPI 3: yang ditampilkan COUNT saja atau COUNT + avg revenue?**
"Data yang ditampilkan jumlah customer existing yang melakukan transaksi" — apakah cukup jumlahnya saja, atau juga rata-rata revenue per customer seperti chart ComboWidget saat ini?

**Q4 — KPI 6 "repeat order":**
Artinya:
- Opsi A: Customer existing yang beli **lebih dari 1 kali** dalam 30 hari (frekuensi)?
- Opsi B: Customer existing yang **pernah beli sebelumnya** dan beli lagi di 30 hari ini (returning)?

---

## Format Response API

```json
{
  "company_id": 1,
  "period_month": "2026-06",
  "trend": [
    {
      "month": "2026-06",
      "existing_customers": 928,
      "total_revenue_existing": 287149564,
      "avg_revenue": 8445575,
      "avg_gross_profit": 2242628,
      "high_margin_ratio": 0,
      "repeat_order_rate": 37.3,
      "expansion_rate": 56.1
    }
  ],
  "high_margin_current": { "bought_pct": 0, "not_bought_pct": 100 },
  "repeat_order_current": { "value": 37.3 }
}
```

---

## Format Kolom CSV/Excel Sumber (Accurate Online)

| Kolom | Tipe | Keterangan |
|---|---|---|
| invoice_number | string | Dedup key |
| invoice_date | date DD/MM/YYYY | |
| customer_code | string | |
| customer_name | string | |
| product_category | string | Nama kategori produk |
| revenue | number | Tanpa titik, koma desimal |
| gross_profit | number | |

Jika format Accurate berubah, mapping dilakukan di `utils/parser.ts` — jangan ubah nama kolom internal.
