# Dokumentasi Metrik 10 KPI — Customer Loyal Dashboard

> Dokumen ini menjelaskan definisi bisnis, formula, parameter, dan sumber data untuk
> metrik-metrik pada halaman `/customer-metrics`, `/cross-selling`, dan
> `/dormant-customer`.
>
> Ditulis ulang bertahap (task029.md §36, mulai 2026-08-25) mengikuti dokumen SSOT
> resmi "DEFINISI OPERASIONAL Customer Loyal Dashboard" — sebelumnya dokumen ini
> cuma mencakup M3-M7 (judul lama "Dokumentasi Metrik M3 · M4 · M5") dan beberapa
> bagian sudah usang (mis. window "30 hari" M6/M7 — lihat catatan di section
> masing-masing). Dikerjakan satu KPI per satu, bukan sekaligus.
>
> Last updated: 2026-08-25 (M1, M2 ditambahkan; M3, M4, M5, M6 direview
> ulang & disesuaikan ke SSOT + granularitas; M5 chart-nya juga diganti
> total dari Donut snapshot ke trend 12 titik; M7 masih versi lama, belum
> direview ulang)
> Baca juga: `executive-dashboard/metrics.md` (definisi bisnis global)

---

## Definisi Umum

Dashboard ini punya **DUA konsep populasi berbeda**, dipakai KPI yang berbeda pula
(task029.md §34, dikonfirmasi ke dokumen SSOT resmi 2026-08-25) — jangan disamakan:

### Customer Aktif

Customer yang dianggap "aktif" pada suatu periode adalah customer yang memenuhi syarat:

```
customer punya ≥1 invoice DI DALAM rentang periode (period_start s.d. period_end)
AND customers.is_placeholder = false
```

**TIDAK ADA syarat riwayat transaksi sebelumnya** — customer baru (transaksi pertama
DI DALAM periode ini) IKUT terhitung. Dipakai **M1 (Cross Sell Ratio)** dan
**M2 (Average Product Category per Customer)** — lihat section M1 di bawah.

### Existing Customer

Customer yang dianggap "existing" pada suatu bulan adalah customer yang memenuhi syarat:

```
customers.first_invoice_date < awal bulan (period_start)
AND customers.is_placeholder = false
```

Customer baru (first invoice DI DALAM periode ini) **dikecualikan**. Dipakai
**M3, M4, M5, M6, M7** (masing-masing dengan syarat tambahan berbeda-beda, lihat
section per KPI) dan sebagian **M8-M10**.

Customer **dummy** (PELANGGAN UMUM, WALK-IN, dll.) dikecualikan melalui kolom
`is_placeholder = true` yang di-set otomatis saat import — berlaku di KEDUA
definisi di atas.

### Parameter Global

| Parameter | Tipe | Default | Keterangan |
|---|---|---|---|
| `company_id` | `integer \| "all"` | `"all"` | Filter per entitas; 0 = semua holding |
| `period_month` | `YYYY-MM` | Bulan berjalan | Bulan referensi; chart selalu tampilkan 12 bulan ke belakang |

---

## M1 — Cross Sell Ratio

### Penjelasan

Mengukur keberhasilan strategi cross-selling dan kedalaman hubungan bisnis dengan
customer — berapa persen customer yang beli lebih dari 1 kategori produk dalam
1 periode. Populasinya **Customer Aktif** (lihat Definisi Umum), BUKAN Existing —
customer baru IKUT dihitung sejak transaksi pertamanya, beda dari M3-M7.

### Formula

```
Cross-Sell Rate (%) = COUNT(customer aktif, cat_count > 1) / COUNT(TOTAL customer aktif) × 100
```

- **Numerator**: customer aktif dengan `COUNT(DISTINCT product_category_id) > 1` di
  dalam periode
- **Denominator**: semua customer aktif periode itu (`COUNT(*)` dari populasi Customer
  Aktif — TANPA syarat riwayat sebelumnya)

Rentang transaksi yang dianalisis ikut LEBAR PERIODE PENUH sesuai granularitas
filter (Bulanan/Kuartal/Semester/Tahunan — Kuartal/Tahunan pakai elapsed cutoff kalau
periode itu masih berjalan, BUKAN dipotong ke 1 bulan terakhir).

### Metrik turunan (kartu ringkasan)

```
avg_categories       = AVG(cat_count) dari semua customer aktif (bukan cuma yg >1 kategori)
total_distinct_cats  = COUNT(DISTINCT product_category_id) terjual di periode itu
```

### Benchmark Interpretasi

| Rentang | Label | Keterangan |
|---|---|---|
| `< 25%` | Rendah | Single Product Dependency |
| `25% – 40%` | Cukup | Basic Solution Penetration — baseline sehat utk distributor AIDC |
| `40% – 60%` | Baik | Cross-sell berjalan efektif / Integrated Customer Account |
| `> 60%` | Sangat Baik | Customer engagement dan product penetration kuat |

**STATUS: SEBAGIAN diimplementasikan** (2026-08-25) — 3 garis batas band (25/40/60,
dashed, warna warning→success) ditampilkan langsung di chart trend M1
(`ComboChartWidget`, prop `referenceLines` baru), menempel di axis rate yang sama
dgn garis Cross-Sell Rate-nya (domain axis otomatis melebar supaya garis ini tidak
pernah terpotong). BELUM ada: label kategori teks ("Rendah"/"Cukup"/dst) atau
pewarnaan area/zona per band — cuma garis batas angka, bukan visualisasi warna
penuh spt band M6/M8/M10 (`business_configs` + status chip warna). Threshold
di sini HARDCODE di frontend (bukan `business_configs`) — dokumen SSOT
menyatakan angka ini "benchmark umum, dapat disesuaikan dengan industri", beda
sifat dari target M6/M8/M10 yang memang dirancang configurable per perusahaan.

### Drill-Down — M1 Detail (klik titik chart / tombol)

`GET /metrics/cross-selling` dgn `period_end` titik yang diklik
(`fetchCrossSellingDetail`, `m1.repository.ts`):

| Kolom | Keterangan |
|---|---|
| Nama customer | Dari tabel `customers` |
| Jumlah Kategori | `category_count` — jumlah kategori produk unik dibeli |
| Total Revenue | Revenue customer itu di periode tsb |
| Branch/Divisi/Channel | Dari invoice TERBARU customer itu DI DALAM periode (bukan all-time) |
| Tipe Produk | Breakdown per `item_type` (unit/consumable/sparepart) — qty & revenue masing-masing |

### Drill-Down — M1.1 Heatmap (Customer × Kategori Produk)

`GET /metrics/cross-selling` (`fetchCrossSellingHeatmap`) — matrix top 30 customer
(berdasarkan revenue) × kategori produk, sel = jumlah transaksi customer itu di
kategori itu (`—` = tidak pernah beli). Layout khusus mobile (grid kolom per
customer, bukan scroll horizontal tabel penuh).

### Sumber Data

| Tabel | Kolom | Keterangan |
|---|---|---|
| `invoices` | `invoice_date`, `customer_id`, `branch_id`, `channel_name` | Header invoice |
| `invoice_items` | `product_category_id`, `revenue`, `quantity` | Basis hitung kategori + breakdown tipe produk |
| `customers` | `is_placeholder` | Filter dummy (TIDAK pakai `first_invoice_date` — populasi Customer Aktif tidak butuh riwayat) |
| `channel_divisions` | `division_id` | Fallback mapping divisi dari channel |

### Tampilan

- **Chart**: `ComboChartWidget` — trend N-periode (bar = Pelanggan Aktif abu-abu +
  Multi-Produk biru bertumpuk, garis = Cross-Sell Rate)
- **KpiHeader**: current vs YoY (fetch 2x, `period_end` digeser -1 tahun, murni
  frontend, tidak ada perubahan backend)
- **Top 5**: Top Movers timeline, basis MoM (periode langsung sebelumnya, bukan YoY)
- **Heatmap M1.1**: lihat Drill-Down di atas

---

## M2 — Average Product Category per Customer (APCPC)

### Penjelasan

Mengukur kedalaman pembelian (purchase depth) — rata-rata jumlah kategori produk
unik yang dibeli tiap customer aktif dalam 1 periode. **Berbagi 100% data mentah
dengan M1** (1 fetch, 1 populasi, 1 query backend — `fetchCrossSellingKPI`/
`fetchCrossSellingTrend`, `m1.repository.ts`) — TIDAK ada query/populasi
terpisah, cuma tampilan/drill-down yang beda.

### Formula

```
Avg Category (APCPC) = AVG(cat_count) dari semua customer aktif
                      = Total kategori unik dibeli SELURUH customer aktif ÷ Jumlah customer aktif
```

`cat_count` per customer = `COUNT(DISTINCT product_category_id)` dalam periode itu.
Populasi = **Customer Aktif** (sama persis M1 — lihat Definisi Umum), BUKAN
Existing.

### Interpretasi KPI

Tidak ada band angka resmi (beda dari M1 yang punya 25/40/60) — interpretasinya
kualitatif: makin tinggi APCPC makin baik penetrasi produk; kenaikan biasanya
menandakan bundling efektif, up-selling/cross-selling berhasil, atau customer
engagement menguat.

### Drill-Down — M2 Detail (klik titik chart)

`GET /metrics/cross-selling` dgn `period_end` titik yang diklik
(`fetchCrossSellingDetail`, sama fungsi dgn drill-down M1, filter/tampilan beda):

| Kolom | Keterangan |
|---|---|
| Nama customer | Dari tabel `customers` |
| Beli Unit / Consumable / Sparepart | 3 kolom checkbox (`has_unit`/`has_consumable`/`has_sparepart`) — apakah customer beli tipe produk itu di periode ini |
| Jumlah Kategori | `category_count` |
| Total Revenue | Revenue customer itu di periode tsb |

Header dialog: rata-rata kategori, total kategori unik terjual (`total_distinct_cats`),
jumlah customer aktif (`active_count`) — titik yang diklik, bukan titik terakhir.

### Sumber Data

Sama persis M1 (lihat section M1 — `invoices`, `invoice_items`, `customers.is_placeholder`,
`channel_divisions`). Tidak ada tabel/kolom tambahan khusus M2.

### Tampilan

- **Chart**: `ComboChartWidget` — trend N-periode (bar STACKED: Single Category +
  Multi Category = Total Customer Aktif, `single_category` dihitung di frontend
  dari `total_active - multi_product`; garis = Avg Category)
- **KpiHeader**: current vs YoY (fetch 2x, pola sama M1)
- **Top 5**: Top Movers timeline, basis MoM (sama pola M1)

---

## M3 — Average Revenue per Existing Customer (ARPEC)

### Penjelasan

Mengukur rata-rata pendapatan yang dihasilkan dari **existing customer yang aktif
bertransaksi** dalam 1 periode (Bulanan/Kuartal/Semester/Tahunan — task029.md
§30.13, generalisasi dari "Tren 12 bulan" hardcode lama). Dipakai mengukur nilai
ekonomi customer yang dipertahankan dan efektivitas strategi retensi/pengembangan
akun.

**Dicek terhadap dokumen SSOT resmi (task029.md §36, 2026-08-25) — SUDAH SESUAI**:
definisi "Existing Customer" di SSOT eksplisit mensyaratkan "riwayat sebelum
periode DAN masih melakukan pembelian pada periode tersebut" — PERSIS populasi
yang dipakai di bawah (bukan "existing kumulatif" tanpa syarat aktif). Konsekuensi
penting: customer yang berhenti total (dormant) otomatis TIDAK masuk populasi ini
dgn sendirinya (karena syarat "masih membeli" sudah menyingkirkan mereka) — TIDAK
butuh gerbang dormant terpisah, beda dari M7 (lihat section M7).

### Formula

```
Avg Revenue (M3) = SUM(revenue existing yang transaksi) / COUNT(existing yang transaksi)
```

- **Numerator**: total revenue dari invoice existing customer yang punya transaksi di periode itu
- **Denominator**: jumlah existing customer yang punya ≥ 1 invoice di periode itu
  (bukan total existing — yang tidak transaksi tidak masuk denominator)

### Enrichment: Top Contributor + Badge Konsentrasi

Setiap bulan dihitung siapa existing customer dengan revenue tertinggi:

```
top_rev_pct = (revenue customer X) / SUM(revenue semua existing) × 100
```

- Ditampilkan di tooltip: `Top: [nama], [revenue], [%]`
- Badge ⚠ muncul di chart jika `top_rev_pct > 25%` (konsentrasi tinggi)

### Drill-Down Modal

*(Ditambahkan 2026-07-23, granularitas-aware sejak 2026-08-25 §33)* Klik pada
batang periode tertentu membuka modal Revenue Breakdown (`GET
/metrics/revenue-breakdown`, `date_from` dikirim = awal periode yang diklik,
mirror pola M4 gp-breakdown) yang menampilkan:

| Kolom | Keterangan |
|---|---|
| Ranking | Urutan revenue terbesar ke terkecil |
| Nama customer | Dari tabel `customers` |
| Revenue | Revenue periode tersebut |
| % Total | Kontribusi revenue terhadap total revenue existing periode itu |
| Tier | Atas / Tengah / Bawah (berdasarkan median revenue periode itu, pola sama dengan tier M4) |

Header modal menampilkan: total revenue existing, avg revenue/customer, median threshold,
jumlah customer transaksi.

*(Sempat dicoba 2026-08-25: breakdown populasi 4-angka — Total Pelanggan/
Pelanggan Lama/Baru/Aktif — TAPI DIBATALKAN sama hari, instruksi user:
"jangan ditampilkan kalau memang tidak masuk hitungan" — 3 dari 4 angka itu
tidak ikut dipakai di rumus mana pun di modal ini (cuma informasi jumlah
orang), dianggap membingungkan ditaruh bersebelahan dgn angka hasil
hitungan. Modal kembali ke set info semula, cuma `total_existing` yang
tetap benar sesuai koreksi di bawah.)*

**KOREKSI 2026-08-25 (task029.md §36, susulan pertanyaan user thd screenshot
modal M3)** — sebelumnya `total_existing` modal ini pakai `cteEstablishedCustomers`
mentah (cohort FIXED, TERMASUK yang tidak transaksi sama sekali di periode ini,
keputusan lama "template standar KPI4") — TERNYATA bertentangan dgn definisi
SSOT sendiri ("Existing Customer... DAN MASIH MELAKUKAN PEMBELIAN PADA PERIODE
TERSEBUT"). Diperbaiki: `total_existing` SEKARANG `COUNT(*)` dari
`existing_revenue` (established customer yang BENAR-BENAR transaksi di
`date_from`..`filterDate`) — persis sama populasi yang menyumbang "Total
Revenue" di atasnya, dan SEKARANG konsisten dgn `existing_customers` trend
chart utk periode yang sama (dulu modal SELALU jauh lebih besar, mis. 32.631
vs 855 riil transaksi — 38× lipat, sekarang match). Efek ikutan: "Avg
Revenue/Customer" (dihitung frontend, `total_revenue ÷ total_existing`) JADI
JAUH LEBIH BESAR dari sebelumnya (pembagi mengecil drastis) — situasi
Rp7 jutaan/customer, bukan lagi Rp100-200 ribuan.

Tooltip chart dan modal drill-down memakai formatter angka yang sama persis
(`fmtRpDetail`, 2 desimal) — sebelumnya tooltip pakai `fmtRp` (1 desimal) sehingga
angka tampak beda (mis. "2,4M" vs "2,35M") padahal data underlying identik.

### Sumber Data

| Tabel | Kolom | Keterangan |
|---|---|---|
| `invoices` | `total_revenue`, `invoice_date`, `customer_id` | Header invoice |
| `customers` | `first_invoice_date`, `is_placeholder` | Filter existing + dummy |

### Tampilan

- **Chart**: ComboChartWidget N-periode (batang = total revenue existing, garis = avg revenue)
- **Y-axis**: format `Rp` disingkat (`jt`, `rb`)
- **Tooltip**: avg revenue periode itu + top contributor + badge konsentrasi
- **Modal**: tabel drill-down per periode (lihat Drill-Down Modal di atas)

---

## M4 — Average Gross Profit per Existing Customer (AGPEC, Tier Breakdown)

### Penjelasan

Mengukur rata-rata laba kotor (gross profit) dari existing customer yang bertransaksi
dalam 1 periode (Bulanan/Kuartal/Semester/Tahunan) — profitabilitas customer lama dari
kontribusi margin, bukan cuma omzet. Sekaligus membagi distribusi GP ke dalam **3 tier
berdasarkan median GP periode tersebut**, ditampilkan sbg stacked bar.

**Dicek terhadap dokumen SSOT resmi (task029.md §36, 2026-08-25) — SUDAH SESUAI**:
definisi "Existing Customer" sama persis M3 ("riwayat sebelum periode DAN masih
melakukan pembelian pada periode tersebut"), "Gross Profit = Revenue − COGS" (kolom
`invoices.total_gp`, dihitung saat import).

### Formula Avg GP

```
Avg GP (M4) = SUM(gross_profit existing yang transaksi) / COUNT(existing yang transaksi)
```

- **Numerator**: total GP dari invoice existing customer yang punya transaksi di periode itu
- **Denominator**: jumlah existing customer yang punya ≥ 1 invoice di periode itu

### Klasifikasi Tier (Median-Based)

Tier dihitung ulang setiap periode menggunakan **median GP individu** periode tersebut:

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

Klik pada batang periode tertentu membuka modal GP Breakdown (`GET
/metrics/gp-breakdown`, `date_from` = awal periode yang diklik) yang menampilkan:

| Kolom | Keterangan |
|---|---|
| Ranking | Urutan GP terbesar ke terkecil |
| Nama customer | Dari tabel `customers` |
| GP | Gross profit periode tersebut |
| % Total | Kontribusi GP terhadap total GP periode itu |
| Tier | Atas / Tengah / Bawah (berdasarkan median periode itu) |

Header modal menampilkan: total GP, avg GP/customer, nilai median threshold, jumlah customer transaksi.

**KOREKSI 2026-08-25 (task029.md §36)** — sama bug persis M3: `total_existing`
modal ini SEBELUMNYA pakai `cteEstablishedCustomers` mentah (cohort FIXED,
TERMASUK yang tidak transaksi periode ini). Diperbaiki: SEKARANG `COUNT(*)`
dari `existing_gp` (established customer yang BENAR-BENAR transaksi di
rentang ini) — konsisten dgn `existing_customers` trend chart. Efek ikutan:
"Avg GP/Customer" (dihitung frontend) jadi lebih besar dari sebelumnya.

Modal mendukung **export PDF** via jsPDF + autoTable.

### Sumber Data

| Tabel | Kolom | Keterangan |
|---|---|---|
| `invoices` | `total_gp`, `invoice_date`, `customer_id` | Header invoice |
| `customers` | `first_invoice_date`, `customer_name`, `customer_code`, `is_placeholder` | Filter + label |

### Tampilan

- **Chart**: BarChartWidget stacked N-periode (tier1/tier2/tier3)
- **Y-axis**: format `Rp` disingkat
- **Tooltip**: total GP + avg GP + breakdown tier + top contributor
- **Modal**: tabel drill-down per bulan + PDF export

---

## M5 — High Margin Product Penetration (HMPP)

### Penjelasan

Mengukur sejauh mana perusahaan berhasil mendorong penjualan produk bermargin
tinggi — persentase existing customer yang membeli minimal 1 produk High
Margin dalam 1 periode (Bulanan/Kuartal/Semester/Tahunan). Mengukur porsi
CUSTOMER yang membeli (penetrasi), BUKAN porsi revenue-nya (itu ranah M3
"Kontribusi High Margin").

**Dicek terhadap dokumen SSOT resmi (task029.md §36, 2026-08-25)** — populasi
M5 SEMPAT diperdebatkan (dokumen tidak py bullet "Existing Customer" lengkap
di section-nya sendiri spt M3/M4/M7, cuma "Customer Aktif" generik) —
**dikonfirmasi ULANG via data nyata** (perbandingan 12 bulan Existing vs
Customer Aktif, rate SELALU lebih rendah kalau customer baru diikutkan,
konsisten ~1-1,7pp tiap bulan): **keputusan akhir user TETAP "Existing"**
("karena tidak disebutkan [customer baru harus diikutsertakan]" di dokumen).

### Formula

```
HMPP (%) = COUNT(existing customer yang beli ≥1 produk HM) / COUNT(Existing Customer aktif) × 100
```

- **Numerator**: existing customer yang punya ≥ 1 `invoice_item` dari produk High Margin di periode itu
- **Denominator**: existing customer yang aktif (punya ≥1 invoice APA PUN) di periode itu —
  BUKAN cuma yang beli HM, BUKAN JUGA fixed cohort (lihat KOREKSI di bawah)

### Definisi Produk High Margin — MANUAL (bukan dihitung otomatis)

**Koreksi dari versi dokumen lama** (deskripsi "auto-threshold dari median margin
rate" di bawah ini SUDAH TIDAK BERLAKU, ditemukan usang 2026-08-25) — produk
High Margin sekarang ditandai MANUAL oleh admin (tabel `high_margin_products`,
halaman **Settings → High Margin**), BUKAN dihitung otomatis dari margin rate
transaksi. 1 baris = 1 mapping `product_id` ATAU `product_category_id` →
berlaku dalam rentang `effective_from`..`effective_until` (nullable = masih
berlaku sampai sekarang). Invoice item masuk hitungan HM kalau tanggal
invoice-nya jatuh dalam rentang effective mapping yang relevan.

### KOREKSI 2026-08-25 (task029.md §36) — bug `total_existing` drilldown

Sama pola M6 (bukan M3/M4) — denominator M5 BUKAN "yang beli HM" (itu
numerator), tapi SEMUA existing yang aktif transaksi APA PUN. `fetchHmBreakdown`
SEBELUMNYA pakai `COUNT(*) FROM established_customers` (fixed cohort). Diperbaiki:
CTE baru `inv_active` (any invoice di rentang, TANPA JOIN `high_margin_products`)
— mirror alias `cur` di trend chart `high_margin_ratio`.

### Top 5 — ranking berdasarkan JUMLAH, bukan Rupiah

**Koreksi 2026-08-25** (instruksi user: *"Top 5 itu harusnya jumlah terbanyak
bukan value nya"*) — SEBELUMNYA ranking pakai `hm_revenue DESC` (nilai
Rupiah), padahal M5 mengukur PENETRASI (jumlah/keluasan), bukan nilai uang.
Diganti ke `hm_qty DESC` (total UNIT/quantity produk High Margin terjual,
`SUM(invoice_items.quantity)`) — field baru `hm_qty` ditambahkan ke
`fetchHmBreakdown`, kolom baru "Qty HM" juga muncul di tabel drilldown.

### Drill-Down Modal (HM Breakdown)

Klik titik chart → endpoint `GET /metrics/hm-breakdown` (`date_from` = awal periode yang diklik)

| Kolom | Keterangan |
|---|---|
| Ranking | Urutan `hm_qty` (unit terbanyak) terbesar ke terkecil |
| Nama customer | Dari tabel `customers` |
| Qty HM | Total unit produk High Margin terjual ke customer itu |
| Revenue HM | Total revenue dari produk High Margin (info tambahan, BUKAN basis ranking) |
| % HM | Kontribusi revenue HM customer itu terhadap total revenue HM periode itu |

Header modal: total existing, jumlah pembeli HM, penetrasi (dihitung ULANG
dari 2 angka drilldown itu sendiri — BUKAN dari titik terakhir trend, supaya
benar walau titik yang diklik beda dari titik terakhir), total revenue HM.

### Sumber Data

| Tabel | Kolom | Keterangan |
|---|---|---|
| `invoices` | `invoice_date`, `customer_id` | Relasi ke items |
| `invoice_items` | `product_id`, `quantity`, `revenue` | Basis Qty/Revenue HM |
| `high_margin_products` | `product_id`, `product_category_id`, `effective_from`, `effective_until` | Mapping MANUAL admin — SSOT produk mana yang dianggap High Margin |
| `customers` | `first_invoice_date`, `is_placeholder` | Filter existing + dummy |

### Tampilan

- **Chart**: `ComboChartWidget` — trend N-periode (bar STACKED: Tidak Membeli +
  Membeli High Margin = Total Existing Customer aktif; garis = Penetrasi HM %)
  — **GANTI dari DonutChartWidget snapshot 1 titik** (koreksi 2026-08-25,
  instruksi user: *"chart nya buat jadi 12 titik tren seperti cart lain"*)
- **KpiHeader**: current vs YoY (titik terakhir trend vs titik terakhir trend YoY)
- **Top 5**: Top Movers timeline, basis `hm_qty` (lihat di atas)
- **Modal**: tabel drill-down per periode (lihat Drill-Down Modal di atas)

---

## M6 — Repeat Order Rate (ROR)

### Penjelasan

Mengukur persentase existing customer yang melakukan pembelian ulang (**lebih dari 1 transaksi**) dalam 1 periode (Bulanan/Kuartal/Semester/Tahunan) — loyalitas customer, kualitas pengalaman pelanggan, dan efektivitas strategi retensi. "Repeat order" artinya minimal 2 invoice berbeda dalam periode itu, bukan sekadar pernah beli sebelumnya.

**Dicek terhadap dokumen SSOT resmi (task029.md §36, 2026-08-25) — SUDAH SESUAI**:
"Customer yang Melakukan Repeat Order" (numerator, >1 transaksi periode ini)
BEDA dari "Existing Customer" (denominator, cuma syarat riwayat + masih
beli, TANPA syarat harus >1 kali) — dokumen memisahkan keduanya secara
eksplisit.

### Formula

```
ROR (%) = COUNT(existing yang punya >1 invoice periode ini) / COUNT(Existing Customer aktif) × 100
```

- **Numerator**: existing customer dengan `COUNT(DISTINCT invoice_id) > 1` dalam periode
- **Denominator**: existing customer yang punya ≥ 1 invoice di periode itu (SEMUA yang aktif,
  bukan cuma yang repeat order)

### Threshold & Konfigurasi

Target diambil dari `business_configs.repeat_order_target_pct` (default: 80). Dapat diubah di halaman **Settings → Threshold → Target KPI** tanpa deploy ulang.

Threshold ini mengontrol:
- Warna RadialBarWidget (lingkaran penuh = target, bukan 100%)
- Status label: `✓ Sesuai Target` / `⚠ Mendekati Target` / `✗ Di Bawah Target`

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

Klik RadialBarWidget → endpoint `GET /metrics/ror-breakdown` (`date_from` = awal periode yang diklik)

| Kolom | Keterangan |
|---|---|
| Ranking | Urutan invoice_count terbesar |
| Nama Customer | Dari tabel `customers` |
| Kode | `customer_code` (nullable, tampil `—` jika null) |
| Jumlah Order | `invoice_count` — badge StatusChip (≥10=success, ≥5=primary, ≥3=info, default) |
| Total Revenue | Agregat revenue invoice di periode itu |

Header modal: total existing, count repeat buyer, rate.

**KOREKSI 2026-08-25 (task029.md §36)** — `total_existing` modal ini
SEBELUMNYA `COUNT(*)` dari `established_customers` mentah (fixed cohort).
Diperbaiki: SEKARANG `COUNT(*)` dari established customer yang benar-benar
punya invoice APA PUN di rentang ini (CTE baru `inv_active`, BUKAN cuma yang
repeat order — beda dari fix M3/M4 yang cukup swap ke populasi numerator,
di M6 numeratornya sendiri SUDAH subset lebih sempit dari denominator yang
benar). Konsisten dgn `existing_customers`/`repeat_order_rate` trend chart.

Modal menggunakan `ResponsiveListView` (DataGrid desktop / card mobile).

### Tampilan

- **Chart**: RadialBarWidget snapshot titik terakhir trend (granularitas-aware)
- **Domain**: `[0, target_pct]` — lingkaran penuh = target
- **Warna**: proporsi terhadap target (`pct = value / target_pct × 100`)
  - Hijau: `pct ≥ 100`
  - Kuning: `pct ≥ 75`
  - Merah: `pct < 75`
- **Klik**: buka modal ROR breakdown

---

## M7 — Customer Expansion Rate

### Penjelasan

Mengukur pertumbuhan nilai bisnis dari existing customer melalui peningkatan
pembelian — dipakai utk menilai efektivitas strategi account growth dan
customer value expansion. Berapa persen existing customer (yang BELUM
lewat ambang dormant) yang spend-nya **naik** dibanding periode
SEBELUMNYA (lebar sama, calendar-anchored, granularitas-aware — bukan lagi
30/60 hari hardcode, lihat "REVISI 2026-08-23/25" di bawah).

**Populasi (REVISI 2026-08-25, task029.md §34.1)** — BUKAN "semua existing"
polos (definisi §M3-M6). Existing customer yang SUDAH resmi dormant
(melewati `dormantThresholdCaseSql`, sama ambang per kategori bisnis divisi
dgn M8) DIKELUARKAN dari denominator — itu ranah M8, bukan lagi soal
"expansion". Yang tersisa jadi "existing DAN belum lewat ambang dormant"
(alias `established_not_dormant`) — customer yang baru absen tapi belum
resmi dormant tetap masuk hitungan, kebaca sbg kategori "Tidak Aktif"
(sinyal dini, masih actionable).

### Formula

```
M7 (%) = COUNT(existing_not_dormant dimana rev_cur > rev_prev) / COUNT(TOTAL existing_not_dormant) × 100
```

- **Window aktif (cur)**: bucket granularitas yang sedang dilihat (`dateFrom`..`filterDate`, ikut periodType — bulanan/kuartal/semester/tahunan)
- **Window sebelumnya (prev)**: bucket SEBELUMNYA, lebar sama, calendar-anchored (period-anchored posisi relatif sama, BUKAN lagi rolling 30 hari mundur — koreksi user 2026-08-23: "membandingkan 1-7 vs 26-31 itu makesense?")
- **Numerator**: `cur_revenue > prev_revenue` (`COALESCE(...,0)` implisit dari `LEFT JOIN`)
  - Termasuk customer yang tidak order di prev tapi order sekarang
  - Tidak termasuk customer yang tidak order di keduanya (0 > 0 = false, masuk `inactive`)
- **Denominator**: `COUNT(*)` dari `established_customers JOIN established_not_dormant` — fixed cohort per business rule di `filterDate` (pola "Template Standar Kartu KPI4": Total = fixed cohort, kategori = partisi eksak dari cohort itu, BUKAN rata-rata snapshot)

```sql
-- CTE established_not_dormant (m3m7.repository.ts, fetchExpansionBreakdown/
-- fetchCustomerMetricsTrend) — gerbang dormant, SAMA PERSIS ambang M8
established_not_dormant AS (
  SELECT ec.id
  FROM established_customers ec
  JOIN cust_dormant_threshold cdt ON cdt.cid = ec.id
  LEFT JOIN last_inv_unbounded li ON li.customer_id = ec.id AND li.invoice_date <= filterDate
  GROUP BY ec.id, cdt.dormant_threshold
  HAVING MAX(li.invoice_date) IS NOT NULL
    AND MAX(li.invoice_date) > filterDate - cdt.dormant_threshold * INTERVAL '1 month'
)

-- Status per customer (exhaustive partition dari combined = established JOIN established_not_dormant)
CASE
  WHEN cur_revenue > prev_revenue THEN 'up'
  WHEN cur_revenue = prev_revenue AND cur_revenue = 0 THEN 'inactive'
  WHEN cur_revenue = prev_revenue THEN 'flat'
  ELSE 'down'
END AS status
```

### Service Layer

```typescript
expansion_rate: row.expansion_rate,  // up_rate — dulu bernama up_rate, sekarang expansion_rate (m3m7.repository.ts TrendRow)
flat_rate:      row.flat_rate,
inactive_rate:  row.inactive_rate,
down_rate:      row.down_rate,
```

Field lama `up_rate`/`flat_down_rate` (binary) SUDAH DIGANTI 4 field
terpisah di atas sejak revisi 4-way (2026-08-21) — lihat tabel di bawah.

**4-way (REVISI 2026-08-21, KERAS — user: "datamu tidak valid jika tanpa
transaksi kamu beri label stabil")** — versi 3-way lama (`flat_rate` =
`cur_revenue = prev_revenue`, TERMASUK sama-sama 0) SALAH secara bisnis:
customer yang tidak order sama sekali di kedua window dilabeli "Stabil",
padahal mereka tidak melakukan apa pun. Dipisah eksak jadi 4 kategori
(`fetchCustomerMetricsTrend`, dipakai chart diverging & SummaryCard tab
Overview `M7ExpansionGrowth.tsx`):

| Kategori | Kondisi | Makna bisnis |
|---|---|---|
| `up_rate` | `cur > prev` | Spending naik |
| `flat_rate` | `cur = prev` DAN `cur > 0` | Genuinely tidak berubah, MASIH order |
| `inactive_rate` | `cur = prev = 0` | TIDAK ADA transaksi sama sekali di kedua window |
| `down_rate` | `cur < prev` | Spending turun (bisa turun ke 0 juga) |

Di data lokal (company='all'): Up 1.7%, Flat **0.2%**, Inactive **90.0%**,
Down 8.1% — sebelumnya "Flat" gabungan lama tampil ~90.2%, MENYEMBUNYIKAN
fakta bahwa hampir semuanya sebenarnya "tidak ada transaksi" (window aktif
cuma 30 hari, kohort existing jauh lebih lebar dari itu — wajar mayoritas
tidak transaksi di window sesempit ini, tapi itu bukan "stabil").

### Drill-Down (dialog klik-titik + tabel breakdown, direvisi 2026-08-21)

Klik titik chart ATAU tabel breakdown yang selalu tampil di tab Trend
Analysis, keduanya sumber datanya `GET /metrics/expansion-breakdown`
(`fetchExpansionBreakdown`, `m3m7.repository.ts`):

| Kolom | Keterangan |
|---|---|
| Nama customer | Dari tabel `customers` |
| Branch/Division/Channel | **BARU 2026-08-21** — dari invoice TERBARU customer itu DI DALAM window "current", pola sama `latest_inv` M1 (`m1.repository.ts`). Division fallback 3-level: `division_override_id` → `channel_divisions` → divisi "other" (sama persis M1) |
| Revenue Sebelumnya | `prev_revenue` (window 30 hari sebelum active window) |
| Revenue Sekarang | `cur_revenue` (active window) |
| % Perubahan | `NULL` kalau `prev_revenue = 0` (customer baru, tidak ada basis pembagi) |
| Status | 4-way: `up`/`flat`/`inactive`/`down` (revisi 2026-08-21 dari 3-way `up`/`flat`/`down`, yang sebelumnya dari binary `up`/`flat_down`) — `inactive` = `cur_revenue = prev_revenue = 0`, dipisah dari `flat` yang sekarang cuma `cur = prev` DAN `cur > 0` |

Kolom **Ranking** (angka urutan) DIHAPUS dari tampilan 2026-08-21 — di
tabel breakdown yang bisa di-sort ulang user (Name/Revenue/Change), angka
ranking dari backend (tetap urutan revenue delta desc) jadi tidak sinkron
dgn urutan baris yang tampil, membingungkan. Kolom **Customer Code**
JUGA dihapus — `customer_code` NULL utk SEMUA customer di data lokal,
kolom itu selalu kosong. Kedua field tetap ada di data (dipakai `id`
DataGrid & search), cuma bukan kolom tampilan lagi.

**Filter baris breakdown (BARU 2026-08-21)** — `rows` yang di-return cuma
customer dengan `cur_revenue > 0 ATAU prev_revenue > 0` (py sinyal
revenue). Established customer yang LITERAL tidak order sama sekali di
kedua window (Rp0→Rp0, ~89% dari total kohort) DIKELUARKAN dari baris
tabel — mereka tidak "menyebabkan" apa pun (§28.7), cuma noise kalau
ditampilkan semua (32237 baris). **`up_count`/`flat_count`/`inactive_count`/
`down_count`/`total_existing` TIDAK ikut difilter** — tetap dihitung dari
kohort established PENUH (formula resmi di atas: "denominator = semua
existing"), supaya SummaryCard/KpiHeader tetap akurat sesuai definisi
KPI. **Catatan**: karena filter ini, status `inactive` (kolom Status)
SECARA PRAKTIS tidak pernah muncul di baris tabel/dialog yang tampil
(definisinya `cur=prev=0`, yang justru SELALU dikeluarkan filter di
atas) — nilai `inactive_count`-nya tetap benar/berguna di angka
aggregate (SummaryCard), cuma tidak akan pernah kelihatan sbg chip baris
individual.

Header modal menampilkan: jumlah customer spending naik (`up_count`), total existing
(`total_existing`), dan up rate hasil hitung ulang dari keduanya — sudah diverifikasi
`up_count / total_existing` match persis dengan `up_rate` di trend endpoint (M7 chart)
untuk bulan yang sama.

### Tampilan

Halaman standar §28.10/§29 (KpiHeader current/YoY/change SELALU di atas +
tab Overview/Trend Analysis) — sama pola M1/M2, `M7ExpansionGrowth.tsx`
(tab Ekspansi halaman Growth) beda dari `M7Expansion.tsx` (dipakai apa
adanya, tanpa KpiHeader/tab, di halaman Customer Metrics workbench yang
menumpuk M3-M7 sekaligus).

**Chart Trend Analysis (revisi 2026-08-21, dari 100% stacked horizontal
lama)** — `ExpansionChart.tsx` (shared), diverging vertical bar per bulan:
`up_rate` menjulur ke ATAS dari garis 0 (1 segmen). Sisi BAWAH garis 0
adalah STACK 2 segmen (revisi susulan sama hari, user: "negatif chart
jadi bar stack yang membedakan masing masing kategori") —
`down_rate` (dinegasikan, MASIH transaksi tapi turun) ditumpuk dgn
`inactive_rate` (dinegasikan, TIDAK ADA transaksi sama sekali). Warna
monokrom (bukan hijau/merah) — primary solid utk naik, tint primary utk
turun, grey NETRAL (bukan tint lagi) utk inactive — genuinely beda hue
krn "tidak ada sinyal" beda konsep dari "menurun". `showZeroLine` (garis
tegas di 0). `flat_rate` TIDAK masuk chart (bukan positif/negatif, tidak
natural di bar diverging) — kebaca di SummaryCard "Flat" tab Overview.
Legend 3 entri: Spending Up / Spending Down / No Transaction.

**Mini chart Overview** — `AreaChartWidget` 1 garis "Net Expansion"
(`up_rate - down_rate - inactive_rate`, direvisi sama hari — momentum
negatif customer yang berhenti total ikut dihitung, bukan cuma yang
menurun tapi masih order) dgn fitur "fill by value" recharts
(`negativeColor` di `AreaSeries`, gradient `SplitColorGradient` baca
posisi pixel titik 0 dari `useYAxisScale()`) — garis DAN fill area
SAMA-SAMA ganti warna monokrom (primary solid vs grey) tepat di titik
silang 0.

---

## M9 — Dormant Customer Value (DCV)

### Penjelasan

Mengukur total nilai bisnis yang "tertahan"/berisiko hilang dari customer
yang sudah masuk kategori dormant — dipakai utk menilai seberapa besar
revenue yang belum berhasil dipertahankan atau diaktivasi ulang. Ranking
per-customer, diurutkan dari estimasi kerugian terbesar.

**Populasi (Dormant Customer)**: customer yang punya riwayat transaksi
(established) TAPI transaksi terakhirnya sudah melewati ambang dormant —
ambang SAMA PERSIS M8 (`dormantThresholdCaseSql`, per kategori bisnis
divisi). Digate juga oleh SSOT "New/Existing" §30.10 (`existingSince` =
awal kalender label periode yang dilihat) — customer yang first-purchase-
nya BARU tapi sudah lewat ambang dormant (kasus langka) DIKELUARKAN, itu
bukan populasi "Existing" yang relevan.

### Formula

```
recent_12m_rev      = SUM(revenue) 12 bulan kalender SEBELUM transaksi terakhir customer
avg_monthly_revenue  = recent_12m_rev / 12
months_dormant       = (tahun,bulan filterDate) - (tahun,bulan transaksi terakhir), min 1
estimated_lost_value = avg_monthly_revenue × months_dormant
```

`recent_12m_rev` DIBATASI 12 bulan kalender TERAKHIR sebelum dormant
(bukan total all-time dibagi jumlah bulan yang ada transaksi saja) —
pembeli borongan/jarang tidak dapat rata-rata yang melambung karena
pembaginya window waktu TETAP, bukan cuma bulan yang kebetulan ada
transaksi (pola sama `avgMonthlyExpr`, `customers.repository.ts`).

`months_dormant` — selisih BULAN KALENDER murni (`tahun*12+bulan`),
BUKAN selisih hari mentah dibagi 30 (koreksi keras user 2026-08-25: cutoff
akhir bulan April harus terhitung Mei/Juni/Juli tanpa order = 3 bulan
dormant di Agustus, bukan `107 hari / 30 = 4` dibulatkan).

```sql
-- m8m10.repository.ts, fetchDormantValueRanking
cust_last AS (
  SELECT c.id, MAX(inv.invoice_date) AS last_invoice_date
  FROM customers c JOIN inv ON inv.customer_id = c.id
  JOIN established_customers ec ON ec.id = c.id
  GROUP BY c.id
  HAVING MAX(inv.invoice_date) <= filterDate - dormantThreshold * INTERVAL '1 month'
),
cust_agg AS (
  SELECT cl.customer_id,
    SUM(inv.rev) FILTER (
      WHERE inv.invoice_date <= cl.last_invoice_date
        AND inv.invoice_date >= DATE_TRUNC('month', cl.last_invoice_date - INTERVAL '11 months')
    ) AS recent_12m_rev
  FROM cust_last cl LEFT JOIN inv ON inv.customer_id = cl.customer_id
  GROUP BY cl.customer_id
)
```

**GAP diketahui (2026-08-26, task029.md §36.12)** — dokumen SSOT
mendefinisikan DUA komponen historis paralel: *"Historical Revenue... dan
Historical Gross Profit adalah laba kotor historis yang pernah
dihasilkan customer tersebut."* Implementasi SAAT INI 100% berbasis
REVENUE (`recent_12m_rev`/`avg_monthly_revenue`/`estimated_lost_value`
semua Rupiah omset) — TIDAK ADA komponen gross profit sama sekali, baik
di backend (`DormantValueRow` tidak punya field GP) maupun UI (tidak ada
mention "gross profit"/"laba" di M9DormantValue.tsx). Belum diputuskan
apakah ini disengaja (SSOT pakai kata "atau" — pendapatan ATAU GP, bisa
dibaca sbg 2 lensa alternatif, revenue-only sah) atau harus ditambah
metrik GP paralel. Menunggu keputusan user, belum dikerjakan.

### Bug diperbaiki (2026-08-26, task029.md §36.12)

**"Total Potensi Kerugian" (`value_ranking_total_current`) SEBELUMNYA
cuma menjumlah TOP 20 customer** (`fetchDormantValueRanking(p, 20, ...)`,
limit hardcode dipakai jg utk hitung total) — bukan SEMUA dormant
customer. Diverifikasi via query langsung (data lokal, `company_id=all`,
2026-08): total SEMUA dormant = **Rp 37.594.149.575**, sedangkan jumlah
top 20 saja cuma **Rp 2.807.182.082** — kartu ringkasan UNDERSTATED ~93%.

Fix: `metrics.service.ts` `getDormantCustomerMetrics` — `fetchDormantValueRanking`
dipanggil dgn `limit=null` (SEMUA dormant, pola sama `getDormantBreakdown`
M8 yg sudah lebih dulu begini), top-20 utk TAMPILAN (chart/ranking table)
di-`slice(0, 20)` dari array penuh itu di JS (TIDAK fetch 2x query
terpisah), total (`value_ranking_total_current`/`_comparison`) dijumlah
dari array PENUH. Kartu "Customer Ter-ranking" (`ranking.length`) TETAP
menampilkan hitungan yang ditampilkan (≤20) — labelnya sudah jujur
("ter-ranking" = yang tampil di daftar, bukan klaim "total dormant"),
tidak perlu diubah.

---

## M10 — Customer Reactivation Rate (CRR)

### Penjelasan

Mengukur efektivitas strategi reactivation/win-back — persentase customer
dormant yang berhasil kembali bertransaksi. Beda dari kebanyakan KPI lain,
numerator dihitung dari transaksi yang BENAR-BENAR sudah terjadi sampai
HARI INI di periode berjalan (bukan tunggu periode tutup) — customer bisa
"reaktivasi" kapan saja dalam periode, terdeteksi langsung.

**Populasi (Total Customer Dormant)**: customer yang SUDAH dormant per
snapshot di AWAL periode yang diukur (secara teknis: akhir periode
SEBELUMNYA yang sudah tutup — titik waktu yang SAMA). **Numerator
(Kembali Bertransaksi)**: subset populasi itu yang order terakhirnya
(dicek ulang di HARI INI, bukan cuma di akhir periode) sudah cukup baru
utk keluar dari status dormant lagi.

### Formula

```
dormant_count (denominator)   = COUNT(existing customer, last order <= akhir periode SEBELUMNYA - ambang dormant)
reactivated_count (numerator) = subset dormant_count di atas, TAPI last order (dicek s.d HARI INI) > HARI INI - ambang dormant
reactivation_rate = reactivated_count / dormant_count × 100
```

Field `prev_dormant_count` (snapshot titik SEBELUM `dormant_count`, beda
window lagi) BUKAN denominator formula ini — sempat salah dipakai di kartu
ringkasan (diperbaiki 2026-08-24) dan di tooltip hover chart (diperbaiki
2026-08-26, task029.md §36.13) — keduanya SEKARANG konsisten pakai
`dormant_count`.

### Bug diperbaiki (2026-08-26, task029.md §36.13)

Tooltip hover chart M10 (`M10Tooltip`, `M10ReactivationRate.tsx`) masih
menampilkan `prev_dormant_count` sbg "denominator", padahal kartu
ringkasan SUDAH dikoreksi ke `dormant_count` sejak 2026-08-24 (2 field
BEDA titik waktu, `prev_me` vs `me`) — akibatnya kalau user coba verifikasi
manual `reactivated_count ÷ [angka di tooltip]`, hasilnya TIDAK match
persis dgn `reactivation_rate` yang ditampilkan di baris pertama tooltip
yang sama. Diperbaiki: tooltip ganti ke `dormant_count`, konsisten dgn
kartu ringkasan.
