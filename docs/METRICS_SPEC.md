# METRICS_SPEC.md — Spesifikasi Bisnis 10 Metrik Executive Dashboard

> **Wajib dibaca AI sebelum mengerjakan fitur kalkulasi metrik apapun.**
> File ini adalah sumber kebenaran tunggal untuk definisi bisnis semua metrik.

---

## Parameter Global (Berlaku untuk Semua Metrik)

| Parameter | Tipe | Keterangan |
|-----------|------|------------|
| `company_id` | integer \| `"all"` | Entitas perusahaan. `"all"` = holding view (gabungan) |
| `period_month` | string `YYYY-MM` | Bulan referensi kalkulasi |
| `active_window` | integer `3 \| 6 \| 12` | Window klasifikasi customer aktif (dalam bulan) |

---

## Definisi Kunci (Berlaku Global)

| Term | Definisi |
|------|---------|
| **Customer Aktif** | Customer yang `last_transaction_date >= (awal period_month - active_window bulan)` |
| **Existing Customer** | Customer yang `first_transaction_date < awal period_month` — sudah ada sebelum periode |
| **New Customer** | Customer yang `first_transaction_date` jatuh di dalam `period_month` |
| **Dormant Customer** | Customer yang `last_transaction_date < (awal period_month - dormant_threshold_months bulan)`. Threshold dari `app_configs.dormant_threshold_months` (default: 3) |
| **Kategori Produk** | Hanya kategori produk (hardware + consumable) — jasa/service tidak dihitung |
| **High Margin Product** | Produk yang `product_categories.is_high_margin = true` |
| **Periode Sebelumnya** | `period_month - 1 bulan` — untuk perbandingan metrik expansion |

---

## Metrik 1: Cross Selling Ratio

**Tujuan**: Mengukur seberapa banyak customer membeli lebih dari satu kategori produk.

**Rumus**:
```
Cross Selling Ratio = Customer yang beli >1 kategori di period / Total Customer Aktif
```

**Definisi operasional**:
- **Customer beli >1 kategori**: customer yang punya transaksi dengan minimal 2 `product_category_id` berbeda di dalam `period_month`
- **Total Customer Aktif**: menggunakan definisi customer aktif berdasarkan `active_window`
- Kategori jasa/service **tidak dihitung**

**Output tabel (per bulan)**:

| Bulan | Total Customer Aktif | Customer Multi-Produk | Ratio |
|-------|---------------------|-----------------------|-------|
| Jan | 100 | 20 | 20% |

**Output detail (1.1 Cross Selling Dashboard)**:
- Tabel per customer: kolom = tiap kategori produk, nilai = `Ya` / `Tidak`
- Filter: bisa filter per entitas dan per periode

**Query hint**:
```sql
-- Customer multi product di period
SELECT customer_id, COUNT(DISTINCT product_category_id) as cat_count
FROM transactions
WHERE company_id = :company_id
  AND invoice_date >= :period_start
  AND invoice_date <= :period_end
  AND product_category_id IN (SELECT id FROM product_categories WHERE is_service = false)
GROUP BY customer_id
HAVING COUNT(DISTINCT product_category_id) > 1
```

---

## Metrik 2: Average Product Category per Customer

**Tujuan**: Mengukur rata-rata berapa kategori produk yang dibeli setiap customer aktif.

**Rumus**:
```
Avg Category = Total kategori unik terjual di period / Total Customer Aktif
```

**Definisi operasional**:
- **Total kategori unik terjual**: `COUNT(DISTINCT product_category_id)` dari semua transaksi di `period_month`
- **Total Customer Aktif**: berdasarkan `active_window`
- Kategori jasa/service tidak dihitung
- Semakin tinggi nilai = semakin baik

**Output tabel (per bulan)**:

| Bulan | Avg Category |
|-------|-------------|
| Jan | 1.3 |

---

## Metrik 3: Average Revenue per Existing Customer

**Tujuan**: Mengukur apakah existing customer membeli produk bernilai lebih tinggi dari waktu ke waktu.

**Rumus**:
```
Avg Revenue = Total revenue dari existing customer di period / Jumlah existing customer
```

**Definisi operasional**:
- **Revenue existing customer**: `SUM(revenue)` dari transaksi di `period_month` yang dilakukan oleh existing customer
- **Jumlah existing customer**: `COUNT(DISTINCT customer_id)` yang termasuk existing customer DAN bertransaksi di `period_month`
- Scope: semua produk & jasa (tidak filter kategori)
- Semakin tinggi = semakin baik

**Output tabel (per bulan)**:

| Bulan | Revenue Existing | Existing Customer | Avg Revenue |
|-------|-----------------|-------------------|-------------|
| Jan | 500.000.000 | 100 | 5.000.000 |

---

## Metrik 4: Average Gross Profit per Existing Customer

**Tujuan**: Mengukur profitabilitas rata-rata dari existing customer.

**Rumus**:
```
Avg GP = Total gross profit dari existing customer di period / Jumlah existing customer
```

**Definisi operasional**:
- Sama dengan Metrik 3, tapi menggunakan kolom `gross_profit` bukan `revenue`
- **Jumlah existing customer**: sama dengan Metrik 3 (yang bertransaksi di period)

**Output tabel (per bulan)**:

| Bulan | Total GP | Existing Customer | Avg GP |
|-------|----------|-------------------|--------|
| Jan | 100.000.000 | 100 | 1.000.000 |

---

## Metrik 5: High Margin Product Penetration

**Tujuan**: Mengukur seberapa banyak existing customer yang membeli produk high margin.

**Rumus**:
```
High Margin Penetration = Existing customer yang beli produk high margin di period / Total existing customer aktif
```

**Definisi operasional**:
- **Produk high margin**: `product_categories.is_high_margin = true` — diset dari `app_configs.high_margin_category_ids`
- **Existing customer beli high margin**: existing customer yang punya minimal 1 transaksi dengan produk high margin di `period_month`
- **Total existing customer aktif**: existing customer yang aktif berdasarkan `active_window`
- Semakin tinggi = semakin baik

**Output tabel (per bulan)**:

| Bulan | Existing Customer Aktif | Beli High Margin | Ratio |
|-------|------------------------|------------------|-------|
| Jan | 100 | 15 | 15% |

---

## Metrik 6: Repeat Order Rate

**Tujuan**: Mengukur loyalitas customer — berapa persen existing customer yang kembali bertransaksi di periode ini.

**Rumus**:
```
Repeat Order Rate = Customer yang transaksi di period DAN adalah existing customer / Total existing customer aktif
```

**Definisi operasional**:
- **Customer repeat order**: existing customer yang punya transaksi di `period_month`
- **Total existing customer aktif**: existing customer yang aktif berdasarkan `active_window`
- Semakin tinggi = semakin baik

**Output tabel (per bulan)**:

| Bulan | Existing Customer Aktif | Repeat Order | Ratio |
|-------|------------------------|--------------|-------|
| Jan | 100 | 60 | 60% |

---

## Metrik 7: Customer Expansion Rate

**Tujuan**: Mengukur berapa persen customer yang spending-nya naik dibanding bulan sebelumnya.

**Rumus**:
```
Expansion Rate = Existing customer dengan total spending naik vs periode sebelumnya / Total existing customer aktif
```

**Definisi operasional**:
- **Spending naik**: total `revenue` customer di `period_month` > total `revenue` customer di `period_month - 1`
- Hanya customer yang bertransaksi di **kedua** periode yang dihitung (ada data pembanding)
- **Total existing customer aktif**: existing customer yang aktif berdasarkan `active_window`
- Semakin tinggi = semakin baik

**Output tabel (per bulan)**:

| Bulan | Existing Customer Aktif | Spending Naik | Ratio |
|-------|------------------------|---------------|-------|
| Jan | 100 | 30 | 30% |

**Edge case**:
- Customer yang hanya transaksi di period ini tapi tidak di period sebelumnya: **tidak dihitung** (tidak ada data pembanding)
- Customer baru (new customer) tidak masuk hitungan

---

## Metrik 8: Dormant Customer Rate

**Tujuan**: Mengukur berapa persen existing customer yang sudah tidak aktif.

**Rumus**:
```
Dormant Rate = Jumlah existing customer dormant / Total existing customer
```

**Definisi operasional**:
- **Dormant**: `last_transaction_date < (awal period_month - dormant_threshold_months)`. Threshold dari `app_configs` (default: 3 bulan)
- **Total existing customer**: semua existing customer (aktif + dormant) — tidak difilter `active_window`
- Semakin rendah = semakin baik, ideal < 10%

**Output tabel (per bulan)**:

| Bulan | Total Existing Customer | Dormant | Ratio |
|-------|------------------------|---------|-------|
| Jan | 500 | 50 | 10% |

---

## Metrik 9: Dormant Customer Value

**Tujuan**: Mengukur potensi omset yang hilang dari customer dormant.

**Rumus per customer**:
```
Dormant Value = AVG monthly revenue customer × Jumlah bulan dormant
```

**Definisi operasional**:
- **AVG monthly revenue**: rata-rata revenue per bulan customer tersebut berdasarkan histori transaksi **sebelum** dormant
- **Jumlah bulan dormant**: selisih bulan antara `last_transaction_date` dan `period_month` referensi
- Output adalah **daftar customer dormant** beserta estimasi value yang hilang

**Output tabel (detail per customer)**:

| Customer | AVG Revenue/Bulan | Bulan Tidak Beli | Estimated Lost Value |
|----------|------------------|------------------|----------------------|
| PT ABC | 20.000.000 | 6 | 120.000.000 |
| PT XYZ | 10.000.000 | 5 | 50.000.000 |

**Catatan**: Nilai ini adalah **estimasi potensi**, bukan kerugian aktual.

---

## Metrik 10: Customer Reactivation Rate

**Tujuan**: Mengukur keberhasilan tim penjualan dalam mengaktifkan kembali customer dormant.

**Rumus**:
```
Reactivation Rate = Customer dormant yang kembali bertransaksi di period / Total customer dormant (bulan sebelumnya)
```

**Definisi operasional**:
- **Customer dormant bulan sebelumnya**: customer yang statusnya dormant pada `period_month - 1`
- **Kembali bertransaksi**: customer tersebut punya transaksi di `period_month`
- Target tahunan minimum: 15–20%

**Output tabel (per bulan)**:

| Bulan | Dormant Customer (bulan lalu) | Aktif Kembali | Ratio |
|-------|-------------------------------|---------------|-------|
| Jan | 50 | 5 | 10% |

---

## Format Response API untuk Semua Metrik

```typescript
// Response untuk metrik dengan tren bulanan
{
  "metric": "cross_selling_ratio",
  "company_id": 1,
  "period_month": "2024-03",
  "active_window": 6,
  "summary": {
    "current_value": 22.5,         // nilai di period_month (persen atau angka)
    "previous_value": 20.0,        // nilai bulan sebelumnya
    "change_percent": 12.5,        // perubahan dalam persen
    "trend": "up"                  // "up" | "down" | "stable"
  },
  "monthly_trend": [               // tren 12 bulan ke belakang dari period_month
    { "month": "2023-04", "value": 18.0, "total_active": 95, "multi_product": 17 },
    { "month": "2023-05", "value": 19.5, "total_active": 98, "multi_product": 19 },
    // ...
  ]
}
```

---

## Asumsi Format Data CSV/Excel dari Accurate Online

Kolom yang wajib ada di file upload:

| Nama Kolom | Tipe | Keterangan |
|-----------|------|------------|
| `invoice_number` | string | Nomor invoice unik |
| `invoice_date` | date `DD/MM/YYYY` | Tanggal transaksi |
| `customer_code` | string | Kode customer di Accurate |
| `customer_name` | string | Nama customer |
| `product_category` | string | Nama kategori produk |
| `revenue` | number | Total nilai penjualan (tanpa titik, koma sebagai desimal) |
| `gross_profit` | number | Gross profit transaksi |

> Jika format kolom dari Accurate berbeda, mapping dilakukan di `utils/parser.ts` — jangan ubah nama kolom internal.
