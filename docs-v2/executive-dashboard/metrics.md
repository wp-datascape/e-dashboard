# executive-dashboard/metrics.md — Definisi Bisnis KPI 1–8

> WAJIB dibaca sebelum mengerjakan fitur kalkulasi metrik apapun.
> Sumber kebenaran tunggal untuk definisi bisnis.
> Last updated: 2026-06-30 (semua open questions terjawab — definisi final)

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
| `period_end` | string `YYYY-MM-DD` | Tanggal acuan (default: hari ini). Window 30 hari dihitung mundur dari sini. |
| `division` | string (opsional) | Filter per divisi/channel |

> **Dihapus**: `period_month` (YYYY-MM) dan `active_window` tidak lagi dipakai.
> Periode berjalan = **30 hari rolling** mundur dari `period_end`.
> Threshold dormant = **dinamis per kategori bisnis** (KOREKSI 2026-08-07 —
> lihat catatan di bawah §Perbandingan; baris ini SEBELUMNYA salah menulis
> "fixed 90 hari", basi sejak fitur threshold per-unit ditambahkan setelah
> 2026-06-30, tidak pernah diupdate).

---

## Definisi Status Customer (FINAL)

Semua status dihitung relatif terhadap **`period_end`** (tanggal dipilih user, default hari ini).
**Active window = 30 hari rolling** mundur dari `period_end`.

| Status | Kondisi | Threshold |
|---|---|---|
| **Aktif** | Ada invoice dalam `(period_end - 30 hari, period_end]` | 30 hari rolling |
| **Existing** | `first_invoice_date < period_end - 30 hari` AND `last_invoice_date >= period_end - N bulan` | Pernah beli sebelum window + belum dormant |
| **Dormant** | `last_invoice_date < period_end - N bulan` | N bulan tanpa transaksi, N dinamis per kategori bisnis |
| **New** | `first_invoice_date` dalam `(period_end - 30 hari, period_end]` | Pertama kali beli dalam window aktif |

> **N (threshold dormant) BUKAN angka tetap** — diambil dari
> `business_configs.dormant_threshold_months.<kategori>` sesuai kategori
> bisnis dominan pada scope yang dipilih (`resolveDormantMonths()` di
> `features/config/threshold.ts`). Default per kategori: `b2b_dc` 3 bulan,
> `b2b_project` 12 bulan, `b2c` 6 bulan, `manufacturing` 6 bulan — dapat
> diubah admin lewat Settings → Threshold. Baris tabel di atas SEBELUMNYA
> menulis literal "90 hari", basi sejak fitur ini ditambahkan (koreksi
> 2026-08-07).

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

```
Numerator   : COUNT DISTINCT customer_id yang punya ≥ 2 kategori dalam 30-hari window
Denominator : COUNT DISTINCT customer_id yang ada di 30-hari window
```

**Chart:** BarChartWidget 12 bulan di `/cross-selling` — tiap bar = 1 window 30 hari bergeser mundur
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

**Definisi:** Jumlah existing customer yang melakukan transaksi dalam active window 30 hari.

**Existing customer** = `first_invoice_date < period_end - 30 hari` AND `last_invoice_date >= period_end - 90 hari`

**Cara hitung:**
```
Count : COUNT existing customer yang punya invoice dalam (period_end - 30 hari, period_end]
```

**Yang ditampilkan:** Jumlah existing customer yang transaksi (count saja).

> **MVP:** Avg revenue per customer di-hold untuk setelah project live.

**Scope:** Semua produk + jasa, tidak difilter kategori.

**Chart:** BarChartWidget 12 bulan di `/customer-metrics`

---

## KPI 4 — Existing Customer Active (Gross Profit)

**Definisi:** Total gross profit dari existing customer yang transaksi dalam active window 30 hari.

```
Total GP : SUM(gross_profit) dari invoice existing customer dalam (period_end - 30 hari, period_end]
```

**Chart:** BarChartWidget stacked (3 tier: top/mid/long-tail) di `/customer-metrics`

---

## KPI 5 — High Margin Product Penetration

**Definisi:** Proporsi existing customer yang membeli produk high margin dalam active window 30 hari.

**High Margin Product:** Ditentukan via **memo entitas** — admin input produk/kategori mana yang dianggap high margin untuk periode tertentu. Tersimpan di tabel `high_margin_products` (dengan `effective_from` / `effective_until`).

**Cara hitung:**
```
Numerator   : COUNT existing customer yang punya ≥ 1 invoice_item dari produk high margin
              dalam (period_end - 30 hari, period_end]
Denominator : COUNT TOTAL existing customer (termasuk yang tidak transaksi di window ini)
```

**Chart:** DonutChartWidget snapshot di `/customer-metrics`

---

## KPI 6 — Repeat Order Rate

**Definisi:** Proporsi existing customer yang melakukan **lebih dari 1 transaksi** dalam active window 30 hari.

**Cara hitung:**
```
Numerator   : COUNT existing customer dengan COUNT(DISTINCT invoice_id) > 1
              dalam (period_end - 30 hari, period_end]
Denominator : COUNT TOTAL existing customer
```

> "Repeat order" = frekuensi ≥ 2 transaksi dalam 30 hari, bukan sekadar pernah beli sebelumnya.

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
Window aktif (cur)  : SUM(revenue) existing dalam (period_end - 30 hari, period_end]
Window sebelumnya   : SUM(revenue) existing dalam (period_end - 60 hari, period_end - 30 hari]

Numerator   : COUNT existing dimana COALESCE(cur.rev, 0) > COALESCE(prev.rev, 0)
Denominator : COUNT TOTAL existing customer
```

> Customer yang tidak order di window sebelumnya (prev.rev = 0) tapi order sekarang **dihitung** sebagai "spending naik".
> Denominator = **semua existing**, termasuk yang tidak aktif sama sekali.

**Chart:** BarChartWidget 100% stacked horizontal di `/customer-metrics`

---

## KPI 8 — Dormant Customer Rate

**Definisi:** Proporsi customer yang tidak bertransaksi selama N bulan (threshold dinamis per kategori bisnis, lihat catatan §Definisi Status Customer) dari **seluruh customer** (bukan hanya existing).

**Dormant:** `last_invoice_date < period_end - N bulan`

**Cara hitung:**
```
Numerator   : COUNT customer dengan last_invoice_date < period_end - N bulan
Denominator : COUNT ALL customer (seluruh data customer di DB)
N           : dormant_threshold_months.<kategori bisnis dominan scope>
              (business_configs, default: b2b_dc=3, b2b_project=12, b2c=6, manufacturing=6)
```

**Butuh data:** Seluruh tabel `customers` + tanggal transaksi terakhir dari `invoices`.

**Chart:** LineAlertWidget (threshold 10%) di `/dormant-rate` (sebelumnya bundel `/dormant-customer`, dipecah 2026-08-07 — lihat [[task025]] §7a)

---

## KPI 9 — Dormant Customer Value (tidak berubah)

Estimasi value yang hilang per customer dormant:
```
AVG monthly revenue (histori sebelum dormant) × Jumlah bulan dormant
```

**Chart:** BarChartWidget horizontal ranking di `/dormant-value` (sebelumnya bundel `/dormant-customer`, dipecah 2026-08-07 — lihat [[task025]] §7a)

---

## KPI 10 — Customer Reactivation Rate (tidak berubah)

```
Customer dormant (period sebelumnya) yang kembali transaksi di period ini
÷ Total customer dormant period sebelumnya
```

Target minimum: 15–20%

**Chart:** BulletChartWidget di `/reactivation-rate` (sebelumnya bundel `/dormant-customer`, dipecah 2026-08-07 — lihat [[task025]] §7a)

---

## Perbandingan: Definisi Lama vs Final

| Aspek | Versi Lama | Versi Final (2026-06-30) |
|---|---|---|
| Parameter filter | `period_month: YYYY-MM` | `period_end: YYYY-MM-DD` (default: hari ini) |
| Periode berjalan | Bulan kalender | **30 hari rolling** mundur dari `period_end` |
| Threshold dormant | `dormant_threshold_months` dari config | ~~Fixed 90 hari~~ **KOREKSI 2026-08-07**: tetap **dinamis dari `dormant_threshold_months` per kategori bisnis** — keputusan "fixed 90 hari" di baris ini tidak pernah benar-benar dieksekusi ke kode, dan dikonfirmasi TIDAK jadi diubah (kode/business_configs yang jadi acuan, dokumen ini yang salah) |
| `active_window` param | Ada di query param | Dihapus |
| KPI 1 window | Multi-window 30/90/180/360 hari | Bar chart **12 bulan** (tiap bar = 30-hari rolling) |
| KPI 3 tampilan | Count + avg revenue | **Count saja** (avg revenue = fitur post-MVP) |
| KPI 5,6,7 denominator | Active existing | Total existing |
| KPI 6 definisi | Returning customer | **Frekuensi > 1x dalam 30 hari** |
| KPI 8 denominator | Total existing | **All customer** |
| Definisi "existing" | first_invoice_date < period_start | + syarat belum dormant (< N bulan, N dinamis per kategori bisnis) |

---

## Format Response API

```json
{
  "company_id": 1,
  "period_end": "2026-06-30",
  "trend": [
    {
      "period_end": "2026-06-30",
      "existing_customers": 928,
      "total_revenue_existing": 287149564,
      "high_margin_ratio": 0,
      "repeat_order_rate": 37.3,
      "expansion_rate": 56.1
    }
  ],
  "high_margin_current": { "bought_pct": 0, "not_bought_pct": 100 },
  "repeat_order_current": { "value": 37.3 }
}
```

> `avg_revenue` dan `avg_gross_profit` dihapus dari response MVP.

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
