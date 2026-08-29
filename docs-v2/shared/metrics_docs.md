# Dokumentasi Metrik M3 · M4 · M5

> Dokumen ini menjelaskan definisi bisnis, formula, parameter, dan sumber data untuk
> tiga metrik utama pada halaman `/customer-metrics`.
>
> Last updated: 2026-06-28
> Baca juga: `executive-dashboard/metrics.md` (definisi bisnis global)

---

## Definisi Umum

### Existing Customer

Customer yang dianggap "existing" pada suatu bulan adalah customer yang memenuhi syarat:

```
customers.first_invoice_date < awal bulan (period_start)
AND customers.is_placeholder = false
```

Customer **dummy** (PELANGGAN UMUM, WALK-IN, dll.) dikecualikan melalui kolom
`is_placeholder = true` yang di-set otomatis saat import.

### Parameter Global

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `company_id` | `integer \| "all"` | `"all"` | Filter per entitas; 0 = semua holding |
| `period_month` | `YYYY-MM` | Bulan berjalan | Bulan referensi; chart selalu tampilkan 12 bulan ke belakang |

---

## M3 — Avg Revenue Existing Customer

### Penjelasan

Mengukur rata-rata pendapatan yang dihasilkan dari **existing customer yang aktif bertransaksi**
di setiap bulan. Tren 12 bulan dipakai untuk melihat apakah nilai per customer naik atau turun.

### Formula

```
Avg Revenue (M3) = SUM(revenue existing yang transaksi) / COUNT(existing yang transaksi)
```

- **Numerator**: total revenue dari invoice existing customer yang punya transaksi di bulan tersebut
- **Denominator**: jumlah existing customer yang punya ≥ 1 invoice di bulan tersebut
  (bukan total existing — yang tidak transaksi tidak masuk denominator)

### Enrichment: Top Contributor + Badge Konsentrasi

Setiap bulan dihitung siapa existing customer dengan revenue tertinggi:

```
top_rev_pct = (revenue customer X) / SUM(revenue semua existing) × 100
```

- Ditampilkan di tooltip: `Top: [nama], [revenue], [%]`
- Badge ⚠ muncul di chart jika `top_rev_pct > 25%` (konsentrasi tinggi)

### Drill-Down Modal

*(Ditambahkan 2026-07-23)* Klik pada batang bulan tertentu membuka modal Revenue
Breakdown (`GET /metrics/revenue-breakdown`, mirror pola M4 gp-breakdown) yang
menampilkan:

| Kolom | Keterangan |
|---|---|
| Ranking | Urutan revenue terbesar ke terkecil |
| Nama customer | Dari tabel `customers` |
| Revenue | Revenue bulan tersebut |
| % Total | Kontribusi revenue terhadap total revenue existing bulan itu |
| Tier | Atas / Tengah / Bawah (berdasarkan median revenue bulan itu, pola sama dengan tier M4) |

Header modal menampilkan: total revenue existing, avg revenue/customer, median threshold,
jumlah customer transaksi.

Tooltip chart dan modal drill-down memakai formatter angka yang sama persis
(`fmtRpDetail`, 2 desimal) — sebelumnya tooltip pakai `fmtRp` (1 desimal) sehingga
angka tampak beda (mis. "2,4M" vs "2,35M") padahal data underlying identik.

### Sumber Data

| Tabel | Kolom | Keterangan |
|---|---|---|
| `invoices` | `total_revenue`, `invoice_date`, `customer_id` | Header invoice |
| `customers` | `first_invoice_date`, `is_placeholder` | Filter existing + dummy |

### Tampilan

- **Chart**: ComboChartWidget 12 bulan (batang = total revenue existing, garis = avg revenue)
- **Y-axis**: format `Rp` disingkat (`jt`, `rb`)
- **Tooltip**: avg revenue bulan itu + top contributor + badge konsentrasi
- **Modal**: tabel drill-down per bulan (lihat Drill-Down Modal di atas)

---

## M4 — Avg Gross Profit Existing Customer (Tier Breakdown)

### Penjelasan

Mengukur rata-rata gross profit dari existing customer yang bertransaksi, sekaligus membagi
distribusi GP ke dalam **3 tier berdasarkan median GP bulan tersebut**. Tren 12 bulan
dalam bentuk stacked bar memperlihatkan komposisi GP dari masing-masing tier.

### Formula Avg GP

```
Avg GP (M4) = SUM(gross_profit existing yang transaksi) / COUNT(existing yang transaksi)
```

- **Numerator**: total GP dari invoice existing customer yang punya transaksi di bulan tersebut
- **Denominator**: jumlah existing customer yang punya ≥ 1 invoice di bulan tersebut

### Klasifikasi Tier (Median-Based)

Tier dihitung ulang setiap bulan menggunakan **median GP individu** bulan tersebut:

```
median_gp = PERCENTILE_CONT(0.5) dari GP per existing customer yang transaksi
```

| Tier | Kondisi | Warna Chart |
|---|---|---|
| **Tier Atas** | GP individu > `median_gp` | Hijau |
| **Tier Tengah** | `0.5 × median_gp` < GP ≤ `median_gp` | Biru |
| **Tier Bawah** | GP ≤ `0.5 × median_gp` | Merah |

Yang ditampilkan di stacked bar adalah **total GP gabungan** per tier (bukan count customer):

```
tier1_gp = SUM(gp) WHERE gp > median_gp
tier2_gp = SUM(gp) WHERE 0.5×median < gp ≤ median
tier3_gp = SUM(gp) WHERE gp ≤ 0.5×median
```

### Enrichment: Top GP Contributor + Badge Konsentrasi

```
top_gp_pct = (GP customer X) / SUM(GP semua existing) × 100
```

- Ditampilkan di tooltip: `Top: [nama], [GP], [%]`
- Badge ⚠ muncul di chart jika `top_gp_pct > 25%`

### Drill-Down Modal

Klik pada batang bulan tertentu membuka modal GP Breakdown yang menampilkan:

| Kolom | Keterangan |
|---|---|
| Ranking | Urutan GP terbesar ke terkecil |
| Nama customer | Dari tabel `customers` |
| GP | Gross profit bulan tersebut |
| % Total | Kontribusi GP terhadap total GP bulan itu |
| Tier | Atas / Tengah / Bawah (berdasarkan median bulan itu) |

Header modal menampilkan: total GP, avg GP/customer, nilai median threshold, jumlah customer transaksi.

Modal mendukung **export PDF** via jsPDF + autoTable.

### Sumber Data

| Tabel | Kolom | Keterangan |
|---|---|---|
| `invoices` | `total_gp`, `invoice_date`, `customer_id` | Header invoice |
| `customers` | `first_invoice_date`, `customer_name`, `customer_code`, `is_placeholder` | Filter + label |

### Tampilan

- **Chart**: BarChartWidget stacked 12 bulan (tier1/tier2/tier3)
- **Y-axis**: format `Rp` disingkat
- **Tooltip**: total GP + avg GP + breakdown tier + top contributor
- **Modal**: tabel drill-down per bulan + PDF export

---

## M5 — High Margin Product Penetration

### Penjelasan

Mengukur berapa persen **existing customer** yang membeli produk dengan margin tinggi
di bulan berjalan. Produk high margin ditentukan secara **otomatis dari data** —
tidak perlu konfigurasi manual.

### Formula

```
M5 (%) = COUNT(existing customer yang beli ≥1 produk HM) / COUNT(TOTAL existing customer) × 100
```

- **Numerator**: existing customer yang punya ≥ 1 `invoice_item` dari produk high margin di bulan itu
- **Denominator**: **semua existing customer** (`first_invoice_date < awal bulan`),
  termasuk yang tidak transaksi bulan ini

> Perbedaan penting dari M3 dan M4: denominator M5 = TOTAL existing (bukan hanya yang transaksi).

### Definisi Produk High Margin (Dinamis)

Produk diklasifikasikan sebagai high margin per bulan berdasarkan **margin rate aktual**:

```
margin_rate (per produk per bulan) = SUM(gross_profit) / SUM(revenue) × 100
```

Dihitung dari `invoice_items` level, diagregasikan per `product_id` per bulan.

#### Threshold

| Kondisi | Threshold yang dipakai |
|---|---|
| `business_configs.high_margin_min_pct` tidak di-set atau = 0 | **Auto**: median margin rate semua produk bulan itu |
| `business_configs.high_margin_min_pct` di-set, misal `30` | **Manual**: produk dengan `margin_rate ≥ 30%` |

Threshold auto dihitung:
```sql
PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY margin_rate)
-- dari semua produk yang terjual di bulan tersebut (revenue > 0)
```

Threshold yang dipakai ditampilkan di subtitle chart:
`Auto-threshold: 28.8% margin rate` atau `Manual-threshold: 30% margin rate`

### Pipeline Kalkulasi

```
1. product_margin_rates
   → SUM(gp) / SUM(rev) per product_id per bulan
   → filter: revenue > 0

2. hm_threshold_calc
   → threshold = config atau median dari product_margin_rates

3. hm (high margin buyers)
   → customer yang punya invoice_item dengan product margin_rate ≥ threshold

4. M5 ratio
   → COUNT(hm ∩ existing) / COUNT(existing) × 100
```

### Sumber Data

| Tabel | Kolom | Keterangan |
|---|---|---|
| `invoices` | `invoice_date`, `customer_id` | Relasi ke items |
| `invoice_items` | `product_id`, `gross_profit`, `revenue` | Basis kalkulasi margin rate |
| `customers` | `first_invoice_date`, `is_placeholder` | Filter existing + dummy |
| `business_configs` | `high_margin_min_pct` | Threshold manual (opsional) |

### Konfigurasi Threshold Manual

Untuk menetapkan threshold fixed (misalnya selalu 30%):

```sql
INSERT INTO business_configs (key, value) VALUES ('high_margin_min_pct', '30')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
```

Kosongkan atau set `0` untuk kembali ke mode auto.

### Tampilan

- **Chart**: DonutChartWidget snapshot bulan berjalan
- **Hijau**: % existing customer yang membeli produk high margin
- **Abu (inactive)**: sisanya
- **Center**: persentase `bought_pct`
- **Subtitle**: threshold yang dipakai + mode (auto/manual)

---

## M6 — Repeat Order Rate

### Penjelasan

Mengukur berapa persen existing customer yang melakukan **lebih dari 1 transaksi** dalam active window 30 hari periode berjalan. "Repeat order" bukan sekadar transaksi, tapi minimal 2 invoice berbeda.

### Formula

```
M6 (%) = COUNT(existing yang punya >1 invoice dalam 30 hari) / COUNT(TOTAL existing) × 100
```

- **Numerator**: existing customer dengan `COUNT(DISTINCT invoice_id) > 1` dalam window `(period_end - 30 hari, period_end]`
- **Denominator**: semua existing customer di bulan itu (termasuk yang tidak transaksi)

### Threshold & Konfigurasi

Target diambil dari `business_configs.repeat_order_target_pct` (default: 80). Dapat diubah di halaman **Settings → Threshold → Target KPI** tanpa deploy ulang.

Threshold ini mengontrol:
- Warna RadialBarWidget (lingkaran penuh = target, bukan 100%)
- Status label: `✓ Sesuai Target` / `⚠ Mendekati Target` / `✗ Di Bawah Target`

```sql
-- CTE repeat_orders di fetchCustomerMetricsTrend
repeat_orders AS (
  SELECT e.ms, ri.customer_id
  FROM raw_inv ri
  JOIN months m ON
    ri.invoice_date > (m.ms + INTERVAL '1 month' - INTERVAL '1 day') - activeDays * INTERVAL '1 day'
    AND ri.invoice_date <= (m.ms + INTERVAL '1 month' - INTERVAL '1 day')
  JOIN existing e ON e.id = ri.customer_id AND e.ms = m.ms
  GROUP BY e.ms, ri.customer_id
  HAVING COUNT(DISTINCT ri.invoice_id) > 1
)

-- Di SELECT utama:
ROUND(COUNT(DISTINCT ro.customer_id)::numeric * 100 / NULLIF(COUNT(DISTINCT e.id), 0), 1)
AS repeat_order_rate
```

### API Response

`repeat_order_current` di endpoint `/metrics/customer-metrics`:
```json
{
  "repeat_order_current": {
    "value": 39.0,
    "target_pct": 80
  }
}
```

`target_pct` diambil paralel lewat `loadThresholds()` di service, bukan dari trend array.

### Drill-Down Modal (ROR Breakdown)

Klik RadialBarWidget → endpoint `GET /metrics/ror-breakdown?month=YYYY-MM&company_id=...`

| Kolom | Keterangan |
|---|---|
| Ranking | Urutan invoice_count terbesar |
| Nama Customer | Dari tabel `customers` |
| Kode | `customer_code` (nullable, tampil `—` jika null) |
| Jumlah Order | `invoice_count` — badge StatusChip (≥10=success, ≥5=primary, ≥3=info, default) |
| Total Revenue | Agregat revenue invoice di 30 hari itu |

Header modal: total existing, count repeat buyer, rate.

Modal menggunakan `ResponsiveListView` (DataGrid desktop / card mobile).

### Tampilan

- **Chart**: RadialBarWidget snapshot bulan berjalan
- **Domain**: `[0, target_pct]` — lingkaran penuh = target
- **Warna**: proporsi terhadap target (`pct = value / target_pct × 100`)
  - Hijau: `pct ≥ 100`
  - Kuning: `pct ≥ 75`
  - Merah: `pct < 75`
- **Klik**: buka modal ROR breakdown

---

## M7 — Customer Expansion Rate

### Penjelasan

Mengukur berapa persen existing customer yang spend-nya **naik** dibanding 30 hari sebelum active window. Denominator = semua existing, bukan hanya yang aktif di kedua periode.

### Formula

```
M7 (%) = COUNT(existing dimana rev_cur > rev_prev) / COUNT(TOTAL existing) × 100
```

- **Window aktif (cur)**: `(period_end - 30 hari, period_end]`
- **Window sebelumnya (prev)**: `(period_end - 60 hari, period_end - 30 hari]`
- **Numerator**: `COALESCE(cur.rev, 0) > COALESCE(prev.rev, 0)`
  - Termasuk customer yang tidak order di prev (prev.rev = 0) tapi order sekarang
  - Tidak termasuk customer yang tidak order di keduanya (0 > 0 = false)
- **Denominator**: `COUNT(DISTINCT e.id)` — semua existing

```sql
-- CTE prev_inv_agg di fetchCustomerMetricsTrend
prev_inv_agg AS (
  SELECT e.ms, ri.customer_id, SUM(ri.rev) AS rev
  FROM raw_inv ri
  JOIN months m ON
    ri.invoice_date > (m.ms + '1 month'::interval - '1 day'::interval) - activeDays * 2
    AND ri.invoice_date <= (m.ms + '1 month'::interval - '1 day'::interval) - activeDays
  JOIN existing e ON e.id = ri.customer_id AND e.ms = m.ms
  GROUP BY e.ms, ri.customer_id
)

-- Di SELECT utama:
ROUND(
  COUNT(DISTINCT CASE WHEN COALESCE(cur.rev, 0) > COALESCE(prv.rev, 0) THEN e.id END)::numeric * 100
  / NULLIF(COUNT(DISTINCT e.id), 0), 1
) AS expansion_rate
```

### Service Layer

```typescript
up_rate:        row.expansion_rate,
flat_down_rate: parseFloat((100 - row.expansion_rate).toFixed(1)),
```

`flat_down_rate` = sisa existing yang spending-nya flat/turun (termasuk yang tidak order sama sekali).

### Drill-Down Modal

*(Ditambahkan 2026-07-23)* Klik pada bar bulan tertentu membuka modal Expansion
Breakdown (`GET /metrics/expansion-breakdown`, `fetchExpansionBreakdown` di
`m3m7.repository.ts`) yang menampilkan per customer:

| Kolom | Keterangan |
|---|---|
| Ranking | Urutan `(cur_revenue - prev_revenue)` terbesar ke terkecil |
| Nama customer | Dari tabel `customers` |
| Revenue Sebelumnya | `prev_revenue` (window 30 hari sebelum active window) |
| Revenue Sekarang | `cur_revenue` (active window) |
| % Perubahan | `NULL` kalau `prev_revenue = 0` (customer baru, tidak ada basis pembagi) |
| Status | `up` (hijau) jika `cur_revenue > prev_revenue`, else `flat_down` |

Header modal menampilkan: jumlah customer spending naik (`up_count`), total existing
(`total_existing`), dan up rate hasil hitung ulang dari keduanya — sudah diverifikasi
`up_count / total_existing` match persis dengan `up_rate` di trend endpoint (M7 chart)
untuk bulan yang sama.

### Tampilan

- **Chart**: BarChartWidget 100% stacked horizontal 12 bulan
- **Hijau** (`up_rate`): % existing dengan spending naik
- **Abu-abu** (`flat_down_rate`): % flat/turun/tidak aktif
- **Label**: persentase langsung di dalam bar via `showLabels` + `labelFormatter`
- **Subtitle**: "Hijau = % spending naik vs 30 hari sebelumnya · Abu-abu = % flat/turun"
- **Modal**: tabel drill-down per bulan (lihat Drill-Down Modal di atas)
