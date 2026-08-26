# Task 029 — Dashboard Information Architecture & KPI Mapping (Spec)

**Status: SPEC/PLANNING, BELUM DIEKSEKUSI.** Rekap dari dokumen desain lengkap
yang dikirim user (2026-08-19) — restrukturisasi IA (navigasi, pengelompokan
10 KPI, halaman Overview baru, pola breakdown, filter persisten). Ini
menggantikan/menyempurnakan hasil critique UI sebelumnya (task028 bagian UI,
lihat `.impeccable/critique/`) — user menilai treatment dev branch saat ini
("standarisasi 10 halaman KPI ke template KPI4", commit 48dc858) tidak bagus,
dan minta pakai basis UI yang ada di branch `main` sebagai starting point,
BUKAN yang ada di `dev` sekarang. Detail keputusan itu menyusul setelah
investigasi perbedaan main vs dev — belum final di dokumen ini.

Dokumen ini murni REKAP spec asli user, disusun ulang jadi markdown supaya
mudah dirujuk — bukan rencana implementasi (fase/prioritas belum diputuskan).

---

## 1. Struktur Navigasi

**Keputusan final (user, 2026-08-19): TANPA parent menu "Matrix".** Growth/
Retention/Value jadi menu utama mandiri, sejajar dengan Overview — bukan
sub-menu bersarang. Draft awal spec sempat menyebut opsi "Matrix" sebagai
parent (dicoret di bawah, disimpan sebagai riwayat keputusan, BUKAN struktur
final).

```
DASHBOARD
│
├── Overview
├── Growth
├── Retention
└── Value
```

**Konsep:**
- Overview → Executive Summary
- Growth → Customer & business expansion
- Retention → Customer health & engagement
- Value → Revenue & profitability

~~Draft awal: Growth, Retention, dan Value sebagai sub-menu dari parent
menu "Matrix" (Dashboard → Overview / Matrix → Growth/Retention/Value).
Ditolak user — langsung 4 menu utama sejajar, tanpa Matrix.~~

## 2. Pengelompokan 10 KPI

| KPI | Growth | Retention | Value |
|---|:---:|:---:|:---:|
| M1 — Cross Selling | ✓ | | |
| M2 — Average Product Category | ✓ | | |
| M3 — Average Revenue / Existing Customer | | | ✓ |
| M4 — Average Gross Profit / Existing Customer | | | ✓ |
| M5 — High Margin Product Penetration | | | ✓ |
| M6 — Repeat Order Rate | | ✓ | |
| M7 — Customer Expansion Rate | ✓ | | |
| M8 — Dormant Customer Rate | | ✓ | |
| M9 — Dormant Customer Value | | ✓ | |
| M10 — Customer Reactivation Rate | | ✓ | |

**Catatan M9:** Dormant Customer Value ditempatkan di Retention karena
konteks utamanya "berapa besar value customer yang sedang berisiko akibat
dormant?". KPI ini tetap boleh ditampilkan sebagai supporting metric di area
Value kalau diperlukan, tapi tidak perlu jadi KPI kedua di sana.

## 3. Overview

**Tujuan:** dalam 10–15 detik management tahu kondisi bisnis secara
keseluruhan. Overview TIDAK menampilkan seluruh 10 KPI sebagai chart besar —
cuma ambil summary dari Growth, Retention, dan Value.

```
Overview
│
├── Executive KPI Summary
├── Revenue & Profit
├── Customer Health
├── Customer Growth
└── Key Alerts
```

### 3.1 Executive KPI Summary

Menampilkan KPI bisnis paling penting, contoh:

| Metrik | Nilai | Perubahan |
|---|---|---|
| Revenue | Rp 12.4B | +Rp 1.37B (+12.4%) |
| Gross Profit | Rp 2.1B | -Rp 80M (-3.2%) |
| Existing Customers | 326 | +16 (+5.2%) |
| Dormant Customers | 204 | +25 (+13.9%) |

**Prinsip:** jangan cuma "Revenue +12.4%" — tapi Current Value, Comparison
Value, Absolute Change, Percentage Change sekaligus.

## 4. Revenue & Profit

Overview cukup 2 chart utama (Revenue, Gross Profit), masing-masing:
nilai besar + delta YoY (▲/▼ absolut + %) + Area/Line Chart. Tooltip tetap
seperti yang sudah dipakai sekarang.

## 5. Customer Health

Ambil KPI M6 (Repeat Order Rate), M8 (Dormant Customer Rate), M10
(Customer Reactivation Rate) — 3 kartu berdampingan, tiap kartu: nilai +
delta (pp) + mini chart. Tujuan: indikasi cepat customer base sehat/tidak.

## 6. Customer Growth

Ambil M1 (Cross Selling), M2 (Avg Product Category), M7 (Customer
Expansion Rate) — 3 kartu berdampingan. Overview cuma kasih signal; analisis
lanjutan masuk ke menu Growth.

## 7. Key Alerts

Ambil kondisi dari rule/threshold tiap KPI, contoh:

- 🔴 Dormant Customer Rate — 62.6% (above critical threshold)
- 🔴 Repeat Order Rate — 49.1% (below target)
- 🟡 Gross Profit — -Rp 80M (-3.2%) YoY
- 🟢 Customer Expansion — +Rp 320M (+24.8%) YoY

Dengan §3-7, Overview jadi **Business Status Dashboard**, bukan sekadar
kumpulan grafik.

## 8. Growth

```
Growth
│
├── M1 Cross Selling
├── M2 Average Product Category
└── M7 Customer Expansion Rate
```

### 8.1 M1 — Cross Selling

**Tujuan:** seberapa banyak existing customer beli >1 kategori/produk.

**Main Visualization:** 100% Stacked Bar (Cross-Selling Customers vs
Single-Category Customers).

**KPI Summary:** Current Rate 38.4% · Comparison 36.5% · Change +1.9pp

**Tooltip** (contoh, Aug 2026): Cross-Selling Customers 126 · Single-Category
Customers 200 · Existing Customers 326 · Cross Selling Rate 38.7% · Avg
Categories/Customer 2.4

**Breakdown** (Customer Breakdown): Customer · Categories · Products ·
Revenue · Cross Selling (Yes/No) · Δ YoY

## 9. M2 — Average Product Category

**Tujuan:** rata-rata jumlah kategori produk yang dibeli existing customer.

**Main Visualization:** Distribution Bar (1 category / 2 categories / 3 /
4 / 5+).

**KPI Summary:** Current 2.4 · Comparison 2.1 · Change +0.3

**Tooltip:** Avg Categories/Customer 2.4 · Existing Customers 326 · Total
Categories Purchased 782 · Median Categories 2 · YoY Change +0.3

**Breakdown** (Customer/Category Breakdown): Customer · Categories · Top
Category · Revenue · Last Order

## 10. M7 — Customer Expansion Rate

**Tujuan:** customer yang mengalami peningkatan purchase/value.

**Main Visualization:** 100% Stacked Bar (Expanded / Stable / Contracted).

**KPI Summary:**
- Expanded Customers — Current 16 · Comparison 13 · Change +3 customers
- Expansion Rate — Current 5.0% · Comparison 4.1% · Change +0.9pp

**Monetary Impact** (value growth): Customer Revenue — Current Rp 4.12B ·
Comparison Rp 3.80B · Change +Rp 320M · Growth +8.4%

**Breakdown** (Customer Expansion Breakdown): Customer · Previous Revenue ·
Current Revenue · Change · Growth % · Status (Expanded/Contracted/Stable)

## 11. Retention

```
Retention
│
├── M6 Repeat Order Rate
├── M8 Dormant Customer Rate
├── M9 Dormant Customer Value
└── M10 Customer Reactivation Rate
```

## 12. M6 — Repeat Order Rate

**Main Visualization:** 100% Stacked Bar (Repeat / Non-repeat).

**KPI Summary:** Current 49.1% · Comparison 54.8% · Change -5.7pp; Current
Customers 160 · Comparison Customers 179 · Change -19

**Breakdown** (Customer Order Behavior): Customer · Orders · Revenue · Last
Order · Previous Order · Status (Repeat/New/Dormant)

## 13. M8 — Dormant Customer Rate

**Main Visualization:** Area Chart + Critical Threshold.

**KPI Summary:**
- Dormant Customers — Current 204 · Comparison 179 · Change +25 customers
- Dormant Rate — Current 62.6% · Comparison 54.9% · Change +7.7pp

**Tooltip:** Dormant Rate 62.6% · Dormant Customers 204 · Existing Customers
326 · Critical Threshold 10% · Above Threshold +52.6pp · 45+ Days Without
Order 204

**Breakdown** (Dormant Customer Breakdown): Customer · Last Order · Days
Inactive · Previous Revenue · Lifetime Revenue · Status (Critical/Dormant)

## 14. M9 — Dormant Customer Value

**Tujuan:** value/revenue yang berisiko akibat customer dormant.

**Main Visualization:** Area Chart.

**KPI Summary:** Dormant Customer Value — Current Rp 2.84B · Comparison
Rp 2.35B · Change +Rp 490M · Growth +20.9%; Dormant Customers 204 vs 179
(+25)

**Breakdown** (Dormant Value at Risk): Customer · Last Revenue · GP · Last
Order · Days Inactive · Revenue at Risk · Priority (High/Medium)

## 15. M10 — Customer Reactivation Rate

**Main Visualization:** Bar + Line (bar = jumlah reactivated, line = rate).

**KPI Summary:**
- Reactivated Customers — Current 2 · Comparison 5 · Change -3
- Reactivation Rate — Current 0.5% · Comparison 1.5% · Change -1.0pp

**Monetary Impact:** Reactivated Revenue — Current Rp 82M · Comparison
Rp 140M · Change -Rp 58M · Growth -41.4%

**Breakdown** (Reactivated Customer Breakdown): Customer · Dormant Since ·
Reactivated · Reactivation Date · Revenue · Orders · GP

## 16. Value

```
Value
│
├── M3 Average Revenue / Existing Customer
├── M4 Average Gross Profit / Existing Customer
└── M5 High Margin Product Penetration
```

## 17. M3 — Average Revenue / Existing Customer

**Main Visualization:** Area + Line.

**KPI Summary:** Current Rp 151.1K · Comparison Rp 180.4K · Change -Rp 29.3K
· Growth -16.2%

**Tooltip** (pola sudah dipakai sekarang): Existing Customer Revenue
Rp 4.93M · Total Established 32,600 · Avg Revenue/Customer Rp 151.1K ·
Median Threshold Rp 630.0K · High Margin Contribution Rp 531.54M ·
Contribution Percentage 10.8%

**Breakdown** (Customer Revenue Breakdown): Customer · Revenue · Avg
Revenue · Share · Orders · Δ YoY

## 18. M4 — Average Gross Profit / Existing Customer

**Main Visualization:** Area + Line.

**KPI Summary:** Current Rp 97.2K · Comparison Rp 104.8K · Change -Rp 7.6K
· Growth -7.3%

**Breakdown** (Customer Gross Profit Breakdown): Customer · Revenue · Gross
Profit · GP Margin · Share GP · Δ YoY

## 19. M5 — High Margin Product Penetration

**Main Visualization:** 100% Stacked Bar + Target (High Margin Revenue vs
Other Revenue).

**KPI Summary:**
- High Margin Revenue — Current Rp 531.54M · Comparison Rp 620M · Change
  -Rp 88.46M · Growth -14.3%
- Contribution — Current 10.8% · Comparison 13.2% · Change -2.4pp
- Target 20.0% · Gap -9.2pp

**Tooltip:** High Margin Revenue Rp 531.54M · Other Revenue Rp 4.40B ·
Total Revenue Rp 4.93B · Contribution 10.8% · Target 20.0% · Gap -9.2pp

**Breakdown** (Product Breakdown): Product · Revenue · Gross Profit · GP
Margin · Revenue Share · High Margin (Yes/No)

## 20. Standard Comparison

Dashboard cuma pakai YoY sebagai satu-satunya comparison — seluruh KPI pakai
pola yang sama.

**Monetary KPI:** Current · Comparison · Absolute Change · Growth %

**Count KPI:** Current · Comparison · Absolute Change · Growth %

**Rate KPI:** pakai **percentage point (pp)**, BUKAN relative % — contoh
Current 49.1% · YoY 54.8% · Change **-5.7pp** (bukan -10.4%, supaya tidak
rancu antara relative growth dan percentage-point change).

## 21. Standard Periode

Semua menu pakai standar YoY:

| Period | Current | Comparison |
|---|---|---|
| Monthly | Aug 2026 | Aug 2025 |
| Quarterly | Q3 2026 | Q3 2025 |
| Semester | H2 2026 | H2 2025 |
| Annual | FY 2026 | FY 2025 |

**Tidak perlu** MoM, QoQ, Previous Period/Month/Quarter — tujuannya jaga
dashboard tetap sederhana.

## 22. Global Filter

Filter konsisten di seluruh layer, termasuk Breakdown.

**Holding Level:**
```
Company       [ All ▼ ]
Period        [ Monthly ▼ ]
Period Value  [ Aug 2026 ▼ ]
```
Holding bisa pilih: All Companies / Company A / Company B / Company C.

**Company Level** (setelah user berada di 1 company, filter Company tidak
perlu ditampilkan lagi karena sudah jadi context):
```
Branch        [ All ▼ ]
Division      [ All ▼ ]
Channel       [ All ▼ ]

Period        [ Monthly ▼ ]
Period Value  [ Aug 2026 ▼ ]
```

## 23. Filter Harus Persistent sampai Breakdown

Contoh: user set Company=PT A, Period=Q3 2026 di level atas → masuk menu
Retention → Dormant Customer → Breakdown → tabel otomatis pakai
Company=PT A, Period=Q3 2026, Comparison=Q3 2025 tanpa perlu di-set ulang.
User baru boleh mempersempit lebih lanjut (Branch/Division/Channel) di level
breakdown itu.

## 24. Generic Table Filter

Semua tabel breakdown pakai pola filter yang konsisten:

```
┌─────────────────────────────────────────────────────────────┐
│ Search...                                                    │
│                                                               │
│ Branch ▼    Division ▼    Channel ▼    Status ▼    Sort ▼   │
└─────────────────────────────────────────────────────────────┘
```

Filter tambahan bersifat context-aware, contoh:
- **Customer table**: Search Customer, Branch, Division, Channel, Status
- **Product table**: Search Product, Category, Brand, Status

Tapi global context (Company, Period, YoY Comparison) tetap sama di semua
tabel.

## 25. Pola UI Setiap KPI

Semua halaman KPI sebaiknya konsisten strukturnya:

```
┌─────────────────────────────────────────────────────────────┐
│ KPI NAME                                                     │
│                                                                │
│ CURRENT VALUE                                                 │
│ Rp 4.93B                                                       │
│                                                                │
│ Comparison     Rp 4.32B                                        │
│ Change         +Rp 610M                                        │
│ Growth         +14.1%                                          │
│                                                                │
│ ─────────────────────── CHART ───────────────────────────────  │
│                                                                │
│ [ Analysis ]                              [ Breakdown ]        │
└─────────────────────────────────────────────────────────────┘
```

**Tab Analysis** berisi: KPI value, Comparison, Absolute change, Growth/pp,
Chart, Tooltip, Target/threshold (kalau ada).

**Tab Breakdown** berisi: detail customer/product, Search, Filter, Sorting,
Pagination, Comparison value kalau relevan.

**UPDATE (2026-08-19) — lihat §28.** Ringkasan di atas dielaborasi jauh
lebih detail (Header 3 tipe KPI, isi persis Analysis/Breakdown per bagian,
aturan chart per KPI, tooltip vs summary, dst). §28 JUGA menggantikan
daftar kolom breakdown yang sempat disebut inline di tiap section KPI di
atas (§8.1, §9, §12-19) — kolom yang benar dipakai adalah yang di §28.10,
bukan yang di section masing-masing KPI di atas (beda, lebih detail: ada
Branch/Division/Channel, YoY per kolom, status enum, dst).

## 26. Prinsip Utama Dashboard

```
                                DASHBOARD
                                    │
        ┌───────────┬──────────────┼──────────────┬───────────┐
        │           │              │              │           │
     OVERVIEW     GROWTH       RETENTION         VALUE     (menu lain)
        │
┌───────┼────────┐
│       │        │
Revenue Customer Alerts
Profit  Health
```

(Tanpa parent "Matrix" — lihat §1, keputusan final user.)

Tiap KPI mengikuti alur: Current Value → Comparison Value (YoY) → Absolute
Change → Growth/pp → Chart → Tooltip → Breakdown (Search, Generic Filters,
Sort, Pagination).

**Inti desain:**
- Overview menjawab: "Bagaimana kondisi bisnis?"
- Growth menjawab: "Apakah customer/business kita berkembang?"
- Retention menjawab: "Apakah kita mempertahankan customer?"
- Value menjawab: "Seberapa besar revenue dan profit yang dihasilkan?"
- Breakdown menjawab: "Customer/product mana yang menyebabkan angka
  tersebut?"

Untuk semua KPI yang dibandingkan: jangan cuma tampilkan `+12.4%`. Tampilkan
Current → Comparison → Absolute Change → Growth %, supaya user tahu nilai
sekarang, nilai pembanding, selisih, dan persentase perubahannya sekaligus.

---

## Catatan tambahan (2026-08-19, sesi ini)

User eksplisit tidak suka arah visual di `dev` (hasil task026 "standarisasi
ke template KPI4" + fix task028) dan minta basis UI diambil dari branch
`main` sebagai starting point untuk implementasi spec di atas.

**Investigasi konkret (bukan asumsi):**

`main` (14 commit unik dari merge-base, kebanyakan security/RBAC fix) TIDAK
PERNAH menerima task025 (split M3-M7 jadi 10 halaman terpisah) maupun
task026 (standarisasi ke template KPI4: `FilterBarShell`, `PeriodYoyBanner`,
`KpiMetricCard` — semua pola bordered-Card yang jadi sumber keluhan "ramai").
`dev` 37 commit unik dari merge-base, mencakup SEMUA redesign itu.

Struktur `main` untuk M3-M7: **1 halaman bundel** `pages/CustomerMetrics/
index.tsx` (bukan 10 halaman terpisah) — filter minimal (`ScopeFilterFields`
+ `DatePicker` + toggle, TANPA Card wrapper), tiap section metrik (M3/M4/
M5+M6/M7) render langsung dalam `<Box>` polos (SectionLabel + info tooltip
+ chart), TANPA Card/border wrapping sama sekali. Ini **cocok persis**
dengan screenshot "clean" (image #5) yang user tunjukkan — kemungkinan besar
image #5 memang screenshot dari struktur main ini (atau prototype
`executive-kpi-dashboard` yang dimodel dari situ), BUKAN dari `dev`.

**Trade-off yang perlu disadari sebelum reuse main sebagai basis:**
main TIDAK punya: banner perbandingan YoY di level halaman (PeriodYoyBanner
belum ada sama sekali di main — trend chart M3 di main cuma tampilkan tren
bulanan, tanpa titik "current vs comparison" eksplisit), kartu Avg/Median
Revenue terpisah, 10 halaman terpisah dengan page-settings/permission
granular per KPI (task025), maupun beberapa fix data yang sudah masuk `dev`
sesudahnya. Kalau basis UI dari main dipakai, pola Current/Comparison/
Absolute Change/Growth% dari spec §20 (yang notabene BARU, belum ada juga
di main) tetap harus dibangun baru — main cuma referensi utk "chrome minim,
tanpa Card berlebihan", bukan sumber lengkap fitur yang dibutuhkan.

**Belum diputuskan (perlu instruksi eksplisit sebelum mulai kode):**
1. Rebuild dari nol mengikuti spec §1-26 lengkap (Overview+Growth/
   Retention/Value, filter persistent, Analysis/Breakdown tab) dengan
   visual chrome minim ala main — TIDAK reuse struktur "10 halaman terpisah"
   dev sama sekali?
2. Atau: pertahankan struktur data/routing dev yang sudah ada (10 halaman,
   RBAC page-settings), cuma GANTI visual treatment-nya (hapus Card
   berlebihan di FilterBarShell/PeriodYoyBanner/KpiMetricCard, adopsi
   chrome minim main) sambil pelan-pelan migrasi ke IA baru (menu Growth/
   Retention/Value + Overview)?
3. Mulai dari 1 halaman dulu (mis. M3/Customer Revenue) sebagai
   proof-of-concept sebelum roll-out ke 10 KPI + Overview + restrukturisasi
   nav, atau langsung semua sekaligus?

## 27. Customer/KPI Definitions — pola tampilan (tambahan user, 2026-08-19)

**Keputusan: JANGAN tabel besar.** Tujuan section ini bukan analisis, tapi
bantu user paham "angka ini sebenarnya dihitung dari siapa?" — beda fungsi
dari kartu KPI (yang jawab "berapa hasilnya?"). Definition TIDAK menggantikan
info comparison (Current/Comparison/Change/Growth% tetap ada di kartu KPI
seperti biasa, §20).

### 27.1 Di halaman Overview

Section "Customer Definitions" diletakkan SETELAH KPI summary utama,
SEBELUM chart/detail — cuma tampilkan definisi singkat utk segmen yang
paling sering bikin bingung (New/Active/Existing/Dormant), horizontal card 3-4
kolom, tidak perlu tinggi:

```
┌─────────────────────────────────────────────────────────────┐
│ Customer Definitions                                    ⓘ   │
│ How customer segments are calculated for the selected period │
│                                                                │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌────────┐│
│ │ NEW CUSTOMER │ │ ACTIVE       │ │ EXISTING     │ │ DORMANT││
│ │              │ │ CUSTOMER     │ │ CUSTOMER     │ │CUSTOMER││
│ │ First trans- │ │ Transacted   │ │ (deskripsi)  │ │(deskr.)││
│ │ action in    │ │ during the   │ │              │ │        ││
│ │ period       │ │ selected     │ │              │ │        ││
│ └──────────────┘ └──────────────┘ └──────────────┘ └────────┘│
└─────────────────────────────────────────────────────────────┘
```

Diakhiri link "View all definitions →" ke halaman/section definisi lengkap.

**PENTING — teks definisi di card HARUS ikut SSOT task028** (`segment.helper.ts`
docstring), bukan contoh kalimat di draft ini. Contoh kalimat yang dikirim
user di pesan ini ("Existing = sudah transaksi sebelumnya DAN kembali
bertransaksi periode ini") itu ilustrasi pola UI doang, BUKAN redefinisi —
sudah dikonfirmasi user di pesan sebelumnya definisi tetap: Existing = bukan
New, TERMASUK Dormant (regardless transaksi periode ini atau tidak).

**Keputusan (user, 2026-08-19): istilah "Lost Customer" DIABAIKAN, pakai
"Dormant Customer" saja** — bukan kategori terpisah, cuma istilah dari draft
ilustrasi UI, tidak dipakai di implementasi mana pun.

### 27.2 Per halaman Growth/Retention/Value

Masing-masing punya section Definitions sendiri, spesifik ke KPI di halaman
itu — bukan pengulangan definisi customer di §27.1, tapi definisi
KPI/formula (mis. Growth: Revenue Growth/Customer Growth/GP Growth;
Retention: Retention Rate/Active Customer/Dormant Customer/Returning
Customer; Value: Revenue per Customer/GP per Customer/Average Order Value).

### 27.3 KPI Definitions lengkap — accordion, bukan flat list

Kalau daftar definisi sudah banyak (customer segments + growth + retention +
revenue + dst), JANGAN ditaruh sekaligus di Overview (kesannya jadi halaman
dokumentasi). Kelompokkan per kategori, render sebagai accordion collapsible:

```
KPI Definitions                                      ⓘ

Customer
  > New Customer
  > Active Customer
  > Existing Customer
  > Dormant Customer

Growth
  > Revenue Growth
  > Customer Growth
  > GP Growth

Retention
  > Retention Rate
  > Customer Retention
  > Repeat Customer

Value
  > Revenue / Customer
  > GP / Customer
  > Average Order Value
```

### 27.4 Ringkasan pola 2-tingkat

- **Overview**: definisi singkat cuma utk customer segment yang paling
  sering bikin bingung (New/Active/Existing/Dormant) + link "View all
  definitions →".
- **Tiap menu (Growth/Retention/Value)**: definisi spesifik KPI di menu itu
  (mis. Growth Definitions: Revenue Growth, Customer Growth, GP Growth).
- Definition section TIDAK PERNAH menggantikan kartu KPI comparison
  (Current/Comparison/Change/Growth%) — dua hal terpisah, saling melengkapi.

Opsi 3 (mulai 1 halaman) direkomendasikan mengingat skala pekerjaan (nav
restructure + 10 halaman KPI + halaman Overview baru + kemungkinan endpoint
backend baru utk Key Alerts/Customer Health/Customer Growth aggregation) —
tapi keputusan akhir tetap di tangan user.

---

## 28. Struktur Final KPI Analysis & Breakdown (tambahan user, 2026-08-19)

Elaborasi detail dari §25 (Pola UI Setiap KPI) — dokumen ini yang jadi
acuan final implementasi tab Analysis/Breakdown per KPI, MENGGANTIKAN
ringkasan singkat di §25 dan daftar kolom breakdown yang sempat disebut
inline di §8.1/§9/§12-19 (lihat §28.10 utk kolom yang benar).

### 28.1 Prinsip Utama

Setiap KPI memiliki 3 level informasi:

```
KPI
 │
 ├── HEADER
 │   ├── Current
 │   ├── YoY
 │   └── Change
 │
 ├── ANALYSIS
 │   ├── 12-Period Trend Chart
 │   ├── Tooltip → detail setiap periode
 │   └── Trend Summary → ringkasan keseluruhan trend
 │
 └── BREAKDOWN
     ├── Filter
     ├── Table
     ├── Sorting
     └── Pagination
```

### 28.2 KPI Header

Header harus selalu konsisten untuk seluruh KPI — 3 tipe KPI, aturan beda:

**Value KPI** (contoh M3):

```
M3 · Average Revenue / Existing Customer

Rp 151.1K          Rp 142.8K          +Rp 8.3K (+5.8%)
Current             YoY                Change
```

**Rate KPI** (contoh M8):

```
M8 · Dormant Customer Rate

62.6%              54.9%              +7.7pp
Current             YoY                Change
```

**Count KPI**:

```
326                298                +28 (+9.4%)
Current             YoY                Change
```

**Aturan:**

| Jenis KPI | Current | YoY | Change |
|---|---|---|---|
| Value | Nilai periode terpilih | Nilai periode sama tahun lalu | Absolute + % |
| Rate | Rate periode terpilih | Rate periode sama tahun lalu | Percentage point |
| Count | Jumlah periode terpilih | Jumlah periode sama tahun lalu | Absolute + % |

### 28.3 Analysis Tab

Setiap KPI memiliki:

```
[ Analysis ] [ Breakdown ]
─────────────
```

Analysis menjawab: **"Bagaimana KPI ini bergerak?"**

**Trend Chart** — 12 periode terakhir, mengikuti granularitas filter:

| Filter | Trend |
|---|---|
| Monthly | 12 bulan |
| Quarterly | 12 kuartal |
| Semester | 12 semester |
| Annual | 12 tahun |

Contoh Monthly: `Sep 2025 → Oct → Nov → ... → Jul → Aug 2026`
Contoh Quarterly: `Q4 2023 → Q1 2024 → ... → Q2 2026 → Q3 2026`

Periode yang dipilih SELALU jadi titik terakhir trend.

### 28.4 Jenis Chart

Tidak semua KPI harus pakai line chart — pilih berdasarkan karakteristik KPI:

| KPI | Chart Utama |
|---|---|
| M1 Cross Selling | Line / Area |
| M2 Average Product Category | Line |
| M3 Average Revenue / Existing Customer | Line / Area |
| M4 Average Gross Profit / Existing Customer | Line / Area |
| M5 High Margin Product Penetration | Line |
| M6 Repeat Order Rate | Line |
| M7 Customer Expansion Rate | Line |
| M8 Dormant Customer Rate | Line |
| M9 Dormant Customer Value | Area / Line |
| M10 Customer Reactivation Rate | Line |

**Prinsip:**
- **Line** → perubahan KPI dari waktu ke waktu.
- **Area** → cocok ketika ingin menekankan magnitude/value.
- **Bar** → dipakai kalau yang dibandingkan adalah kategori/periode secara
  diskrit, bukan sebagai default trend.

### 28.5 Tooltip

Tooltip menjawab: **"Apa yang terjadi pada periode yang saya hover?"**

Contoh M3:

```
Revenue Breakdown — August 2026

Average Revenue / Existing Customer   Rp 151.1K
Existing Customer Revenue             Rp 4.93M
Existing Customers                    326
Median Revenue                        Rp 630K
High Margin Contribution              Rp 531.54M
Contribution                          10.8%
```

Tooltip boleh menampilkan info detail karena punya konteks jelas (periode
yang di-hover, mis. "August 2026") — beda dengan summary (§28.6), yang
tidak boleh diam-diam ambil 1 titik.

### 28.6 Trend Summary

Summary TIDAK mengambil data dari satu titik terakhir secara diam-diam —
harus punya konteks yang jelas.

Contoh 12M Summary:

```
12M SUMMARY

12M Average          Highest           Lowest
Rp 128.6K            Rp 151.1K         Rp 102.4K
                      Aug 2026          Feb 2026
```

Atau kalau KPI lebih cocok YTD:

```
YTD PERFORMANCE

YTD 2026             YTD 2025          Change
Rp 1.11M             Rp 1.04M          +Rp 70K (+6.7%)
```

**Prinsip:**

| Informasi | Makna |
|---|---|
| Current | Kondisi periode yang dipilih |
| YoY | Periode yang sama tahun sebelumnya |
| Change | Perubahan Current vs YoY |
| 12M Average | Rata-rata seluruh periode yang tampil |
| Highest | Nilai tertinggi dalam trend |
| Lowest | Nilai terendah dalam trend |
| YTD | Ringkasan Januari sampai periode terpilih |

Tidak semua KPI wajib punya semua jenis summary di atas.

### 28.7 Breakdown Tab

Breakdown menjawab: **"Siapa atau apa yang menyebabkan KPI tersebut
berubah?"**

Struktur:

```
[ Analysis ] [ Breakdown ]
                 ─────────

Table Filter
────────────────────────────────────────────

TABLE

────────────────────────────────────────────

Pagination
```

Breakdown tidak dibatasi setinggi chart, tapi tetap punya batas tinggi
supaya halaman tidak jadi tak terkendali.

**Rekomendasi ukuran container:** `min-height: ±500px`, `max-height:
±700px`. Table body boleh pakai internal scroll.

### 28.8 Global Filter

Berlaku untuk seluruh halaman. Level akses menentukan filter yang
tersedia:

- **Holding**: Company, Branch, Division, Channel, Period
- **Company**: Branch, Division, Channel, Period (Company sudah jadi
  context, tidak ditampilkan lagi — konsisten dgn §22)
- **Period type**: Monthly, Quarterly, Semester, Annual

Semua pakai **YoY sebagai standar comparison** (§20/§21) — TIDAK perlu
tambah Previous Period sebagai default.

### 28.9 Table Filter (beda dari Global Filter)

- **Global filter** → menentukan konteks data dashboard (Company, Branch,
  Division, Channel, Period).
- **Table filter** → menentukan data yang ingin dilihat DALAM breakdown
  (Search Customer, Status, Sort, KPI-specific filter).

Pola generic ini sama dgn §24.

### 28.10 Breakdown Masing-Masing KPI

Ini yang MENGGANTIKAN daftar kolom breakdown lama di §8.1/§9/§12-19.

#### M1 — Cross Selling

**Restrukturisasi tab (permintaan user, 2026-08-21) — SELESAI:**
struktur tab §28.3/28.7 (Analysis/Breakdown, 2 tab) di halaman M1 diganti 3
sub-tab: **Overview** (Summary Cards + mini trend chart + top 5 customer by
total revenue, ringkasan cepat) · **Trend Analysis** (chart tren PENUH +
tabel Breakdown PENUH, gabungan Analysis+Breakdown lama) · **Heatmap** (M1.1,
dulu nempel di bawah chart tren di tab Analysis, sekarang tab sendiri).

**⚠️ KEPUTUSAN DIBALIK 2026-08-21 (sore, sama hari) — "Halaman M1 adalah
standar layout default untuk diterapkan ke semua layout KPI":** catatan awal
di bawah ini bilang restrukturisasi ini "KHUSUS M1, TIDAK men-supersede §28
Analysis/Breakdown di M2-M10" — **KEPUTUSAN ITU DIBATALKAN oleh user hari
yang sama.** Pola M1 (KpiHeader current/YoY/change + sub-tab Overview/Trend
Analysis[/Heatmap kalau relevan]) SEKARANG jadi **standar layout default utk
SEMUA KPI M1-M10** — men-supersede §28 Analysis/Breakdown 2-tab lama
sepenuhnya. §28.3/28.7 (Analysis/Breakdown) di atas jadi HISTORIS, bukan
acuan lagi. Lihat implementasi M2 di bawah (KPI pertama yang ikut pola
baru ini setelah M1).

Keputusan desain (dikonfirmasi via pertanyaan ke user):
- KPI Header (current/YoY/change) TETAP selalu tampil DI ATAS ketiga sub-tab
  (bukan pindah ke dalam Overview) — konstan terlihat apa pun sub-tab aktif.
- Top 10 customer di Overview: by **Category Count** (bukan Revenue),
  kolom diringkas (Nama · Category Count · Total Revenue), state-nya
  TERPISAH dari search/sort tabel Breakdown penuh di Trend Analysis (selalu
  top-10-by-category-count, tidak ikut berubah kalau user sortir tabel di
  tab sebelah).
- Mini chart (Overview) pakai widget & data SAMA PERSIS dgn chart penuh
  (Trend Analysis) — cuma height lebih kecil (160 vs 280) & tanpa
  `TrendSummary` (ringkasan analitis, biar Overview tetap ringkas).

**Koreksi 2026-08-21 (temuan user: "Overview dan Trend Analysis isinya
kenapa sama?"/"summary-nya mana?"):** iterasi pertama Overview cuma
"versi kecil" dari Trend Analysis (chart sama dipersempit + tabel sama
dipotong 10 baris) — TIDAK ada elemen yang genuinely beda, "Summary Cards"
dari mockup awal user TIDAK pernah dibangun (diasumsikan cukup diwakili
KpiHeader yang sudah ada, ternyata tidak — KpiHeader cuma 1 metrik, mockup
minta "cards" jamak). **Ditambahkan `SummaryCard` (komponen lokal baru,
`M1CrossSelling.tsx`)** — 4 kartu angka headline sekaligus (Cross Sell
Rate, Active Customers, Multi-Category Customers, Avg Category/Customer),
dari `data.kpi1`/`data.kpi2` yang SUDAH di-fetch (kpi2 sebelumnya SAMA
SEKALI tidak ditampilkan di halaman M1 — cuma dipakai M2 punya dialog
sendiri). Pakai `Card` primitif (`components/ui/Card`), BUKAN `StatCard`/
`MetricStatCard` (dashboard) — keduanya WAJIB `change`/`trend`/`data`
sparkline yang tidak ada konteksnya di sini, maksa isi itu = data palsu.

**Koreksi ke-2, sama hari (layout + jenis chart/list Overview):**
- **Layout**: dari 1 kolom vertikal (cards → chart → list, semua full-width
  stacked) jadi 2 section — section ATAS 2 kolom (kiri: 4 Summary Cards grid
  2×2, kanan: chart), section BAWAH full-width (list Top 10). Wrap ke 1
  kolom otomatis di layar sempit (`flexWrap: 'wrap'`, breakpoint implisit
  lewat `flex: '1 1 300px'`).
- **Chart**: dari `ComboChartWidget` (bar Active/Multi-Category + line Cross
  Sell Rate, sama persis dgn Trend Analysis cuma dipersempit) jadi
  **`SimpleTrendLine`** (komponen lokal baru) — 1 garis Cross Sell Rate
  SAJA, dibangun langsung dari primitif recharts. **BUKAN** reuse
  `AreaChartWidget` (area terisi warna, bukan "line" murni) atau
  `LineAlertWidget` (SELALU render `ReferenceArea`/`ReferenceLine` ambang
  alert, tidak bisa dimatikan, tidak relevan utk Cross Sell Rate yang tidak
  py konsep ambang alert — maksa pakai widget itu = ambang alert palsu).
- **List Top 10**: dari `ResponsiveListView` (DataGrid, tabel) jadi list
  polos (rank nomor + nama + revenue, 1 baris per customer, border-bottom
  antar baris, dibangun dari `Card` + `Box`/`Typography` — bukan komponen
  tabel). Sorting juga diganti dari **by Category Count** jadi **by Total
  Revenue** (permintaan user, koreksi ke-2). **Koreksi ke-3, sama hari:
  dibatasi Top 5** (bukan Top 10 lagi).

Implementasi: `M1CrossSelling.tsx` — state tab
`'overview' | 'trend' | 'heatmap'` (dulu `'analysis' | 'breakdown'`), 3
blok render kondisional. Tidak ada perubahan backend (semua tab reuse
`data.trend`/`data.detail`/`data.heatmap` yang SUDAH ada dari 1 fetch,
tidak ada fetch baru). `tsc --noEmit` + `eslint` bersih. Render di browser
BELUM di-screenshot (tidak ada tooling browser di sesi ini).

**Tabel Breakdown (Trend Analysis tab) — §28.10 LENGKAP 2026-08-21
(permintaan user: "hapus kolom id pelanggan dan tambahkan data yang belum
ada"):**
- Kolom **ID Pelanggan (customer_code) DIHAPUS** dari tabel M1 (frontend-
  only — field-nya TETAP ada di `CrossSellingDetailRow`/dipakai search,
  cuma tidak jadi kolom tampilan lagi). `M2AvgCategory.tsx` py tabel
  drill-down sendiri, TIDAK disentuh, masih tampilkan customer_code.
- **Branch/Division/Channel** — BARU, butuh perubahan backend:
  `CS_INV_CTE` (`m1.repository.ts`, dipakai bareng oleh
  `fetchCrossSellingKPI`/`fetchCrossSellingTrend`/`fetchCrossSellingDetail`/
  `fetchCrossSellingHeatmap`) diperluas project kolom
  `branch_id`/`channel_name`/`invoice_date`/`division_id`
  (`COALESCE(division_override_id, channel_divisions.division_id)`) —
  aman (kolom asli tabel `invoices`, tidak nambah baris, `SELECT DISTINCT`
  sudah include `i.id` yang unik). `fetchCrossSellingDetail` nambah CTE
  `latest_inv` (`DISTINCT ON customer_id ORDER BY invoice_date DESC`) —
  branch/division/channel diambil dari invoice TERBARU customer itu DI
  DALAM periode laporan (BUKAN all-time seperti `cteCustDivision`/dormant
  threshold — scope-nya sengaja ikut periode, bukan properti customer
  sepanjang hidup). Diverifikasi: company 1, 316 baris, 0 yang branch/
  division-nya NULL.
- **YoY Category Count/Category Change/Revenue YoY/Cross Sell Status** —
  BARU, **TIDAK butuh backend baru** — reuse `yoyData` (fetch `period_end`
  digeser -1 tahun) yang SUDAH ada di halaman ini (awalnya cuma buat
  KpiHeader). Frontend JOIN `yoyData.detail` ke `data.detail` by
  `customer_id` (`yoyByCustomer` Map). Cross Sell Status: **New** = tidak
  ada baseline YoY (customer TIDAK di populasi Existing periode yang sama
  setahun lalu — BUKAN definisi "New" halaman ini, yang populasinya sudah
  Existing-only), **Increased/Stable/Decreased** = perbandingan
  category_count vs YoY-nya. Chip warna: New=primary, Increased=success,
  Stable=default, Decreased=error (`StatusChip`).
- **Caveat verifikasi jujur**: dites ke data restore production lokal —
  branch/division/channel dan struktur YoY-nya SUDAH benar (query jalan,
  join tidak error, tidak ada leakage), TAPI dataset lokal cuma py histori
  Jan 2025–sekarang (hasil restore terakhir sesi ini) — periode
  pembanding YoY (Sep 2024–Agu 2025) otomatis 0 baris (belum ada data
  sama sekali sebelum Jan 2025), jadi SEMUA customer tampil "New" di
  lokal. Ini keterbatasan DATA TES, bukan bug — logic-nya sudah benar dan
  akan otomatis terisi begitu histori data cukup panjang (production).
  `m1BreakdownNote` (catatan lama "belum tersedia") DIHAPUS, sudah tidak
  relevan — SEMUA kolom §28.10 M1 sekarang lengkap.

**Koreksi ke-4, sama hari — kolom breakdown per tipe produk DIHAPUS dari
tabel** (temuan user: "tabel jadi lebih detail lagi sampai menampilkan
revenue padahal seharusnya itu breakdown matrix"). Kolom qty/revenue per
item_type (Unit/Consumable/Sparepart/dst, ditambahkan lebih awal di sesi
yang sama per permintaan user) DIHAPUS lagi dari tabel Breakdown — matriks
customer × tipe produk itu SUDAH jadi tugas tab **Heatmap** (M1.1), tabel
Breakdown jadi dobel/kepanjangan kalau nampilin detail yang sama. Field
`type_breakdown` TETAP ada di `CrossSellingDetailRow` (dipakai Heatmap),
cuma tidak lagi di-flatten jadi kolom tabel. `detail_categories` (list
kategori dinamis, dari fix "card KNT hilang" sebelumnya) TETAP ada di
response, dipakai kalau suatu saat perlu lagi — cuma tidak dipakai
`breakdownColumns` M1 sekarang. Kolom akhir tabel M1: Customer · Branch ·
Division · Channel · Category Count · YoY Category Count · Category
Change · Revenue · Revenue YoY · Cross Sell Status — PERSIS §28.10, tanpa
tambahan. `tsc --noEmit` + `eslint` bersih.

**Koreksi ke-5 (nama SectionLabel/judul) & ke-6 (chart Overview), sama
hari:**
- **Prefix "M1"/"M1.1"/"M2" dihapus dari semua judul** (permintaan user:
  "hapus prefix M1 langsung judul saja di semuanya ganti simbol atau icon
  saja" + susulan "terapkan di semua matrix") — diganti ikon MUI (BUKAN
  emoji, aturan proyek): `SwapHorizIcon` (judul utama M1),
  `GridOnIcon` (SectionLabel Heatmap M1.1 DAN judul internal
  `HeatmapWidget` itu sendiri — widget-nya nambah prop `icon?` baru buat
  ini), `CategoryIcon` (M2). `SectionLabel` (`HelperComponents.tsx`)
  nambah prop `icon?: React.ElementType` opsional, reusable.
- **Gaya "AI content writing" (pola "Judul — Deskripsi" pakai em dash,
  "·" nempel prefix+nama) dibersihkan** dari judul-judul itu (permintaan
  user eksplisit) — jadi frasa alami, mis. "M1 · Cross Selling Ratio —
  Trend 12 {{unit}}" → "Tren Rasio Cross Selling (12 {{unit}})". Subtitle/
  legend chart lain yang pakai "·" sbg pemisah enumerasi (pola berbeda,
  fungsional, dipakai luas di widget lain) SENGAJA tidak disentuh.
- **Chart mini Overview diganti jadi Area Chart** (permintaan user: "rubah
  chart overview menjadi area chart") — `SimpleTrendLine` (komponen lokal
  custom yang tadinya dibangun manual dari primitif recharts, per
  permintaan "line chart" sebelumnya) DIHAPUS, diganti reuse
  `AreaChartWidget` (komponen shared, sudah dipakai M2) — konsisten dgn
  prinsip "pusatkan UI, jangan duplikasi". `AreaChartWidget` sudah
  bungkus Card+title+subtitle sendiri, jadi wrapper `Card` manual yang
  tadinya dibuat di Overview juga ikut dibuang (tidak perlu lagi).

**Koreksi ke-7 — teks tab Heatmap dirapikan + bug info salah diperbaiki**
(user: "text di heatmap ini tidak mengikuti filter informasi salah" +
"format tanggal dan uang cek ulang gunakan util" + "tampilan juga
terlalu sesak dengan text text tersebut" + "sepertinya harus dihapus
salah satu karena sepertinya duplikat"):
- **Bug info salah**: `heatmapHelperText` hardcode "Top 8 kategori" —
  TIDAK PERNAH akurat, backend TIDAK ADA cap 8 kategori sama sekali
  (cuma customer yang dibatasi top 30, kategori dinamis penuh per
  company — 4 utk MKO, 6 utk KNT, lihat koreksi ke-3 sebelumnya).
  Screenshot user nunjukin chip "6 kategori" vs teks "Top 8 kategori" di
  sebelahnya — jelas kontradiktif. DIHAPUS dari teks, biar chip (yang
  sudah akurat) jadi satu-satunya sumber angka itu.
- **Format tanggal**: `data.period.start`/`.end` (raw ISO "2026-08-01")
  ditampilkan mentah tanpa format sebelumnya — sekarang lewat
  `formatDateID` (util `@/utils/date.ts`, standar DD-MM-YYYY proyek,
  sudah dipakai luas di tempat lain) → "01-08-2026".
- **Format uang**: `HeatmapWidget.tsx` py fungsi lokal `fmtRp()` duplikat
  (bukan reuse util) — diganti `formatIDR` (`@/utils/format.ts`, formatter
  Rupiah singkat standar utk ruang sempit spt sel tabel/tick chart, sudah
  dipakai luas di tempat lain juga).
- **Tampilan sesak/duplikat**: SectionLabel ("Heatmap Cross Selling
  Pelanggan" + ikon) DAN title internal `HeatmapWidget` ("Matriks Cross
  Selling Pelanggan (periode)") tumpang tindih persis (nama + periode
  disebut 2x). `HeatmapWidgetProps.title` diubah jadi opsional, tidak
  diisi lagi dari `M1CrossSelling.tsx` — SectionLabel di luar jadi
  satu-satunya judul. Subtitle widget ("Kolom = tipe produk... · Hijau =
  ada pembelian... · Diurutkan...") dipangkas jadi cuma hint interaksi
  ("Klik sel untuk melihat detail produk") — sisanya sudah kebaca dari
  header kolom & legend warna visual yang SUDAH ada di bawah matrix
  (duplikat kalau dijelaskan lagi via teks). `heatmapMatrixTitleWithPeriod`
  (i18n key, sekarang tidak dipakai) dihapus. `tsc --noEmit` + `eslint`
  bersih.

**Koreksi ke-8 — `KpiHeader` (komponen shared, `components/dashboard/`):
label periode generik diganti eksplisit** (user: "'periode ini' jangan
dipakai, harus keterangan eksplisit" + susulan "'Saat Ini' ganti juga jadi
eksplisit"). Sebelumnya: `"{{metric}} — periode ini vs {{period}}"` dan
item row `"Saat Ini: X | {{comparisonLabel}}: Y | Perubahan: Z"` — sisi
current SELALU teks generik ("periode ini"/"Saat Ini"), sisi pembanding
SUDAH eksplisit ("Agustus 2025") — asimetris, tidak konsisten.
- `KpiHeaderProps` nambah field WAJIB baru `currentPeriodLabel: string`
  (mis. "Agustus 2026", dihitung via `formatPeriodLabel(periodType,
  periodKey)` — reuse fungsi yang SUDAH dipakai buat `comparisonLabel`,
  bukan logic baru). Dipakai di 2 tempat: judul section (ganti "periode
  ini") DAN label item pertama (ganti "Saat Ini").
- i18n key `dashboard.kpiHeader.current` ("Saat Ini"/"Current") jadi
  orphan, DIHAPUS.
- **Bonus fix ketemu sambil kerjakan** (kelihatan langsung di teks yang
  dikirim user): `formatPeriodLabel()` (`utils/analisisPeriod.ts`) utk
  quarter/semester nge-print tanda kurung aneh — "Kuartal (2) Tahun 2025"
  bukan "Kuartal 2 Tahun 2025". DIPERBAIKI (hapus `()`), dampaknya ke
  SEMUA pemakai fungsi ini (`M1CrossSelling.tsx` + `Analisis/index.tsx`),
  bukan cuma KpiHeader.
- `KpiHeader` cuma dipanggil dari 1 tempat (`M1CrossSelling.tsx`) saat
  ini, jadi field baru langsung WAJIB (bukan opsional) — caller lain nanti
  (M2-M10 pas ikut pola KpiHeader) otomatis kena kontrak yang benar dari
  awal, tidak perlu migrasi ulang. `tsc --noEmit` + `eslint` bersih.

**Tujuan:** mengetahui customer yang membeli lebih dari satu kategori.

**Kolom:** Customer · Branch · Division · Channel · Current Category
Count · YoY Category Count · Category Change · Revenue · Revenue YoY ·
Cross Sell Status

**Status:** New / Increased / Stable / Decreased

**Tambahan di luar spec (permintaan user, 2026-08-21) — SELESAI, sudah lewat
1x koreksi:** kolom breakdown per tipe produk ditambahkan ke tabel
Breakdown, tiap tipe 2 kolom terpisah (qty + revenue). `qty` = `SUM(quantity)`
asli kolom `invoice_items.quantity` — SENGAJA beda dari cara heatmap M1.1
hitung angka sel (`COUNT(*)` baris item, ambigu: banyak-produk-1-invoice vs
1-produk-banyak-invoice keluar angka sama).

**Iterasi 1 (SALAH, sudah diganti):** 3 kolom hardcode Unit/Consumable/
Sparepart. Ternyata `item_type` BERVARIASI per company — KNT punya 6 tipe
(unit/consumable/sparepart/**card**/accesories/software), MKO 4. Kategori
`card` KNT saja Rp43.8 miliar, SAMA SEKALI hilang dari tabel dgn hardcode 3
kolom (ditemukan user lewat perbandingan visual heatmap KNT [6 kategori] vs
tabel [cuma 3]). Klaim verifikasi awal ("sum 3 tipe = total_revenue") cuma
kebetulan cocok di 1 sampel customer yang tidak pernah beli kategori Card —
tidak berlaku umum, TIDAK menyeluruh.

**Iterasi 2 (SEKARANG, benar) — kolom DINAMIS:** jumlah & jenis kolom
mengikuti `item_type` yang BENAR-BENAR ada di data (`detail_categories`),
mirror persis cara heatmap M1.1 kerja (`GROUP BY item_type`, bukan hardcode).
- Backend (`m1.repository.ts`): `fetchCrossSellingDetail` diubah dari 1 query
  ter-agregasi 3-tipe jadi 2 query (`cc` = ringkasan customer, `type_breakdown`
  = flat customer×item_type mirror pola heatmap), di-pivot di JS jadi map
  `type_breakdown: Record<item_type, {qty, revenue}>` per customer + list
  `categories` (SEMUA item_type yg ada di SEMUA customer, bukan cuma top-30
  spt heatmap — 2 field terpisah `categories` (heatmap) vs `detail_categories`
  (tabel) di `CrossSellingMetricsData`, SENGAJA beda scope, lihat komentar
  di `metrics.types.ts`).
- Frontend (`M1CrossSelling.tsx`): `breakdownColumns` dibangun dinamis dari
  `data.detail_categories` (bukan array literal 3 kolom tetap). Field kolom
  di-FLATTEN ke `type_qty_{category}`/`type_revenue_{category}` langsung di
  `breakdownRows` (bukan `valueGetter` — komponen `ResponsiveListView` versi
  mobile baca `row[field]` langsung, tidak lewat `valueGetter`, ditemukan
  pas implementasi). `relabelCategory` (`helpers.ts`) diperluas cover
  card/accesories/software (dulu cuma unit/consumable/sparepart, sisanya
  fallback raw key).
- **Diverifikasi ulang MENYELURUH** (bukan 1 sampel lagi): company 2 (KNT) —
  `detail_categories` = 6 tipe termasuk `card`, dicek 1 customer (Shopee COS,
  28 kategori) — SUM SEMUA 6 tipe (unit+card+consumable+software+accesories+
  sparepart) = Rp10.572.641.909, PERSIS sama dgn `total_revenue`. `tsc
  --noEmit` + `eslint` bersih (backend+frontend), test suite 79 pass/2 skip/
  3 fail (fail SAMA dgn baseline, tidak terkait M1).
- Render tabel di browser BELUM di-screenshot (tidak ada tooling browser
  otomatis tersedia di sesi ini) — cek manual di browser sebelum dianggap
  selesai total.

#### M2 — Average Product Category

**Tujuan:** mengetahui perubahan jumlah kategori produk yang dibeli
customer.

**Kolom:** Customer · Branch · Division · Channel · Current Category
Count · YoY Category Count · Change · Revenue · Revenue YoY

**Restrukturisasi ikut pola M1 (2026-08-21, permintaan user "lanjutkan di
tab kategori" setelah keputusan "M1 = standar layout default") — SELESAI:**
`M2AvgCategory.tsx` diadaptasi PERSIS dari `M1CrossSelling.tsx`, dengan
penyesuaian karena M2 tidak punya konsep Heatmap sendiri:
- **`KpiHeader`** (current/YoY/change) ditambahkan di atas — SEBELUMNYA M2
  sama sekali TIDAK punya perbandingan YoY eksplisit. Metrik: Avg
  Category/Customer (`kpi2.avg_categories`), `kpiType="value"`,
  `formatValue` 2 desimal. Butuh fetch YoY baru (`useCrossSelling` dgn
  `period_end` digeser -1 tahun) — pola sama persis M1, prop baru
  `periodEnd`/`applyDateCutoff` ditambah ke `Props` M2 (diteruskan dari
  `Growth/index.tsx` dan `CrossSelling/index.tsx`, sebelumnya M2 tidak
  terima `periodEnd` sama sekali).
- **2 sub-tab (BUKAN 3 spt M1)**: **Overview** (Summary Cards 2×2 — Avg
  Category, Total Distinct Categories, Active Customers, Cross Sell Rate +
  mini Area chart + Top 5 customer by CATEGORY COUNT bukan revenue —
  ranking ikut metrik utama panel ini sendiri, beda dari M1 yg ranking by
  revenue) · **Trend Analysis** (chart Area PENUH + `TrendSummary`, SAMA
  persis chart yang sudah ada sebelumnya, cuma dipindah ke tab).
  **TIDAK ada tab Heatmap** — M1.1 heatmap sudah cukup 1x di panel M1
  (`activeKpi` switch di Growth, panel M1/M2 TIDAK pernah tampil
  bersamaan), tidak perlu diduplikasi ke M2.
- **Komponen `SummaryCard`** dipindah dari lokal `M1CrossSelling.tsx` ke
  `HelperComponents.tsx` (shared) — dipakai M1 DAN M2 sekarang, bukan
  duplikat kode.
- **i18n key generik** (`m1SearchPlaceholder`/`m1SortLabel`/dst di tabel
  Breakdown M1) di-rename buang prefix "m1" (`tableSearchPlaceholder`/
  `tableSortLabel`/dst) — sudah dipakai lintas KPI (bukan cuma M1 lagi),
  nama lama menyesatkan.

**Iterasi lanjutan drill-down/BreakdownTable (sama hari, 3 putaran):**
1. **Awalnya**: drill-down klik-titik-buka-dialog M2 (fitur M2-only, M1
   tidak punya krn Breakdown-nya fixed-period bukan per-titik) DIPERTAHANKAN
   apa adanya, TIDAK diganti tabel breakdown, supaya tidak regresi.
2. **User lapor 2 masalah**: "klik titik tidak ada muncul pop up" (dialog
   rusak/tidak reliable) DAN "tabel breakdown nya belum ada". Respons awal:
   dialog DIHAPUS, diganti komponen baru **`BreakdownTable.tsx`** (shared,
   diekstrak dari logic breakdown M1 — `CROSS_SELL_STATUS_COLOR`/
   `breakdownColumns`/join-YoY/search+sort — SEKARANG dipakai M1 DAN M2,
   M1CrossSelling.tsx juga di-refactor pakai komponen ini, bukan kode
   lokal lagi).
3. **User protes**: "kamu bilang ada dialog, dialognya itu tidak
   berfungsi, sekarang malah kamu hapus?" — benar, menghapus fitur yang
   rusak BUKAN cara memperbaikinya. User pilih: kembalikan dialog + coba
   perbaiki bug klik-nya, `BreakdownTable` TETAP ada juga (2 cara akses
   data, bukan saling gantikan — dialog utk histori per-titik masa lalu,
   BreakdownTable utk periode sekarang tanpa perlu klik).
   - **Root cause bug klik ditemukan**: `AreaChartWidget.tsx` pasang
     `onClick` di `<Dot>` custom kecil (radius 4px) per-titik — dibandingkan
     `BarChartWidget.tsx` (yang klik-nya TERBUKTI jalan, dipasang LANGSUNG
     di `<Bar>`, permukaan solid besar) — Dot kecil kemungkinan besar
     KETUTUP layer pelacak-mouse internal recharts yang dipakai Tooltip
     (invisible, di ATAS dot dalam stacking order), klik tidak pernah
     sampai ke elemen Dot.
   - **Fix**: `onClick` dipindah ke level `<AreaChart>` (chart container)
     pakai `activeLabel` dari `MouseHandlerDataParam` (tipe resmi recharts
     v3.10.1, via `import type { MouseHandlerDataParam } from 'recharts'`)
     — cari baris data yang `[xKey]`-nya cocok dgn `activeLabel`. Mekanisme
     ini SAMA PERSIS dgn yang sudah TERBUKTI jalan buat Tooltip hover
     (recharts internal mouse-tracking), bukan DOM element kecil yang bisa
     ketutup. Dot tetap tampil visual (`dot={{ r: 3, ... }}`, statis) +
     `activeDot={{ r: 5 }}` (hover highlight bawaan recharts) — cuma TIDAK
     lagi jadi target klik individual.
   - **Perubahan ini di `AreaChartWidget.tsx` (shared)** — otomatis
     berlaku ke SEMUA pemakai widget ini yang pakai `onAreaClick` di masa
     depan, bukan cuma M2.
4. **Hasil akhir**: M2 sekarang punya KEDUANYA — dialog klik-titik (SUDAH
   diperbaiki) + `BreakdownTable` (di tab Trend Analysis, di bawah chart).
- `tsc --noEmit` + `eslint` (whole project) bersih.

**Verifikasi tambahan (sama hari, 2 temuan user):**
- **"Popup tren 2025 kenapa tidak ada Customer Aktif?"** — dicek langsung ke
  data, BUKAN bug: dataset lokal (hasil restore production terbaru) cuma
  py histori mulai **1 Januari 2025** (kedua company). Klik ke titik
  **Januari 2025** → Customer Aktif = 0, KARENA memang tidak mungkin ada
  customer "Existing" di bulan pertama data sama sekali (syarat Existing:
  first_invoice SEBELUM `periodStart - activeMonths`, mustahil dipenuhi
  kalau tidak ada histori sebelum Jan 2025 sama sekali). Dibuktikan: Maret
  2025 = 589 aktif, Juni 2025 = 939 aktif — bulan LAIN di 2025 normal ada
  data, cuma bulan PERTAMA (Januari) yang nol, sesuai definisi bisnisnya.
- **Kolom breakdown `—` diganti `0`/`Rp 0`** (koreksi user, konsisten dgn
  standar tabel lain di app ini — instruksi yang SAMA persis pernah
  diberikan sebelumnya utk kolom type-breakdown M1 yang sudah dihapus):
  `yoy_category_count`, `category_change`, `yoy_total_revenue` di
  `BreakdownTable.tsx` — dulu tampil `—` kalau customer tidak punya
  baseline YoY (kategori "New"), sekarang `0`/`Rp 0`. **Category count
  22, 25, dst di tabel ini SUDAH benar kategori** (bukan produk) —
  diverifikasi ke data: `COUNT(DISTINCT product_category_id)`, dibuktikan
  1 customer KNT dgn category_count=22 py distinct_products=150 (jauh
  lebih besar, kalau "22" itu produk seharusnya sama dgn 150-nya, bukan
  angka terpisah jauh lebih kecil).

**Redesign chart Trend Analysis M2 (2026-08-21, permintaan user)** — dari
`AreaChartWidget` (1 garis avg_category polos) jadi `ComboChartWidget`
(stacked bar + 2 garis), spek dari user: "1. Total customer -> tinggi
stacked bar, 2. Single Category -> bagian pertama bar, 3. Multi Category ->
bagian kedua bar, 4. Avg Category -> line + benchmark":
- **`ComboChartWidget` (shared) diperluas**: prop `stacked?: boolean` baru
  (terapkan `stackId="stack"` ke `Bar`+`Bar2`, sebelumnya SELALU render 2
  bar sejajar, tidak bisa ditumpuk) + `formatLine2` (gap kecil yang
  ketemu — tooltip line2 sebelumnya tidak pernah pakai formatter custom,
  fallback ke `toLocaleString` polos) + `onBarClick` sekarang nempel di
  KEDUA bar (bar+bar2), bukan cuma bar pertama — supaya klik di segmen
  manapun dari stacked bar sama-sama trigger drill-down.
- **Data**: `single_category` DIHITUNG di frontend (`total_active -
  multi_product`, keduanya SUDAH ada di `data.trend`, TIDAK ADA fetch/
  perubahan backend). `benchmark` = rata-rata `avg_category` dari SEMUA 12
  titik yang tampil di chart (dikonfirmasi ke user: bukan target
  dikonfigurasi admin — itu opsi lain yang lebih besar scope-nya, ditolak
  demi versi cepat jalan hari ini) — 1 angka konstan di-broadcast ke semua
  titik data supaya line2 render sbg garis lurus horizontal.
- **Diverifikasi ke data asli** (company 2, 12 bulan): `single_category +
  multi_product` PERSIS sama dgn `total_active` di SEMUA 12 titik (tidak
  ada selisih).
- **Koreksi benchmark (sama hari, susulan)**: user tanya "jadi rata-rata
  dari rata-rata?" — BENAR, perhitungan awal (`sum(avg_category) / 12`,
  unweighted mean) salah secara statistik: bulan dgn sedikit customer
  (mis. Agustus 2026 baru 779, bulan berjalan) ikut disamakan bobotnya
  dgn bulan yang 1992 customer. Diperbaiki jadi **weighted mean** —
  `sum(avg_category_i × total_active_i) / sum(total_active_i)`, setara
  total kategori SEMUA customer-bulan dibagi total customer-bulan.
  Diverifikasi: unweighted 1.54 vs weighted 1.53 (beda kecil di dataset
  ini, tapi metode weighted yang benar — bisa beda jauh lebih besar kalau
  distribusi customer per bulan lebih timpang).

**Koreksi ke-2 (sama hari, susulan lagi)** — user: "sepertinya itu tidak
berfungsi hapus saja benchmark nya" + "kalau diubah jadi area chart dengan
data ini apakah bisa? agar tidak monoton semuanya bar chart combo?":
- **Garis benchmark DIHAPUS total** (state `benchmark`, prop `line2Key`
  di JSX, key i18n `m2SeriesBenchmark`) — tidak didebug lebih lanjut,
  langsung dihapus sesuai instruksi eksplisit user.
- **`ComboChartWidget` (shared) diperluas lagi**: prop baru
  `barVariant?: 'bar' | 'area'` (default `'bar'`, perilaku lama
  tidak berubah) — kalau `'area'`, bar/bar2 dirender sbg `<Area>` (gradient
  fill, gaya sama `AreaChartWidget`) alih-alih `<Bar>` (kotak), TAPI data
  dan `stacked`/`onBarClick` logic SAMA PERSIS (cuma ganti bentuk visual,
  bukan struktur data baru). `<defs>`/`linearGradient` ditambah kondisional
  (cuma di-render kalau `barVariant==='area'`). Fitur `concentrationKey`
  (highlight bar red di atas threshold, dipakai M4) TETAP Bar-only — tidak
  masuk akal utk Area, jadi cuma ada di cabang `barVariant==='bar'`.
- M2 sekarang pakai `barVariant="area"` — chart Trend Analysis M2 jadi
  **stacked AREA** (Single Category + Multi Category, gradient fill)
  + garis Avg Category (line biasa, TANPA benchmark lagi) — beda visual
  dari M1 yang tetap `barVariant="bar"` (default, tidak disentuh), biar
  tidak semua KPI di app ini tampil sbg bar chart combo yang sama persis.
- **Koreksi warna (susulan)**: `barColor` (segmen Single Category) tadinya
  abu-abu/slate (persis warna `total_active` di M1) — user: "rubah warna
  nya jangan abu abu". Diganti `theme.palette.warning.main` (amber) —
  3 warna sekarang beda jelas: Single Category=amber, Multi Category=biru
  (primary, TIDAK diubah), Avg Category=hijau (success, TIDAK diubah).
- `tsc --noEmit` + `eslint` bersih.

**Bug klik "pop up error" ditemukan & diperbaiki (susulan, sama hari)** —
setelah M2 pindah ke `barVariant="area"`, klik chart munculkan error.
Root cause: `onClick` PER-ELEMEN yang dipasang di `<Bar>`/`<Area>` (pola
lama `ComboChartWidget`) beda payload di recharts v3 — `<Bar>` kirim data
BARIS asli (`BarRectangleItem`), `<Area>` kirim props GEOMETRI KURVA-nya
sendiri (`RechartsMouseEventHandler<Props, SVGPathElement>`,
`node_modules/recharts/types/shape/Curve.d.ts`) — BUKAN data. Waktu M2
pakai `barVariant="area"`, handler `onBarClick` M2 (`(d) => ...d.month...`)
terima objek salah bentuk, `d.month` undefined, error di
`getPeriodDateRange` (parse periode invalid). Fix: `onClick` PER-ELEMEN
di `<Bar>`/`<Area>` DIHAPUS semua, dipindah 1x ke level `<ComposedChart>`
pakai `activeLabel` (`MouseHandlerDataParam` dari recharts) — mekanisme
SAMA PERSIS yang sudah dipakai buat perbaiki `AreaChartWidget.tsx`
sebelumnya, kali ini diterapkan ke `ComboChartWidget` juga — bekerja
SERAGAM utk Bar maupun Area, tidak bergantung payload per-elemen yang
ternyata beda-beda. M1 (pakai `barVariant="bar"` default, tapi TIDAK
kirim `onBarClick` sama sekali) tidak terdampak/tidak berisiko oleh
perubahan ini. `tsc --noEmit` + `eslint` bersih.
- `onAreaClick` → `onBarClick` (ganti widget pindah pola klik ke Bar yang
  lebih reliable — sudah dibuktikan lebih robust dari klik-titik Area di
  koreksi sebelumnya). `AreaChartWidget` TETAP dipakai di tab Overview
  (mini chart, sengaja tetap sederhana — cuma tab Trend Analysis yang
  di-upgrade ke versi kaya ini).
- `tsc --noEmit` + `eslint` bersih.

#### M3 — Average Revenue / Existing Customer

**Tujuan:** mengetahui customer yang menghasilkan revenue terbesar dan
perubahan revenue mereka.

**Kolom:** Customer · Branch · Division · Channel · Current Revenue ·
YoY Revenue · Revenue Change · Revenue Growth % · Category Count ·
Revenue Share

**Sorting:** Highest Revenue · Largest Growth · Largest Decline

#### M4 — Average Gross Profit / Existing Customer

**Tujuan:** mengetahui customer berdasarkan kontribusi Gross Profit.

**Kolom:** Customer · Branch · Division · Channel · Current GP · YoY GP
· GP Change · GP Growth % · Revenue · GP Margin · Category Count

#### M5 — High Margin Product Penetration

**Tujuan:** mengetahui customer dan produk yang berhubungan dengan
high-margin product. Punya 2 breakdown terpisah:

**Customer Breakdown — Kolom:** Customer · Branch · Division · Channel ·
High Margin Product Count · Total Product Count · Penetration % · High
Margin Revenue · Total Revenue · Contribution %

**Product Breakdown — Kolom:** Product · Category · Division · Revenue ·
Gross Profit · Margin % · High Margin Status · Customer Count · Revenue
Contribution

#### M6 — Repeat Order Rate

**Tujuan:** mengetahui customer yang kembali melakukan order.

**Kolom:** Customer · Branch · Division · Channel · Previous Order Date
· Current Order Date · Days Since Previous Order · Order Count · Revenue
· Repeat Status

**Status:** Repeat / Non-repeat

#### M8 — Dormant Customer Rate

**Tujuan:** mengetahui customer yang sudah tidak melakukan order.

**Kolom:** Customer · Branch · Division · Channel · Last Order Date ·
Days Inactive · Previous Revenue · YoY Revenue · Customer Value ·
Dormant Status

**Sorting:** Longest Inactive · Highest Revenue at Risk

#### M9 — Dormant Customer Value

**Tujuan:** mengetahui nilai bisnis yang sedang dormant/berisiko hilang.

**Kolom:** Customer · Branch · Division · Channel · Last Order · Days
Inactive · Previous Revenue · Previous Gross Profit · Revenue at Risk ·
GP at Risk · Dormant Duration

**Fokus utama:** Revenue at Risk · GP at Risk

#### M10 — Customer Reactivation Rate

**Tujuan:** mengetahui customer dormant yang berhasil kembali aktif.

**Kolom:** Customer · Branch · Division · Channel · Previous Last Order
· Reactivation Date · Dormant Duration · Previous Revenue ·
Reactivation Revenue · Revenue Change · Reactivation Status

### 28.11 Struktur Final Setiap KPI Card

Tampilan Analysis:

```
┌──────────────────────────────────────────────────────────────┐
│ M3 · Average Revenue / Existing Customer                     │
│                                                              │
│ Rp 151.1K          Rp 142.8K          +Rp 8.3K (+5.8%)      │
│ Current             YoY                Change                │
│                                                              │
│ [ Analysis ]        [ Breakdown ]                            │
│ ─────────────                                               │
│                                                              │
│                 12-PERIOD TREND                              │
│                                                              │
│                       CHART                                  │
│                                                              │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ 12M AVERAGE          HIGHEST             LOWEST              │
│ Rp 128.6K             Rp 151.1K           Rp 102.4K          │
│                       Aug 2026             Feb 2026           │
└──────────────────────────────────────────────────────────────┘
```

Tampilan Breakdown:

```
┌──────────────────────────────────────────────────────────────┐
│ M3 · Average Revenue / Existing Customer                     │
│                                                              │
│ Rp 151.1K          Rp 142.8K          +Rp 8.3K (+5.8%)      │
│ Current             YoY                Change                │
│                                                              │
│ [ Analysis ]        [ Breakdown ]                            │
│                      ───────────                              │
├──────────────────────────────────────────────────────────────┤
│ Search Customer   Status ▼   Sort ▼   ...                    │
├──────────────────────────────────────────────────────────────┤
│ CUSTOMER TABLE                                                 │
│                                                              │
│ Customer | Revenue | YoY | Change | Growth | Share | ...   │
│ ──────────────────────────────────────────────────────────── │
│ ...                                                          │
│ ...                                                          │
│ ...                                                          │
├──────────────────────────────────────────────────────────────┤
│ Showing 1–25 of 326                         ← 1 2 3 4 →      │
└──────────────────────────────────────────────────────────────┘
```

### 28.12 Hirarki Informasi Final

```
                  OVERVIEW
                     │
                     ▼
              "Apa kondisinya?"
                     │
                     ▼
              KPI CATEGORY
                     │
                     ▼
               KPI HEADER
           Current / YoY / Change
                     │
                     ▼
                 ANALYSIS
               12-Period Trend
                     │
          ┌──────────┴──────────┐
          ▼                     ▼
       Tooltip             Trend Summary
     Point Detail          12M / YTD
          │
          ▼
       BREAKDOWN
          │
     ┌────┼────┐
     ▼    ▼    ▼
   Filter Table Pagination
          │
          ▼
   Customer / Product Detail
```

### 28.13 Prinsip Akhir

- Header menjawab **"sekarang bagaimana?"**
- Chart menjawab **"perubahannya bagaimana?"**
- Tooltip menjawab **"apa detail pada periode ini?"**
- Summary menjawab **"bagaimana performa keseluruhan trend?"**
- Breakdown menjawab **"siapa/apa yang menyebabkan perubahan?"**

Dengan struktur ini, 3–4 KPI dalam satu menu (Growth/Retention/Value)
tetap bisa berada dalam satu halaman, tanpa membuat tiap KPI harus
memuat chart, tabel, dan informasi detail sekaligus (Analysis vs
Breakdown dipisah tab, bukan ditumpuk).

---

## 29. Tab Per-KPI di Halaman Growth/Retention/Value (tambahan user, 2026-08-19)

Revisi atas asumsi §28.13 ("3-4 KPI tetap satu halaman, ditumpuk vertikal").
Makin banyak KPI dapat pola lengkap §28 (Header + Analysis/Breakdown penuh),
satu halaman ditumpuk jadi terlalu panjang — Retention paling parah (4 KPI
× blok penuh). Solusi: KPI jadi tab level halaman, bukan ditumpuk.

### 29.1 Referensi visual

Dicek https://overview.tremor.so/support sebagai referensi gaya tab bar
(bersih, underline biru di tab aktif). Catatan penting: di halaman itu tab
ada di level HALAMAN (Support/Retention/Workflow/Agents) — di DALAM 1
halaman, semua KPI card (Current Tickets/SLA Performance/Call Volume)
tetap tampil bersamaan tanpa tab, baru di bawahnya 1 tabel data. Jadi pola
"1 tab = 1 KPI" adalah ekstensi ide user, bukan langsung dicontoh dari
referensi — cuma gaya visual tab bar-nya yang dipakai.

### 29.2 Struktur

```
[Filter bar - 1 baris, dipakai bareng semua tab: company/branch/division/
 periode/exclude-intercompany]

[Tab bar: M1 Cross Selling | M2 Avg Category | M7 Expansion]
─────────────────────────────────────────────────────────
   (isi tab aktif = 1 blok §28 penuh: KpiHeader + tab
    Analysis/Breakdown + chart + breakdown table)
```

- Filter TETAP di atas tab, bukan di dalam tiap tab — ganti tab tidak
  reset filter (lanjutan §23, filter persistent).
- Konten tab = 1 KPI penuh sesuai §28 (Header, Analysis/Breakdown, chart,
  tooltip, trend summary, breakdown table) — pola internal KPI TIDAK
  berubah dari yang sudah ada di M1, cuma dipindah dari "selalu tampil"
  jadi "tampil kalau tab-nya aktif" (KPI non-aktif unmount, bukan display:
  none — hindari fetch data KPI yang tidak sedang dilihat).

### 29.3 Deep-link via URL query param

Tab aktif tercermin di query string, mis. `/growth?kpi=cross_selling_ratio`.
Alasan:
- Refresh/share link tetap di tab yang sama (bukan reset ke tab pertama).
- Sekalian jadi solusi temuan lama yang belum dikerjakan: 9 `metric.link`
  dari kartu Overview yang nunjuk ke rute mati (`/customer-revenue` dkk,
  tidak pernah ada rute frontend-nya) — link itu diarahkan ke
  `/growth?kpi=...` / `/retention?kpi=...` / `/value?kpi=...` sesuai
  menu-nya, bukan rute terpisah per KPI.

Value `kpi` = `metric_key` yang SAMA dengan yang sudah dipakai backend/
`METRIC_LABEL_KEYS` (frontend/src/components/dashboard/metricFormat.ts) —
bukan nama baru, biar `metric.link` dari Overview bisa langsung dipetakan
tanpa tabel mapping tambahan:

- Growth: `cross_selling_ratio` (M1) · `avg_category` (M2) · `expansion_rate` (M7)
- Retention: `repeat_order_rate` (M6) · `dormant_rate` (M8) · `dormant_value` (M9) ·
  `reactivation_rate` (M10)
- Value: `avg_revenue` (M3) · `avg_gross_profit` (M4) · `high_margin_penetration` (M5)

Query param tidak ada / tidak valid / user tidak punya akses KPI itu →
fallback ke KPI pertama yang user PUNYA akses, urutan sesuai §2.

### 29.4 Rollout

Growth dulu (M1/M2/M7) sebagai contoh — direview user sebelum diterapkan
ke Retention (§11) dan Value (§16). Pola internal tiap KPI (Header/
Analysis/Breakdown, §28) TIDAK berubah, restrukturnya cuma di level
"tab mana yang render", bukan isi KPI itu sendiri.

---

## 30. Filter Granularitas Periode — Monthly/Quarterly/Semester/Annual (tambahan user, 2026-08-19)

Klarifikasi §21/§22 (sudah tertulis tapi belum diimplementasi di manapun)
+ §28.3 ("12 periode terakhir, mengikuti granularitas filter"). Ini FILTER
KEDUA yang terpisah dari filter scope (Entitas/Divisi + tanggal, sudah ada
di semua halaman KPI) — belum ada UI-nya sama sekali saat ini.

### 30.1 Konfirmasi maksud "12 batang mengikuti granularitas"

Ganti filter ke Quarterly BUKAN mengelompokkan 12 bulan yang sama jadi
kuartal-kuartal — tapi mengganti unit chart itu sendiri jadi kuartal, dan
mundur 12 kuartal (=3 tahun), bukan 12 bulan (=1 tahun) lagi. Tiap batang
= 1 kuartal utuh (3 bulan digabung). Sama utk Semester (12 semester = 6
tahun) dan Annual (12 tahun).

Ini BUKAN cuma soal chart Analysis — filter ini juga mengubah KPI Header
(§21): Quarterly → Current = Q3 2026, YoY = Q3 2025 (bukan lagi Aug 2026
vs Aug 2025). Jadi granularitas ini punya 2 titik pengaruh: Header (current/
comparison KPI) dan trend chart Analysis (§28.3) — bukan cuma salah satu.

### 30.2 Temuan: data historis belum cukup panjang

Dicek langsung ke DB lokal (restore data production, 2026-08-19):
`invoices.invoice_date` rentang **2025-01-01 s/d 2026-08-17 (~20 bulan)**.

| Granularitas | Rentang dibutuhkan (12 periode) | Rentang data ada | Slot kosong |
|---|---|---|---|
| Monthly | 1 tahun | ~20 bulan | 0 dari 12 |
| Quarterly | 3 tahun | ~6-7 kuartal | ~5 dari 12 |
| Semester | 6 tahun | ~3 semester | ~9 dari 12 |
| Annual | 12 tahun | ~2 tahun | ~10 dari 12 |

**Keputusan user:** tetap 12 slot selalu (bukan dipotong sesuai data yang
ada) — periode yang datanya belum ada ditampilkan kosong/nol. Konsekuensi:
saat ini chart Semester & Annual mayoritas kosong sampai data historis
menumpuk beberapa tahun ke depan — ini WAJAR/EXPECTED, bukan bug, mengingat
sistem baru mulai punya data terstruktur sejak awal 2025.

### 30.3 Aturan agregasi per jenis KPI (1 batang = 1 periode gabungan)

**Rate KPI** (mis. M8 Dormant Rate, M1 Cross-Sell Rate) — **keputusan
user:** dihitung ULANG dari total pembilang/penyebut se-periode, BUKAN
rata-rata dari rate tiap bulan (rata-rata rate bisa distorsi kalau volume
antar bulan beda jauh — mis. dormant rate Juli 10% dari 50 customer vs
Agustus 10% dari 500 customer, rata-rata sederhana (10%+10%)/2 mengabaikan
bobot volume). Contoh M8 kuartal: total customer dormant (Jul+Agu+Sep) /
total existing customer (Jul+Agu+Sep) — BUKAN AVG(rate Jul, rate Agu,
rate Sep).

**Value/Count KPI** (mis. M3 Revenue, M9 Dormant Value) — **belum
diputuskan, perlu direview PER KPI saat implementasi**, karena tidak semua
"jumlah" aman langsung dijumlah 3 bulan:
- Metrik SUM murni per transaksi (Total Revenue, Total GP) → aman
  dijumlah 3 bulan.
- Metrik COUNT customer unik (mis. "existing customers", "expanded
  customers") → TIDAK aman langsung dijumlah 3 bulan (customer yang sama
  aktif di 3 bulan itu bakal ke-double/triple count) — butuh query ulang
  "distinct customer dalam window 1 kuartal", bukan SUM(count bulanan).

### 30.4 Belum ada implementasi backend sama sekali

Semua endpoint M1-M10 (`backend/src/features/metrics/metrics.service.ts`)
saat ini HARDCODE bulanan — tidak ada parameter `period_type`, trend selalu
12 bulan terakhir dari `period_end`. Menambahkan granularitas ini bukan
cuma tambah filter UI, tapi perubahan di:
- Backend: tiap service M1-M10 perlu terima `period_type` + hitung ulang
  query aggregate-nya per aturan §30.3 (bukan cuma ganti label axis).
- Ada modul yang SUDAH punya logic resolve rentang tanggal
  quarter/semester/annual siap pakai:
  `backend/src/features/analisis/period.util.ts` (`getPeriodRange`,
  `PeriodType`) — REUSE ini, jangan tulis ulang, cuma untuk fitur Analisis
  (task016) saat ini, bukan dipakai M1-M10.
- Frontend: filter UI baru (dropdown Monthly/Quarterly/Semester/Annual) +
  axis label chart per granularitas (mirror `formatMonthLabel`,
  §"Format tampilan" di `utils/date.ts` — perlu `formatQuarterLabel`/
  `formatSemesterLabel`/`formatYearLabel` baru).

### 30.5 Skala pekerjaan

Ini JAUH lebih besar dari tab-per-KPI (§29) — nyentuh ~10 service backend
(M1-M10, tiap KPI beda cara agregasi per §30.3) + KPI Header + trend chart
di 3 halaman (Growth/Retention/Value). Rekomendasi: pilih 1 KPI dulu jadi
contoh (mirror pola M1 di §28/§29), direview user, baru diterapkan ke
sisanya — BUKAN dikerjakan sekaligus ke 10 KPI.

### 30.6 M1 Cross Selling — SELESAI (contoh pertama, 2026-08-20)

Backend + frontend granularitas M1 (Cross Selling Ratio) sudah jalan
end-to-end, sudah diverifikasi live di browser (bukan cuma dites unit):

- `backend/src/features/metrics/metrics.schema.ts` — `crossSellingQuerySchema`
  terima `period_type` (monthly/quarter/semester/annual, default monthly,
  behavior lama tetap identik kalau param ini tidak dikirim — diverifikasi
  numerik sama persis vs query lama sebelum diganti).
- `backend/src/features/analisis/period.util.ts` — ditambah
  `buildTrailingPeriods()` (N periode mundur, reusable utk M2-M10) dan
  `clampToElapsedEnd()` (lihat §30.7).
- `backend/src/features/metrics/repository/m1.repository.ts` —
  `fetchCrossSellingTrend` digeneralisasi dari `generate_series` bulanan ke
  bucket VALUES-list per granularitas (drizzle `sql.join` + `VALUES`, BUKAN
  array parameter — `sql\`${arr}::text[]\`` TIDAK bekerja di drizzle-orm,
  expand jadi row/record bukan array literal, sudah dites langsung ke DB).
- Frontend: `M1CrossSelling.tsx`, `M2AvgCategory.tsx` (share `data.trend`
  yang sama dgn M1, jadi otomatis ikut granularitas + drill-down-nya
  digeneralisasi dari `monthToEndDate` ke `getPeriodDateRange`), tab bar
  Growth kirim `period_type`, label header/chart/trend-summary semua
  granularitas-aware (`formatPeriodLabelShort`, `dashboard.periodUnit.*`).
- M7 (Expansion, `useCustomerMetrics`) BELUM — di luar scope "mulai dari
  KPI 1", lihat §30.9.

### 30.7 Periode berjalan — elapsed cutoff + YoY apple-to-apple (SELESAI, 2026-08-20)

**Temuan sebelum diperbaiki:** untuk periode yang MASIH BERJALAN (mis. Q3
2026 saat hari ini baru pertengahan Agustus), KPI Header sempat menunjuk
0%/0 customer — window aktif (`active_window_months`, business_configs) di
data ini cuma 1 bulan, sementara cutoff yang dipakai SELALU akhir kalender
penuh periode (mis. 30 September utk Q3), jauh di masa depan yang datanya
belum ada. Bulanan kebetulan tidak kelihatan 0% (window 1 bulan × cutoff
akhir bulan yang cuma beberapa hari di depan hari ini, masih ketimpa data
riil) — TAPI pembanding YoY-nya ternyata TETAP pakai 1 bulan PENUH
(instruksi user 2026-08-20 menemukan ini: "jika data filter bulanan, chart
menampilkan data tidak 0 ... apakah pembanding nya YoY 2025 ini 1 bulan
penuh?" — jawabannya waktu itu YA, bukan apple-to-apple).

**Perbaikan:** `clampToElapsedEnd(periodKey, calendarEnd, today)` di
`period.util.ts` — potong cutoff ke "hari ini" (atau padanan tahun-nya
buat YoY) KALAU DAN HANYA KALAU periode itu masih berjalan; periode yang
sudah tutup penuh (mis. Q2 2026, kuartal lalu) TIDAK disentuh, tetap
tampil 1 periode penuh. Trik intinya: geser referensi "hari ini" mundur
sejumlah tahun = selisih (tahun sekarang − tahun di periodKey) — jadi
utk request current (periodKey tahun ini) referensinya hari ini apa
adanya, utk request YoY (periodKey tahun lalu) referensinya otomatis ikut
mundur setahun juga — TANPA backend perlu tahu request ini "current" atau
"YoY", cukup dari tahun di periodKey sendiri. Sudah diverifikasi 4 skenario
langsung ke DB + live di browser: (1) bulanan berjalan, (2) kuartalan
berjalan (dulu 0%, sekarang benar), (3) YoY dari kuartal berjalan (ikut
terpotong ke tanggal yang sama tahun lalu, bukan akhir kuartal penuh), (4)
kuartal yang sudah tutup (tetap tampil penuh, tidak kepotong).

Trend chart's titik TERAKHIR (periodKey aktif) ikut memakai cutoff yang
sama; titik-titik sebelumnya (periode yang sudah tutup) tidak disentuh.

Diterapkan di M1 saja sejauh ini (sama seperti §30.6) — M2 ikut otomatis
(share `data.trend`), M3-M10 BELUM (§30.9).

**Koreksi (2026-08-20, sesudah §30.7 di atas sempat salah diterapkan):**
implementasi PERTAMA `clampToElapsedEnd` cuma memotong tanggal AKHIR window,
tapi tanggal AWAL window tetap dihitung dari rumus lama "mundur N bulan
mentah dari cutoff" (`filterDate - activeMonths bulan`) — untuk cutoff yang
BUKAN akhir bulan (mis. tanggal 20), ini menggeser awal window jadi tanggal
20 bulan sebelumnya (mis. 21 Juli), BUKAN tanggal 1 bulan berjalan (1
Agustus). **Ditegur user:** "start date selalu harus awal periode ... itu
sudah aturan paten international, jangan buat aturan aneh sendiri." Benar —
awal window untuk KPI/reporting period HARUS SELALU tanggal 1 kalender
(atau 1 Januari utk tahunan, dst), tidak pernah digeser oleh aritmatika
mundur-N-bulan.

**Perbaikan final** (`m1.repository.ts`, `CS_INV_CTE` + `fetchCrossSellingTrend`):
awal window dihitung `date_trunc('month', cutoff) − (activeMonths−1) bulan
− 1 hari` — SELALU jatuh di tanggal 1 kalender suatu bulan (mundur sejumlah
bulan PENUH dari bulan cutoff sendiri, activeMonths TETAP tidak pernah
diubah oleh periodType, task026 §8e tetap berlaku), bukan hasil pengurangan
mentah dari tanggal cutoff yang bisa jatuh di tengah bulan. Utk periode yang
SUDAH TUTUP, cutoff-nya sendiri selalu akhir bulan kalender, jadi rumus lama
vs baru KEBETULAN sama — TAPI ditemukan bonus: rumus LAMA (bahkan sebelum
sesi ini) punya bug off-by-one halus kalau bulan cutoff & bulan sebelumnya
beda jumlah hari (mis. cutoff 30 Juni − 1 bulan = 30 Mei via aritmatika
interval Postgres, padahal seharusnya awal Juni = 1 Juni, bukan nyerempet
31 Mei) — rumus baru otomatis bebas dari bug ini juga (¹karena dimulai dari
`date_trunc` bulan cutoff, bukan pengurangan interval mentah). Bug SAMA
(`filterDate - activeMonths * INTERVAL '1 month'` mentah) MASIH ADA di
M3-M10 (`m3m7.repository.ts`, `m8m10.repository.ts`, `m5/m6.repository.ts`,
`segment.helper.ts`) — TIDAK disentuh di sesi ini (di luar scope "M1 dulu"),
dicatat sebagai temuan terpisah, cek lagi kalau giliran M3-M10 dikerjakan.

Sudah diverifikasi ulang: window Agustus 2026 (berjalan) sekarang benar
1-20 Agustus (bukan lagi 21 Juli-20 Agustus), YoY-nya 1-20 Agustus 2025
(apple-to-apple), dan periode yang sudah tutup (Juni 2026) tetap 1-30 Juni
penuh — semua diverifikasi live browser + query langsung ke DB.

### 30.7a "Apply date cutoff" — mode analisis SEMUA titik trend dipotong sama (SELESAI, 2026-08-20)

**Latar belakang:** dari diskusi §30.7, user menunjukkan filter "Periode"
sebenarnya cuma filter BULAN/periode (hari-nya tidak berpengaruh KECUALI
di periode yang sedang berjalan) — "itu namanya bukan filter tanggal tapi
filter bulan atau periode... klik tanggal 25 Juli dan 1 Juli data chart
di Juli tidak akan berubah". Lalu user klarifikasi maksud aslinya:
kebutuhan ANALISIS eksplisit "20 hari pertama dalam 12 bulan terakhir
grafiknya seperti apa" — beda dari default trend (yang cuma motong titik
yang sedang berjalan, periode tutup tetap penuh, lihat §30.7). Ini FITUR
TERPISAH yang sengaja diaktifkan user, BUKAN pengganti behavior default.

**UI** (`Growth/index.tsx`): field "Periode" DEFAULT `type="month"`
(cuma pilih bulan+tahun — jujur soal apa yang benar-benar dipakai, sesuai
temuan user), + checkbox baru "Apply date cutoff" di sampingnya. Checkbox
OFF → field tetap month picker, behavior trend = default (§30.7). Checkbox
ON → field berubah jadi date picker penuh (hari bisa dipilih), DAN
mengaktifkan mode SEMUA 12 titik trend dipotong ke hari yang sama (bukan
cuma titik yang sedang berjalan) — termasuk pembanding YoY-nya, tetap
apple-to-apple (day-of-month yang sama di kedua tahun).

**Backend:** param baru `apply_date_cutoff` (boolean, pola string-enum
sama seperti `exclude_intercompany` — BUKAN `z.coerce.boolean()`).
`clampEndToDay(periodEnd, day)` (period.util.ts) — potong SEBUAH tanggal
akhir periode ke hari ke-D bulan yang sama (dibatasi hari terakhir bulan
itu kalau D lebih besar, mis. D=31 di bulan Februari → jatuh ke 28/29).
Kalau `apply_date_cutoff=true`, SEMUA 12 bucket trend (bukan cuma titik
terakhir) + KPI Header dipotong lewat fungsi ini, MENGGANTIKAN
`clampToElapsedEnd` (§30.7) sepenuhnya utk request itu.

Diterapkan di M1 + fetch YoY-nya M1 sendiri (§30.6 pattern) — M2 ikut
otomatis (share `data.trend`). Sudah diverifikasi query langsung ke DB +
live browser: checkbox OFF → trend seperti biasa (11 bulan penuh, 1 bulan
berjalan terpotong elapsed); checkbox ON, hari=20 → SEMUA 12 titik
terpotong ke tanggal 1-20 bulan masing-masing, termasuk KPI Header current
& pembanding YoY (mis. "Saat Ini: 28.7% | Agustus 2025: 29.6%" — dua-duanya
window tanggal 1-20).

**Koreksi (2026-08-20, sesudah user tanya "apakah ini bekerja untuk
kuartalan/semesteran/tahunan juga?"):** implementasi PERTAMA `clampEndToDay`
cuma memotong DAY-nya, tanpa cek apakah hasilnya masih masuk akal — untuk
granularitas > bulanan, bucket periodEnd yang masuk ke fungsi ini adalah
akhir kalender BULAN TERAKHIR periode itu (mis. Kuartal 3 → 30 September).
Kalau periode itu SEDANG BERJALAN, bulan terakhirnya bisa jadi bulan yang
BELUM TERJADI SAMA SEKALI (hari ini baru Agustus, September belum mulai) —
"hari ke-20 bulan itu" jadi tanggal masa depan, hasilnya 0/kosong (bug,
sama persis gejala §30.7 sebelum diperbaiki, tapi di fungsi yang beda).

**Perbaikan:** `clampEndToDay` sekarang JUGA di-cap ke `referenceNowForYear`
(fungsi baru, diekstrak dari logic yang sudah ada di `clampToElapsedEnd`
— dipakai bareng oleh keduanya) — periode yang SUDAH TUTUP tidak terdampak
(hasil clamp-nya sudah otomatis di masa lalu), cuma periode yang MASIH
BERJALAN yang kena batasi ke hari ini (atau padanan tahun-nya buat YoY).
Sudah diverifikasi ulang 4 granularitas × current/YoY/closed langsung ke
DB + live browser (kuartalan) — semua KPI Header & trend sekarang konsisten
non-zero, current Q3 2026 (cutoff hari 20) = 28.7% match persis dengan
bulanan Agustus 2026 (cutoff hari 20) = 28.7% (masuk akal, activeMonths=1
independen dari periodType, §30.4/task026 §8e).

### 30.8 Temuan terbuka — M1/M2 belum pakai definisi customer SSOT (task028)

**BELUM DIPERBAIKI — lihat §30.10 utk definisi final (New/Existing relatif
periode, BUKAN activeMonths) yang menggantikan opsi A/B di bawah ini.**

M3-M10 semua sudah pakai `cteEstablishedCustomers` (SSOT task028,
`segment.helper.ts`: Existing = bukan New, TERMASUK Dormant). M1
(`m1.repository.ts` CS_INV_CTE) dan M2 (`avg-category.repository.ts`)
PUNYA populasi sendiri yang tidak pernah dipanggil ke situ — populasinya
"siapa saja yang transaksi dalam window aktif" (gabungan New+Active,
BUKAN exclude New seperti SSOT). Tooltip M1 melabeli angka ini "Existing
Customers" — jadi labelnya menyesatkan (populasi sebenarnya bukan
"Existing" per definisi final).

Sudah dicek 2 cara perbaikan langsung ke DB (data Q2 2026, akhir Juni,
rate cross-sell sekarang 27,0% dari 2.623 customer):

| Opsi | Cara | Hasil (rate / populasi) |
|---|---|---|
| A — Exclude New saja | Populasi tetap "aktif dalam window", cuma customer yang pembelian PERTAMANYA jatuh di window ini (New) dikeluarkan | 27,0% → 30,5% (1.584 customer) — perubahan wajar |
| B — SSOT penuh (samakan M6-M10) | Denominator diganti SEMUA existing customer (termasuk yang sudah lama tidak beli), bukan cuma yang aktif window ini | 27,0% → 1,6% (30.373 customer) — anjlok drastis, makna KPI berubah total dari "cross-sell di antara yang aktif" jadi "cross-sell di antara SEMUA yang pernah ada" |

Sempat diajukan ke user via pertanyaan tapi user minta klarifikasi dulu
(2026-08-20), lalu percakapan pindah ke §30.7 duluan — opsi mana yang
dipakai BELUM diputuskan, dicatat di sini biar tidak hilang.

### 30.10 Definisi periode & New/Existing customer — REVISI FINAL (2026-08-20)

**Koreksi user atas draft saya sebelumnya** ("lewat satu bulan" / window
aktif N-bulan buat nentuin New/Existing): itu salah. Aturan yang benar,
kata user persis: *"jika transaksi pertama di Juli, di akhir periode Juli
itu close, masuk periode Agustus dia sudah bukan New"* — New/Existing itu
**relatif ke PERIODE yang sedang dilihat (batas kalender), bukan relatif
ke activeMonths (window bulan mundur).**

**A. Batas periode — SELALU batas kalender, tidak bisa digeser (aturan
paten internasional, sudah dikonfirmasi user 2x):**

| Granularitas | Awal (selalu) | Akhir default (kalau sudah tutup) |
|---|---|---|
| Tahunan | 1 Januari | 31 Desember |
| Semester 1 | 1 Januari | 30 Juni |
| Semester 2 | 1 Juli | 31 Desember |
| Kuartal 1 | 1 Januari | 31 Maret |
| Kuartal 2 | 1 April | 30 Juni |
| Kuartal 3 | 1 Juli | 30 September |
| Kuartal 4 | 1 Oktober | 31 Desember |
| Bulanan | tanggal 1 | sehari sebelum tanggal 1 bulan berikutnya |

Kalau periode itu SEDANG BERJALAN (belum lewat "akhir default"-nya),
akhir efektifnya dipotong ke hari ini (elapsed cutoff, §30.7) — bukan
akhir default. Awal periode TIDAK PERNAH dipotong/digeser, kapan pun.

Status implementasi: sudah SESUAI di `period.util.ts` (`getPeriodRange`)
untuk keempat granularitas — tidak perlu perbaikan di bagian ini, cuma
diformalkan di sini biar jadi acuan tertulis.

**B. Definisi New/Existing — GANTI TOTAL dari activeMonths, jadi relatif
periode:**

- **New** = customer yang transaksi PERTAMA-nya SEPANJANG HIDUP (belum
  pernah transaksi sebelum itu sama sekali) jatuh DI DALAM rentang periode
  yang sedang dilihat (start-end kalender di atas, sudah termasuk elapsed
  cutoff kalau periode itu berjalan).
- **Existing** = customer yang transaksi pertamanya jatuh SEBELUM awal
  periode yang sedang dilihat (sudah "customer lama" sebelum periode ini
  bahkan mulai), DAN py punya minimal 1 transaksi DI DALAM periode ini
  ("Customer aktif berarti yang ada transaksi >= 1 di periode filter" —
  kata user persis).
- Konsekuensi otomatis (contoh user): customer yang transaksi pertama di
  Juli itu New untuk periode "Juli" / "Kuartal 3" / "2026" (karena Juli
  ada di dalam ketiganya) — begitu masuk periode "Agustus", customer yang
  sama itu Existing (karena transaksi pertamanya, Juli, sudah SEBELUM awal
  Agustus). Tidak perlu aturan "lewat N bulan" sama sekali — otomatis dari
  posisi tanggal transaksi pertama vs batas periode yang dipilih.

**Dampak ke M1/M2 (menggantikan §30.8 yang masih pending):** populasi M1
saat ini ("siapa saja transaksi dalam activeMonths=1 bulan mundur") harus
diganti "siapa saja transaksi pertama SEBELUM awal periode ini, DAN
transaksi minimal 1x DI DALAM periode ini" (Existing per definisi baru di
atas) — beda dari Opsi A/B yang sempat dihitung di §30.8 (yang masih
berbasis activeMonths), BELUM dihitung ulang angkanya dengan definisi ini.
Rentang transaksi yang dianalisis (buat cross-sell rate) ikut lebar
periode penuh (Kuartal = 3 bulan/elapsed, Tahunan = YTD), BUKAN activeMonths
1 bulan — ini juga menjawab pertanyaan user soal "51 hari untuk Q3" (elapsed
Jul1-Aug20), bukan 1 bulan terakhir saja.

**SELESAI (pilot M1, 2026-08-20).** Diimplementasi sbg helper GLOBAL/
reusable (task029 §30.10, instruksi user: "terapkan filter global nya
dulu untuk dipakai di matrix yang lain nya"), BUKAN ditulis khusus di
dalam M1 saja:

- `customers/helper/segment.helper.ts` — 2 fungsi baru, re-export lewat
  `metrics/segment.helper.ts`:
  - `cteFirstInvoiceDate(p)` → CTE `first_invoice_date(customer_id,
    first_date)`, tanggal transaksi pertama SEPANJANG HIDUP customer
    (scope company+branch RBAC saja, BUKAN division/branch filter laporan
    — status New/Existing itu properti GLOBAL customer).
  - `cteExistingCustomersByPeriod(p, periodStart)` → CTE `existing_
    customers(id)`, pakai `cteFirstInvoiceDate` di atas + `first_date <
    periodStart`.
- `period.util.ts` — `TrailingPeriodBucket` tambah field `start` (selalu
  batas kalender, tidak pernah dipotong/digeser); `buildTrailingPeriods`
  isi `start` dari `getPeriodRange(...).start` tiap bucket.
- `m1.repository.ts` (pilot) — `CS_INV_CTE` ganti total dari activeMonths
  window jadi `[periodStart, periodEnd]` + JOIN `existing_customers`.
  `fetchCrossSellingTrend` dihitung ULANG per bucket (populasi Existing
  beda2 tiap titik trend, sesuai `bk.ps` masing-masing — TIDAK bisa lagi
  1 window global sekali hitung seperti implementasi lama) — pakai
  `cteFirstInvoiceDate` SEKALI (bukan 12x subquery per bucket, efisiensi).
- `metrics.service.ts` — `periodStartDate` dihitung dari `getPeriodRange`
  (SELALU kalender, tidak ikut clamp elapsed/day-cutoff yang cuma
  menyentuh `end`), diteruskan ke KPI/Detail/Heatmap. `period.start` yang
  ditampilkan sekarang LANGSUNG `periodStartDate` ini — sekaligus
  membereskan bug lama (`startStr` sempat pakai rumus `Date.UTC(y, em -
  activeMonths, 1)` yang cuma benar kebetulan untuk activeMonths=1,
  sekarang sudah tidak dipakai sama sekali).
- Tooltip UI M1/M2 (`chart1Subtitle`/`m2ChartSubtitle`, i18n id+en) —
  disesuaikan teksnya, tidak lagi bilang "window N bulan" (definisi lama).

**Diverifikasi (query langsung ke DB + live browser, hari ini 2026-08-20):**

| Granularitas | period.start | period.end | active_count | rate |
|---|---|---|---|---|
| Bulanan (Agustus, berjalan) | 2026-08-01 | 2026-08-20 | 855 | 28,9% |
| Kuartalan (Q3, berjalan, **51 hari**) | 2026-07-01 | 2026-08-20 | 2.104 | 31,4% |
| Semesteran (S2, berjalan) | 2026-07-01 | 2026-08-20 | 2.104 | 31,4% |
| Tahunan (2026, berjalan, **YTD**) | 2026-01-01 | 2026-08-20 | 4.806 | 40,2% |
| Kuartalan Q1 2026 (SUDAH TUTUP, full) | 2026-01-01 | 2026-03-31 | 3.495 | 33,4% |

Trend 12-kuartal: titik paling awal (2023-Q4 s/d 2025-Q1) = 0 customer —
BENAR secara definisi baru (data invoice mulai Jan 2025 di DB lokal ini,
jadi SEMUA customer di 2025-Q1 itu transaksi pertamanya masih DI DALAM
periode itu sendiri = New, bukan Existing). Titik current (2026-Q3, baru
elapsed 51 hari) populasinya LEBIH KECIL dari 2026-Q1/Q2 (kuartal penuh
90 hari) — sudah benar, terlihat jelas juga di chart (bar Q3 26 lebih
pendek dari Q1/Q2 26). YoY current vs pembanding tetap apple-to-apple
(§30.7, tidak berubah): Q3 2026 (Jul1-Aug20) vs Q3 2025 (Jul1-Aug20).

**Belum disentuh** (scope pilot M1 saja, sesuai §30.9): M2 ikut otomatis
(share `data.trend`/`data.period`, tidak perlu perubahan sendiri). M3-M10
masih pakai `cteEstablishedCustomers`/activeMonths (task026 §8e, memang
BEDA definisi dan sengaja tidak diubah scope-nya di sini). Drill-down
M1.1 (`useCustomerProducts`, dialog produk per customer) masih pakai
`active_window`/activeMonths lama juga (endpoint terpisah, di luar 4
fungsi yang diubah).

### 30.9a URGEN — Bug ambang Dormant per divisi (task027, ditemukan lagi 2026-08-21)

**Prioritas: URGENT — bug aktif, angka SALAH di production sekarang, TIDAK
bergantung pada keputusan task028/granularitas.** Ditemukan pertama task027
(201 customer b2b_project salah dicap Dormant), diinvestigasi ulang lebih
dalam 2026-08-21 saat audit M8-M10 utk granularitas periode.

**Root cause dikonfirmasi:** `resolveDormantMonths()` (`config/threshold.ts`)
cari divisi dgn JUMLAH INVOICE TERBANYAK company-wide, lalu pakai ambang
dormant divisi ITU SAJA untuk SEMUA customer — bukan per kategori bisnis
customer sendiri (B2B_DC=3, B2C=6, B2B_Project=12, Manufacturing=6 bulan).

**Temuan baru 2026-08-21:** infrastruktur fix-nya SUDAH ADA di kode, cuma
tidak pernah disambungkan (dead code) — `getDormantCategoryMap()` (peta
division_id→kategori dormant) dan `buildDormantCaseSql()` (bikin ekspresi
SQL `CASE division_id WHEN ... THEN ambang END` per baris) — dua-duanya
didefinisikan di `config/threshold.ts`, TIDAK ADA pemanggil sama sekali di
seluruh codebase (dicek via grep).

**Rencana perbaikan:**
1. ✅ Tentukan "divisi customer ini" pakai definisi yang SUDAH ada (pola
   "divisi dari invoice TERAKHIR", sama seperti Customer Workbench) — bukan
   aturan baru.
2. ✅ Alirkan info divisi ke CTE `cxm` (`m8m10.repository.ts`) — sekarang
   tidak bawa info divisi sama sekali.
3. ✅ Ganti `${dormantMonths}::int` (1 angka utk semua) → `buildDormantCaseSql(...)`
   (per-customer sesuai divisinya).
4. ⏳ Telusuri SEMUA pemanggil `resolveDormantMonths` (bukan cuma M8-M10) —
   kemungkinan juga badge status "Dormant" Customer Workbench kena bug sama.
5. ✅ Verifikasi pakai perbandingan langsung SQL sebelum/sesudah (company 1,
   filterDate 2026-08-21): 476 dormant per-customer vs 680 dormant scalar-3-
   bulan-lama — 204 customer yang tadinya salah dicap Dormant (kebanyakan
   divisi Project/Intercompany, seharusnya ambang 12bln bukan 3bln), angka
   `total_customers` (974) TIDAK berubah (bukti activeMonths tidak
   terpengaruh, cuma dormantMonths yang diganti) — sesuai ekspektasi.

**Status 2026-08-21: LANGKAH 1-3 & 5 SELESAI (di `m8m10.repository.ts`,
`customers/helper/segment.helper.ts`, `metrics/segment.helper.ts`,
`metrics.service.ts`), diverifikasi lokal, TIDAK di-deploy** (lihat
peringatan di bawah). Implementasi:
- `cteCustDivision(p)` (CTE baru, `customers/helper/segment.helper.ts`) —
  divisi customer dari invoice TERBARU, scope company+branch RBAC saja
  (BUKAN filter laporan) — filosofi sama `cteFirstInvoiceDate`, pattern sama
  `latestSalespersonSq` (`customers.repository.ts`).
- `dormantThresholdCaseSql(p)` — wrapper `buildDormantCaseSql()` +
  `COALESCE(division_override_id, cust_division.division_id)` (task013
  pattern).
- `SegmentParams` nambah field `dormant`/`dormantCategoryMap` (resolusi
  sekali per request di `resolveSegmentParams`, `metrics.service.ts`) —
  `dormantMonths` scalar lama TETAP ada (backward-compat caller yang belum
  migrasi), TIDAK dipakai lagi di dalam m8m10.
- Ketiga fungsi (`fetchDormantTrend`, `fetchDormantValueRanking`,
  `fetchReactivatedCustomers`) sudah pakai threshold per-customer.
- `tsc --noEmit` bersih, test suite 78 pass/2 skip/4 fail (4 fail SAMA
  seperti baseline sebelum perubahan ini — tidak terkait dormant).

**Langkah 4 — audit ulang 2026-08-21: cuma 1 dari 3 "pemanggil lain" yang
BENAR-BENAR kena bug ini, bukan 3.** Ditelusuri satu-satu:
- ✅ **`customers.repository.ts` (`findCustomers`, badge status Customer
  Workbench) — SELESAI DIPERBAIKI.** Ini SATU-SATUNYA yang benar-benar
  pakai `resolveDormantMonths()` (1 scalar dominan) buat mengklasifikasi
  BANYAK customer sekaligus. Fix: `sqlStatusExpr`/`sqlStatusWhere`
  (`customers/helper/segment.helper.ts`) tipe parameter `dormantMonths`
  diperluas jadi `number | SQL` (drizzle `sql` tag otomatis menangani
  keduanya, angka jadi bound param atau SQL fragment di-splice apa
  adanya — tidak perlu ubah isi fungsi). `findCustomers` sekarang kirim
  `dormantThresholdExpr` (`buildDormantCaseSql` + `COALESCE(division_override_id,
  channel_divisions.division_id)`, reuse JOIN `channel_divisions` yang
  sudah ada lewat `latestSalespersonSq`) — bukan scalar lagi. GROUP BY
  query `rows` ditambah `channel_divisions.division_id` +
  `customers.division_override_id` (wajib, Postgres reject non-aggregate
  column di SELECT tanpa ini). **`findCustomerDetail` (halaman detail 1
  customer) TIDAK disentuh — sudah benar dari awal**, karena cuma 1
  customer per request, threshold-nya sudah di-resolve spesifik utk
  customer itu via `resolveDormantCategory(divRow.division_id)` (baca kode:
  line ~341-342), bukan scalar dominan company-wide.
- ⚠️ **`m3m7.repository.ts` (KPI3-7) — TERNYATA TIDAK KENA BUG INI.**
  Satu-satunya referensi `dormantMonths` di file ini (`raw_inv` CTE, lower-
  bound tanggal) TIDAK mengklasifikasi Dormant/Active — cuma buffer
  pre-filter tanggal yg lebih lebar dari yang sebenarnya dibutuhkan
  `active_inv_agg`/`prev_inv_agg` (window aslinya jauh lebih sempit,
  `activeMonths`-based). Nilai `dormantMonths` yang salah TIDAK mengubah
  baris mana pun yang akhirnya dihitung — cuma sedikit boros scan. Tidak
  perlu fix (opsional: bisa dihapus sbg minor cleanup performa, di luar
  scope bug ini).
- ⚠️ **`m4.repository.ts` (GP breakdown) — TERNYATA TIDAK KENA BUG INI.**
  File ini sama sekali tidak reference `dormantMonths` — delegasi penuh ke
  `cteEstablishedCustomers(p)`, yang di versi LOKAL saat ini (task028,
  "Existing termasuk dormant") SUDAH TIDAK PAKAI `dormantMonths` sama
  sekali (lower-bound dormant sudah dilepas). Kalau task028 DIBATALKAN/
  di-revert kembali ke perilaku production (dormant lower-bound balik),
  BARU `cteEstablishedCustomers` perlu direvisit dgn threshold per-
  customer — tapi itu keputusan terpisah (task028), bukan bug task027.

**Ralat cakupan dampak** (dari catatan lama): `m3m7.repository.ts` dan
`m4.repository.ts` DIKELUARKAN dari daftar "kena bug" — cukup
`m8m10.repository.ts` (KPI8-10) dan `customers.repository.ts` (Customer
Workbench), keduanya SUDAH diperbaiki per 2026-08-21.

**Verifikasi Langkah 4** (company 1, filterDate hari ini): status Customer
Workbench SEBELUM (scalar 3bln) → dormant=680, active=117, existing=177.
SESUDAH (per-customer) → dormant=476, active=117, existing=381. `active`
tidak berubah (benar, tidak bergantung dormantMonths), 204 customer pindah
dari dormant→existing (680-476 = 381-177 = 204, konservasi eksak, cocok
persis dgn hasil m8m10). Test suite tidak ada regresi baru (78 pass/2
skip/4 fail, sama dgn baseline).

**Status akhir 2026-08-21: SEMUA 5 langkah SELESAI** (langkah 4 ternyata
lebih sempit dari perkiraan awal — cuma 1 file lagi yang perlu, bukan 3).
Diverifikasi lokal, **TIDAK di-deploy**.

**Peringatan:** `m8m10.repository.ts` DAN `customers/helper/segment.helper.ts`
DAN `customers.repository.ts` adalah bagian dari file yang ENTANGLED dgn
task026/028 belum-deploy (lihat task030.md §3,
[[project_task026_task028_undeployed_entangled]]) — fix ini sudah
dikerjakan+diverifikasi lokal, tapi TIDAK bisa di-deploy sendirian tanpa
rekonstruksi manual sampai keputusan task028 selesai.

### 30.9 Scope yang masih belum disentuh — STANDAR WAJIB, bukan opsional (update 2026-08-21)

**Keputusan user 2026-08-21: poin 1 & 2 di bawah ini BUKAN pending/opsional
lagi — keduanya STANDAR FILTER GLOBAL, wajib diterapkan ke SEMUA KPI (M1-
M10, Retention, Value), bukan cuma Growth/M1-M2 sbg contoh.** Poin 4 juga
diputuskan LANGSUNG disamakan dgn M1 (bukan "dicek lagi nanti").

1. **Filter granularitas periode** (Bulanan/Kuartalan/Semesteran/Tahunan,
   §30) — WAJIB semua KPI. M1+M2+M3-M7 SELESAI (lihat §30.13,
   2026-08-22 — M3-M7 share 1 fungsi backend `fetchCustomerMetricsTrend`,
   dikerjakan sekaligus). **M8-M10 masih belum** (kompleksitas tambahan
   sendiri, lihat §30.9b). Retention & Value (§11, §16) masih pola lama
   total (tab-per-KPI §29 JUGA belum) — filter granularitas di halaman itu
   belum ada UI-nya sama sekali, jadi M3-M7 belum kelihatan efeknya di
   sana walau backend-nya sudah siap.
2. **"Apply date cutoff"** (§30.7a, potong semua titik trend ke hari yang
   sama) — WAJIB semua KPI, standar sama dengan poin 1. Baru M1+M2.
3. Definisi New/Existing relatif-periode (§30.10) — TERPISAH dari poin
   1/2/4, dan terpisah juga dari task028 (lihat §30.8, keduanya soal
   berbeda — §30.10 soal KAPAN garis New→Existing, task028 soal SIAPA yang
   masuk Existing sama sekali/soal dormant). Baru M1 (pilot). BELUM
   diputuskan mau di-generalisasi ke M2-M10 atau tetap M1-only — beda
   dari poin 1/2 yang SUDAH confirmed wajib global.
4. Bug off-by-one rumus window lama (`filterDate - activeMonths bulan`
   mentah, BUKAN calendar-anchored spt fix M1 pagi 2026-08-20) — **WAJIB
   disamakan dengan M1**, bukan "dicek lagi nanti". SELESAI utk
   `m3m7.repository.ts` (§30.13, 2026-08-22, formula sendiri BUKAN
   sama-persis M1 — lihat §30.13 kenapa). Masih ada di
   `m8m10.repository.ts`, `m5/m6.repository.ts`, `segment.helper.ts`
   (`cteEstablishedCustomers`).
- **"Customer Definitions" UI** (§27) — belum dibangun. **Catatan
  2026-08-21**: dokumen §27.1 baris 524-529 SUDAH eksplisit bilang teks
  kartu-nya "HARUS ikut SSOT task028" — artinya §27 TERSAMBUNG ke
  keputusan task028 yang sama (lihat [[project_task026_task028_undeployed_entangled]]),
  bukan isu independen. Tidak bisa dibangun akurat sebelum task028
  diputuskan.

**Skala pekerjaan poin 1/2/4:** menyentuh M3-M10 (6+ file repository) +
2 halaman penuh (Retention, Value) + kemungkinan entangled lagi dengan
task026/028 di file yang sama (m3m7/m8m10/m5/m6/segment.helper.ts — cek
`git diff origin/main` dulu sebelum deploy APAPUN dari sini, lihat §3
task030.md). Belum mulai dikerjakan per 2026-08-21 — dicatat sbg scope
confirmed, bukan lagi didiskusikan opsional-tidaknya.

### 30.9b PENDING — Interaksi ambang Dormant per-divisi × granularitas periode (M8-M10, dibahas 2026-08-21)

**Konteks:** setelah fix threshold dormant per-divisi selesai (§30.9a), muncul
pertanyaan susulan: bagaimana perilakunya begitu M8-M10 dapat filter
granularitas periode (poin 1 di §30.9, belum dikerjakan)? Dianalisis (belum
diimplementasi), disepakati sbg 2 pending item TERPISAH dari §30.9a:

**A. Trend chart (dormant_rate per titik) — snapshot vs lebar bucket.**
Dormant Rate itu SNAPSHOT (status PADA 1 titik waktu), bukan agregat
sepanjang rentang seperti Revenue. Threshold per-divisi (fix §30.9a) sudah
period-agnostic — benar di titik waktu manapun, tidak perlu diperbaiki lagi.
Tapi begitu granularitas bucket (Kuartal/Semester/Tahun) LEBIH LEBAR dari
ambang dormant divisi tsb (paling parah: b2b_dc 3bln vs bucket Tahunan
12bln), snapshot cuma di 2 ujung bucket — dinamika DI ANTARANYA hilang dari
tampilan. **Dibuktikan pakai data asli** (company 1, division=1
Distribution/b2b_dc, ambang 3bln, tren bulanan 12 titik 2025-09 s/d
2026-08): dormant_rate Maret 2026 (akhir Q1) = 44.4%, Juni 2026 (akhir Q2)
= 43.8% — hampir sama, kelihatan stabil. Tapi bulan di antaranya (April
47.4%, Mei 48.8%) sempat naik cukup tinggi lalu turun lagi — kalau cuma
lihat snapshot kuartalan (Maret vs Juni), lonjakan tengah kuartal itu SAMA
SEKALI TIDAK KELIHATAN. Obstacle teknis tambahan: `fetchDormantTrend`
(`m8m10.repository.ts`) CTE `months`-nya HARDCODE `generate_series` 12
bulan trailing — kalau period_type disambungkan tanpa mengubah bucket
generator ini, tampilan TETAP 12 titik bulanan, tidak otomatis jadi 12
kuartal/semester/tahun (perlu pola sama `buildTrailingPeriods`, M1).
`reactivated_count`/`prev_me` juga ikut perlu diputuskan ulang — window
reaktivasi sekarang implisit 1 bulan (prev month boundary), kalau bucket
jadi Tahunan otomatis melebar jadi "reaktivasi kapan saja sepanjang tahun
ini" — keputusan bisnis, bukan otomatis benar.

**B. Breakdown table per-customer — "dormant sejak bulan apa" TIDAK kena
masalah di atas.** Beda dari trend chart, tanggal seorang customer JADI
dormant adalah properti PER-CUSTOMER (`last_invoice_date` + ambang
divisinya sendiri), bukan properti bucket periode — nilainya SAMA PERSIS
mau ditarik dengan filter Bulanan/Kuartalan/Semesteran/Tahunan sekalipun,
karena tidak dihitung per-bucket. Breakdown table begini justru
mengembalikan detail presisi yang hilang di poin A. Yang perlu ditambah
(kecil, reuse infrastruktur `dormantThresholdCaseSql`/`cteCustDivision`
yang sudah ada dari §30.9a, BUKAN bikin baru): kolom `dormant_since` =
`last_invoice_date + dormant_threshold_customer_itu * INTERVAL '1 month'`
di `fetchDormantValueRanking` (KPI9, top 20) dan/atau `findCustomers`
dengan `status=dormant` (Customer Workbench, daftar lengkap+pagination) —
kedua-duanya SUDAH pakai ambang per-customer yang benar (§30.9a), tinggal
tambah 1 kolom output, threshold per-customer-nya sudah tersedia di query
(dipakai HAVING/WHERE), tinggal di-carry jadi SELECT juga.

**Status: belum dikerjakan, dicatat sbg pending — item A digabung ke scope
poin 1 §30.9 (granularitas M8-M10), item B independen/lebih ringan, bisa
dikerjakan kapan saja tanpa nunggu poin A selesai.**

### 30.11 Bug `clampToElapsedEnd`/`clampEndToDay` — periode lampau ke-clamp jadi rentang terbalik (SELESAI, 2026-08-21)

User klik titik Desember 2025 di chart tren M2 (Growth) — popup drill-down
tampil 0 di ketiga angka (Avg Categories, Distinct Categories, Active
Customers), padahal invoice Desember 2025 ada 12678 (company 2) + 404
(company 1) baris, dan query manual langsung ke DB menunjukkan 1787
customer Existing aktif di bulan itu.

**Root cause**: `clampToElapsedEnd`/`clampEndToDay` (period.util.ts) dipakai
`getCrossSellingMetrics` (metrics.service.ts) buat "potong tanggal akhir
periode yang MASIH BERJALAN ke hari ini" (supaya current period & YoY-nya
apple-to-apple, tidak nunjuk 0% di tengah periode). Tapi fungsi ini nebak
"apa periode ini current/YoY-nya current" CUMA dari selisih TAHUN
(`today.getFullYear() - periodYear`), tanpa cek bulan/kuartal-nya sama
sekali. `periodKey="2025-12"` (Desember, sudah tutup 8 bulan) beda tahun 1
dari `today` (2026-08-21) → dikira "padanan YoY dari periode berjalan" →
di-cap ke `referenceNow = "2025-08-21"` (21 Agustus 2025, hasil geser
`today` mundur 1 tahun) — padahal `referenceNow` itu JATUH SEBELUM
`periodStart` Desember (1 Des 2025)! Query jadi
`invoice_date >= '2025-12-01' AND invoice_date <= '2025-08-21'` — rentang
TERBALIK/mustahil → 0 baris selalu, apa pun isi datanya.

Dibuktikan lewat script langsung manggil `getCrossSellingMetrics` (bypass
HTTP): sebelum fix, `period.end` yang dihasilkan buat request
`period_end='2025-12-31'` adalah `"2025-08-21"` (bukan `"2025-12-31"`).
Bug ini SEBENARNYA sudah ada sejak periode granularitas (§30.7)
diimplementasikan 2026-08-20 — cuma baru ketahuan sekarang krn baru kali
ini user klik titik bulan Sep-Des tahun lalu di chart (klik bulan yang
lebih awal tahun ini, mis. Jan-Ags 2025, kebetulan tidak kena krn
`referenceNow` jatuh SETELAH bulan itu, bukan sebelum — jadi kondisi
`calendarEnd > referenceNow` selalu false, tidak ke-clamp).

**Fix**: `clampToElapsedEnd`/`clampEndToDay` sekarang terima `periodType`
tambahan, cek `periodKey` itu digeser ke tahun `today` HARUS PERSIS sama
dgn `getCurrentPeriodKey(periodType, today)` dulu sebelum boleh di-clamp —
bukan cuma cocok tahunnya, bulan/kuartal/semesternya ikut dicocokkan.
Periode lampau sembarang (drill-down klik titik chart manapun) sekarang
selalu lolos tanpa clamp (`calendarEnd` dipakai apa adanya), sesuai niat
awal komentar lama "periode yang sudah tutup tidak kena potong sama
sekali" — niat itu sekarang BENERAN diimplementasikan, bukan cuma
tertulis di komentar.

Diverifikasi (script manual, company 'all'):
- Desember 2025 (bug yang dilaporkan): `active_count` 0 → 1787, `period.end`
  `"2025-08-21"` → `"2025-12-31"` (benar, full bulan).
- September 2025 (bug sama, belum sempat dilaporkan user): 0 → 1247.
- Current period (Agustus 2026, berjalan): tetap ke-clamp ke `"2026-08-21"`
  (tidak berubah, ini memang harus terpotong).
- YoY eksplisit (Agustus 2025, padanan YoY dari Agustus 2026 berjalan):
  tetap ke-clamp ke `"2025-08-21"` (tidak berubah, apple-to-apple YoY tetap
  jalan).
- Kuartal Q3 2025 (padanan YoY dari Q3 2026 yang sedang berjalan — today
  jatuh di Q3 2026 juga): tetap ke-clamp konsisten (by design, bukan bug).
- Kuartal Q1 2025 (`active_count` 0): TETAP 0 setelah fix — ini LEGIT, bulan
  pertama data (Jan 2025), tidak ada customer yang first_invoice_date-nya
  sebelum awal Q1 2025 secara definisi. Beda kasus dari bug di atas.

Satu-satunya pemanggil kedua fungsi ini (`getCrossSellingMetrics`, dipakai
M1+M2, satu-satunya fitur yang sudah pakai granularitas periode §30.7 saat
ini) — jadi fix ini otomatis menutup celah yang sama persis di mode
default MAUPUN mode "Apply date cutoff" (§30.7a, `clampEndToDay` dipakai
di 12 titik trend sekaligus, sama-sama rawan kasus ini kalau user
toggle mode itu lalu lihat bucket Sep-Des tahun sebelumnya).

Catatan buat granularitas Annual: `periodKey` Annual formatnya cuma
`"YYYY"` (tidak ada komponen bulan) — jadi bedanya "tahun lalu yang sudah
tutup total" vs "padanan YoY dari tahun berjalan" TIDAK bisa dibedakan
lewat mekanisme fix ini (`shiftedToThisYear` buat Annual selalu cocok
trivial). Ini bukan regresi dari fix ini — perilaku lama utk Annual sudah
begini dari awal (§30.7), dan belum ada laporan bug spesifik utk kasus
itu. Dicatat sbg keterbatasan yang diketahui, bukan diperbaiki sekarang
(di luar scope laporan user kali ini — cuma monthly/quarter yang dipakai
Growth/M1/M2 saat ini).

### 30.12 M7 Expansion — standar layout Growth + chart diverging (SELESAI, 2026-08-21)

Lanjutan rollout "M1 jadi standar layout semua KPI" (§29/30.6) ke tab
Ekspansi halaman Growth. User pilih scope via AskUserQuestion: standar
penuh (KpiHeader + tab Overview/Trend Analysis) TAPI HANYA versi tab
Growth — halaman Customer Metrics workbench (`CustomerMetrics/index.tsx`,
M3-M7 ditumpuk 1 halaman tanpa KpiHeader/tab) TETAP versi ringkas biar
konsisten sesama M3-M6 di sana. Solusinya PECAH jadi 2 komponen:

- `M7Expansion.tsx` — tetap dipakai apa adanya di Customer Metrics
  workbench, TIDAK dapat KpiHeader/tab.
- `M7ExpansionGrowth.tsx` (BARU) — KHUSUS tab Ekspansi halaman Growth,
  pola sama persis M2AvgCategory.tsx (KpiHeader dgn YoY fetch sendiri +
  tab Overview [SummaryCard Naik/Stabil/Turun/Existing + mini chart + Top
  5 Movers dari `useExpansionBreakdown(periodEnd)`] + tab Trend Analysis
  [chart penuh + TrendSummary]). Dialog drill-down klik-titik TETAP ada
  di kedua versi (fitur lama, tidak diubah), logic-nya di-extract ke
  `expansionHelpers.tsx` (statusChipColor/statusLabel/useExpansionColumns)
  supaya tidak duplikasi antara 2 komponen (ESLint react-refresh juga
  menolak file yang export komponen React + fungsi biasa sekaligus, jadi
  ekstraksi ini sekalian benerin itu).

**Chart diganti dari 100% stacked horizontal jadi diverging vertical**
(user: "ganti jadi positif negatif bar chart") — `ExpansionChart.tsx`
(BARU, dipakai kedua komponen) render `up_rate` positif (hijau, di atas
garis 0) + `down_rate` DINEGASIKAN jadi `-down_rate` (merah, di bawah
garis 0), `stackId` sama supaya nyambung jadi 1 bar per bulan yang
menjulur dua arah dari 0 — bukan lagi bar horizontal 100% penuh per
baris/bulan yang cuma bisa lihat proporsi, bukan skala turun-nya
seberapa besar. `flat_rate` sengaja TIDAK ikut masuk chart (3 arah di 1
bar diverging ambigu dibaca) — tetap kebaca di SummaryCard "Stabil" tab
Overview.

Ternyata `flat_rate`/`down_rate` (trend point) dan `flat_count`/
`down_count`/status 3-way (`up`/`flat`/`down`, breakdown drill-down)
SUDAH dikirim backend sejak koreksi 2026-08-10 (§ lama, "pisahkan
flat/turun") — cuma TYPE frontend (`types/metrics.ts`) dan komponen
(`M7Expansion.tsx`) yang belum pernah disambungkan (masih pakai versi
lama binary `up`/`flat_down`). Backend TIDAK perlu diubah sama sekali
untuk kerjaan ini, murni frontend catch-up.

Susulan user: "bedakan warna positif dan negatif nya agar garis
pemisahnya terlihat" — `BarChartWidget.tsx` (shared) dapat prop baru
`showZeroLine` (render `<ReferenceLine y={0}>` tegas, opt-in supaya
tidak mengubah chart lain yang sudah pakai widget ini) — tanpa ini bar
hijau/merah cuma nempel di titik 0 tanpa batas yang kelihatan jelas.
Juga benerin bug kecil nebeng di widget yang sama: `LabelList` skip-label
threshold `val < 5` (buat sembunyikan label di bar sangat kecil) SELALU
true buat bilangan negatif berapa pun besarnya — diganti `Math.abs(val) <
5`, aman buat semua caller lama (nilai lama semua non-negatif, perilaku
identik).

Sekalian ditambah `icon` prop ke `SectionLabel` + export `SummaryCard` di
`CustomerMetrics/HelperComponents.tsx` (pola sama CrossSelling/
HelperComponents.tsx) — prefix teks "M7 ·" di `sectionLabel`/judul
lainnya dihapus, ganti ikon `TrendingUpIcon` (konsisten dgn pembersihan
prefix "M1"/"M2" §28.10). Dicatat: ada 3-4 implementasi `SectionLabel`
terpisah tersebar di codebase (`pages/shared/`, `CrossSelling/`,
`CustomerMetrics/`, `DormantCustomer/`) — TIDAK dikonsolidasi jadi 1
komponen bersama kali ini (di luar scope, blast radius nyentuh M3-M6/
M8-M10 yang tidak diminta), dicatat sbg technical debt buat nanti.

Status: M1/M2/M7(Growth) sudah standar. M3-M6, M8-M10, Retention, Value
masih belum — lanjutan berikutnya kalau diminta.

**Susulan bug (SELESAI, sama hari)**: user lapor "warna bar nya masih 1
warna merah semua" setelah chart diverging pertama kali jalan. Diverifikasi
via screenshot Playwright langsung (login admin@mail.com, dev server lokal
:5173) — TERBUKTI bug asli, bukan cuma persepsi/proporsi data: SELURUH bar
(bagian atas MAUPUN bawah garis 0) ke-paint merah semua, padahal legend di
bawah chart sudah benar tampil 2 warna (hijau "Spending Up", merah
"Spending Down"). Root cause: `<BarChart>` recharts defaultnya
`stackOffset="none"` — utk 2 series di 1 `stackId` yang TANDA-nya beda
(up_rate positif, down_rate_neg negatif), cumsum "none" bikin series
KEDUA (down_rate_neg) mulai dari TOP series PERTAMA (bukan dari 0),
jadi rect-nya melebar nutupin balik area series pertama. Fix: `BarChart`
(BarChartWidget.tsx, SEMUA caller, bukan cuma M7) dikasih
`stackOffset="sign"` — value literal recharts yang didesain khusus utk
diverging stacked bar (link resmi "BarChartStackedBySign" ada di
`node_modules/recharts/types/util/types.d.ts`), aman utk semua caller lama
yang stacked-nya semua-positif (hasil "sign" == "none" tanpa nilai
negatif). Diverifikasi ulang via screenshot — kedua versi (Growth
Trend Analysis tab BESAR + mini chart Overview tab + versi Customer
Metrics workbench M7Expansion.tsx) semua benar: hijau di atas garis 0,
merah di bawah, garis 0 kelihatan jelas (`showZeroLine`).

**Susulan lanjutan (SELESAI, sama hari)**:
- "jangan hijau dan merah carikan paduan warna yang lebih soft monokrom" —
  ganti dari alpha-blend hijau/merah ke MONOKROM 1 hue (primary/brand
  biru): naik = primary solid, turun = `alpha(primary, 0.3)` (tint sangat
  muda). `chartSubtitle` i18n disesuaikan (ID+EN) — tidak lagi sebut
  "Hijau"/"Merah", ganti "Batang gelap (atas)"/"Batang muda (bawah)".
- "ada angka yang hilang di beberapa chart yang pendek" — `BarChartWidget`
  (shared) punya threshold lama skip-label kalau `|value| < 5` (biar label
  tidak numpuk di bar kecil). Buat chart diverging ini threshold itu
  KONTRAPRODUKTIF — bar pendek justru paling butuh angka eksplisit krn
  visualnya susah ditaksir. Tambah prop `labelMinValue` (default 5, TIDAK
  ubah chart lain), di-set `0` khusus `ExpansionChart.tsx` — sekarang semua
  bar berlabel termasuk yang kecil (4.9%/3.7%/4.1%/1.7% dst, sebelumnya
  hilang).
- "untuk tab overview gunakan chart yang lebih simpel" — mini chart tab
  Overview (`M7ExpansionGrowth.tsx`) diganti dari `ExpansionChart`
  (diverging, 2 seri + label + legend + garis 0 — kepadatan berlebih di
  tinggi 168px) jadi `AreaChartWidget` 1 seri (`up_rate` saja), height 120
  — POLA SAMA PERSIS mini chart Overview M1/M2 (AreaChartWidget 1 seri,
  tanpa label/legend). Chart diverging lengkap TETAP dipakai di tab Trend
  Analysis (di situ ruangnya cukup, height 320).

**"area chart fill by value recharts" (SELESAI, sama hari)** — user
tanya soal teknik recharts, lalu koreksi "bukankah datanya positif
negatif" (mini chart Overview waktu itu cuma tampil `up_rate`, SELALU
positif, teknik split-warna tidak relevan). Diganti jadi metrik `net =
up_rate - down_rate` (`trendWithNet` useMemo) — GENUINELY bisa positif
ATAU negatif, cocok dipakai fill-by-value. Implementasi persis pola resmi
recharts (`AreaChartFillByValue`, dicek via Context7): `AreaChartWidget`
(shared, komponen BARU `SplitColorGradient` di dalamnya) baca
`useYAxisScale()`+`useChartHeight()` — hooks recharts v3, HARUS dirender
sbg child `<AreaChart>` bukan di widget langsung — buat hitung posisi
pixel titik 0 (`ratio`), lalu `<linearGradient>` 4-stop split warna di
titik itu. `AreaSeries` dapat field baru opsional `negativeColor` (tidak
diisi = perilaku lama, gradient 1 warna, TIDAK ada caller lain yang
berubah).

Diverifikasi lewat filter "All Entities"/company 2 (KNT) — net-nya SELALU
negatif 12 bulan terakhir, jadi splitnya sengaja tidak pernah kepakai
(bukan bug, dibuktikan lewat script backend cross-check 3 company). Ganti
filter ke PT Mesin Kasir Online (company 1) — ada 2 bulan net positif,
splitnya kepakai.

Susulan user (2x) — "sama saja tidak ada perubahan warna" — walau gradient
DOM-nya sudah benar (dicek langsung via `page.evaluate` baca elemen
`<linearGradient>`+stops di browser), splitnya SECARA VISUAL terlalu
tipis: (1) opacity 0.45 kurang kontras drpd bikin warnanya jelas beda,
manual coba beberapa kali sampai 0.9/0.08 (opacity solid vs fade-ke-nol
di titik silang) — (2) STROKE garisnya (elemen paling menonjol di chart
ini) TETAP 1 warna terus walau fill sudah split, bikin kesan "tidak
berubah" krn yang paling kelihatan justru tidak ikut berubah — ditambah
gradient KEDUA (`${id}-stroke`, opacity SELALU penuh, tanpa fade-ke-nol
spt gradient fill) khusus dipakai sbg `stroke` prop `<Area>`, reuse
teknik yang sama (fill gradient JUGA bisa dipakai sbg stroke di SVG,
`url(#...)` berlaku ke keduanya). Sekarang garis + fill KEDUANYA ganti
warna tegas di titik silang 0, diverifikasi via screenshot.

**Koreksi keras — tabel Breakdown M7 tidak sesuai standar §28.10 (user:
"standarmu berubah-rubah, tab 1,2 sudah sama, tab 3 ini melenceng jauh,
kamu tidak baca dokumentasi???")** — dibaca ulang §28.10 (M1/M3-M9/M10
kolom breakdown-nya SEMUA py Branch/Division/Channel + BreakdownTable.tsx
py Search+Sort di atas tabel). Tabel M7 yang barusan ditambahkan (§30.12
sebelumnya) BELUM punya ketiganya — gap nyata, bukan kesalahpahaman user:

- **Backend** (`m3m7.repository.ts`, `fetchExpansionBreakdown`): CTE baru
  `latest_inv` (pola SAMA PERSIS latest_inv M1, m1.repository.ts) — invoice
  TERBARU customer itu DI DALAM window "current" (`curRangeCond`), resolve
  `branch_id`→`company_branches.name`, `division_id`→`divisions.label`,
  `channel_name` apa adanya. `ExpansionBreakdownRow` (backend+frontend
  `metrics.types.ts`) dapat 3 field baru: `branch`/`division`/`channel`.
  Diverifikasi jalan (32237 baris, sample row branch="Jakarta"
  division="Distribution" channel="DC WEST") — CATATAN: ~96% baris NULL di
  ketiga kolom itu, krn populasi `established_customers` (fixed cohort)
  include customer yang TIDAK py invoice di window "current" sama sekali
  (cur_revenue=0) — tidak ada invoice utk ambil branch-nya, BUKAN bug,
  konsisten dgn cara `cur_revenue`/`prev_revenue` juga default 0 utk
  kasus yang sama.
- **Frontend** (`expansionHelpers.tsx`): `useExpansionColumns` dapat 3
  kolom baru Branch/Division/Channel (reuse key i18n `common.branch`/
  `customers.detail.division`/`customers.detail.channel` — SAMA PERSIS yang
  dipakai `BreakdownTable.tsx`, tidak bikin key baru duplikat), posisi
  setelah Code, sebelum kolom metrik — urutan sama M1.
- **Table Filter** (`M7ExpansionGrowth.tsx`): Search+Sort ditambah di atas
  tabel, pola SAMA PERSIS `BreakdownTable.tsx` (`TextField` search by
  nama/kode + `TextField select` sort Name/Revenue Desc/Change Desc,
  client-side dari `currentBreakdown` yang SUDAH ada, TIDAK ada fetch
  baru). Height tabel disamakan 480 (dulu 420, standar M1/M2 480).
- Dialog drill-down klik-titik (`expansionColumns` SAMA persis dipakai di
  situ juga) otomatis ikut dapat kolom Branch/Division/Channel — konsisten,
  bukan disengaja beda dari tabel utama.
- `tsc --noEmit` + `eslint` (backend+frontend) bersih, diverifikasi via
  screenshot browser langsung.

**Susulan (3 pertanyaan user, sama hari) — 2 kolom lagi dihapus, 1 bug
division ditemukan:**
- **"#, id itu kolom apa?"** — kolom `ranking` (server-side, urutan tetap
  revenue delta desc) DIHAPUS dari `useExpansionColumns` — begitu tabel
  di-sort ulang lewat dropdown (mis. Name A-Z), angkanya JADI SALAH/acak
  krn tidak ikut urutan tampilan. `BreakdownTable.tsx` (M1/M2) JUGA tidak
  py kolom nomor urut — konsisten dihapus. `ranking` TETAP dipakai sbg
  `id` internal DataGrid, cuma bukan kolom tampilan lagi.
- **"kode itu apa?"** — dicek ke DB: `customer_code` NULL utk SEMUA 32994
  customer (0%) — kolom SELALU "—" tanpa kecuali, sama sekali tidak
  informatif. M1 SUDAH pernah menghapus kolom yang sama persis dgn alasan
  sama (§28.10). Dihapus di sini juga, field tetap dipakai search.
- **"kenapa ada yang branch/channel/division-nya kosong?"** — 2 penyebab
  beda, dicek ke data langsung:
  1. **Mayoritas (28803/32237, ~89%)**: customer established TAPI TIDAK
     ADA invoice sama sekali di window "current" — `cur_revenue`/
     `prev_revenue` JUGA 0 utk baris yang sama (dibuktikan: SEMUA baris
     kosong branch py cur=prev=0). Bukan bug — tidak ada invoice sama
     sekali, jadi tidak ada apa pun (branch/division/channel/revenue) yang
     bisa ditarik.
  2. **Sangat kecil (4 baris)**: customer PY revenue current, TAPI
     `branch_id` invoice-nya sendiri NULL di tabel `invoices` (dicek
     langsung — data mentah dari sumbernya, bukan bug query) — genuinely
     tidak ada branch utk ditampilkan.
  - **Bug nyata ditemukan sambil investigasi**: `latest_inv` (M7) cuma
    2-level fallback division (`division_override_id -> channel_divisions`)
    — M1 py 3-level (+ fallback "other" division kalau channel belum
    ke-mapping `channel_divisions`). Ditambahkan fallback ke-3 SAMA PERSIS
    M1 — diverifikasi: sebelum fix 4 baris py revenue tapi division NULL,
    sesudah fix 0 baris (semua revenue>0 SEKARANG py division terisi,
    fallback ke "Other" kalau channel belum ke-mapping).
- `tsc --noEmit` (backend+frontend) bersih tiap iterasi.

**Koreksi keras — "Inactive" salah dilabeli "Flat/Stabil" (user: "datamu
tidak valid jika tanpa transaksi kamu beri label stabil")** — `flat_rate`
(sejak koreksi 2026-08-10) definisinya `cur_revenue = prev_revenue`,
TERMASUK customer yang literally cur=prev=0 (tidak ada transaksi sama
sekali di kedua window) — dilabeli "Stabil" padahal customer itu TIDAK
melakukan apa pun, bukan "stabil berbelanja". Dipisah jadi 4-way:

- **Backend** (`m3m7.repository.ts`): `flat_rate` sekarang HANYA
  `cur=prev DAN cur>0` (genuinely tidak berubah). `inactive_rate` BARU
  (`cur=prev=0`) — dipakai `fetchCustomerMetricsTrend` (trend chart/
  SummaryCard) DAN `fetchExpansionBreakdown` (status per-customer,
  `up`/`flat`/`inactive`/`down`, `inactive_count` di aggregate). Types
  (`metrics.types.ts` backend+frontend) disesuaikan.
- **Chip status** (`expansionHelpers.tsx`): `inactive` dapat warna
  `warning` sendiri (beda dari `flat`=default/abu netral, `down`=error) —
  secara bisnis lebih perlu perhatian drpd genuinely-flat, tapi bukan
  penurunan aktif spt down.
- **SummaryCard Overview** (`M7ExpansionGrowth.tsx`): grid 2x2 -> 3
  kolom, kartu "Inactive" baru terpisah dari "Flat". Angka nyata
  (company='all'): Up 1.7%, **Flat 0.2%**, **Inactive 90.0%**, Down 8.1% —
  sebelumnya "Flat" gabungan tampil ~90.2%, menyembunyikan bahwa hampir
  SEMUA itu sebenarnya "tidak ada transaksi", BUKAN "stabil berbelanja"
  (0.2% doang yang genuinely flat).
- **Chart diverging** (`ExpansionChart.tsx`, susulan user: "negatif chart
  jadi bar stack yang membedakan masing masing kategori") — sisi negatif
  sekarang STACK 2 SEGMEN terpisah: `down_rate` (tint primary, masih
  transaksi tapi turun) + `inactive_rate` (grey NETRAL, genuinely beda hue
  bukan cuma tint lebih pudar — "tidak ada transaksi" secara konsep beda
  dari "menurun"). Legend 3 entri: Spending Up / Spending Down / No
  Transaction. `flat_rate` TETAP tidak masuk chart (bukan positif/negatif,
  tidak natural di bar diverging) — kebaca di SummaryCard.
- **Net Expansion** (mini chart Overview, fill-by-value) — formula
  diupdate `up_rate - down_rate - inactive_rate` (sebelumnya cuma
  `- down_rate`) — momentum negatif customer yang berhenti total ikut
  dihitung, bukan cuma yang menurun tapi masih order.
- `tsc --noEmit`+`eslint` (backend+frontend) bersih, diverifikasi
  screenshot browser — chart+SummaryCard+tabel semua konsisten pakai
  definisi 4-way yang sama.

### 30.13 Filter granularitas M3-M7 + fix off-by-one window aktif (SELESAI, 2026-08-22)

User lapor: "Filter bulanan, kuartlan, semesteran, tahunan belum jalan" di
tab Expansion (M7) — dropdown Granularitas ada di UI tapi diam-diam
diabaikan backend. Dikonfirmasi via AskUserQuestion: dikerjakan **M3-M7
sekaligus** (poin 1 §30.9), bukan cuma M7, karena semuanya share 1 fungsi
backend `fetchCustomerMetricsTrend` (`m3m7.repository.ts`). Sekalian
memenuhi poin 4 §30.9 (bug off-by-one) utk fungsi yang sama, karena sudah
dibongkar buat generalisasi bucket.

**2 keputusan desain kunci (bukan sekadar refactor mekanis):**

1. **Kualifikasi "Existing" (siapa masuk kohort) — makna bisnis TIDAK
   berubah**, cuma dibuat kalender-benar + generik-bucket. Formula lama:
   `first_invoice_date < (akhir bulan kalender) - activeMonths bulan`
   (pengurangan interval mentah, py bug off-by-one di batas bulan pendek).
   Formula baru: `first_invoice_date < date_trunc('month', bucket.start) -
   (activeMonths-1) bulan - 1 hari` — anchor ke **awal bucket** (dulu ke
   akhir), pola `date_trunc` sama persis fix M1 §30.7. **CATATAN PENTING**:
   ini BUKAN formula "sama persis M1" — investigasi ulang nemuin M1 versi
   FINAL sudah TOTAL meninggalkan windowing berbasis `activeMonths`
   (comment M1: "GANTI TOTAL dari activeMonths mundur yang dipakai
   sebelumnya", sekarang cuma `first_invoice_date < periodStart` tanpa
   offset). M3-M7 TETAP pakai `activeMonths` sbg bagian kualifikasi kohort
   (task026 §8e: "window aktif utk parameter existing TIDAK BOLEH
   berubah") — beda definisi Existing M1 vs M3-M7 ini SUDAH
   didokumentasikan sbg konflik terbuka belum diputuskan (§30.8/task028),
   **plan ini sengaja TIDAK menyentuh/menyatukan itu**, cuma benerin
   aritmatika tanggalnya.
2. **Window agregasi current/previous (revenue M3/M4, rate M7) — ikut
   LEBAR BUCKET**, bukan lagi fixed `activeMonths` — ini yang bikin
   granularitas kelihatan RIIL (Kuartal beneran agregat 3 bulan, bukan
   nampilin 1 bulan terakhir tiap titik). Sesuai keputusan §30.3 yang
   sudah ada ("Rate KPI: recompute dari total pembilang/penyebut
   se-periode, bukan rata-rata rate per bulan"). Untuk granularitas
   BULANAN (default, `activeMonths` config saat ini = 1), bucket 1 bulan
   = `activeMonths` 1 bulan → hasil numerik SAMA seperti sebelumnya
   (diverifikasi, lihat di bawah) — bedanya baru kelihatan di Kuartal/
   Semester/Tahun granularitas eksplisit yang memang belum pernah ada.

**Perubahan backend:**
- `metrics.schema.ts` — `customerMetricsQuerySchema` tambah `period_type`
  (reuse `periodTypeField` yang sama dgn `crossSellingQuerySchema`).
- `metrics.service.ts` `getCustomerMetrics` — direstruktur mirror
  `getCrossSellingMetrics` (§30.6): `buildTrailingPeriods` 12 bucket,
  `clampToElapsedEnd` utk bucket terakhir (reuse fix §30.11, bukan
  ditulis ulang), `prevBuckets` dihitung di SERVICE (bukan repository —
  repository tidak boleh hitung tanggal periode sendiri).
- `m3m7.repository.ts` `fetchCustomerMetricsTrend` — rewrite besar:
  `months AS (generate_series bulanan)` → `buckets(label, ps, pe) AS
  (VALUES ...)` (pola sama persis `fetchCrossSellingTrend` M1, VALUES-list
  drizzle `sql.join`), seluruh 10 CTE (`existing`, `active_inv_agg`,
  `prev_inv_agg`, `hm_inv_agg`, `new_cust`, dst) diganti dari `m.ms` ke
  `b.label`/`b.ps`/`b.pe`. `fetchExpansionBreakdown`/`fetchRevenueBreakdown`
  (drill-down 1 titik) TIDAK berubah — sudah generik terima rentang
  tanggal apa pun sejak awal.

**Perubahan frontend:** `useCustomerMetrics`/`metricsApi.getCustomerMetrics`
tambah `period_type`; `Growth/index.tsx` kirim ke fetch M3-M7 + prop
`periodType` ke `M7ExpansionGrowth`; `M7ExpansionGrowth.tsx` pakai
`periodType` asli (bukan hardcode `'monthly'`) di
`getCurrentPeriodKey`/`getYoyPeriodKey`/`formatPeriodLabel`/drill-down
(`getPeriodDateRange`, ganti dari `monthToEndDate`, pola sama M1);
`ExpansionChart.tsx` terima prop `periodType`, sumbu-X + tooltip custom
(`ExpansionTooltip`, pola `TooltipContentProps`+`renderTooltip` sama
`M3Revenue.tsx`) pakai `formatPeriodLabelShort(periodType, ...)`.
`M7Expansion.tsx` (Customer Metrics workbench, tidak py filter UI granular)
TIDAK diubah — otomatis tetap bulanan lewat default prop opsional.

**Verifikasi:**
- Regresi bulanan (default, TANPA `period_type`) — dibandingkan sebelum/
  sesudah rewrite: field trend berubah TIPIS (mis. `existing_customers`
  bulan Sep 2025 12864→12904), TAPI ini BUKAN regresi — dibuktikan lewat
  psql langsung: threshold "existing" bulan Sep 2025 SEBELUM fix =
  `2025-08-30`, SESUDAH fix = `2025-08-31` (formula lama salah 1 hari di
  batas bulan pendek, persis kelas bug off-by-one yang dimandatkan §30.9
  poin 4). Semua selisih di seluruh 12 titik dicek: kecil (0-3 hari di
  batas bulan), SELALU threshold BARU >= threshold LAMA (artinya customer
  yang qualify Existing bertambah/sama, tidak pernah berkurang — arah
  koreksi konsisten dgn "lebih permisif dgn benar", bukan acak). Tidak ada
  NaN/negatif/nilai aneh di scan penuh output.
- Live browser (Growth → tab Expansion, ganti dropdown 4 granularitas,
  screenshot tiap mode — admin@mail.com, dev server lokal):
  - **Bulanan** (default): "Agustus 2026: 1.7% | Agustus 2025: 5.3%" —
    identik dgn sebelum rewrite.
  - **Kuartalan**: label sumbu-X genuinely "Q4 23" s/d "Q3 26" (12 kuartal
    asli, bukan 12 bulan dikelompokkan ulang). "Kuartal 3 Tahun 2026: 3.4%
    | Kuartal 3 Tahun 2025: 7.4%", trend summary "Highest: 11.9%
    (2025-Q3) | Lowest: 0.0% (2023-Q4)".
  - **Semesteran**: label "S1 21" s/d "S2 26", "Semester 2 Tahun 2026:
    2.3% | Semester 2 Tahun 2025: 3.9%", data kosong (0%) di semester
    sebelum histori dataset dimulai (~2025) — benar, bukan error.
  - **Tahunan**: label "2015" s/d "2026", "Expansion 2026 vs 2025: 9.9% |
    0.0%" — cuma bar 2026 py data (dataset belum panjang, sesuai §30.2).
    Bar 2026 nunjuk down-rate tinggi (~89%) krn periode current (Jan-Ags
    2026, 8 bulan elapsed via `clampToElapsedEnd`) dibandingkan periode
    previous SATU TAHUN PENUH (2025, 12 bulan, TIDAK di-clamp krn sudah
    lampau) — matematis wajar (revenue YTD 8 bulan hampir pasti < revenue
    12 bulan penuh tahun lalu utk mayoritas customer), BUKAN bug, konsisten
    dgn cara M7 sudah bandingkan "current period vs periode SEBELUMNYA"
    (sequential, bukan YoY) sejak awal — sama pola yang juga berlaku di
    granularitas Bulanan (Agustus parsial vs Juli penuh).
  - Dropdown option granularitas berlabel Inggris "Monthly"/**"Quarter"**
    (BUKAN "Quarterly")/"Semester"/"Annual" (i18n
    `paretoThreshold.period.*`) — dicatat krn sempat bikin script
    verifikasi salah selector.
- M1/M2 (Cross Selling/Category, fungsi backend BEDA — `m1.repository.ts`)
  di-screenshot ulang setelah semua perubahan di atas — Bulanan & Kuartal
  KEDUANYA masih benar, tidak ada efek samping (`period.util.ts` yang
  di-share tidak berubah perilakunya utk M1).
- `tsc --noEmit` + `eslint` (backend+frontend) bersih di tiap tahap.

**Di luar scope (sengaja, sesuai batas §30.9 yang sudah ada):** M8-M10
(item terpisah, kompleksitas ambang dormant per-divisi × lebar bucket,
§30.9b), Retention/Value (belum py UI filter granularitas sama sekali,
backend M3-M7 sudah siap tapi belum ada yang manggil dgn `period_type`
selain Growth), "Apply date cutoff" mode utk M3-M7 (poin 2 §30.9, item
terpisah), resolusi SSOT "Existing customer" M1 vs M3-M7 (task028/§30.8,
tetap terbuka).

**Susulan (sama hari) — user pertanyakan angka Kuartal (7,9%) yang tidak
sama dengan "jumlah" 3 bulan penyusunnya (4,0%+3,7%+6,2%=13,9%).**
Diverifikasi langsung lewat script manggil `getCustomerMetrics` (bypass
HTTP, company_id='all'): angka bulanan April/Mei/Juni (6.2/3.7/4.0) DAN
Kuartal Q2 2026 (7.9%) persis sama dgn yang tampil di layar user — bukan
bug. Dijelaskan: (1) menjumlahkan persentase dari basis (denominator)
BERBEDA antar bulan (existing_customers terus bertambah tiap bulan) tidak
valid secara matematis; (2) sesuai §30.3, rate kuartal direcompute dari
TOTAL revenue 3 bulan (Apr+Mei+Jun) vs TOTAL 3 bulan sebelumnya (Jan+Feb+
Mar) per customer — bukan union/sum kejadian "naik" di bulan mana pun,
jadi customer yang naik di 1 bulan tapi turun di bulan lain bisa TIDAK
terhitung naik di level kuartal walau tampil naik di salah satu bulannya.

**Susulan ke-2 (sama hari, koreksi user: "chart tidak valid, karena
menampilkan data tidak 100%... seharusnya chart hanya positif dan
negatif, tapi jumlah keseluruhan harus 100%")** — chart diverging (§30.12)
sebelumnya cuma render `up_rate`(+)/`down_rate`(-), sisanya (flat+inactive,
bisa >85% dari populasi) TIDAK divisualisasikan sama sekali (cuma di
tooltip) — total tinggi bar jauh dari 100%, misleading. Dikonfirmasi
lewat AskUserQuestion (2 opsi grouping): user pilih **sisi positif =
`up_rate` MURNI, sisi negatif = gabungan `flat_rate + down_rate +
inactive_rate`** (bukan opsi "positif = naik+stabil") — supaya tinggi
total bar (atas+bawah) SELALU = 100% dari existing customers, tetap cuma
2 warna. `ExpansionChart.tsx`: field baru `not_up_neg` (ganti
`down_rate_neg`), i18n key baru `seriesNotUp` ("Selain Naik"/"Not Up"),
`chartSubtitle` disesuaikan ("Bawah garis 0 = stabil/turun/tanpa
transaksi, total atas+bawah = 100%"). Tooltip custom (`ExpansionTooltip`)
TIDAK berubah strukturnya — tetap breakdown 4 baris (Naik/Stabil/Turun/
Nonaktif) dari payload penuh, cuma ditambah divider visual pemisah antara
baris "Naik" (sisi positif) vs 3 baris sisanya (sisi negatif gabungan).
Diverifikasi via screenshot: label tiap bar SEKARANG genuinely jumlah ke
100% (mis. Agustus 1.7%+98.3%=100.0%, September 6.9%+93.0%=99.9%,
selisih desimal krn pembulatan 1 angka di belakang koma per komponen —
bukan bug). Tabel breakdown (`useExpansionColumns`, status 4-way per
customer) TIDAK berubah — sudah lebih dulu menampilkan Naik/Stabil/Turun/
Nonaktif per baris sejak §30.12 susulan sebelumnya, memenuhi permintaan
"flat dan nonaktif ditampilkan di tabel" tanpa perubahan tambahan.

**Susulan ke-3 (sama hari, user: "Aku butuh data jumlah nya selain dari
persentase")** — SummaryCard (tab Overview) dan tooltip chart (tab Trend
Analysis) SEBELUMNYA cuma tampil persentase (mis. "Naik 1.7%"), jumlah
customer mentah di baliknya tidak kelihatan sama sekali. Ditambahkan:

- **Backend** (`m3m7.repository.ts` `fetchCustomerMetricsTrend`): 4 kolom
  COUNT baru — `up_count`/`flat_count`/`inactive_count`/`down_count` —
  pakai CASE WHEN SAMA PERSIS `up_rate`/`flat_rate`/`inactive_rate`/
  `down_rate` (cuma tanpa `*100/NULLIF(...)`), supaya angka mentah PERSIS
  konsisten dgn rate yang sudah tampil (bukan hasil back-compute dari rate
  yang sudah dibulatkan 1 desimal, yang bisa meleset). `TrendRow` type +
  `metrics.service.ts` mapping ke `CustomerMetricsTrendPoint` (frontend
  `types/metrics.ts`) ikut diupdate.
- **SummaryCard** (`HelperComponents.tsx`, shared M1/M2/M7) dapat prop
  opsional baru `subValue` (baris kecil di bawah angka utama) — opsional
  supaya caller M1/M2 (cuma py 1 angka per kartu) TIDAK berubah.
  `M7ExpansionGrowth.tsx` isi `subValue` dgn `"{{count}} customer"` (key
  i18n baru `customerCountValue`, pola sama `dormantCustomer.json`) utk
  kartu Naik/Stabil/Tidak Aktif/Turun.
- **Tooltip chart** (`ExpansionChart.tsx`, dipakai Growth+workbench M7):
  4 baris tooltip format ulang jadi `"1.7% (561 customer)"` dst — data
  (`up_count` dst) di-carry lewat `data` array yang sama (payload penuh,
  pola sama field rate).
- Diverifikasi screenshot: SummaryCard "Up 1.7% / 561 customers", "Flat
  0.2% / 53 customers", "Inactive 90.0% / 29.332 customers", "Down 8.1% /
  2.654 customers" — totalnya (561+53+29332+2654=32600) PERSIS sama dgn
  kartu "Existing Customers" (32.600), konsisten. Tooltip chart juga
  tervalidasi sama, format `"persentase (N customer)"` per kategori.
- Tabel breakdown per-customer TIDAK diubah (sudah menampilkan data
  individual per row, bukan agregat persentase — tidak relevan dgn
  permintaan ini).
- `tsc --noEmit` (backend+frontend) bersih.

### 30.14 PENDING — Gabungkan M5 (global) dengan halaman High Margin Push List (per-produk)

**Dicatat 2026-08-22, belum dikerjakan** — user tanya lalu konfirmasi
pemahaman soal 2 hal yang keliru dikira sama:

- **M5 (`high_margin_ratio`, dipakai KPI Value + trend M3-M7)** — angka
  GLOBAL 1 persentase: customer dihitung "penetrated" begitu beli produk
  high-margin APA SAJA (semua kategori di-OR-kan jadi 1 keanggotaan),
  `high_margin_ratio = COUNT DISTINCT customer yang beli HM apa saja /
  COUNT DISTINCT existing customers`. Sumber: `hm_inv_agg` CTE,
  `m3m7.repository.ts`.
- **Tab "Product Penetration" halaman Products > High Margin
  (`ProductsHighMargin/index.tsx`, `fetchHmDetail`)** — breakdown PER
  PRODUK/KATEGORI, tiap baris py persentase penetrasi SENDIRI-SENDIRI
  (mis. KASSEN KS 606 2D BT 0.6%, 67/11574). Jumlah baris-baris ini TIDAK
  akan pas dgn angka global M5 (1 customer bisa muncul di banyak baris
  produk, cuma dihitung 1x di angka global) — beda level agregasi, bukan
  bug/inkonsistensi.
- Halaman yang sama JUGA punya tab "Upsell Targets" (`fetchUpsellTargets`,
  lihat §30.13 susulan soal fix timeout 20s-nya) — per-customer, kategori
  HM apa yang BELUM dibeli.

**Keputusan lokasi menu (dibahas sama sesi)**: M5 secara konseptual masuk
grup **Value** (bareng M3 Revenue, M4 Gross Profit — sama-sama soal
KUALITAS/kontribusi margin per existing customer, BUKAN soal ekspansi
jumlah/jenis pembelian spt grup Growth). Dokumen ini sendiri (§16-19)
sudah menempatkan M5 berurutan dgn M3/M4 di bawah "Value" — taksonomi
konseptual sudah benar, cuma navigasi sidebar BELUM ikut (sekarang
"High Margin" jadi menu berdiri sendiri di "Produk & Portofolio", bukan
tab KPI di halaman Value spt M1/M2 di Growth).

**Rencana (belum dieksekusi, "kita atur nanti" — instruksi user)**:
gabungkan fungsi M5 (angka global, kartu KPI + trend) dengan halaman
Products > High Margin (breakdown per-produk + Upsell Targets) — jadi
1 pengalaman terpadu, kemungkinan pola sama M1/M2/M7 (KpiHeader + tab
Overview [angka global + summary] / Trend Analysis / Breakdown
[per-produk + upsell]), dipindah ke bawah menu Value. Detail desain
BELUM diputuskan — perlu dibahas lebih lanjut sebelum implementasi
(termasuk apakah "Upsell Targets" tetap relevan di bawah Value atau
tetap di Products, dan bagaimana breakdown per-produk existing di
`ProductsHighMargin/index.tsx` di-reuse vs ditulis ulang).

### 30.15 PENDING — Hapus route halaman KPI lama setelah layouting Growth/Retention/Value selesai

**Dicatat 2026-08-22, belum dikerjakan.** Bermula dari bug: card "Cross
Selling Ratio" di Overview masih buka halaman lama `/cross-selling`
(judul "Cross Selling", tab menu 3 chart lain) — root cause & fix link
card ada di §30.14-adjacent (commit `fix(dashboard): kartu Overview...`,
sama hari). Investigasi lanjutan: KENAPA `/cross-selling` (dan 9 route
KPI lama lainnya — `/avg-category-per-customer`, `/customer-revenue`,
`/customer-gross-profit`, `/high-margin-penetration`, `/repeat-order`,
`/customer-expansion`, `/dormant-rate`, `/dormant-value`,
`/reactivation-rate`) MASIH bisa dibuka sama sekali.

**Penyebab**: konsolidasi Growth/Retention/Value (task029, 2026-08-19)
cuma menghapus entry-nya dari SIDEBAR (`menu.tsx`) — route-nya sendiri
(`routeConstants.tsx`) SENGAJA TIDAK dihapus, karena komponen chart-nya
(M1CrossSelling, M2AvgCategory, M3Revenue, dst) langsung di-*reuse* oleh
halaman Growth/Retention/Value yang baru (`menu.tsx`, comment eksplisit:
"isinya sama, cuma sudah tidak ada entry langsung di sidebar"). Efek
sampingnya: siapa pun yang py URL lama (bookmark, link lama, atau kode
lain yang belum di-update spt kasus dashboard card ini) tetap bisa
nyasar ke UI lama, di luar standar layout Growth/Retention/Value yang
sedang dirapikan.

**Rencana (belum dieksekusi, instruksi eksplisit user: "HAPUS", bukan
redirect — koreksi keras thd usulan redirect yang sempat saya
tawarkan)**: setelah standar layout M1-M10 (§28-29, saat ini baru
M1/M2/M7 SELESAI, M3-M6/M8-M10 masih pola lama — lihat §30.12) kelar
semua, **HAPUS** 10 route lama di atas (`routeConstants.tsx` — hapus
entry route-nya) beserta halaman standalone-nya (`pages/CrossSelling/
index.tsx`, `pages/CustomerMetrics/index.tsx`, `pages/DormantCustomer/
index.tsx`, dst — file container halamannya, BUKAN komponen chart M1-M10
di dalamnya yang masih dipakai Growth/Retention/Value). **Sebelum
eksekusi**: audit dulu apakah ada tempat LAIN yang sengaja bergantung ke
10 URL lama ini (notifikasi berisi link, PDF report, dsb) — belum dicek
sama sekali sejauh ini, kalau ada perlu diarahkan ke halaman baru
sebelum route lamanya benar-benar dihapus.

### 30.16 Bug KRITIS — `ResponsiveListView` mobile crash "A problem repeatedly occurred" (SELESAI, 2026-08-22)

User lapor (dgn screenshot Safari iOS): tab crash berulang di menu
Ekspansi (Growth) saat buka "list view mode" mobile — sempat dikira
lanjutan bug "auto reload kembali ke Overview" yang sebelumnya SALAH
didiagnosis sbg stale-chunk-setelah-deploy (§ sebelumnya di sesi ini).
Investigasi ulang membuktikan diagnosis stale-chunk itu keliru — root
cause sebenarnya JAUH lebih serius dan kemungkinan besar SUMBER YANG SAMA
utk kedua laporan.

**Root cause**: `ResponsiveListView.tsx` (komponen SHARED, dipakai 30+
halaman — RBAC, Classification, Analisis, ActivityLog/AuditLog/LoginLog,
M1-M7 breakdown table, Users, Companies, Transactions, Customers, dst).
Cabang DESKTOP render lewat MUI `DataGrid` (otomatis dipaginasi/
virtualized via `pageSize`). Cabang MOBILE (`isMobile` true) SAMA SEKALI
TIDAK pakai DataGrid — cuma `rows.map(...)` mentah, render SEMUA baris
sekaligus jadi komponen `<Accordion>` penuh (icon+chip+nested Box),
`pageSize` yang sudah diterima props diam-diam DIABAIKAN di jalur ini.
Untuk tabel besar (breakdown Expansion client-side, ~3.400+ baris company
'all') ini artinya ribuan komponen Accordion+Chip di-mount SEKALIGUS di
1 render — cukup utk menghabiskan memori tab mobile Safari, WebKit
meng-crash process render-nya, browser auto-reload, crash lagi, berulang
sampai muncul dialog "A problem repeatedly occurred" — TEPAT gejala yg
dilaporkan user. Ini JUGA kemungkinan besar penjelasan SEBENARNYA utk
laporan "klik chart tren, halaman auto-reload balik ke Overview" —
membuka tab Trend Analysis me-render breakdown table yang sama di bawah
chart, crash-reload lalu kembali ke default tab persis meniru gejala yg
sebelumnya (keliru) didiagnosis sbg stale JS chunk.

**Fix**: `ResponsiveListView.tsx` — tambah paginasi CLIENT-side di cabang
mobile (state `mobilePage`, slice `rows.slice(page*pageSize,
(page+1)*pageSize)`, kontrol Prev/Next + label "Page X of Y", key i18n
baru `common.pageOf`). Reset `mobilePage` ke 0 tiap `rows` berubah
(search/sort/filter baru bisa bikin halaman sekarang di luar jangkauan).
Caller `paginationMode='server'` (Transactions, Products, Notifications,
ProductsHighMargin, Customers, Analisis — `rows` yang diterima SUDAH 1
halaman dari API) SENGAJA dilewati dari paginasi tambahan ini — datanya
sudah kecil, motong ulang di sini malah salah.

**Diverifikasi**: Playwright device iPhone 13, scope company='all' —
SEBELUM fix: seluruh `rows` (ribuan) di-mount jadi Accordion. SESUDAH
fix: M7 Expansion breakdown → 25 Accordion + "Page 1 of 137" (≈3.425
baris ÷ 25). M1 Cross Selling breakdown (komponen sama, halaman beda) →
25 Accordion + "Page 1 of 35" (≈875 baris) — konsisten, fix berlaku ke
SEMUA pemakai komponen ini sekaligus (bukan cuma M7), sesuai sifat
shared-component. `tsc --noEmit` bersih.

### 30.17 Bug — popup drill-down (klik bar bulan berjalan) beda data dgn tabel utama, di 6 komponen (SELESAI, 2026-08-22)

**Laporan user**: klik bar Agustus (tanpa filter) di chart tren Ekspansi,
lalu sortir popup by "Perubahan Terbesar" — baris teratas popup beda dari
peringkat 1-2 tabel breakdown utama di bawahnya (customer beda, urutan
beda), padahal keduanya "sama-sama breakdown periode saat ini" dan
seharusnya konsisten (tabel = pelengkap breakdown, bukan sumber lain).

**Root cause**: `onBarClick` (drill-down popup) menghitung tanggal via
`getPeriodDateRange(periodType, bulan).end` / `monthToEndDate(bulan)` —
KEDUANYA murni kalkulator kalender, SELALU mengembalikan akhir bulan
kalender (mis. Agustus → 31 Agustus) TANPA PEDULI hari ini sudah sampai
tanggal berapa. Tabel breakdown utama di halaman yang sama defaultnya
`periodEnd = hari ini` (mis. 22 Agustus). Klik bar bulan BERJALAN (bukan
bulan yang sudah tutup) jadi query popup pakai `period_end=2026-08-31`
(9 hari ke MASA DEPAN) sementara tabel pakai `period_end=2026-08-22` —
window "previous" ikut bergeser krn beda titik potong, customer/urutan
yang keluar jadi genuinely beda, BUKAN cuma soal invoice masa depan yang
kosong. User awalnya mengira ini soal logic sortir (%  vs Rupiah), TERNYATA
akar masalahnya di TANGGAL yang dipakai query, sebelum sortir sama sekali
sempat berperan.

**Cakupan — user tanya "2 matrix lainnya juga?", ternyata 6 komponen kena,
bukan cuma M7**:
- `M2AvgCategory.tsx`, `M7ExpansionGrowth.tsx` (pola `getPeriodDateRange` +
  `periodType`, sudah granularitas-aware) — fix pakai clamp baru
  `clampPeriodEndToToday()` (BARU, `utils/analisisPeriod.ts`), mirror
  `clampToElapsedEnd` backend: cek `periodKey === getCurrentPeriodKey(...)`,
  kalau ya baru clamp ke hari ini.
- `M3Revenue.tsx`, `M4GrossProfit.tsx`, `M7Expansion.tsx` (versi lama
  Customer Metrics workbench) — pola `monthToEndDate(bulan)` per-bar,
  masih hardcode bulanan (belum granularitas). Fix: pindah ke
  `resolvePeriodEnd()` (ternyata SUDAH ADA di `utils/date.ts`, dipakai
  Dashboard/index.tsx, cuma belum pernah disambungkan ke drill-down
  M3-M7 — persis pola bug yang sama diperbaiki lewat fungsi yang sudah
  benar sejak awal tapi tidak ke-reuse).
- `M5HighMargin.tsx`, `M6RepeatOrder.tsx` — pola beda: `onChartClick`
  (bukan per-bar) manggil `monthToEndDate(periodEnd)` dengan `periodEnd`
  prop yang SUDAH tanggal penuh 'YYYY-MM-DD' (dari DatePicker Retention/
  Value, bukan 'YYYY-MM'). Fix: `resolvePeriodEnd(periodEnd.slice(0,7))`
  — ambil bagian YYYY-MM dulu baru clamp, mempertahankan makna "drill ke
  bulan penuh yang memuat tanggal terpilih" sambil menutup celah tanggal
  masa depan.
- `monthToEndDate` di `CustomerMetrics/helpers.ts` (versi duplikat,
  BUKAN yang di `utils/date.ts`) DIHAPUS — sudah 0 pemakai setelah 3 fix
  di atas, dead code yang kalau dibiarkan bisa "digunakan lagi" tanpa
  sadar dan mengulang bug yang sama.

**Diverifikasi**: klik bar Agustus (bulan berjalan) di M7 Expansion
(tanpa filter) → network request SEKARANG `period_end=2026-08-22` (hari
ini, BUKAN 2026-08-31) — React Query bahkan DEDUPE 2 request (popup +
tabel utama) jadi 1 network call karena parameternya sekarang genuinely
identik, bukti konsistensi bukan cuma "kebetulan sama". M4 Gross Profit
diverifikasi terpisah → `period_end=2026-08-22` juga. `tsc --noEmit`
bersih di 6 file + 1 file dihapus fungsinya.

**Di luar scope**: M8-M10 (DormantCustomer/) TIDAK punya pola drill-down
klik-chart ini sama sekali (dicek, tidak ada `onBarClick`/`onChartClick`
di 3 filenya) — tidak kena bug ini, bukan berarti belum diperiksa.

### 30.18 KpiHeader + TrendSummary — redesain jadi card (SELESAI, 2026-08-22)

User kirim mockup: ganti tampilan "info di bawah judul" (KpiHeader,
current/pembanding/perubahan) dan TrendSummary (Rata-rata/Tertinggi/
Terendah) dari 1 baris teks "Label: Value | Label: Value" (iterasi ke-5,
§28.2) jadi kartu rounded+shadow — angka besar berdampingan + pill warna
utk perubahan.

`KpiHeader.tsx`: `Paper` rounded (`borderRadius:3`) + soft shadow (BUKAN
`@/components/ui/Card` yang flat-border square — gaya sengaja beda utk
card ringkasan). Judul (nama metrik) + subjudul ("{{periode saat ini}}
vs {{periode pembanding}}", key i18n baru `dashboard.kpiHeader.periodVs`)
di atas, 2 angka besar (`variant="h4"`) berdampingan dgn caption periode
di bawah masing-masing, lalu `Chip` full-content di bawah utk perubahan
(hijau=naik/merah=turun/abu=flat, icon trend + label "poin persentase"
sama seperti sebelumnya, cuma bentuknya jadi pill bukan teks inline).

`TrendSummary.tsx`: pola sama persis (card rounded+shadow, judul+subjudul
key i18n baru `dashboard.trendSummary.periodSubtitle`), 3 angka besar
berdampingan (Rata-rata/Tertinggi/Terendah), Tertinggi/Terendah dapat
caption periode ekstra di bawah angkanya (mis. "(2025-09)").

Kedua komponen SHARED, otomatis berlaku ke semua pemakai (M1/M2/M7 Growth
— satu-satunya yang sudah pakai KpiHeader/TrendSummary sejauh ini, M3-M6
di halaman Value/Retention BELUM migrasi ke pola KpiHeader ini, lihat
§30.12, jadi tidak terpengaruh perubahan ini — bukan regresi, memang
belum pakai komponennya). Diverifikasi desktop (900px) dan mobile
(iPhone 13 device) — card scale rapi di kedua ukuran, pill tidak
overflow. `tsc --noEmit` bersih.

**Susulan (koreksi keras, sama hari) — "kamu buat componen baru? kenapa
card nya berbeda dengan yang lain? padahal componennya atomic".**
Implementasi PERTAMA di atas SALAH: pakai `Paper` MUI mentah +
`borderRadius: 3` + `boxShadow` custom yang saya tulis sendiri supaya
persis mockup (rounded corner + soft shadow) — hasilnya card ini punya
gaya visual SENDIRI, beda dari SEMUA card lain di app (`@/components/ui/
Card`, dipakai StatCard/SummaryCard/filter card/dst — flat-border square,
sudah didefinisikan di `theme/index.ts` MuiCard styleOverrides). Ini
persis pelanggaran [[feedback_centralize_ui_no_duplication]] — nulis
styling baru alih-alih reuse komponen atomic yang sudah ada.

**Fix**: `KpiHeader.tsx`/`TrendSummary.tsx` diganti total — pakai `Card`
atomic (`@/components/ui/Card`) apa adanya, TANPA sx border/shadow/radius
tambahan sama sekali (ikut default Card+theme). Pill perubahan juga
diganti dari `Chip` MUI mentah (solid fill custom) ke `StatusChip` atomic
(`@/components/ui/StatusChip` — SELALU outlined, oval, size/warna
seragam sesuai design system, dipakai StatCard juga) — warna dipetakan
ke prop semantiknya langsung (`success`/`error`/`default`), bukan
`bgcolor` custom lagi. Hasil: card ini sekarang visual IDENTIK dgn card
chart/tabel di sekitarnya (border tipis sama, sudut kotak sama, tanpa
shadow tambahan) — konsisten penuh dgn card lain di halaman yang sama,
bukan gaya sendiri. Diverifikasi ulang screenshot, `tsc --noEmit` bersih.

### 30.19 Growth: hapus tab luar per-KPI, tabel dipindah ke menu Laporan baru (SELESAI, 2026-08-22)

**Instruksi keras user**: "Rubah UI ke kondisi sebelum kita pakai tab
untuk memisahkan cross selling, kategori, dan ekspansi... kembalikan ke
kondisi UI awal" + "kita buatkan saja halaman khusus tabel, terlalu
kotor jika chart digabung dengan tabel" + "jangan rollback git... tapi
tata kembali UI-nya... kamu bisa mereferensi UI dari Value atau
Retention" + (dipertegas via AskUserQuestion) "Buat saja 1 menu report,
dan buat sub menu retention, revenue, dan growth — nanti kita maping
tabel-tabel apa saja yang kita masukkan disana".

**Bagian 1 — Growth/index.tsx: tab luar per-KPI (§29, dipasang
2026-08-19) DIHAPUS.** Kembali ke pola DITUMPUK VERTIKAL (referensi
eksplisit user: Retention/index.tsx & Value/index.tsx) — M1CrossSelling,
M2AvgCategory, M7ExpansionGrowth SEMUA dirender sekaligus (bukan 1 KPI
aktif via `<Tabs>`+query param `?kpi=`), masing-masing diganti
`NoSectionAccess` kalau permission-nya tidak dimiliki (pola sama persis
Retention). Fetch `useCrossSelling`/`useCustomerMetrics` sekarang
`enabled` oleh permission (`canCrossSelling`/`canExpansion`) langsung,
bukan lagi oleh `activeKpi`. Filter (Entitas/Periode/Filter Lanjutan)
TETAP 1 instance dipakai bareng semua section (tidak berubah). Sub-tab
INTERNAL tiap KPI (Overview/Trend Analysis/Heatmap di M1, dst) TIDAK
disentuh — instruksi user spesifik soal tab yang MEMISAHKAN 3 KPI itu,
bukan tab internal per-KPI.

**Bagian 2 — Tabel breakdown (`BreakdownTable` di M1/M2, `ResponsiveListView`
Search+Sort di M7) yang dulu nempel PERMANEN di tab "Trend Analysis"
DIHAPUS dari M1CrossSelling.tsx/M2AvgCategory.tsx/M7ExpansionGrowth.tsx**
(chart+TrendSummary TETAP ada di situ, cuma tabelnya yang pindah) —
**dipindah ke halaman baru** `pages/Report/Growth/index.tsx`, diakses
lewat menu sidebar baru **"Laporan"** (`config/menu.tsx`, collapsible,
3 submenu: Growth/Retention/Revenue — icon+posisi sejajar Growth/
Retention/Value). Report > Growth: filter sendiri (Entitas/Cabang/
Divisi/Periode/Granularitas/Exclude Intercompany, TIDAK share state dgn
`/growth`), 2 tab — "Cross Selling" (`BreakdownTable`, dataset SAMA persis
dipakai M1 dan M2 makanya cuma 1 tab bukan 2 yang isinya duplikat) dan
"Expansion" (Search+Sort+`ResponsiveListView`, logic diekstrak apa
adanya dari M7ExpansionGrowth.tsx). Report > Retention dan Report >
Revenue: **shell/placeholder** ("Belum ada tabel di halaman ini — akan
ditambahkan kemudian") — Retention/Value (halaman chart) TIDAK punya
tabel breakdown permanen sama sekali (M6/M8/M9/M10/M3/M4/M5 semuanya
cuma dialog drill-down klik-chart), jadi tidak ada yang bisa dipindah
sekarang; instruksi user eksplisit "nanti kita maping" — BELUM
diputuskan, sengaja tidak dikerjakan lebih jauh dari shell routing.

**Route baru**: `/report/growth`, `/report/retention`, `/report/revenue`
(`routeConstants.tsx`, `routeLazyComponents.tsx`) — permissionKey REUSE
`growth:view`/`retention:view`/`value:view` (SAMA dgn halaman chart-nya,
bukan permission RBAC baru, tidak perlu migrasi permission).

**Temuan penting saat debug 404**: route baru TIDAK otomatis muncul cuma
dari `routeRegistry` (frontend) — `App.tsx` generate `<Route>` dari
`pageSettings` (fetch `/api/v1/page-settings`, tabel `page_settings`
backend) di-map ke `routeRegistry[page_key]`; kalau `page_key` tidak ada
row-nya di DB, route TIDAK PERNAH ter-render walau sudah terdaftar di
frontend. 3 baris baru ditambahkan `backend/src/db/seed.ts`
(`report-growth`/`report-retention`/`report-revenue`, ready:true) DAN
di-INSERT langsung ke DB dev lokal (seed.ts saja tidak retroaktif ke DB
yang sudah ke-seed) — **perlu INSERT manual yang sama ke DB dev/prod
saat deploy nanti**, jangan cuma andalkan migrate/deploy kode.

**Ditemukan sekalian (tidak diaktifkan lagi)**: `page_settings` SUDAH
py 10 baris `report-cross-selling`/`report-avg-category-per-customer`/
`report-dormant-rate`/`report-dormant-value`/`report-reactivation-rate`/
`report-customer-revenue`/`report-customer-gross-profit`/`report-high-
margin-penetration`/`report-repeat-order`/`report-customer-expansion`
dari sistem "Report" LAMA (task026 Fase 3, 2026-08-09) — SUDAH ORPHAN,
tidak ada entry route-nya lagi di `routeConstants.tsx` sejak konsolidasi
Growth/Retention/Value (2026-08-19), kemungkinan besar dianggap
tergantikan waktu itu oleh tabel breakdown inline yang baru saja
dihapus lagi hari ini. Struktur LAMA itu per-KPI INDIVIDUAL (10 halaman),
struktur BARU per-FRAMEWORK (3 halaman: Growth/Retention/Revenue) —
BEDA, bukan reaktivasi sistem lama, sesuai instruksi eksplisit user.
Baris lama DIBIARKAN di DB (harmless, pola sama baris orphan lain).

**Diverifikasi**: screenshot `/growth` (M1+M2+M7 tersusun vertikal, tanpa
tab luar, tab "Trend Analysis" M1 tanpa tabel lagi), sidebar (menu
"Laporan" collapsible di bawah Value), `/report/growth` tab "Cross
Selling" (855 baris, "Report · Growth"), tab "Expansion" (3.424 baris),
`/report/retention` (placeholder benar setelah fix key i18n
`report.comingSoon` -> `common.report.comingSoon`, salah prefix
namespace di percobaan pertama). `tsc --noEmit` bersih backend+frontend.

### 30.20 Restrukturisasi grup sidebar — Business/Report/Data (SELESAI, 2026-08-22)

**Instruksi user**: "untuk growth, retention dan value jadikan dalam 1
section jangan dipisah judul, berikan judul business, untuk menu value
ganti nama dengan revenue, buat judul Data, dan kelompokkan customer,
transaksi dan produk".

**Mekanisme sidebar** (`config/menu.tsx`): `groupLabelKey` di SATU item
me-render header section BARU di atasnya; item BERIKUTNYA tanpa
`groupLabelKey` otomatis nyambung jadi bagian section yang sama (bukan
disembunyikan). Menggabungkan section = cukup lepas `groupLabelKey` dari
item ke-2/ke-3 dst, BUKAN restrukturisasi data model.

**Business** — 'growth' (item pertama) dapat `groupLabelKey:
'nav.groups.business'` (key i18n baru, "Business"), 'retention' dan
'value' dilepas `groupLabelKey`-nya (sebelumnya masing-masing py section
sendiri "GROWTH"/"RETENTION"/"VALUE" terpisah).

**Revenue** — 'value' (label tampilan) ganti dari `nav.groups.value` ke
`nav.groups.revenue` (key i18n baru, "Revenue"). SENGAJA cuma label yang
berubah — key internal/path/permission TETAP `value`/`/value`/
`value:menu` (rename permission/route di luar scope, blast radius jauh
lebih besar dari yang diminta). Submenu Report ketiga ('report-revenue')
ikut disamakan ke `nav.groups.revenue` (sebelumnya salah reuse
`nav.groups.value`, sekarang konsisten).

**Data** — gabungan 3 section lama (Customer Workbench, Product &
Portfolio, Transaction & Revenue) jadi 1, pola sama Business: 'customer'
(item pertama, dipindah ke posisi baru — SEBELUMNYA section tersendiri
persis di bawah Executive Dashboard) dapat `groupLabelKey:
'nav.groups.data'` (key i18n baru, "Data"), 'product'/'transaction'
dilepas `groupLabelKey`-nya. High Margin/Product Trend (anak 'product')
dan Projects (anak 'transaction') IKUT pindah bareng parent-nya —
TIDAK disebut eksplisit oleh user, tapi tetap 1 kelompok tematik (dulu
juga nempel di grup yang sama, cuma section-nya beda).

**Urutan section akhir**: Executive Dashboard -> Business (Growth/
Retention/Revenue) -> Report (Growth/Retention/Revenue, collapsible) ->
Data (Customer/Products/High Margin/Product Trend/Transactions/Projects)
-> Administration (tidak berubah).

**Insiden kecil (self-caught)**: saat mengedit blok Business, item
'customer' SEMPAT KEHAPUS TIDAK SENGAJA (old_string edit pertama
mencakup teks section "GROUP 2: CUSTOMER WORKBENCH" tapi new_string
tidak melestarikannya) — ketahuan lewat `grep "key: 'customer'"` tidak
match apa pun sebelum sempat di-screenshot/dilaporkan sbg selesai,
langsung diperbaiki (ditambahkan kembali sbg item pertama Data) sebelum
verifikasi visual.

**Diverifikasi**: screenshot sidebar penuh — 4 section baru persis sesuai
instruksi (Business/Report/Data/Administration + Executive Dashboard).
`tsc --noEmit` bersih.

### 30.21 Sidebar: hapus semua judul section/divider, Business & Data jadi parent collapsible, hapus Product Trend, accordion eksklusif (SELESAI, 2026-08-22)

**Instruksi user (2 pesan berurutan)**: "Coba hilangkan judul section dan
divider, jadi langsung overview. menu business, sub menu growth,
retention, revenue. menu data, sub menu customer, produk, high margin,
tren produk (Hapus ini redundan dengan retention), transaksi, proyek" —
lalu susulan: "Buat saat sub menu terbuka, sub menu lain tertutup
otomatis menghindari scroll".

**Hapus semua header/divider** — `Sidebar.tsx` cuma render `<Divider>`+
teks label KALAU `section.groupLabelKey` truthy. SEMUA `groupLabelKey`
di `menu.tsx` dilepas (dashboard/business-items/report/data-items/
administration) — hasilnya list mengalir polos, "Overview" langsung di
paling atas tanpa header "Executive Dashboard" di atasnya.

**Business & Data jadi parent collapsible** — §30.20 sebelumnya bikin
Growth/Retention/Revenue & Customer/Products/dst jadi "section flat"
(item terpisah, cuma dibedakan visual lewat `groupLabelKey` di item
pertama). Tanpa header/divider, pola itu tidak lagi bisa mengelompokkan
apa pun secara visual — direstruktur jadi parent+children (`children:
[...]`, pola sama Report/Settings yang sudah ada): `key: 'business'`
(icon `BusinessIcon`, path default `/growth`) membungkus growth/
retention/value; `key: 'data'` (icon `StorageIcon` baru, path default
`/customers`) membungkus customer/product/high-margin/transaction/
project. Parent TIDAK py `permissionKey` sendiri (gating tetap di level
children, pola sama Report/Settings).

**Product Trend dihapus dari Data** — instruksi eksplisit user: "redundan
dengan retention". HANYA dilepas dari array `children` Data (menu/
sidebar) — route `/products/trend` TIDAK dihapus dari
`routeConstants.tsx`/`page_settings` (pola sama halaman lama lain di
file ini, "isinya sama, cuma sudah tidak ada entry langsung di
sidebar"). `ShowChartIcon` (import yang jadi unused) ikut dihapus.

**Accordion eksklusif** (susulan, mid-turn) — SEBELUM fix: `NavGroup`
(`Sidebar.tsx`) simpan `expanded` sbg `useState` LOKAL per komponen,
jadi Business+Data+Settings+dst semua bisa expanded BERSAMAAN,
sidebar jadi sangat panjang. Fix: state "grup mana yang lagi terbuka"
DIANGKAT ke komponen `Sidebar` (1 `expandedKey: string | null`),
dioper ke tiap `<NavGroup>` sbg prop `expanded`/`onToggle` (bukan lagi
`useState` lokal). `onToggle` set `expandedKey` ke key grup itu (toggle
off kalau diklik lagi), otomatis nutup grup lain krn cuma 1 state
dibagi semua. Initial value: grup yang MEMUAT path aktif saat mount
(mis. buka `/report/growth` langsung -> grup "Report" otomatis
terbuka), `null` kalau tidak ada yang cocok.

**Diverifikasi**: screenshot sidebar collapsed (list rapi tanpa header/
divider: Overview, Business, Report, Data, Settings, Configuration,
Access Control, Log) dan expanded (klik Business -> Growth/Retention/
Revenue muncul; klik Data -> Business otomatis nutup, Data muncul
dengan 5 children TANPA Product Trend). `tsc --noEmit` bersih.

**Susulan (sama hari) — indikator expand/collapse ganti dari chevron ke
+/-** (koreksi user: "jangan pakai arrow"). `ExpandMoreIcon`/
`ExpandLessIcon` diganti `AddIcon`/`RemoveIcon` — tertutup = "+", terbuka
= "-". Diverifikasi screenshot.

### 30.22 M1/M2/M7: hapus sub-tab internal (Overview/Trend Analysis/Heatmap), ditumpuk langsung (TAHAP 1, SELESAI, 2026-08-22)

**Instruksi user**: "perbaikan struktur layouting hapus tab menu jadi
hanya chart saja seperti layout retention dan revenue. Tapi aku masih
memerlukan beberapa informasi yang ada dalam card dan top customer tapi
kita ganti layouting nya. untuk sekarang pindahkan dari tab menu ke
layout utama dulu setiap chart termasuk heatmap".

Lanjutan §30.19 (yang menghapus tab LUAR — Cross Selling/Category/
Ekspansi di Growth/index.tsx) — sekarang tab DALAM tiap KPI (Overview/
Trend Analysis, +Heatmap khusus M1) di `M1CrossSelling.tsx`/
`M2AvgCategory.tsx`/`M7ExpansionGrowth.tsx` JUGA dihapus, pola akhirnya
sama persis Retention/Value (chart+info langsung, tanpa tab sama
sekali).

**TAHAP 1 (ini) — cuma pindah lokasi, BUKAN redesain**: `<Tabs>`/`<Tab>`
+ state `tab`/`setTab` dihapus dari 3 file; SEMUA section yang dulu
kondisional per-tab (`{tab === 'overview' && (...)}` dst) diubah jadi
`<Box>` polos tanpa syarat — DITUMPUK berurutan sesuai urutan tab lama
(Overview dulu: SummaryCard+mini chart+Top Customers, lalu Trend
Analysis: chart penuh+TrendSummary, lalu utk M1 Heatmap). Isinya TIDAK
dikurangi/digabung sama sekali (instruksi eksplisit user: "aku masih
memerlukan beberapa informasi yang ada dalam card dan top customer") —
konsekuensinya mini chart Overview & chart penuh Trend Analysis SEKARANG
tampil BERSAMAAN (sebelumnya cuma salah satu terlihat tergantung tab
aktif), disengaja apa adanya sesuai instruksi "untuk sekarang pindahkan
dulu" — redesain tata-letak (TAHAP 2, mis. gabung/hilangkan duplikasi
mini-vs-full chart) MENYUSUL terpisah, belum dikerjakan.

**Diverifikasi**: screenshot `/growth` — M1 tampil KpiHeader -> Summary
Cards+mini chart -> Top 5 Customers -> chart tren penuh (Cross-Selling
Trend, 12 bulan) berurutan TANPA tab bar apa pun di antaranya. `tsc
--noEmit` bersih (3 file: M1CrossSelling.tsx, M2AvgCategory.tsx,
M7ExpansionGrowth.tsx).

**Susulan (sama hari) — KpiHeader (elemen paling atas) dilepas dari
`Card`, jadi teks polos** (instruksi user: "Info card yang diatas
jadikan text lain base jangan pakai card lagi"). `KpiHeader.tsx`:
`<Card>` (atomic, §30.18) diganti `<Box>` polos (tanpa border/bg/
shadow) — konten TIDAK berubah (judul metrik+subjudul periode+2 angka
besar+`StatusChip` pill perubahan), cuma bungkusnya bukan lagi kotak
bordered. `SummaryCard` grid + `TrendSummary` di bawahnya TETAP pakai
`Card` (tidak diminta berubah) — elemen paling atas ini sengaja
dibedakan dari card-card lain di halaman yang sama. Diverifikasi
screenshot, `tsc --noEmit` bersih.

### 30.23 M1/M2/M7: gabung KpiHeader+chart+TrendSummary jadi 1 Card (Header/Body/Footer, sesuai §28.11, SELESAI, 2026-08-22)

**Instruksi user**: "Jadikan 1 layout dengan chart cross selling sebagai
header chart seperti konsep awal begitu juga untuk card dibawah chart
jadikan footer chart".

"Konsep awal" yang dimaksud = §28.11 "Struktur Final Setiap KPI Card"
(ASCII diagram lama di dokumen ini) — 1 Card berbatas (border) berisi
Judul+KpiHeader sbg **header**, chart sbg **body**, lalu
Average/Highest/Lowest (TrendSummary) sbg **footer**, dipisah garis
horizontal (`Divider`) — BUKAN 3 elemen lepas-lepas seperti hasil §30.22
(KpiHeader teks polos + chart tersendiri + `TrendSummary` Card
tersendiri dengan `mt: 2` di antaranya).

**Perubahan**:
- `TrendSummary.tsx` — tambah prop `bare?: boolean` (default `false`).
  `bare=true` skip pembungkus `<Card>` + margin-top sendiri, cuma
  render `<Box sx={{textAlign:'center'}}>` isinya — dipakai sbg footer
  DI DALAM Card lain (caller yang kasih `Divider`+padding).
- `M1CrossSelling.tsx`, `M2AvgCategory.tsx`, `M7ExpansionGrowth.tsx` —
  pola SAMA PERSIS di ketiganya: `SectionLabel`(judul+info icon) +
  `KpiHeader` dibungkus `<Box sx={{p:2.5}}>` pertama, lalu `<Divider/>`,
  lalu chart utama (`ComboChartWidget`/`ExpansionChart`) dibungkus
  `<Box sx={{p:2.5}}>` kedua, lalu `<Divider/>` lagi, lalu
  `<TrendSummary bare .../>` dibungkus `<Box sx={{p:2.5}}>` ketiga —
  SEMUANYA di dalam SATU `<Card>` (atomic, §30.18).
- SummaryCard grid + mini chart + Top Customers/Top Movers (section di
  BAWAH Card baru ini) **SENGAJA TIDAK ikut digabung** — tetap section
  terpisah apa adanya, belum diubah tata-letaknya (itu scope TAHAP 2
  §30.22 yang masih menunggu instruksi lanjut, bukan bagian permintaan
  ini). Heatmap M1 juga tetap section terpisah di bawah, tidak berubah.

**Diverifikasi**: `tsc --noEmit` + `eslint` bersih (4 file). Screenshot
`/growth` (Playwright, login admin@mail.com) — ketiga panel (M1 Cross
Selling, M2 Average Category, M7 Expansion) tampil sebagai 1 Card
berbatas: judul+KpiHeader (current/YoY/chip perubahan) di atas, garis
pembatas, chart trend 12 bulan di tengah, garis pembatas lagi,
Average/Highest/Lowest di bawah — semuanya dalam 1 kotak yang sama,
sesuai §28.11. Catatan: query `/metrics/customer-metrics` (dipakai M7)
lambat di lokal (~10 detik) — bukan regresi dari perubahan ini, cuma
karakteristik data dev, card tetap render benar setelah data datang.

### 30.24 M1/M2/M7: hapus judul redundan, baris perbandingan pindah ke atas chart, legend disatukan di bawah (SELESAI, 2026-08-22)

**Instruksi user** (anotasi screenshot §30.23, kotak warna): "yang aku
tandai kotak merah itu adalah redundan dan tidak diperlukan, cukup
judul utama card. Kotak kuning itu juga sama-sama legend kenapa
letaknya dipisah atas dan bawah? itu UI UX yang salah. Pertahankan
kotak merah dengan emot centang, hapus yang lain. Gantikan posisi
kotak kuning atas dengan kotak hijau. Satukan ke 2 kotak kuning ke
bawah chart."

Diterjemahkan dari anotasi: 3 judul tampil di §30.23's unified Card —
(1) `SectionLabel` (judul utama, ditandai centang → KEEP), (2)
`KpiHeader`'s `metricLabel` ("Cross-Sell Rate" dst, DELETE — redundan
dgn (1)), (3) judul bawaan chart (`ComboChartWidget`/`ExpansionChart`'s
`title`, mis. "Tren Cross-Selling (12 bulan)", DELETE — redundan juga).
Baris perbandingan periode (`KpiHeader` sisa, "kotak hijau") PINDAH
menggantikan posisi judul+subtitle chart yang dihapus (tepat di atas
chart). Subtitle chart lama (mis. "Bar = jumlah customer · Line =
cross-sell rate (%)") dan legend warna recharts (bawaan, di bawah
chart) — 2-2nya "kotak kuning", sama-sama legend tapi kepisah
atas/bawah — DISATUKAN, keduanya di BAWAH chart.

**Perubahan**:
- `KpiHeader.tsx` — prop `metricLabel` DIHAPUS dari interface + render
  (`<Typography variant="subtitle1">{metricLabel}</Typography>`
  dihapus). Komponen sekarang HANYA render 1 baris perbandingan
  (periode:nilai | vs | periode:nilai + chip, dari §30.23).
- `ComboChartWidget.tsx` — `title: string` (wajib) → `title?: string`
  (opsional), header Box cuma render kalau `title` ada. Prop baru
  `caption?: string` — teks kecil di BAWAH chart (setelah
  `ResponsiveContainer`, sebelum `</Card>`), sejajar dgn `<Legend>`
  bawaan recharts yang sudah render di situ juga — otomatis "menyatu"
  krn posisi sama, TIDAK perlu logic khusus gabung dgn legend.
- `BarChartWidget.tsx` — treatment PERSIS sama: `title?: string`, header
  Box conditional (`value !== undefined || title`), prop baru
  `caption?: string` dirender di bawah chart.
- `ExpansionChart.tsx` (wrapper `BarChartWidget` khusus M7) — prop baru
  `showHeader?: boolean` (default `true`, jaga `M7Expansion.tsx`
  workbench lama TETAP tampil title/subtitle bawaan, TIDAK ikut
  berubah) + `caption?: string` diteruskan ke `BarChartWidget`.
- `M1CrossSelling.tsx`/`M2AvgCategory.tsx`/`M7ExpansionGrowth.tsx` —
  pola SAMA PERSIS di ketiganya: header region Card cuma
  `SectionLabel` (+ info icon M1); `KpiHeader` (tanpa `metricLabel`)
  DIPINDAH ke body region, tepat SEBELUM chart; `title`/`subtitle`
  TIDAK lagi dikirim ke `ComboChartWidget`/`ExpansionChart`
  (M7 pakai `showHeader={false}`); subtitle chart lama dikirim lewat
  prop `caption` yang baru.

**Diverifikasi**: `tsc --noEmit` + `eslint` bersih (7 file). Screenshot
`/growth` (Playwright) — ketiga panel: header Card cuma 1 judul (tanpa
"Cross-Sell Rate"/dst di bawahnya), baris "[periode]:[nilai] | vs |
[periode]:[nilai] [chip]" persis di atas chart (posisi bekas judul+
subtitle chart), chart tanpa judul sendiri, legend warna + caption
penjelasan chart SEKARANG SATU BLOK sejajar tepat di bawah chart
(bukan lagi kepisah atas/bawah). Footer `TrendSummary` tidak berubah.

### 30.25 M1: 3 KPI card di atas chart, Top 5 Customers pindah ke samping chart, hapus section duplikat (SELESAI, 2026-08-22, khusus M1 saja)

**Instruksi user** (setelah diskusi mockup ASCII "Growth > Cross
Selling" yang di-scope-persempit via AskUserQuestion): "Kamu hanya
harus tambahkan 3 card summary diatas chart cross selling dan
meletakkan top 5 customer list disamping chart. Summary yang saat ini
ada dibawah chart [dihapus, kontennya pindah]. Hapus juga mini chart
ringkasan 12 bulan." Jawaban AskUserQuestion sebelumnya mengonfirmasi:
(1) ini TAMBAHAN di atas, BUKAN pengganti unified Card §30.23/30.24;
(2) Top 5 Customers "letakkan di samping chart 70/30 lebar 70% untuk
chart, Nama dan Persentase Kontribusi, contoh: 1. TOKOPEDIA BOS
(22%)"; (3) langsung diimplementasikan (bukan didiskusikan dulu).
Scope **KHUSUS M1** (bukan M2/M7 — mockup & instruksi cuma soal
"Cross Selling").

**Bug ditemukan sekalian**: saat membaca file utk kerjaan ini, ketemu
blok `ComboChartWidget`+`TrendSummary` DUPLIKAT (title/subtitle versi
lama, `TrendSummary` non-`bare`) yang render chart yang SAMA PERSIS 2x
di halaman — sisa refactor §30.23 yang lupa dihapus (M2/M7 SUDAH
dibersihkan waktu itu, M1 kelewatan). Otomatis terhapus sebagai bagian
dari perubahan ini (section itu memang jadi target hapus juga).

**Perubahan** (`M1CrossSelling.tsx` saja):
- **Section 1 (baru)** — 3 `<Grid>` kolom (`xs=12,sm=6,md=4`) berisi
  `KpiCard` (Cross-Selling Rate/Avg Category per Customer/Active
  Customers), ditaruh SEBELUM `<Card>` unified. **REUSE PENUH**
  `KpiCard` + i18n keys (`kpi1Label`/`kpi1Sub`/`kpi2Label`/`kpi2Sub`/
  `activeCustomerLabel`/`activeCustomerSub`) dari halaman ORPHAN lama
  `pages/CrossSelling/index.tsx` (route sudah tidak dipakai sejak
  §30.19, tapi KODE-nya TIDAK dihapus/didead-code-kan — persis
  komponen+teks yang sama dipakai ulang di sini, BUKAN dibuat baru,
  sesuai prinsip "centralize UI, no duplication"). Prefix "KPI 1 ·"/
  "KPI 2 ·" di label DIHAPUS (i18n `kpi1Label`/`kpi2Label`, id+en) —
  konsisten dgn keputusan §30.21 hapus prefix M-angka, sekarang teks
  ini AKTIF tampil lagi jadi diselaraskan.
- **Section 2 (unified Card body)** — chart utama dibungkus
  `<Box sx={{display:'grid', gridTemplateColumns:{xs:'1fr',md:'7fr 3fr'}}}>`
  bareng Top 5 Customers Card di sampingnya (70/30, stack ke 1 kolom
  di mobile). Top 5 Customers format baris ganti dari "Rank · Nama ·
  Rp revenue" jadi "Rank. Nama (persentase%)" — persentase = kontribusi
  `total_revenue` customer itu thd JUMLAH `total_revenue` SEMUA
  customer aktif periode itu (`totalRevenueAll`, `useMemo` baru,
  dibulatkan ke bilangan bulat via `Math.round`, bukan 1 desimal —
  contoh user "22%" bulat).
- **DIHAPUS TOTAL**: section terpisah lama di bawah unified Card
  (SummaryCard grid 2x2 + mini `AreaChartWidget` "ringkasan 12 bulan"
  + Top 5 Customers versi lama format revenue) — kontennya sudah
  dicover Section 1 (KPI) + Top 5 Customers versi baru di samping
  chart. Import `AreaChartWidget` dan `SummaryCard` (dari
  HelperComponents) jadi tidak dipakai lagi, dihapus dari import.
  `formatRupiah` TETAP dipakai (kolom tabel drill-down heatmap M1.1,
  tidak terkait).
- Heatmap M1.1 (di bawah unified Card) TIDAK berubah — tetap section
  terpisah, tidak ikut kena hapus (sesuai jawaban AskUserQuestion,
  yang dibahas cuma Top Customers).

**Diverifikasi**: `tsc --noEmit` + `eslint` bersih. Screenshot `/growth`
— urutan akhir M1: 3 KPI card (Cross-Selling Rate 28.9%/Avg Category
1.6/Active Customers 855) → unified Card (judul, KpiHeader baris
perbandingan, chart 70% + Top 5 Customers 30% di sampingnya dgn format
"1. TOKOPEDIA BOS (14%)" dst, TrendSummary footer) → Heatmap. Tidak ada
lagi chart Cross-Selling duplikat. M2/M7 diverifikasi TIDAK terpengaruh
(screenshot scroll ke bawah, render normal apa adanya).

---

## 31. Pembanding MoM vs YoY per KPI — penyelarasan halaman Chart vs Laporan (2026-08-23)

Bermula dari laporan bug "cutoff_day salah utk granularitas non-bulanan"
(sudah fix, lihat commit `67d0298`), diskusi berkembang ke pertanyaan
lebih besar: KPI mana pakai basis pembanding apa, dan kenapa beda-beda.

### 31.1 Audit basis pembanding existing (diverifikasi via grep, bukan tebakan)

| KPI | Bar chart 12-titik | Header ("X 2025 vs X 2026") | Top 5/Top Movers | Drill-down popup |
|---|---|---|---|---|
| M1/M2 (Cross Selling) | Snapshot murni (rate/avg_category BUKAN hasil pembanding) | YoY (fetch 2x, `period_end` -1 tahun, murni frontend) | YoY (`yoyCategoryCountByCustomer`) | Snapshot murni, TIDAK ada kolom pembanding |
| M7 (Expansion) | MoM, TERTANAM di query backend (`prevBuckets`, beda dari M1/M2 krn nilai bar MEMANG hasil pembanding by definisi) | YoY (fetch 2x terpisah, sama pola M1/M2) | MoM (`fetchExpansionBreakdown`, window periode sebelumnya) | Ada kolom pembanding (Revenue Sebelumnya/Sekarang), tapi basisnya MoM |
| M3-M6 | Snapshot murni | Tidak ada sama sekali | Tidak ada Top 5 | Snapshot murni |
| M8-M10 | Snapshot murni (M10 reactivation_rate formulanya sendiri MoM-derived tapi tidak di-expose sbg delta) | Backend SUDAH hitung YoY (`comparison_value`), tapi YATIM — tidak pernah sampai frontend (`DormantData` type tidak deklarasikan field itu, komponen `KpiSummaryStrip` yang disebut di komentar backend sudah tidak ada) | — | — |

Halaman **Dashboard Overview** (`/dashboard`, terpisah dari Growth/Value/
Retention) sudah tampilkan YoY utk SEMUA KPI (M3-M6, M8-M10 termasuk)
lewat mekanisme sendiri (`dashboard.service.ts`) — tidak terhubung ke
halaman KPI manapun yang dibahas di atas.

Laporan (`pages/Report/Growth/index.tsx`, `BreakdownTable.tsx`,
`expansionHelpers.tsx`) — SUDAH punya kolom pembanding lengkap: Cross
Selling YoY (`yoy_category_count`, `category_change`, `cross_sell_status`),
Expansion MoM (`prev_revenue`/`cur_revenue`). Basisnya HARDCODE
(Cross Selling selalu YoY, Expansion selalu MoM) — tidak bisa dipilih.

### 31.2 Keputusan user — pembagian tanggung jawab Chart vs Laporan

Supaya tidak menimbulkan kebingungan (user lihat panah tren di Top 5 tapi
tidak bisa verifikasi di popup drill-down), dan supaya tidak melebar jadi
"pasang toggle MoM/YoY di semua kartu 10 KPI" (scope creep yang disadari
sendiri oleh user) — pembagian tanggung jawabnya:

- **Summary card** (KpiCard di atas chart) — TETAP snapshot periode
  terpilih, TIDAK ada pembanding. Tidak berubah.
- **Header + trend chart 12-titik** — TETAP YoY (M1/M2 sudah begini,
  M7 headernya juga sudah YoY). Trend chart 12-titik sendiri (isi bar)
  TIDAK berubah cara hitungnya (M1/M2 snapshot, M7 tetap MoM di bar-nya
  — itu inherent, bukan pilihan).
- **Top 5 (M1/M2) — DIUBAH dari YoY jadi MoM**, supaya SAMA basisnya
  dengan Top Movers M7 (yang sudah MoM) — 3 KPI ini jadi konsisten 1
  basis pembanding personal-level (MoM), bukan campur YoY/MoM.
- **Link "Cek Detail" BARU** ditambahkan di bawah tiap Top 5/Top Movers
  (M1, M2, M7) — mengarah ke halaman Laporan (`/report/growth`, tab
  sesuai KPI-nya).
- **Toggle MoM/YoY BARU** ditaruh DI HALAMAN LAPORAN (bukan di halaman
  chart) — mengontrol kolom pembanding BreakdownTable (Cross Selling)
  DAN tabel Expansion sekaligus. Cross Selling: kolom bisa gonta-ganti
  YoY/MoM (backend TIDAK berubah, cuma frontend pilih `period_end`
  pembanding mana yang di-fetch). Expansion: backend PERLU tambahan
  param `comparison_basis` (schema `expansionBreakdownQuerySchema`,
  service `getExpansionBreakdown`, repository `fetchExpansionBreakdown`)
  supaya bisa pilih `getYoyPeriodKey` selain `getPreviousPeriodKey` yang
  sudah ada.

### 31.3 Implementasi (rencana)

1. Frontend: fungsi baru `getMomComparisonPeriodEnd(periodType, periodEnd)`
   di `utils/analisisPeriod.ts` — reuse PERSIS pola `daysSincePeriodStart`
   + `getPreviousPeriodKey` yang sudah ada dari fix cutoff_day kemarin,
   BUKAN tulis ulang. Mirror `shiftDateByYears` yang sudah dipakai utk YoY.
2. `M1CrossSelling.tsx`/`M2AvgCategory.tsx`: tambah fetch MoM baru
   (terpisah dari fetch YoY yang sudah ada, tetap dipakai header) —
   Top 5 pindah baca dari data MoM ini, bukan `yoyData` lagi.
3. `M1CrossSelling.tsx`/`M2AvgCategory.tsx`/`M7ExpansionGrowth.tsx`:
   tambah link "Cek Detail" di bawah Top 5/Top Movers, navigasi ke
   `/report/growth`.
4. Backend `expansionBreakdownQuerySchema` + `getExpansionBreakdown` +
   `fetchExpansionBreakdown`: tambah param `comparison_basis` ('mom'
   default | 'yoy'), pilih `getPreviousPeriodKey` vs `getYoyPeriodKey`
   sbg basis prevKey (mekanisme elapsed-day-anchor yg SUDAH ADA dipakai
   utk keduanya, cuma beda sumber periodKey).
5. `pages/Report/Growth/index.tsx`: tambah toggle MoM/YoY di filter bar
   (pola sama "Apply date cutoff" checkbox yg sudah ada) — Cross Selling
   tab pilih `period_end` pembanding sesuai toggle (reuse §31.3.1), fetch
   Expansion kirim `comparison_basis` sesuai toggle.
6. `BreakdownTable.tsx`: label kolom pembanding ("YoY Category Count" dst)
   perlu jadi dinamis sesuai basis aktif, bukan hardcode "YoY" di teksnya.

**Belum dikerjakan** — draft rencana, implementasi menyusul turn berikutnya.

## 32. PENDING — Gap definisi New/Existing SSOT §30.10 di drill-down M3-M7 + M9 + filter Pareto tidak fungsional (2026-08-24)

Ditemukan sambil mengerjakan fix gerbang populasi "existing" M8-M10 (lihat
§30.9b lanjutan di bawah, granularitas M8-M10) — dicatat sbg 3 pending item
TERPISAH, dikerjakan SATU PER SATU (instruksi user: "kerjakan 1 per satu"),
BUKAN sekaligus.

### 32.1 5 fungsi drill-down M3-M7 — KOREKSI, cuma 3+1 yang genuinely bermasalah

**Klaim awal SALAH** ("5 fungsi semua definisi lama") — setelah dicek detail
per fungsi (`cteEstablishedCustomers`/`cteExistingCustomersByPeriod` itu
SECARA STRUKTUR SQL identik, `first_date < periodStart`; bedanya cuma NILAI
`periodStart` yang dikirim CALLER-nya), ternyata:

| Fungsi | KPI | Status sebenarnya |
|---|---|---|
| `fetchRevenueBreakdown` | M3 | Genuinely belum ada param `dateFrom` sama sekali (schema/service/repository) — hardcode `${filterDate.slice(0,7)}-01` (awal bulan kalender berisi filterDate). **Perlu fix penuh.** |
| `fetchGpBreakdown` | M4 | Backend SUDAH siap (fix 2026-08-23, terima param `dateFrom` opsional). Frontend (`M4GrossProfit.tsx`) TIDAK mengirim `date_from` DAN tidak py prop `periodType` sama sekali — TAPI dicek lebih lanjut (2026-08-24): komponen ini dipakai di 3 tempat (Value/index.tsx, CustomerMetrics workbench, Dashboard) yang KETIGANYA **tidak py filter granularitas sama sekali** (Value page cuma Entitas+Tanggal, tidak ada Kuartal/Semester/Tahun). Jadi drill-down M4 SELALU bulanan di semua tempat dia dipakai saat ini — fallback hardcode `${filterDate.slice(0,7)}-01` utk kasus bulanan HASILNYA SAMA PERSIS dgn `dateFrom` kalau granularitasnya bulanan. **Bukan bug aktif** (tidak ada jalur UI yang bisa memicunya jadi salah) — backend readiness 2026-08-23 itu persiapan utk suatu saat Value page dapat filter granularitas, BELUM ada action item sekarang. **DIKELUARKAN dari daftar kerja saat ini.** |
| `fetchHmBreakdown` | M5 | Sama seperti M3 — TIDAK ada param dateFrom sama sekali. **Perlu fix penuh.** |
| `fetchRorBreakdown` | M6 | Sama seperti M3 — TIDAK ada param dateFrom sama sekali. **Perlu fix penuh.** |
| `fetchExpansionBreakdown` | M7 | **SUDAH BENAR sepenuhnya** — backend+frontend (`date_from`+`period_type`) sudah tersambung end-to-end sejak kerjaan granularitas M7 sebelumnya. **Tidak perlu perbaikan.** |

Konsekuensi (utk M3/M5/M6, dan M4 sebelum frontend-nya diperbaiki): klik
titik trend chart (populasi SSOT, granularitas-aware) vs data yang muncul
di dialog drill-down (populasi bulan-kalender hardcode, TIDAK granularitas-
aware) bisa BEDA angka utk KPI yang sama, titik yang sama — mirip gejala
bug §30.17 (SELESAI, tapi soal window tanggal, bukan soal definisi
Existing). M1 TIDAK termasuk daftar ini (drill-down-nya sudah SSOT dari
awal, KPI pilot §30.10).

**Rencana (urutan pengerjaan, "1 per satu" — instruksi user) — REVISI
setelah dicek caller M3/M5 juga (2026-08-24)**:

M3 (`M3Revenue.tsx`) dan M5 (`M5HighMargin.tsx`) dipakai di 3 tempat yang
SAMA PERSIS dgn M4 (Value/index.tsx, CustomerMetrics workbench, Dashboard)
— KETIGANYA tanpa filter granularitas. Jadi M3 dan M5 statusnya SAMA
seperti M4: **tidak ada bug aktif sekarang**, DIKELUARKAN juga dari daftar
kerja saat ini.

1. ~~M4~~ — DIKELUARKAN, tidak ada bug aktif.
2. ~~M3~~ — DIKELUARKAN, tidak ada bug aktif (caller sama dgn M4, cek 2026-08-24).
3. ~~M5~~ — DIKELUARKAN, tidak ada bug aktif (caller sama dgn M4, cek 2026-08-24).
4. **M6 — SELESAI (2026-08-24).** `fetchRorBreakdown` (m6.repository.ts)
   +`rorBreakdownQuerySchema`+`getRorBreakdown`+frontend (`getRorBreakdown`
   api, `useRorBreakdown` hook, `M6RepeatOrder.tsx` — Top 5 fetch DAN dialog
   drilldown, keduanya kirim `date_from`) — pola SAMA PERSIS M4/M7
   (`dateFrom ?? fallback bulan lama`). Diverifikasi langsung ke DB, Kuartal
   3 2026: total_existing drilldown SEBELUM fix 32.631 (SALAH, beda 1.195
   dari trend chart 31.436), SESUDAH fix 31.436 (cocok persis). repeat_count
   ikut berubah 275 → 630 (window agregat sebelumnya cuma 1 bulan, sekarang
   lebar kuartal penuh Jul-Agu).

Tiap langkah diverifikasi query langsung ke DB (populasi/angka sebelum-
sesudah) sebelum dianggap selesai, sama seperti pola verifikasi migrasi-
migrasi SSOT sebelumnya.

### 32.2 `fetchDormantValueRanking` (M9) tidak punya gate New/Existing sama sekali

Beda kasus dari §32.1 (bukan "definisi lama", tapi TIDAK ADA gate sama
sekali) — `cust_last` CTE (`m8m10.repository.ts`) cuma syarat
`MAX(invoice_date) <= filterDate - ambang`, tanpa cek `first_invoice_date`
vs periode apa pun. Customer yang first-purchase-nya BARU tapi sudah lewat
ambang dormant (kasus langka tapi mungkin, mis. B2C ambang 6 bulan, first
purchase 7 bulan lalu tanpa order lagi) tetap masuk ranking — secara
definisi §30.10 seharusnya "New" (belum genap 1 periode penuh sbg
customer), bukan populasi yang relevan utk KPI berbasis "Existing".

**SELESAI (2026-08-24).** `fetchDormantValueRanking(p, limit, existingSince?)`
— param baru `existingSince`, reuse `cteEstablishedCustomers(p, existingSince
?? awal-bulan-filterDate)` (SSOT §30.10, CTE yang sama dipakai M4/M6/M7,
BUKAN nulis logic existing baru) di-JOIN ke `cust_last`. Titik referensi:
diputuskan TANPA nanya ulang ke user — reuse pola yang SUDAH disepakati utk
`is_existing_at_me` (`fetchDormantTrend`): `liveBucket.start` (awal kalender
ASLI label yang sedang dilihat), caller `getDormantCustomerMetrics` kirim
`liveBucket.start` (current) / `comparisonBuckets.at(-1)!.start` (YoY).
Caller kedua (`getDormantBreakdown`, dialog drilldown M8 yg reuse fungsi
ini) BELUM kirim `existingSince` eksplisit (endpoint itu belum terima
`period_type`/`date_from` sama sekali) — jatuh ke fallback awal-bulan.

**Temuan verifikasi DB (2 tahap, tahap 1 SALAH — dikoreksi user)**:

Tahap 1 (mode default, TANPA "Apply date cutoff"): gate SECARA STRUKTURAL
vacuous (tidak pernah mengecualikan siapa pun). Sebabnya matematis: desain
"geser 1 periode" (§32 atas, "Dormant Agustus") membuat `filterDate` (akhir
window data, mis. 31 Juli) SELALU persis 1 hari SEBELUM `existingSince`
(awal label, 1 Agustus) — sementara syarat dormant (`HAVING MAX(invoice_
date) <= filterDate - ambang bulan`) mengharuskan `first_invoice_date`
sudah minimal `ambang` (3-12 bulan) SEBELUM filterDate, kontradiksi kalau
first ≥ existingSince. Diverifikasi: dgn gate vs tanpa gate → SAMA PERSIS
19.304 baris, 0 customer terkecuali (`company_id=all`, filterDate 31 Juli
2026, mode default).

Dari temuan tahap 1 ini saya sempat salah simpulkan ke user: "mode
`apply_date_cutoff` ... belum/tidak terlihat di UI M9 saat ini" — **SALAH**,
ditegur user ("Bukankah date cutoff sudah terpasang di frontend menu
retention?"). Toggle "Apply date cutoff" MEMANG sudah ada & aktif di
Retention page (`Retention/index.tsx` baris 171-178), dikirim ke
`useDormantCustomer` yang SAMA-SAMA memberi data ke M9 (`dcData` dipakai
bersama M6/M8/M9/M10) — bukan skenario hipotetis, REACHABLE user hari ini
tinggal centang toggle.

Tahap 2 (setelah dikoreksi, verifikasi ulang dgn `apply_date_cutoff: true`):
- Granularitas **Semester**: `existingSince`(1 Jul)→`filterDate`(hari ini,
  ~24 Agu) cuma ~54 hari, masih < ambang minimum (3 bulan) → 0 customer
  terkecuali, gate MEMANG vacuous utk kombinasi ini.
- Granularitas **Tahunan**: `existingSince`(1 Jan)→`filterDate`(~24 Agu)
  ~236 hari (~7.8 bulan) — CUKUP LEBAR utk memotong customer ambang
  3-6 bulan. Hasil nyata (`company_id=all`): **3.226 customer** yang
  SEBELUMNYA salah masuk ranking M9 (first-purchase mereka sendiri jatuh
  DI DALAM tahun berjalan, harusnya "New" bukan "Existing"/dormant),
  sekarang benar dikecualikan — total dari 21.051 jadi 17.825 customer,
  `estimated_lost_value` gabungan turun dari Rp44.492.817.963 jadi
  Rp42.341.090.688 (selisih Rp2.151.727.275). Ini SIGNIFIKAN, bukan efek
  samping kecil — user yg pilih granularitas Tahunan + Apply date cutoff
  di halaman Retention akan lihat total "Potensi Kerugian" M9 turun ~4.8%
  dan Top 20 ranking bisa berubah komposisinya setelah fix ini deploy.

Kesimpulan: fix BENAR dan MATERIAL berdampak (bukan no-op) utk kombinasi
granularitas lebar (terutama Tahunan) + Apply date cutoff — kombinasi yang
sudah reachable user sekarang. Utk mode default (bulanan/kuartalan, tanpa
cutoff) tetap vacuous secara matematis, itu bagian yang sudah benar
diverifikasi. `tsc --noEmit` bersih.

### 32.3 Filter "Pareto" di halaman Retention tidak fungsional (dead UI, ditemukan 2026-08-24)

`Retention/index.tsx`: `const [, setOnlyPareto] = useState(false)` — nilai
`onlyPareto` DIBUANG (destructure kosong), tidak pernah dibaca di mana pun.
`ParetoFilterToggle` ada di UI (bisa diklik), tapi TIDAK ada satu pun fetch
(`useCustomerMetrics`/`useDormantCustomer`) yang menerima parameter pareto
— klik toggle-nya tidak mengubah data sama sekali. Berlaku utk SEMUA KPI di
halaman Retention (M6/M8/M9/M10), bukan cuma satu. Sudah ada SEBELUM sesi
ini, bukan regresi baru.

**Rencana**: belum didiskusikan detail implementasinya (apa itu artinya
"Pareto" utk tiap KPI — filter ke customer kategori A saja? butuh
klarifikasi definisi dulu sebelum coding).

**Status semua 3 item di atas: PENDING, belum dikerjakan — dicatat di sini
biar tidak hilang, dikerjakan satu per satu di sesi ini/berikutnya.**

## 33. Standarisasi Menu Revenue/Value (M3/M4/M5) ke pola Growth/Retention (2026-08-25)

Instruksi user: "lanjut kerjakan MENU REVENUE, STANDARTKAN SESUAI LAYOUT 2
MENU SEBELUMNYA JANGAN ADA YANG TERLEWAT SAMA SEKALI" — menu ketiga
("Revenue", key internal `value`, `/value`) berisi M3 Average Revenue, M4
Average Gross Profit, M5 High Margin Penetration — SAMA SEKALI belum
tersentuh standarisasi yang sudah diterapkan ke Growth (M1/M2/M7) dan
Retention (M6/M8/M9/M10) sepanjang sesi ini. Audit lengkap (baca file
langsung, bukan tebakan):

### Temuan `Value/index.tsx` (halaman)
- Filter MASIH pola LAMA: 1 `DatePicker` bulanan polos, TIDAK ada
  `usePeriodTypeFilter`, TIDAK ada panel Filter Lanjutan
  (Cabang/Divisi/Granularitas/Exclude Intercompany), TIDAK ada "Apply date
  cutoff" — beda total dari Growth/Retention.
- `useCustomerMetrics` dipanggil TANPA `period_type`/`apply_date_cutoff`
  sama sekali.

### Temuan `M3Revenue.tsx`
- TIDAK ada `periodType` prop — hardcode bulanan total.
- TIDAK ada KpiHeader (current vs YoY).
- TIDAK ada 3 kartu ringkasan (pola M1/M6/M8/M9/M10).
- TIDAK ada Top 5 sidebar + tombol "Cek Detail di Laporan".
- Dialog title masih `{ date: drillDate }` mentah (bug class SAMA yang
  diperbaiki di M6 — title harus nama entitas saja, periode di subtitle).
- `onBarClick` pakai `resolvePeriodEnd` (helper lama, cuma paham bulanan),
  bukan `getPeriodDateRange`+`clampPeriodEndToToday`.
- `xAxisFormatter={formatMonthLabel}` hardcode, bukan
  `formatPeriodLabelShort` granularitas-aware.
- Tooltip custom SUDAH ada (`M3Tooltip`) tapi styling manual (Box+Divider),
  BUKAN `ChartTooltipCard` shared component — inkonsistensi kecil, bukan
  prioritas utama.
- Backend `fetchRevenueBreakdown` TIDAK terima `dateFrom` sama sekali
  (schema `revenueBreakdownQuerySchema` juga tidak punya field itu) — beda
  dari M4/M7 yang sudah py.

### Temuan `M4GrossProfit.tsx`
- Sama persis M3 (tidak ada periodType/KpiHeader/kartu/Top5/tombol laporan,
  dialog title mentah, onBarClick lama, xAxisFormatter hardcode,
  M4Tooltip custom manual bukan ChartTooltipCard).
- BEDA dari M3: backend `fetchGpBreakdown` SUDAH terima `dateFrom` end-to-
  end (schema+service+repository, task026 §8e) — cuma FRONTEND yang belum
  pernah mengirimnya (selalu `undefined`, jatuh ke fallback activeMonths
  lama). Quick win — tinggal sambung dari sisi FE.

### Temuan `M5HighMargin.tsx`
- BEDA ARSITEKTUR dari M3/M4/M6/M8/M9/M10: donut chart SNAPSHOT 1 titik
  (`hm: {bought_pct, not_bought_pct}` dari `data.high_margin_current`),
  BUKAN trend 12 titik — jadi TIDAK BUTUH `periodType` label chart/axis
  spt yang lain, tapi TETAP butuh:
  - YoY comparison (fetch snapshot periode sama setahun lalu, pola sama
    M1/M2 kartu, BUKAN KpiHeader trend-based — perlu dipikirkan bentuknya,
    mis. badge delta di sebelah center donut).
  - Dialog title masih mentah (bug class sama).
  - `onChartClick` pakai `resolvePeriodEnd` (lama).
  - Backend `fetchHmBreakdown` TIDAK terima `dateFrom` sama sekali (sama
    kasus M3).
- TIDAK ada 3 kartu ringkasan/Top 5/tombol laporan (sama kasus M3/M4) —
  utk M5 relevansi "Top 5" perlu dipikirkan (Top 5 pembeli HM? sudah ada
  di kolom tabel dialog, tinggal dipindah jadi sidebar spt KPI lain).

### Yang SUDAH benar (tidak perlu disentuh)
- `getCustomerMetrics` (trend M3-M7 shared, `metrics.service.ts`) SUDAH
  granularitas-aware (`period_type`/`apply_date_cutoff`) sejak task029
  §30.9 — PR #134/#135 sudah live. Trend M3/M4 otomatis granularitas-aware
  begitu `Value/index.tsx` mengirim `period_type`.
- `cteEstablishedCustomers`/definisi Existing SSOT §30.10 sudah dipakai
  trend M3-M7 (migrasi lama, task029 §30.10) — TIDAK perlu diulang, cuma
  breakdown drilldown M3/M5 yang belum py `dateFrom`.

### Rencana eksekusi (urutan, 1 per satu, verifikasi DB tiap langkah)
1. **Backend M3** (SELESAI): `fetchRevenueBreakdown` + `revenueBreakdownQuerySchema`
   + `getRevenueBreakdown` — tambah `dateFrom`, pola SAMA PERSIS M4/M6.
2. **Backend M5** (SELESAI): `fetchHmBreakdown` + `hmBreakdownQuerySchema` +
   `getHmBreakdown` — tambah `dateFrom`, pola sama.
3. **`Value/index.tsx`** (SELESAI): rebuild filter total — `usePeriodTypeFilter`
   (draft+applied staged pola Growth/Retention), panel Filter Lanjutan,
   "Apply date cutoff", kirim `period_type`/`apply_date_cutoff` ke
   `useCustomerMetrics`.
4. **`M3Revenue.tsx`** (SELESAI): periodType prop, KpiHeader (current vs YoY trend
   terakhir), 3 kartu ringkasan, Top 5 + tombol "Cek Detail di Laporan",
   dialog title→subtitle (formatPeriodRangeSub), onBarClick
   granularitas-aware, xAxisFormatter→formatPeriodLabelShort, sambung
   `date_from` breakdown.
5. **`M4GrossProfit.tsx`** (SELESAI): SAMA PERSIS poin 4 (backend sudah siap,
   tinggal FE).
6. **`M5HighMargin.tsx`** (SELESAI): dialog title→subtitle, onChartClick
   granularitas-aware (walau snapshot, `date_from` tetap relevan utk
   drilldown biar konsisten SSOT §30.10), YoY comparison (bentuk
   disesuaikan krn bukan trend, gated on `yoyHm` truthy biar tidak
   menampilkan yoy=0 palsu di halaman workbench CustomerMetrics yang
   tidak fetch YoY), sambung `date_from` breakdown.

   Sekalian, saat ekstraksi kolom tabel utk poin 7: ditemukan
   `tierChipColor`/`tierLabel` duplikat IDENTIK antara M3Revenue.tsx dan
   M4GrossProfit.tsx (pelanggaran "Centralize UI" yang sudah ada sebelum
   task ini) — dipindah bareng `useRevenueColumns`/`useGpColumns`/
   `useHmColumns` ke file baru `CustomerMetrics/valueHelpers.tsx`, dipakai
   M3/M4/M5 DAN Report/Revenue (poin 7), 1 sumber bukan 3.
7. **Halaman Laporan baru** `Report/Revenue/index.tsx` (SELESAI — route
   `/report/revenue`, bukan `/report/value` seperti draf awal rencana ini;
   `nav.groups.revenue`, permission `expansion:view` sama seperti
   `Value/index.tsx` krn 1 sumber data `useCustomerMetrics`) — 3 tab
   Revenue/GP/HM (search+sort+`ResponsiveListView`, kolom dari
   `valueHelpers.tsx`), pola filter (quick+advanced, `?tab=` deep-link)
   sama persis Report/Growth. 3 tombol "Cek Detail di Laporan" M3/M4/M5
   sudah diarahkan ke `/report/revenue?tab=revenue|gp|hm`. Tab label baru
   `metrics.avgRevenueShort`/`avgGrossProfitShort`/`highMarginShort`
   ditambahkan ke `metrics.json` (id+en), pola sama `crossSellingShort`/
   `expansionShort` yang sudah ada.
8. Audit ulang i18n (SELESAI): `formatPeriodLabel` dkk sudah granularitas+
   i18n-aware dari perbaikan sesi ini; M3/M4/M5 dikonfirmasi pakai fungsi
   yang sama (formatPeriodRangeSub/formatPeriodLabelShort), bukan
   `formatMonthLabel`/`resolvePeriodEnd` lama. Key JSON mati (`chartTitle`/
   `chartSubtitle` M3/M4/M5, sudah tidak dipakai sejak title pindah ke
   SectionLabel) dibiarkan di file JSON (tidak dihapus) — konsisten dgn
   precedent M1/M2/M7 yang juga menyisakan key lama tak terpakai daripada
   berisiko menghapus key yang ternyata masih dirujuk tempat lain.

**Status: SELESAI (2026-08-25). Verifikasi: `tsc --noEmit` bersih,
`eslint` bersih (0 error), `vite build` sukses (chunk baru
`Revenue-*.js`, `valueHelpers-*.js` ter-generate). Belum di-commit/push —
menunggu instruksi eksplisit.**

## 34. Generalisasi populasi "Existing Aktif" (§30.10) dari M1 ke M2-M7 (2026-08-25)

### Kronologi temuan

Berawal dari pertanyaan eksplorasi user soal M5 tren + "2 bar keseluruhan
produk terjual vs high margin" (dibatalkan, scope-nya berubah arah), lalu
pertanyaan "apakah new customer sudah termasuk di M1-M10" — audit ke SQL
backend (bukan tebakan) menemukan SEMUA M1-M10 basisnya "existing", TAPI
ternyata M1 dan M3-M7 punya DUA DEFINISI "existing" YANG BERBEDA:

- **M1/M2** (`fetchCrossSellingTrend`, m1.repository.ts): existing = first
  invoice SEBELUM awal periode **DAN** py minimal 1 transaksi DI DALAM
  periode itu ("aktif-per-periode") — ini definisi FINAL yang sudah
  diputuskan user 2026-08-20 (§30.10, kutipan persis: *"Customer aktif
  berarti yang ada transaksi >= 1 di periode filter"*), diimplementasi
  sbg **pilot M1 saja**, dgn catatan eksplisit di dokumen saat itu:
  *"M3-M10 masih pakai cteEstablishedCustomers/activeMonths... memang
  BEDA definisi dan sengaja tidak diubah scope-nya di sini"* — status
  *"BELUM diputuskan mau di-generalisasi ke M2-M10 atau tetap M1-only"*.
  Generalisasi itu TIDAK PERNAH dilanjutkan sampai sekarang.
- **M3-M7** (`fetchCustomerMetricsTrend`, m3m7.repository.ts, CTE
  `existing` baris 155-194): first invoice sebelum awal periode SAJA,
  TANPA syarat aktif — EXISTS ke invoices `<=` akhir bucket TANPA lower
  bound, jadi TERMASUK customer yang cuma transaksi 1x bertahun-tahun
  lalu lalu dormant selamanya ("existing kumulatif"). ~93% populasi ini
  ternyata tidak genuinely aktif bulan yang diukur (lihat audit di
  bawah).

### Audit dampak nyata (verifikasi DB, bukan estimasi)

2 riset via query langsung ke Postgres lokal (33.041 customers, 246rb+
invoices, semua entitas, Sep 2025-Agu 2026):

1. Basis "existing+new customer" (M1/M2/M5/M6 — dibahas duluan, tapi
   TIDAK jadi scope eksekusi, cuma riset): dilusi signifikan konsisten
   di M1 (-4.3pp) & M2 (-0.13 kategori), nyaris nol di M5, JUSTRU NAIK
   di M6 (+0.4pp) — kejanggalan M6 inilah yang membongkar gap definisi
   di atas.
2. Basis "existing kumulatif vs existing aktif-periode" (M3-M7, riset
   utama) — laporan lengkap dipublikasikan sbg artifact terpisah
   ("Distorsi Populasi Existing"). Ringkasan: rata-rata cuma **7,2%**
   populasi existing M3-M7 genuinely aktif per bulan. M3/M4 (Avg
   Revenue/GP) understated rata-rata **15,8×** (membesar dari 10× ke
   38× sepanjang 12 bulan, karena populasi kumulatif terus menumpuk
   tanpa pernah "keluar"). M6 (Repeat Order Rate) understated **+23,1pp**
   (<3% sekarang vs ~20-30% seharusnya). M7 (Expansion Rate) selisih
   terbesar **+67,3pp**, TAPI numerator-nya bercampur "genuinely
   ekspansi" dgn "reaktivasi dari nol" — butuh dekomposisi lanjutan
   sebelum jadi angka resmi (dicatat sbg catatan, BUKAN diperbaiki di
   task ini).

### Keputusan scope (dibahas eksplisit dgn user sebelum eksekusi)

Sempat dipertimbangkan refactor M3-M7 jadi 5 file/query terpisah demi
keterbacaan — DIBENCHMARK dulu (bukan asumsi): split jadi 5 query DB
independen = **3,0× lebih lambat** (2.713ms → 8.204ms, replikasi query
persis + EXPLAIN ANALYZE, DB lokal sama). **Keputusan: TIDAK di-split**,
fokus balik ke generalisasi §30.10 (instruksi user: *"kita fokus ke data
pilot M1 tadi yang belum diterapkan ke KPI lain"*).

**Scope IN**:
- `fetchCustomerMetricsTrend` (m3m7.repository.ts) — field
  `existing_customers` DAN 5 formula turunannya (`avg_revenue`,
  `avg_gross_profit`, `high_margin_ratio`, `repeat_order_rate`,
  `expansion_rate`) ganti denominator dari `COUNT(DISTINCT e.id)`
  (kumulatif) ke populasi aktif-per-bucket — field `active_existing_count`
  SUDAH DIHITUNG di query yang sama (CTE `monthly_extras`, dari
  `active_inv_agg`), TIDAK perlu CTE/join baru, TIDAK ada biaya query
  tambahan (numerator SEMUA formula ini SUDAH inheren terbatas ke
  customer yang aktif di bucket, cuma denominator-nya yang salah acu).
- M2 otomatis ikut (share fungsi M1, sudah benar sejak §30.10).

**Scope OUT (sengaja tidak disentuh)**:
- Fungsi drill-down (`fetchRevenueBreakdown`/`fetchGpBreakdown`/
  `fetchHmBreakdown`/`fetchRorBreakdown`/`fetchExpansionBreakdown`) —
  field `total_existing` di sana SENGAJA memakai cohort `established_
  customers` TETAP (fixed, tidak ikut window filter) per keputusan
  TERPISAH & LEBIH DULU ("template standar KPI4", 2026-08-10,
  [[feedback_kpi4_card_template_standard]]: *"kartu Total HARUS fixed
  cohort... BUKAN rata-rata snapshot bulanan"*) — beda pertanyaan dari
  §30.10, TIDAK diubah di sini supaya tidak bentrok dgn keputusan itu.
  §32.1 (gap `dateFrom` di drill-down) juga topik terpisah, tidak
  tumpang tindih dgn task ini.
- M8/M9/M10 — dormant/reactivation SECARA STRUKTUR butuh precondition
  "PERNAH aktif LALU berhenti", bukan "aktif SEKARANG" — generalisasi
  §30.10 apa adanya tidak masuk akal utk metrik ini (customer dormant
  BY DEFINITION tidak aktif periode ini). Perlu analisis terpisah,
  bukan bagian task ini.

### Rencana eksekusi (ASLI, direvisi — lihat §34.1 di bawah utk M7)
1. Ubah `m3m7.repository.ts` `fetchCustomerMetricsTrend`: ganti
   denominator `existing_customers`/`avg_revenue`/`avg_gross_profit`/
   `high_margin_ratio`/`repeat_order_rate`/`expansion_rate` dari
   `COUNT(DISTINCT e.id)` ke count aktif-per-bucket.
2. Verifikasi query langsung ke DB (12 bulan, semua entitas) — angka
   HARUS cocok dgn kolom "Existing Aktif"/nilai "Aktif" di audit artifact
   di atas (yang sudah dihitung independen lewat replikasi manual).
3. Audit copy i18n (tooltip `tooltipInfo` M3/M4/M5/M6/M7) — pastikan
   teks tidak lagi menyiratkan populasi "semua yang pernah beli"
   (semantik lama), sesuaikan ke "yang aktif periode ini" kalau perlu.
4. `tsc --noEmit` + `eslint` + `vite build` bersih (frontend TIDAK perlu
   perubahan kode — field `existing_customers` namanya tetap sama,
   cuma nilainya berubah jadi lebih kecil/akurat).

**KOREKSI PENTING (2026-08-25, ditemukan lewat dialog panjang dgn user
sebelum eksekusi M7)**: rencana poin 1 di atas (samakan `expansion_rate`
M7 ke denominator `active_existing_count` sama seperti M3/M4/M6) TERNYATA
SALAH — lihat §34.1 di bawah, M7 butuh populasi BEDA (existing yang
"belum lewat ambang dormant", bukan "aktif periode ini persis"), krn
struktur breakdown 4-arahnya sendiri (kategori "Tidak Aktif") butuh
customer yang TIDAK bertransaksi tapi masih relevan dibandingkan.

**Status per KPI (2026-08-25, akhir sesi ini):**
- **M1/M2**: SELESAI (populasi diubah TOTAL, bukan cuma denominator —
  lihat §34.0 di bawah, ini beda kasus dari M3-M7).
- **M7**: SELESAI — lihat §34.1 (desain populasi baru, bukan sekadar
  swap ke `active_existing_count`).
- **M3/M4/M6**: BELUM dieksekusi — tooltip `tooltipInfo` sudah diupdate
  duluan (mendeskripsikan definisi TARGET "existing aktif periode ini",
  bukan behavior SEKARANG yang masih kumulatif) — **copy sudah mendahului
  implementasi**, backend-nya MASIH pakai `COUNT(DISTINCT e.id)`
  kumulatif seperti sebelumnya. Perlu dieksekusi supaya kode menyusul
  tooltip-nya, JANGAN dibiarkan lama (gap copy-vs-implementasi
  menyesatkan kalau dibiarkan).
- **M5**: BELUM diputuskan — dokumen SSOT ambigu ("customer aktif" di
  kalimat pembuka vs "customer existing" di definisi rinci), user belum
  menjawab klarifikasi mana yang dipakai.

### 34.0 M1/M2 — eksekusi (SELESAI, 2026-08-25)

Beda dari M3-M7 (yang cuma soal DENOMINATOR salah), M1/M2 ternyata punya
gerbang EXTRA yang seharusnya TIDAK ADA sama sekali — pilot §30.10
(2026-08-20) keliru mengklasifikasikan M1/M2 sbg "Existing" (first
invoice sebelum periode), padahal dokumen SSOT resmi (di-review user
2026-08-25, "DEFINISI_OPERASIONAL_CUSTOMER_LOYAL_DASHBOARD.docx")
eksplisit: populasi M1 ("Cross Sell Ratio") & M2 ("Avg Category")
adalah **"Customer Aktif"** murni (≥1 transaksi periode ini, TANPA
syarat riwayat) — beda total dari M3/M4/M6/M7 yang MEMANG "Existing
Customer" (py riwayat + masih beli).

**Perubahan** (`m1.repository.ts`):
- `CS_INV_CTE` (dipakai `fetchCrossSellingKPI`/`fetchCrossSellingDetail`/
  `fetchCrossSellingHeatmap`) — CTE `cteExistingCustomersByPeriod`
  DIHAPUS total dari WITH clause, JOIN `existing_customers ec` dihapus
  dari CTE `inv`. Import `cteExistingCustomersByPeriod`/
  `cteFirstInvoiceDate` dihapus (sudah tidak dipakai).
- `fetchCrossSellingTrend` — JOIN `first_invoice_date fid ON fid.first_
  date < bk.ps` dihapus dari CTE `per_bucket`. CTE `first_invoice_date`
  (`cteFirstInvoiceDate(p)`) dihapus dari WITH clause (tidak dipakai lagi
  di fungsi ini).

**Verifikasi DB (12 bulan, semua entitas, cocok persis dgn 2 sumber
independen — angka lama dari riset audit sebelumnya DAN replikasi query
manual baru)**:

| Bulan | Populasi Lama (existing-gated) | Populasi Baru (customer aktif) | M1 Rate Lama→Baru | M2 Avg Lama→Baru |
|---|---|---|---|---|
| Sep 2025 | 1.247 | 2.798 | 34,2%→29,0% | 1,72→1,54 |
| Okt 2025 | 1.331 | 3.815 | 33,5%→23,2% | 1,72→1,43 |
| Nov 2025 | 1.518 | 3.877 | 29,1%→21,7% | 1,63→1,41 |
| Des 2025 | 1.787 | 4.195 | 27,8%→22,1% | 1,57→1,40 |
| Jan 2026 | 1.989 | 4.248 | 28,1%→23,8% | 1,55→1,42 |
| Feb 2026 | 1.993 | 3.893 | 27,7%→24,0% | 1,54→1,43 |
| Mar 2026 | 1.752 | 3.236 | 24,5%→21,2% | 1,48→1,38 |
| Apr 2026 | 2.153 | 4.067 | 25,7%→22,6% | 1,49→1,40 |
| Mei 2026 | 1.469 | 2.590 | 26,9%→25,3% | 1,60→1,51 |
| Jun 2026 | 1.561 | 2.589 | 30,4%→26,9% | 1,65→1,54 |
| Jul 2026 | 1.674 | 2.869 | 29,8%→26,7% | 1,61→1,52 |
| Agu 2026* | 855 | 1.218 | 28,9%→28,7% | 1,60→1,58 |

*Agustus cuma 17 hari (MAX(invoice_date) di DB), bukan bulan penuh.

Populasi hampir 2× lebih besar di semua bulan (customer baru sekarang
ikut terhitung), rate/rata-rata turun sedikit di semua titik (customer
baru belum tentu langsung cross-sell di transaksi pertama — masuk akal,
bukan bug). `tsc --noEmit` bersih (backend+frontend, frontend TIDAK
perlu perubahan kode). Sudah dilaporkan ke user dlm bentuk tabel di
percakapan, TIDAK diulang jadi artifact terpisah (user cukup dgn tabel
teks).

### 34.1 M7 — desain ulang populasi (SELESAI, 2026-08-25)

**Kenapa BUKAN sekadar swap denominator seperti M3/M4/M6 (dikoreksi via
dialog Socratic dgn user sebelum coding, bukan diasumsikan)**:

M7 punya breakdown 4-arah (Naik/Flat/Turun/Tidak Aktif) yang HARUS sum
ke 100% dari 1 populasi yang sama. Kategori "Tidak Aktif" (`cur=prev=0`)
SECARA DEFINISI butuh customer yang **tidak** bertransaksi periode ini —
kalau denominator dipersempit ke "aktif periode ini" (pola M3/M4/M6),
kategori ini otomatis SELALU 0%, breakdown-nya rusak total secara
matematis. Ada juga catatan desain terdokumentasi sebelumnya
(`shared/metrics_docs.md`, 2026-08-21) yang eksplisit MEMBELA populasi
kumulatif: *"'Flat' gabungan lama tampil ~90,2%, MENYEMBUNYIKAN fakta
bahwa hampir semuanya sebenarnya 'tidak ada transaksi'... tapi itu bukan
'stabil'"* — tujuannya supaya "Tidak Aktif" TERLIHAT jelas, bukan
disembunyikan.

**Resolusi (dicapai lewat tanya-jawab bergiliran dgn user, bukan
diputuskan sepihak)**:
- Customer baru (first invoice DI DALAM periode ini) — TETAP dikeluarkan
  (gerbang "Existing" tidak berubah, sudah benar sejak awal, first invoice
  = 0 pembanding "prev" mustahil bermakna).
- Customer yang SUDAH RESMI dormant (lewat ambang, ambang SAMA PERSIS M8
  per kategori bisnis divisi, `dormantThresholdCaseSql`) — DIKELUARKAN
  dari perhitungan sama sekali (ranah M8, bukan lagi "expansion"). Kutipan
  user: *"perlihatkan tidak papa, tapi tidak dimasukkan ke perhitungan"*.
- Customer yang BARU absen tapi BELUM lewat ambang — TETAP masuk hitungan,
  biasanya jatuh ke "Tidak Aktif"/"Turun" — sinyal dini yang actionable,
  BUKAN dicampur dgn yang sudah lama mati. Ini yang membuat kategori
  "Tidak Aktif" tetap terlihat (memenuhi rasionale metrics_docs.md) TAPI
  jadi jauh lebih bermakna (bukan didominasi >80% akun mati bertahun-tahun).

**Perubahan** (`m3m7.repository.ts`):
- `fetchCustomerMetricsTrend`: CTE baru `cust_dormant_threshold`
  (reuse `dormantThresholdCaseSql`+`cteCustDivision`, SAMA PERSIS pola
  M8), `last_inv_unbounded` (scan invoice TANPA batas bawah tanggal —
  beda dari `raw_inv` yg dibatasi window trailing-buckets, dormant butuh
  tahu transaksi TERAKHIR sungguhan), `last_inv_per_bucket`,
  `existing_not_dormant`. `expansion_rate`/`flat_rate`/`inactive_rate`/
  `down_rate` + 4 raw count (`up_count` dst) ganti basis dari `e.id`
  (existing kumulatif) ke `nd.customer_id` (existing_not_dormant) —
  numerator DAN denominator sama-sama diganti (CASE WHEN return
  `nd.customer_id`, NULL kalau customer sudah dormant → otomatis
  ter-exclude dari COUNT DISTINCT). Field baru `existing_not_dormant_
  count` ditambahkan ke `TrendRow`/`CustomerMetricsTrendPoint`
  (backend+frontend).
- `fetchExpansionBreakdown` (drilldown klik-bar) — SAMA PERSIS
  ditambahkan gerbang `established_not_dormant` (evaluasi "as of"
  `filterDate`, bukan per-bucket krn ini snapshot 1 titik), `combined`
  CTE JOIN (bukan LEFT JOIN) ke situ. Sengaja disamakan SEKALIGUS dgn
  trend (bukan ditunda) — mencegah bug class §30.17 (chart trend vs
  dialog drilldown beda populasi/angka utk titik yg sama).
- Frontend: `M7ExpansionGrowth.tsx` kartu "Total Existing" ganti dari
  `current?.existing_customers` (kumulatif, TIDAK BERUBAH oleh fix ini)
  ke `current?.existing_not_dormant_count` (field baru) — supaya kartu
  ringkasan konsisten dgn pembagi breakdown 4-arah di bawahnya.
- i18n: `customerMetrics.m7.tooltipInfo` (id+en) — rumus + penjelasan
  populasi baru. `customerMetrics.m7.dialogTotalExisting` (id+en) — teks
  lama "Total Established (Active+Existing)" SUDAH USANG (menjelaskan
  populasi lama), diganti "Total Existing Belum Dormant"/"Total Existing
  Not-Yet-Dormant".

**Verifikasi (Mei 2026, bulan penuh, semua entitas)**:

| Metode | Populasi | Up | Flat | Inactive | Down | Sum |
|---|---|---|---|---|---|---|
| Lama (existing kumulatif) | 29.287 | 3,7% | 0,3% | 83,5% | 12,4% | 99,9% |
| Baru (existing not-dormant) | 14.208 | 7,7% | 0,7% | 66,0% | 25,6% | 100,0% |

Populasi baru (14.208) tepat di antara "existing kumulatif" (29.287) dan
"aktif periode ini murni" (1.469, dari audit §34 sebelumnya) — sesuai
desain. "Inactive" turun dari 83,5%→66,0% (masih substansial tapi bukan
lagi didominasi akun mati bertahun-tahun), "Down" naik 12,4%→25,6%
(sinyal declining yg sekarang tidak lagi tenggelam di rata-rata
kumulatif). Sum 4-arah tetap ~100% di kedua basis (matematis konsisten).

**Konsistensi trend vs drilldown** (diverifikasi via script `bun run`
langsung manggil `getCustomerMetrics`+`getExpansionBreakdown`, BUKAN
cuma query manual) — titik Mei 2026: `existing_not_dormant_count` (trend)
= `total_existing` (drilldown) = **14.208** persis, `up_count`/
`flat_count`/`inactive_count`/`down_count` SAMA PERSIS di kedua sumber
(1.087/97/9.384/3.640) — tidak ada gap §30.17-class.

`tsc --noEmit` bersih (backend+frontend), `eslint` bersih (frontend, 0
error), `vite build` sukses. Belum di-commit/push.

### 34.2 M7 drilldown — tambah info "Total Customer Active" (2026-08-25)

Susulan langsung setelah §34.1 (instruksi user: *"Tambahkan info
drildown total customer aCTIVE"*) — dialog drilldown M7 (klik bar chart)
sebelumnya cuma tampilkan Up Count/Total Existing/Up Rate, tidak ada
info berapa customer yang GENUINELY bertransaksi periode ini (`cur_
revenue > 0`, TANPA syarat naik/turun/flat vs periode sebelumnya — beda
dari `up_count` yang mensyaratkan `cur > prev`).

**Perubahan**: `fetchExpansionBreakdown` (`m3m7.repository.ts`) tambah
field `active_count` — `COUNT(*) FILTER (WHERE cur_revenue > 0) OVER
()`. TIDAK perlu gerbang dormant tambahan (siapa pun `cur_revenue > 0`
otomatis "belum lewat ambang dormant", transaksi barusan — subset
`established_not_dormant` yang sudah ada). Field baru diteruskan lewat
`ExpansionBreakdownData` (backend+frontend), ditambahkan sbg baris info
baru di dialog `M7ExpansionGrowth.tsx` DAN `M7Expansion.tsx` (workbench
lama, disamakan supaya konsisten) — key i18n `dialogActiveCount`
("Total Customer Active"/"Total Active Customer").

Komentar usang di return object (`fetchExpansionBreakdown`) yang masih
mengutip rasionale `metrics_docs.md` lama ("Denominator = semua
existing") sekalian diperbaiki jadi merujuk `established_not_dormant`
(§34.1), bukan "semua existing" lagi.

**Verifikasi (Mei 2026, bulan penuh)**: `active_count` = **1.469** —
cocok PERSIS dgn kolom "Existing Aktif" dari audit populasi §34
sebelumnya (dihitung independen). `active_count (1.469) ≥ up_count
(1.087) + flat_count (97) = 1.184` — benar (selisih 285 dari customer
"Turun" yang `cur_revenue` masih > 0, cuma lebih kecil dari periode
sebelumnya).

`tsc --noEmit` bersih (backend+frontend), `eslint` bersih, `vite build`
sukses. Belum di-commit/push.

### 34.3 M3/M4/M5/M6 — eksekusi rencana asli (SELESAI, 2026-08-25)

Kasus JAUH lebih sederhana dari M7 (§34.1) — tidak ada kendala breakdown
4-arah yang butuh populasi "tidak aktif" tetap terlihat, jadi rencana
ASLI (swap denominator murni) yang dilaksanakan apa adanya, TANPA
CTE/JOIN baru.

**M5 sempat tertahan** (ambiguitas dokumen SSOT: kalimat pembuka bilang
"customer AKTIF", definisi rinci bilang "customer EXISTING") —
DIPUTUSKAN via AskUserQuestion: **"Existing"** (Recommended, konsisten
M3/M4/M6/M7 — kutipan definisi rinci dokumen: *"Customer Existing yang
Membeli High Margin Product"*).

**Perubahan** (`fetchCustomerMetricsTrend`, `m3m7.repository.ts`) — 5
tempat, `COUNT(DISTINCT e.id)` (existing kumulatif, TERMASUK dormant) →
`COUNT(DISTINCT cur.customer_id)` (alias `cur` = `active_inv_agg`, SUDAH
di-JOIN sebelumnya, HANYA berisi customer dgn invoice DI DALAM bucket
ini — reuse murni, 0 biaya query tambahan):
- `existing_customers` (field top-level, dipakai kartu "Total Existing
  Customer" M3/M4/M5/M6 — SEKARANG numerik identik dgn `active_existing_
  count` yang sudah ada, redundan tapi tidak masalah, keduanya tetap
  diekspos).
- `avg_revenue` (M3), `avg_gross_profit` (M4) — denominator.
- `high_margin_ratio` (M5) — numerator TETAP dari `hia`/hm_inv_agg
  (customer yang beli HM), cuma denominator yang diganti.
- `repeat_order_rate` (M6) — denominator.

CTE turunan lain (`monthly_extras`/`top_contrib`/`gp_median_per_month`/
`gp_tier_breakdown`/`top_contrib_gp`) DICEK, TERNYATA SUDAH BENAR sejak
awal (semua sourced langsung dari `active_inv_agg`, bukan dari `existing`
kumulatif) — tidak ada perubahan di situ, bug HANYA ada di 5 titik SELECT
akhir.

**Frontend TIDAK ada perubahan kode** (sesuai rencana awal) — nama field
`existing_customers` tidak berubah, cuma nilainya, jadi UI M3/M4/M5/M6
otomatis menampilkan angka baru yang benar.

**Verifikasi** (fungsi asli `getCustomerMetrics` dipanggil langsung via
`bun run`, bukan replikasi manual — Mei 2026, semua entitas): SEMUA
angka cocok PERSIS dgn kolom "Aktif" di tabel audit populasi §34
(dihitung independen SEBELUM kode ini diubah sama sekali):

| Field | Hasil fungsi (sesudah fix) | Audit "Aktif" (sebelum fix, independen) |
|---|---|---|
| `existing_customers` | 1.469 | 1.469 |
| `avg_revenue` (M3) | Rp7.132.141 | Rp7.132.141 |
| `avg_gross_profit` (M4) | Rp1.414.161 | Rp1.414.161 |
| `high_margin_ratio` (M5) | 3,4% | 3,40% |
| `repeat_order_rate` (M6) | 23,1% | 23,1% |

`tsc --noEmit` bersih (backend+frontend). Backend tidak punya skrip
lint (beda dari frontend), `tsc` cukup. `vite build` frontend bersih
(tidak ada perubahan kode, murni smoke test). Belum di-commit/push.

**Status §34 keseluruhan: SELESAI semua (M1/M2 §34.0, M3/M4/M5/M6 §34.3,
M7 §34.1+§34.2). M8/M9/M10 sengaja TIDAK disentuh (di luar scope, sudah
sesuai dokumen SSOT).**

## 35. Filter "Pareto" (§32.3, lanjutan) — wiring backend M1-M10 (2026-08-25)

### Temuan cakupan (lebih luas dari catatan §32.3 semula)

§32.3 sebelumnya cuma mencatat "Retention page" — ditelusuri ulang,
ternyata pola dead-UI yang SAMA PERSIS ada di **6 halaman sekaligus**:
`Growth/index.tsx`, `Value/index.tsx`, `Retention/index.tsx`,
`Report/Growth/index.tsx`, `Report/Retention/index.tsx`, `Report/
Revenue/index.tsx` — semua punya `const [, setOnlyPareto] =
useState(false)` (value DIBUANG, cuma setter dipakai). Komentar di
Growth/index.tsx eksplisit: *"baru UI, endpoint M1/M2/M7 belum menerima
parameter... tinggal diaktifkan begitu backend menerima parameter
ini"* — SENGAJA dibangun sbg scaffold dari awal (2026-08-20), menunggu
backend menyusul. Cakupan sebenarnya: **SEMUA M1-M10**, bukan cuma
M6/M8/M9/M10 di Retention.

### Definisi "Pareto" (diverifikasi ke kode, bukan tebakan)

BUKAN 80/20 rule dihitung ulang tiap query — tabel `pareto_customers`
(task016): flag MANUAL oleh admin (bukan auto-detect), `company_id` +
`customer_id` + `effective_from`/`effective_until` (window aktif, until
NULL = masih aktif). Sudah fungsional di fitur Analisis (task016) —
`analisis.repository.ts` `only_pareto` = `INNER JOIN pareto_customers`
+ syarat `effective_from <= CURRENT_DATE AND (effective_until IS NULL
OR effective_until >= CURRENT_DATE)`.

**Keputusan desain**: evaluasi Pareto pakai `p.filterDate` (SegmentParams,
bukan `CURRENT_DATE` mentah spt Analisis) — konsisten dgn semua toggle
lain di filter bar KPI (exclude_intercompany dst) yang statis/uniform
di semua 12 titik trend, BUKAN per-bucket berubah — toggle checkbox 1x
di UI, bukan nuansa "Pareto per titik waktu".

### Audit cakupan `exclude_intercompany` (pola yang ditiru)

Dicek ke SEMUA 13 fungsi backend M1-M10 (trend + drilldown) — **100%
ter-cover**, tidak ada gap (`fetchCrossSellingKPI`/`Detail`/`Heatmap`
sempat kelihatan "tidak ada" via grep naif krn exclude_intercompany-nya
ada di `CS_INV_CTE`, helper BERSAMA yang mereka panggil, bukan
tertulis eksplisit di badan fungsi masing-masing — re-cek manual
konfirmasi SEMUA 4 fungsi M1 sudah benar). Pola `build*Raw(...)` di
`utils/scope.ts` (return `sql\`true\`` kalau toggle mati, langsung
di-embed `AND (${cond})` tanpa perlu cek undefined) inilah yang ditiru
PERSIS untuk Pareto — `buildOnlyParetoRaw`.

### Rencana eksekusi

**Backend:**
1. `utils/scope.ts` — `buildOnlyParetoRaw(customerExpr, companyExpr,
   filterDate, onlyPareto)` — mirror `buildExcludeIntercompanyRaw`,
   `EXISTS (SELECT 1 FROM pareto_customers pc WHERE pc.customer_id =
   ${customerExpr} AND pc.company_id = ${companyExpr} AND
   pc.effective_from <= ${filterDate}::date AND (pc.effective_until IS
   NULL OR pc.effective_until >= ${filterDate}::date))`.
2. `customers/helper/segment.helper.ts` `SegmentParams` — tambah
   `onlyPareto?: boolean`.
3. `metrics.service.ts` `resolveSegmentParams` — tambah parameter
   `onlyPareto?: boolean` (posisi terakhir, ikut pola `excludeIntercompany`
   yg juga di posisi terakhir), teruskan ke `SegmentParams`. 11 titik
   panggilan di file yang sama ikut diupdate kirim `params.only_pareto`.
4. `metrics.schema.ts` — `onlyParetoField` baru (mirror PERSIS
   `excludeIntercompanyField`, `z.enum(['true','false']).optional()
   .transform(v => v === 'true')` — BUKAN `z.coerce.boolean()`, standing
   bug class sudah didokumentasikan di komentar file yang sama). Tambah
   `only_pareto: onlyParetoField` ke 9 schema: `crossSellingQuerySchema`,
   `customerMetricsQuerySchema`, `revenueBreakdownQuerySchema`,
   `expansionBreakdownQuerySchema`, `gpBreakdownQuerySchema`,
   `hmBreakdownQuerySchema`, `rorBreakdownQuerySchema`,
   `dormantCustomerQuerySchema`, `dormantValueHistoryQuerySchema`.
5. 13 fungsi repository (m1/m3m7/m4/m5/m6/m8m10) — tambah
   `onlyParetoCond` di tempat yang SAMA PERSIS dgn `excludeIntercompanyCond`
   sudah ada, pakai alias customer_id/company_id yang SUDAH tersedia
   lokal di WHERE clause masing-masing (TIDAK perlu JOIN baru).

**Frontend:**
6. Hooks (`useMetrics.ts`) — tambah `only_pareto?: boolean` ke param
   type 9 hook yang relevan (`useCrossSelling`, `useCustomerMetrics`,
   `useRevenueBreakdown`, `useExpansionBreakdown`, `useGpBreakdown`,
   `useHmBreakdown`, `useRorBreakdown`, `useDormantCustomer`,
   `useDormantBreakdown`, `useDormantValueHistory`), teruskan ke
   `metrics.api.ts`.
7. 6 halaman — ganti `const [, setOnlyPareto]` jadi `const [onlyPareto,
   setOnlyPareto]` (BACA nilainya, bukan buang), kirim `only_pareto:
   onlyPareto` ke SEMUA fetch di halaman itu (trend DAN drilldown kalau
   ada, supaya tidak mismatch spt bug class §30.17).

**Verifikasi**: query DB langsung (bandingkan jumlah row/rate dgn vs
tanpa toggle, utk minimal 1 KPI per file backend yang disentuh) +
`tsc --noEmit` + `eslint` + `vite build`.

### Eksekusi (SELESAI, 2026-08-25)

**Backend:**
1. `utils/scope.ts` — `buildOnlyParetoRaw()` baru, mirror PERSIS
   `buildExcludeIntercompanyRaw()`.
2. `customers/helper/segment.helper.ts` — `SegmentParams.onlyPareto`
   ditambah; `InvoiceScopeParams`/`InvoiceScopeConditions` (dipakai
   `resolveInvoiceScopeConditions`, SHARED oleh 13+ file repository)
   dapat `filterDate?`/`onlyPareto?` (OPSIONAL — supaya file Product/
   Customer Workbench yang TIDAK punya UI Pareto tetap compile tanpa
   sentuhan, backward-compatible penuh) + `onlyParetoCond` di bundel
   return.
3. `metrics.service.ts` `resolveSegmentParams` — parameter baru
   `onlyPareto?`, 11 titik panggilan diupdate (termasuk
   `getDormantStatusBreakdown` yang SEMPAT terlewat dari audit awal —
   ketahuan dari error `tsc`, bukan asumsi).
4. `metrics.schema.ts` — `onlyParetoField` (pola SAMA PERSIS
   `excludeIntercompanyField`, BUKAN `z.coerce.boolean()`), dipasang ke
   **10 schema** (9 rencana awal + `dormantStatusBreakdownQuerySchema`
   yang ketahuan belakangan).
5. Repository — `m1.repository.ts` (2 titik manual, tidak lewat
   `resolveInvoiceScopeConditions`) + `m3m7.repository.ts`/
   `m4.repository.ts`/`m5.repository.ts`/`m6.repository.ts`/
   `m8m10.repository.ts` (20 titik via `onlyParetoCond` yang di-
   destructure dari bundel bersama — 1 perubahan di helper otomatis
   ter-cover ke semua caller yang destructure field baru itu).
6. `dashboard.service.ts` — 6 pemanggilan service M1-M10 hand-built
   (Dashboard Overview, TIDAK py UI Pareto) diberi `only_pareto: false`
   eksplisit (field WAJIB diisi setelah lewat transform Zod, bukan lagi
   opsional di level TypeScript).

**Frontend:**
7. `useMetrics.ts` (12 hooks) + `metrics.api.ts` (11 titik) — semua
   endpoint M1-M10 (trend+drilldown) terima `only_pareto`.
8. 6 halaman (Growth/Value/Retention + 3 Report) — `const [,
   setOnlyPareto]` (value dibuang) → `const [onlyPareto, setOnlyPareto]`
   (dibaca), diteruskan ke SEMUA fetch level halaman + sbg prop baru
   `onlyPareto={onlyPareto}` ke komponen anak (temuan tambahan: pola
   yang sama dgn `excludeIntercompany` juga diteruskan sbg prop ke
   komponen chart, bukan cuma dipakai di level halaman).
9. 10 komponen anak (M1CrossSelling, M2AvgCategory, M6RepeatOrder,
   M7ExpansionGrowth, M8DormantRate, M9DormantValue,
   M10ReactivationRate, M3Revenue, M4GrossProfit, M5HighMargin) — Props
   `onlyPareto?: boolean` ditambah, diteruskan ke fetch drilldown/YoY/
   MoM masing-masing (total ~20 titik fetch). `useCustomerProducts`
   (M1.1, fitur Product Workbench terpisah) SENGAJA TIDAK disentuh —
   backend-nya tidak dalam scope 10 schema di atas.

**Verifikasi** (INSERT 1 baris `pareto_customers` sementara utk
customer nyata yg py transaksi Mei 2026, company_id=2, DIHAPUS lagi
setelah tes — bukan data permanen):

| Fungsi/file | Tanpa toggle | Dengan toggle (customer_id=10766 SAJA) |
|---|---|---|
| M1 (`fetchCrossSellingTrend`) | 2.435 aktif | **1** (multi_product=1, benar) |
| M3-M7 (`fetchCustomerMetricsTrend`) | 1.346 existing | **1** |
| M8-M10 (`fetchDormantTrend`) | 28.392 customer | **1** |

Ketiga file backend utama (mewakili SEMUA 20 titik `onlyParetoCond`,
krn m4/m5/m6 pakai pola SAMA PERSIS via helper bersama yang sudah
terbukti benar) — filter Pareto ISOLASI TEPAT ke 1 customer yang
di-flag, tidak over/under-inclusive.

`tsc --noEmit` bersih (backend+frontend), `eslint src` bersih (0
error), `vite build` sukses. Belum di-commit/push.

## 36. Review satu-per-satu M1-M5 vs dokumen SSOT resmi (2026-08-25)

Susulan §34/§35 — dokumen SSOT resmi ("DEFINISI OPERASIONAL Customer Loyal
Dashboard") direview ULANG, KPI per KPI, teks lengkapnya (bukan cuma ringkasan
awal sesi), dibandingkan kata-per-kata terhadap implementasi. Metodologi:
user paste teks definisi resmi tiap KPI, verifikasi ke kode (bukan asumsi),
perbaiki kalau ada gap, dokumentasikan di `metrics_docs.md`.

### 36.0 `metrics_docs.md` — restrukturisasi

Dokumen ini SEBELUMNYA cuma cakup M3-M7 (judul lama "Dokumentasi Metrik M3 ·
M4 · M5"), beberapa bagian usang. Diperbaiki:
- Judul jadi "Dokumentasi Metrik 10 KPI — Customer Loyal Dashboard".
- "Definisi Umum" dipecah jadi 2 konsep populasi eksplisit — **Customer Aktif**
  (≥1 transaksi periode ini, TANPA syarat riwayat — M1/M2) vs **Existing
  Customer** (riwayat sebelum periode DAN masih beli periode ini — M3-M7).
- Section M1 dan M2 DITAMBAHKAN (baru, sebelumnya tidak ada sama sekali).
- Section M3 dan M4 DIREVIEW ULANG, diperbaiki match SSOT + granularitas.

### 36.1 M1 — verifikasi + benchmark interpretasi jadi garis chart

Formula & populasi SUDAH SESUAI (sudah benar sejak §34.0). Gap yang ditemukan:
benchmark interpretasi resmi (`<25% Rendah, 25-40% Cukup, 40-60% Baik, >60%
Sangat Baik`) **belum diimplementasikan visual sama sekali** — chart cuma
tampilkan rate polos.

**Perbaikan** (`ComombChartWidget.tsx`, komponen SHARED — reusable ke KPI lain):
- Prop baru `referenceLines` — garis horizontal dashed di axis manapun
  (`yAxisId`), domain axis OTOMATIS melebar supaya garis tidak terpotong.
  Label TIDAK auto-generate dari value (koreksi user: redundan kalau sudah
  match tick axis) — cuma tampil kalau caller isi eksplisit.
- Prop baru `rightAxisTickStep` — paksa tick sumbu kanan jadi kelipatan
  tetap (mis. 10 → 10/20/30/40/50/60), BUKAN hasil auto-scale padding 10%
  yang biasa hasilnya pecahan ganjil (koreksi user: tick "17.3%/32.3%"
  "tidak sesuai pola").
- Tick yang PERSIS cocok dgn nilai `referenceLines` diwarnai sesuai garisnya
  (custom tick renderer, `YAxisTickContentProps` dari recharts) — susulan
  user: "sumbu yang sesuai dgn threshold, angkanya berubah warna... 25
  karena tidak ada angkanya tambahkan tapi dalam area yang sama" — nilai yg
  BUKAN kelipatan step (mis. 25) disisipkan paksa ke array tick.
- `M1CrossSelling.tsx` — pasang `referenceLines={[25,40,60]}` (warna
  warning→success) + `rightAxisTickStep={10}`.

Backward-compatible penuh — kedua prop opsional, chart lain (M3/M4 dgn
Rupiah) TIDAK terpengaruh.

### 36.2 M3 — verifikasi + fix bug `total_existing` drilldown

Formula & populasi trend SUDAH SESUAI SSOT (§34.3). Gap ditemukan di
**drilldown** (`fetchRevenueBreakdown`): `total_existing` masih pakai
`cteEstablishedCustomers` MENTAH (cohort FIXED, TERMASUK yang tidak
transaksi sama sekali di rentang ini — keputusan lama "template standar
KPI4") — bertentangan dgn SSOT ("Existing Customer... DAN MASIH MELAKUKAN
PEMBELIAN PADA PERIODE TERSEBUT").

**Perbaikan**: `total_existing` GANTI ke `COUNT(*)` dari CTE `existing_revenue`
(established customer yang BENAR-BENAR transaksi di `date_from`..`filterDate`)
— sekarang konsisten dgn `existing_customers` trend chart. Fallback 0-baris
disederhanakan (langsung 0, tidak query cohort fixed lagi).

**Verifikasi** (01-25 Agustus 2026, semua entitas, via `getRevenueBreakdown`
langsung): `total_existing` 32.631 → **855**, tepat sama dgn `rows.length`.
Efek ikutan: "Avg Revenue/Customer" (dihitung frontend) naik drastis (populasi
pembagi mengecil) — situasi Rp5-7 jutaan/customer, bukan lagi ratusan ribu.

**Info breakdown populasi (Total Pelanggan/Baru/Aktif) — DICOBA lalu
DIBATALKAN sama hari**: sempat ditambah 4 baris info di modal M3 (Total
Pelanggan dari DB, Pelanggan Lama, Pelanggan Baru, Pelanggan Aktif =
Lama+Baru) — field backend baru `total_customers`/`new_customers`
(`fetchRevenueBreakdown`), reuse CTE `first_invoice_date` yang sudah dibawa
`establishedCTE`. **DIBATALKAN** (instruksi user: "jangan ditampilkan kalau
memang tidak masuk hitungan" — 3 dari 4 angka itu TIDAK ikut dipakai di
rumus mana pun di modal ini, dianggap membingungkan ditaruh bersebelahan
dgn angka hasil hitungan). Revert penuh (backend+frontend+i18n), CUMA fix
`total_existing` di atas yang tetap.

**UI lain**: layout dialog M3 dipecah 2 kolom (Revenue High Margin +
Kontribusi dipindah ke kanan, mengisi ruang kosong) — label "Kontribusi
High Margin"→"Revenue High Margin", "Persentase Kontribusi"→"Kontribusi".
Tooltip `tooltipInfo` ditulis ulang — dibuka dgn definisi/tujuan resmi
(nilai ekonomi customer dipertahankan, retensi), referensi silang ke M5
DIHAPUS (instruksi user: "JANGAN SEBUT BEDA DENGAN M5, USER TIDAK PERLU
TAU ITU").

### 36.2b M3 — chart bar tunggal → stacked bar (2026-08-25)

Susulan (instruksi user: *"Ganti cart m3 menjadi stack bar cart, bar utuh
untuk total revenue, bar dalam untuk high margin value, line untuk average
dan median"*). Sebelumnya 1 bar (`total_revenue_existing`) + 3 garis
(avg, median, `hm_pct` sbg persentase). Diganti:

- **Bar bawah** (`non_hm_revenue`, DERIVED = `total_revenue_existing -
  hm_revenue`, pola SAMA PERSIS M2/M5 `single_category`/`not_bought_count`)
  + **Bar atas** (`hm_revenue` mentah, SUDAH ada di trend row, TIDAK perlu
  perubahan backend) — `stacked`, warna bar atas gold/warning (samakan tema
  "High Margin" dgn M5). Stacking keduanya balik ke `total_revenue_existing`
  — tinggi bar keseluruhan TETAP sama persis sebelumnya, cuma sekarang porsi
  HM kelihatan LANGSUNG sbg segmen Rupiah bukan garis %.
- **2 garis** (avg, median) DIPERTAHANKAN apa adanya. Garis ke-3 (`hm_pct`
  %) DIHAPUS — digantikan visual segmen bar, bukan lagi garis terpisah.
- Label bar diubah: "Total Revenue Existing" (dulu utk 1 bar tunggal) jadi
  "Revenue Reguler" (bar bawah, key baru sekarang menampung porsi NON-HM
  saja, bukan total lagi) + "Revenue High Margin" (bar atas, key baru).
  KpiHeader di atas chart TETAP pakai `total_revenue_existing` asli
  (independen dari bar, tidak terpengaruh perubahan ini).

**Catatan kosmetik kecil (belum diperbaiki, di luar scope instruksi ini)**:
badge "⚠" konsentrasi (1 customer >25% total revenue) posisinya dihitung
dari TINGGI `barKey` doang (`non_hm_revenue`) — di bar stacked, tanda ⚠ jadi
menempel di BATAS ANTARA 2 segmen (bukan di PUNCAK bar keseluruhan spt
sebelumnya). Bukan bug fungsional (badge tetap muncul di bulan yang benar),
cuma posisi visualnya kurang pas — `ComboChartWidget` perlu tahu tinggi
TOTAL stack (bukan cuma barKey) utk posisi sempurna, belum dikerjakan.

`tsc`/`eslint`/`vite build` bersih. Belum di-commit/push.

### 36.2c M3 — garis Average jadi Area, warna palette-aware (2026-08-25)

Susulan langsung §36.2b. 3 instruksi user: *"Rubah average menjadi area
chart. Ganti warna jangan terlalu kontras orange bisa gunakan hijau lebih
muda. Area chart cyan. median line solid. Untuk pengaturan warna ini
selalu berganti tergantung palet jadi jangan hardcode."*

**`ComboChartWidget.tsx` (SHARED, task029.md §36) — 2 prop baru, DEFAULT
= perilaku lama (backward-compat penuh, chart lain M1/M2/M4/M6 TIDAK
tersentuh, dikonfirmasi `eslint`+`vite build` seluruh `src` bersih)**:
- `lineVariant?: 'line' | 'area'` (default `'line'`) — mirror `barVariant`
  yang sudah ada duluan (pola sama persis, gradient `<defs>` baru
  `combo-area-grad-line`, gated `lineVariant==='area'`).
- `line2Dash?: string` (default `'8 5'`, SAMA PERSIS nilai hardcode lama)
  — sekarang bisa di-override caller, kirim string kosong utk garis solid.

**`M3Revenue.tsx`**:
- `lineKey="avg_revenue"` dapat `lineVariant="area"` — warna TETAP
  `lineTemplate.line1` (SUDAH palette-aware sejak awal via `PALETTES[
  paletteKey].line1[mode]`, kebetulan cyan di palet default "Enterprise
  Blue" — TIDAK perlu ganti warna, cuma render-nya yang berubah dari Line
  ke Area).
- `line2Key="median_revenue"` dapat `line2Dash=""` (solid, dulu dashed
  '8 5' — tidak perlu lagi dibedakan visual dari Line pertama krn Line
  pertama sekarang Area).
- `bar2Color` (bar HM revenue, §36.2b) — GANTI dari `theme.palette.
  warning.main` (warna semantik FIXED, TIDAK ikut palet — inilah "orange
  terlalu kontras" yg dikeluhkan) ke `PALETTES[paletteKey].secondary[mode]`
  — token yang MEMANG didesain khusus utk "Bar 2" chart 2-bar (lihat
  komentar `palettes.ts` baris 40-43, SUDAH ada sebelum sesi ini, cuma
  belum dipakai di sini). Otomatis beda tiap palet user (mis. hijau muda
  `#6EE7B7` di palet "Executive Green", biru muda `#93C5FD` di "Enterprise
  Blue" default) — TIDAK di-hardcode ke 1 warna.

`tsc`/`eslint` (seluruh `src`)/`vite build` bersih. Belum di-commit/push.

**Susulan sama hari**: user — *"Sepertinya line median juga bagus jika
dijadikan area cart"* — `line2Variant?: 'line' | 'area'` ditambah ke
`ComboChartWidget.tsx` (mirror `lineVariant`, default `'line'`, gradient
`combo-area-grad-line2` baru), `M3Revenue.tsx` line2 (median) dapat
`line2Variant="area"`. `line2Dash` (prop dari susulan sebelumnya, "median
line solid") jadi tidak relevan lagi krn Area TIDAK PERNAH di-dash — dibuang
dari M3Revenue.tsx (properti `line2Dash` di komponen tetap ada, cuma tidak
dipakai lagi di caller ini). `tsc`/`eslint`(seluruh `src`)/`vite build`
bersih.

### 36.3 M4 — verifikasi + fix bug identik M3

**Bug SAMA PERSIS M3** ditemukan di `fetchGpBreakdown` — `total_existing`
pakai fixed cohort. Fix identik: ganti ke `COUNT(*)` dari `existing_gp`.

**Verifikasi** (periode sama, via `getGpBreakdown`): `total_existing` = 855
— cocok PERSIS dgn M3 (populasi existing-aktif memang sama utk KPI manapun
di periode yg sama). `total_gp` Rp1.094.555.129, `avg_gp` Rp1.280.181.

Tooltip ditulis ulang (referensi silang ke M3 "Sama seperti M3, tapi..."
DIHAPUS, dibuka dgn definisi/tujuan resmi sendiri — pola sama M3).

### 36.4 M5 — populasi dikonfirmasi ULANG (bukan cuma "Existing" mentah)

Dokumen SSOT M5 py struktur BEDA dari M3/M4/M7 — TIDAK ada bullet definisi
"Existing Customer" lengkap (dgn syarat riwayat) di section-nya sendiri,
cuma ada "Customer Existing yang Membeli HM" (numerator, kata "existing"
TIDAK didefinisikan ulang) + "Customer Aktif" (definisi lengkap TAPI tanpa
syarat riwayat). Sempat dipertimbangkan ulang apakah populasi M5 seharusnya
"Customer Aktif" (spt M1/M2, customer baru IKUT) — diselesaikan via data
nyata, bukan tebakan tekstual:

**Perbandingan 12 bulan** (Existing vs Customer Aktif, `getHmBreakdown` +
query raw dibandingkan): rate SELALU lebih rendah di versi "Customer Aktif"
(turun ~1,1-1,7pp tiap bulan, konsisten) — customer baru jarang langsung
beli HM di transaksi pertama. **Keputusan akhir user: TETAP "Existing"**
(sesuai keputusan AskUserQuestion §34.3 sebelumnya) — "karena tidak
disebutkan [customer baru harus diikutsertakan]" di dokumen.

**Bug `total_existing` SAMA ditemukan** di `fetchHmBreakdown`, TAPI fix-nya
BEDA dari M3/M4 — denominator M5 BUKAN "yang beli HM" (itu numerator), tapi
SEMUA existing yang aktif APA PUN transaksinya (mirror alias `cur` di trend
chart `high_margin_ratio`). Perlu CTE BARU `inv_active` (any invoice di
rentang, TANPA JOIN high_margin_products) — bukan sekadar swap 1 baris spt
M3/M4. Fallback 0-baris juga diperbaiki (query kecil terpisah, reuse
`inv_active`).

Status: SELESAI kode + verifikasi query.

**Tooltip M5 — DITULIS ULANG (susulan, 2026-08-25)**: user screenshot
tooltip lama, koreksi *"Gak usah sebut admin setting teknis itu lagi. Ini
hanya petunjuk user pemakai yang gak perlu tau itu"* — 2 hal dibuang: (1)
"oleh admin (Settings → High Margin)" — detail konfigurasi internal, tidak
relevan buat user pemakai chart; (2) referensi silang ke M3 ("Beda dengan
'Kontribusi High Margin' di M3...") — DIBUANG juga, mengikuti prinsip
simetris dari koreksi M3 sebelumnya ("JANGAN SEBUT BEDA DENGAN M5") — kalau
M3 tidak boleh sebut M5, M5 juga tidak boleh sebut M3. Insight "porsi
customer vs porsi revenue" DIPERTAHANKAN (masih berguna), cuma tanpa
menyebut nama KPI lain secara eksplisit.

### 36.4b M5 — Top 5 salah kriteria + chart Donut→Trend 12 titik (2026-08-25)

Susulan langsung sesi ini. 2 laporan user:

**1. "Berarti top 5 itu salah, karena mereka dihitung peringkat dari revenue
kan?"** — benar, `fetchHmBreakdown` ranking pakai `hm_revenue DESC`, padahal
M5 mengukur PENETRASI (jumlah/keluasan), bukan nilai uang (itu ranah M3).
Diklarifikasi via AskUserQuestion: kriteria "jumlah terbanyak" yang dimaksud
= **unit/quantity produk HM terjual** (bukan jumlah produk berbeda atau
jumlah transaksi). Fix: field baru `hm_qty` (`SUM(invoice_items.quantity)`)
ditambah ke `fetchHmBreakdown`, ranking + ORDER BY ganti ke `hm_qty DESC`.
Kolom baru "Qty HM" ditambah ke tabel drilldown (`valueHelpers.tsx`), Top 5
timeline tampilkan "N unit" bukan lagi Rupiah. Verifikasi konkret (periode
sama): "DISKON NOTEBOOK INDONESIA" (`hm_revenue` Rp119jt, LEBIH BESAR dari
"ABCORE KOMPUTER" Rp28jt) sekarang PERINGKAT 3, kalah dari ABCORE (qty 121
vs 70) yang naik ke peringkat 2 — bukti urutan benar-benar berubah, bukan
kebetulan sama.

**2. "chart nya buat jadi 12 titik tren seperti cart lain"** — M5 chart
GANTI TOTAL dari `DonutChartWidget` (snapshot 1 titik) ke `ComboChartWidget`
(trend 12 titik, pola SAMA PERSIS M3/M4). Data `high_margin_ratio` SUDAH
ada per-bucket di trend (`fetchCustomerMetricsTrend`, §34.3) — TINGGAL
ditambah field mentahnya (`high_margin_buyer_count`, numerator sebelum
dibagi/dikali 100, backend+frontend types) supaya bisa jadi bar chart.
Bar STACKED (`not_bought_count` = `existing_customers - high_margin_buyer_
count`, DERIVED client-side, pola SAMA PERSIS M2AvgCategory.tsx
`single_category`) + `high_margin_buyer_count` — supaya stacking balik ke
total, bukan dobel hitung. `Value/index.tsx` & `CustomerMetrics/index.tsx`
(2 caller) diupdate kirim `trend`/`yoyTrend` (bukan lagi snapshot
`hm`/`yoyHm` — dihapus total dari komponen, deklarasi variabel yg jadi tak
terpakai ikut dibersihkan). Klik titik chart sekarang buka drilldown
periode itu (pola sama M3/M4, sebelumnya cuma 1 klik area donut).

Bonus fix laten ditemukan sekalian: dialog subtitle "Penetrasi HM" SEBELUMNYA
selalu pakai snapshot CURRENT (`hm?.bought_pct`) walau titik yang diklik beda
dari titik terakhir — sekarang dihitung ULANG dari data drilldown titik itu
sendiri (`hmBreakdown.hm_buyer_count / hmBreakdown.total_existing`), benar
utk titik manapun yang diklik.

**Verifikasi** (via `getCustomerMetrics`, 3 titik terakhir): `high_margin_
buyer_count / existing_customers × 100` PERSIS cocok `high_margin_ratio` di
semua titik (Jun 70/1561=4,5%; Jul 61/1674=3,6%; Agu 24/855=2,8%) — konsisten
dgn audit 12-bulan §36.4 sebelumnya.

`metrics_docs.md` M5 direview total (section "Dinamis"/auto-threshold
median SANGAT USANG, mendeskripsikan mekanisme yang sudah diganti total ke
tabel `high_margin_products` manual admin — dihapus, diganti deskripsi
akurat kondisi sekarang).

**Susulan (2026-08-25): kolom "% Total HM" disembunyikan di drilldown**
— user tanya asal kolom ini (`hm_revenue ÷ total_hm_revenue × 100`, basis
Revenue), lalu koreksi: *"Jangan ditampilkan, karena di drildown tidak ada
revenue. Hanya akan menimbulkan pertanyaan tidak perlu. Tampilkan di tabel
laporan saja"* — kolom ini basisnya Revenue, BEDA dari ranking tabel yang
sekarang basis Qty (§36.4b), jadi membingungkan ditaruh berdampingan tanpa
konteks Revenue yang lebih luas (yang ADA di Report/Revenue, TIDAK ADA di
dialog drilldown chart). `useHmColumns` (`valueHelpers.tsx`, SHARED antara
M5HighMargin.tsx drilldown & Report/Revenue tab HM) dapat param baru
`{ showPct?: boolean }` (default `true`) — 1 fungsi, bukan 2 duplikat.
M5HighMargin.tsx kirim `showPct: false` (drilldown), Report/Revenue TIDAK
disentuh (default tetap tampil). `mobileFields` kedua tempat disesuaikan
sekalian (drilldown buang `hm_pct`, Report tambah `hm_qty` yang sebelumnya
lupa dimasukkan).

**Susulan lagi: kolom "Kode" dihapus** (instruksi user: "Hapus juga kode
yang kosong itu") — `customer_code` SELALU NULL/"—" di semua data lokal,
pola SAMA PERSIS perbaikan M1 sebelumnya (§ sesi-sesi awal). BEDA dari
`hm_pct` di atas — ini dihapus TANPA flag, jadi hilang di KEDUA tempat
(drilldown DAN Report/Revenue), bukan cuma drilldown, karena datanya
memang selalu kosong di mana pun ditampilkan (bukan soal konteks
Revenue-vs-Qty spt hm_pct). Field `customer_code` tetap ada di row data
(DataGrid id/search), cuma bukan kolom tampilan lagi.

`tsc`/`eslint` (seluruh `src`)/`vite build` bersih. Belum di-commit/push.

### 36.5 M6 — verifikasi + fix bug pola M5 (bukan pola M3/M4)

Definisi resmi (dipaste user): *"Customer yang Melakukan Repeat Order adalah
customer yang melakukan LEBIH DARI 1 transaksi dalam periode pengukuran...
Existing Customer adalah customer yang sudah memiliki riwayat transaksi
sebelum periode berjalan dan masih melakukan pembelian pada periode
tersebut."* — 2 konsep TERPISAH (numerator "repeat", denominator "existing
aktif" — TANPA syarat harus repeat). Konfirmasi diagnosis sebelum eksekusi
(user interrupt: "sblum lanjut ini definisi dari dokumentasi" — text
dipaste PAS SEBELUM fix dieksekusi, dipakai konfirmasi arah yang sudah
benar, bukan mengubah arah).

**Bug SAMA pola M5** (bukan M3/M4) ditemukan di `fetchRorBreakdown` —
`total_existing` pakai fixed cohort `established_customers`. Fix: CTE baru
`inv_active` (SEMUA existing yang transaksi APA PUN, TANPA `HAVING >1` —
beda dari `repeat_buyers` yang numerator-only) — mirror alias `cur` di
trend chart `repeat_order_rate`. Fallback 0-baris juga diperbaiki (query
kecil reuse `inv_active`).

**Verifikasi** (periode sama, via `getRorBreakdown`): `total_existing` = 855
— cocok PERSIS dgn M3/M4/M5 (populasi existing-aktif universal per
periode). `repeat_count` 154, rate 18%.

Tooltip ditulis ulang (dibuka definisi/tujuan resmi, "30 hari"/"bulan
berjalan" stale wording diganti granularitas-aware). `metrics_docs.md`
direview ulang total (section lama py contoh SQL `months`/`activeDays`
usang dari SEBELUM §30.13, dihapus/diganti deskripsi kondisi terkini).

### Ringkasan status §36

| KPI | Populasi diverifikasi | Bug `total_existing` drilldown | Tooltip ditulis ulang | Doc `metrics_docs.md` |
|---|---|---|---|---|
| M1 | ✅ (§34.0) | N/A (tidak py fixed-cohort pattern) | Sudah (sesi sebelumnya) | ✅ Baru ditambah |
| M2 | ✅ (share M1) | N/A | Sudah (sesi sebelumnya) | ✅ Baru ditambah |
| M3 | ✅ | ✅ Fixed (pola M3/M4: swap ke numerator) | ✅ Ditulis ulang | ✅ Direview ulang |
| M4 | ✅ | ✅ Fixed (pola M3/M4) | ✅ Ditulis ulang | ✅ Direview ulang |
| M5 | ✅ (dikonfirmasi ulang, tetap Existing) | ✅ Fixed (pola BEDA: CTE `inv_active` baru) | ✅ Ditulis ulang | ✅ Direview ulang total (+ chart Donut→Trend, Top5 fix) |
| M6 | ✅ | ✅ Fixed (pola M5: CTE `inv_active` baru) | ✅ Ditulis ulang | ✅ Direview ulang |
| M7 | Sudah §34.1 (sesi sebelumnya, gerbang dormant beda topik) | Belum dicek ulang scope §36 ini | Sudah (sesi sebelumnya) | Belum direview §36 |

`tsc`/`eslint`/`vite build` bersih di setiap langkah. Belum di-commit/push.

### 36.6 M5 — warna chart hardcode diganti palette-aware (2026-08-25)

Instruksi user: *"High margin penetration perbaiki warna nya"* — setelah
chart M5 dikonversi Donut→Trend (§36.4b), warna bar "Bought High Margin"
dan line rate masih pakai `theme.palette.warning.main`/`theme.palette.info.main`
(warna brand FIXED, tidak ikut palet user — pola sama yang sudah dikoreksi
di M3 §36.2c: *"warna jangan hardcode... selalu berganti tergantung palet"*).

Fix di `M5HighMargin.tsx`: tambah `useThemeMode()`/`PALETTES` (pola persis
M3), lalu:
- `bar2Color` (bar "Bought High Margin"): `theme.palette.warning.main` →
  `PALETTES[paletteKey].secondary[mode]`.
- `lineColor` (line rate %): `theme.palette.info.main` →
  `PALETTES[paletteKey].line1[mode]`.

Verifikasi: `tsc --noEmit` dan `eslint` bersih di file ini.

### 36.7 M3 — line area chart hilang di belakang bar (Recharts z-index) (2026-08-25)

Laporan user (setelah §36.2c mengubah line rata-rata/median M3 dari `Line`
jadi `Area`): *"Kenapa M3 line nya jadi putus putus dibelakang bar,
Seharusnya tetap didepan meski type nya sekarang area chart."*

Diagnosis awal (salah) sempat mengasumsikan urutan JSX (bar dirender lebih
dulu di kode) yang menentukan tumpukan visual. Ternyata Recharts v3 punya
sistem `zIndex` internal sendiri per tipe elemen — dikonfirmasi via
Context7 (dokumentasi resmi Recharts, bukan tebakan) yang menunjukkan
`DefaultZIndexes`: `area: 100`, `bar: 300`, `line: 400` (di antara nilai
lain). Saat `lineKey`/`line2Key` dikonversi dari `<Line>` (default zIndex
400, di depan bar) menjadi `<Area>` (default zIndex 100, di BELAKANG bar
yang 300), tumpukan visualnya diam-diam berubah — inilah sebab garis
"putus-putus" itu sebenarnya garis solid yang separuh tertutup bar.

Fix di `ComboChartWidget.tsx`: tambah prop eksplisit `zIndex={400}` pada
kedua render `<Area>` (`lineKey` dan `line2Key`), mengembalikan tumpukan
ke urutan semula (line/area selalu di depan bar), tanpa mengubah default
behavior `lineVariant='line'`/`line2Variant='line'` yang sudah ada.

Verifikasi: `tsc --noEmit` bersih (`zIndex` valid sbg prop `<Area>` versi
Recharts ini), `eslint src` bersih, `npx vite build` sukses (`✓ built in
16.57s`).

### 36.8 M6 — warna garis chart diganti palette-aware (2026-08-26)

Instruksi user: *"rubah warna m6"* — lanjutan pola §36.2c (M3)/§36.6 (M5).
Beda dari M3/M5, chart M6 (`LineAlertWidget`, `variant="area"`) SEBENARNYA
sudah pakai `theme.palette.primary.main` (BUKAN warna brand fixed spt
`warning`/`info.main` — `primary.main` MEMANG sudah ikut ganti per palet,
lihat `theme/index.ts`). Tapi warna itu SAMA PERSIS dgn warna kartu ringkas
"Customer Repeat Order" di atasnya (juga `primary.main`) — garis chart
tidak beda visual dari aksen kartu. Diselaraskan dgn pola M3 (garis trend
tunggal pakai token `line1`, bar/kartu pakai `primary`/`secondary`).

Fix: `LineAlertWidget.tsx` (shared widget, dipakai juga M8/M10) — tambah
prop opsional `lineColor?: string` (default `theme.palette.primary.main`,
PERILAKU LAMA tidak berubah utk M8/M10 yang belum kirim prop ini). Semua
pemakaian warna series internal (gradient stops, `Area`/`Line`
stroke+dot, `Bar` fill mode `variant='bar'`, legend swatch) diganti dari
literal `theme.palette.primary.main` ke variabel `resolvedLineColor =
lineColor ?? theme.palette.primary.main`. `M6RepeatOrder.tsx` kirim
`lineColor={PALETTES[paletteKey].line1[mode]}` (pola `useThemeMode`+
`PALETTES` persis M3/M5).

Verifikasi: `tsc --noEmit` dan `eslint` bersih di kedua file
(`LineAlertWidget.tsx`, `M6RepeatOrder.tsx`). M8/M10 TIDAK disentuh
(scope §36 belum sampai ke sana), dan defaultnya menjamin tampilan mereka
tidak berubah.

### 36.9 M5 — bar "Tidak Membeli" nyaris tak kelihatan di dark mode (2026-08-26)

Teguran user (screenshot dark mode): *"MEMANG KAMU BUAT ABU ABU SEPERTI
INI?????"* — bar `not_bought_count` pakai `rgba(148,163,184,0.35)` (slate
opacity rendah) di dark mode, BERBAUR ke warna card gelap (`#111827`),
hasil komposit ≈ `rgb(63,73,90)` — nyaris tidak beda dari background,
bar jadi terlihat seperti noda abu-abu buram, bukan bentuk bar yang jelas.

Fix ronde 1: ganti ke `theme.palette.text.disabled` — SOLID (bukan
translucent), tidak lagi berbaur ke background gelap.

**Koreksi user (ronde 2, masih 2026-08-26)**: *"Pakai warna lain di
palete aku ingat ada konfigurasi kombinasi warna untuk cart dan bar
ataupun line"* — `text.disabled` MEMANG sudah solid/kontras, tapi itu
token generik MUI, BUKAN dari matrix warna chart aplikasi (`PALETTES`).
Diselaraskan ke pola bar STACKED yang SUDAH ADA di M3 (§36.2b):
`barColor=primary.main` (porsi mayoritas/dasar bar), `bar2Color=secondary`
(porsi highlight) — sama persis pola `non_hm_revenue`/`hm_revenue` M3,
bukan "abu-abu = tidak penting" tapi "primary = bar utama, secondary =
bar sorotan". `barColor` M5 diganti dari `theme.palette.text.disabled`
ke `theme.palette.primary.main`.

**Koreksi user (ronde 3, masih 2026-08-26, screenshot)**: *"Jangan sama
juga warna nya, jadi monoton page ini"* — `bar2Color=secondary` (biru
pastel) ternyata SATU KELUARGA HUE dgn `barColor=primary` (biru), 2 bar
stacked jadi kelihatan nyaris sama warna (beda lightness doang), chart
terkesan monoton 1 warna. Ganti `bar2Color` dari `secondary` ke `line2` —
token `PALETTES` yang MEMANG didesain kontras terhadap primary & line
lain (lihat komentar `palettes.ts`: *"tiap line dipilih kontras terhadap
warna bar (primary) & terhadap satu sama lain"*) — utk palet biru default
jadi pink/rose (`#F472B6` dark), beda hue total dari primary (biru bar)
maupun `line1` cyan (line rate). 3 elemen chart M5 sekarang 3 hue beda:
biru (bar dasar), pink (bar sorotan), cyan (garis rate).

**Koreksi user (ronde 4, screenshot legend, warna sekarang benar tapi
teks salah)**: *"Itu seharusnya penetrasi high margin bosss"* — label
legend garis rate cuma `"High Margin"` (key `centerLabel`, sisa dari era
DonutChartWidget sebelum §36.4b dikonversi ke trend chart) — teksnya
generik, gampang ketuker dgn label bar2 `"Membeli High Margin"` di
sebelahnya (2 legend entry sama-sama mengandung frasa "High Margin").
Fix: `customerMetrics.m5.centerLabel` diganti dari `"High Margin"` jadi
`"Penetrasi HM"` (id) / `"HM Penetration"` (en) — konsisten dgn wording
`rowPenetration` yang sudah ada. Key `dashboard.charts.highMarginCenterLabel`
(dipakai Dashboard Overview, `renderMetricWidget.tsx`) TIDAK disentuh —
namespace i18n terpisah, tidak kena efek.

**Koreksi user (ronde 5, keras)**: ronde 3 (`bar2Color=line2`) SALAH.
Teguran: *"SETIAP PALET cart ITU TERGANTUNG DENGAN THEME YANG
DITERAPKAN BUKAN LU HARDCODE WARNA PINK... aku sudah buat masing masing
palet aksen punya kombinasi warna chart masing masing, bukan lu yang
nentuin sendiri, baca dokumentasi."* `palettes.ts` SUDAH mendokumentasikan
scope tiap token secara eksplisit di komentarnya sendiri: `secondary` =
*"warna 'Bar 2' di chart 2-bar"* (eksplisit, utk BAR), `line1`/`line2`/
`line3` = *"Warna 3 line di chart M3... tiap line dipilih kontras
terhadap warna BAR (primary)"* (eksplisit, utk LINE — bukan pool bebas
pakai utk elemen BAR). Ronde 3 memakai `line2` (token LINE) sbg warna
BAR — pelanggaran kategori token, "menentukan sendiri" bukan mengikuti
yang terdokumentasi. `bar2Color` DIKEMBALIKAN ke `secondary` — kombinasi
final M5: `barColor=primary`, `bar2Color=secondary` (sama pola PERSIS
bar/bar2 M3), `lineColor=line1` (sama pola "1 line = 1 token line" yg
dipakai M3/M6, bukan pelanggaran kategori). M6 (§36.8, `lineColor=line1`)
TIDAK direvert — itu token LINE dipakai utk LINE, kategorinya benar,
beda dari kasus M5 bar2 ini.

Verifikasi: `tsc --noEmit` dan `eslint` bersih di kelima ronde.

---

### 36.10 M7 — verifikasi §36 (populasi sudah settled §34.1, cuma cek bug+doc)

Definisi resmi (dipaste user): *"CER adalah persentase pertumbuhan nilai
bisnis dari customer existing melalui peningkatan pembelian, penambahan
kategori produk, upgrade layanan, atau perluasan volume transaksi...
Customer dengan Revenue Meningkat adalah existing customer yang nilai
pembeliannya pada periode sekarang lebih tinggi dibanding periode
sebelumnya."*

Beda dari M3-M6: populasi M7 BUKAN topik baru §36 — gerbang "existing DAN
belum lewat ambang dormant" (`established_not_dormant`, ambang SAMA
`dormantThresholdCaseSql` dgn M8) sudah diputuskan & diimplementasikan di
§34.1 (sesi sebelumnya), sengaja BEDA dari "Existing" polos M3-M6 karena
M7 butuh 2 periode pembanding — customer yang absen tapi belum resmi
dormant harus tetap terhitung ("Tidak Aktif", sinyal dini actionable),
bukan didrop begitu saja. Ini TIDAK direlitigasi di §36, cuma diverifikasi
konsisten.

**Cek bug `total_existing`** (pola M3/M4 vs M5/M6): TIDAK ada — M7 dari
awal sudah pakai pola "Template Standar Kartu KPI4" (`total_existing` =
fixed cohort `established_customers JOIN established_not_dormant` di
`filterDate`, `up`/`flat`/`inactive`/`down` PARTISI EKSAK dari cohort yang
sama via `LEFT JOIN inv_current/inv_previous` — bukan `COUNT` independen)
— exhaustive, `up_count+flat_count+inactive_count+down_count` SELALU =
`total_existing`. Beda dari bug M3/M4 (numerator populasi ≠ denominator
populasi) — di M7 populasinya SATU cohort yang sama dari awal.

**Cek numerator "Revenue Meningkat"**: `cur_revenue > prev_revenue` — match
persis definisi. Kalimat pembuka SSOT ("penambahan kategori produk,
upgrade layanan, perluasan volume") itu narasi KONTEKS/alasan revenue bisa
naik, BUKAN kriteria terpisah — kriteria terukur yang eksplisit didefinisi
cuma revenue current > previous, sudah sesuai kode.

**Tooltip** (id/en) ditulis ulang dgn kalimat pembuka tujuan/definisi
(pola sama M3-M6), sisanya (formula, penjelasan gerbang dormant) TETAP
karena sudah akurat dari §34.1.

**`metrics_docs.md`** — bagian "Penjelasan"/"Formula"/"Service Layer" M7
SANGAT usang (window hardcode "30 hari"/"60 hari"/`activeDays`, field
`up_rate`/`flat_down_rate` — SEBELUM §30.13 granularitas & §34.1 gerbang
dormant ada). Ditulis ulang total: window jadi bucket granularitas-aware
calendar-anchored, populasi jelaskan gerbang `established_not_dormant`,
field service layer diperbarui ke `expansion_rate`/`flat_rate`/
`inactive_rate`/`down_rate` (4-way, bukan lagi binary lama). Bagian
"Drill-Down"/"Tampilan" TIDAK diubah — sudah akurat (direvisi 2026-08-21).

Verifikasi: `tsc --noEmit` bersih. Tidak ada perubahan kode backend/
frontend (murni dokumentasi — kodenya sudah benar dari §34.1).

### Ringkasan status §36 (update)

| KPI | Populasi diverifikasi | Bug `total_existing` drilldown | Tooltip ditulis ulang | Doc `metrics_docs.md` |
|---|---|---|---|---|
| M7 | ✅ (§34.1, gerbang dormant CONFIRMED beda topik, tidak direlitigasi) | Tidak ada (pola KPI4 dari awal, exhaustive partition) | ✅ Ditulis ulang | ✅ Ditulis ulang total |

---

### 36.11 M8 — area chart ikut warna ambang (2026-08-26)

Instruksi user (screenshot M8 Dormant Rate): *"Bisakah? Area cart dibawah
ambang berwarna hijau dan yang menembuh berwarna merah"* — chart
`LineAlertWidget` (`variant="area"`) sebelumnya isian SATU warna gradient
(`resolvedLineColor` solid, memudar), TIDAK berubah warna walau garis
menembus ambang — cuma `ReferenceArea` band tipis (opacity 0.1) yang
ganti warna, nyaris tak kelihatan ketutup isian solid di atasnya.

**Referensi resmi recharts** ("Area Chart Fill By Value", dipaste user
lengkap dgn source code) — pola: `<Area baseValue={splitPoint}>` +
gradient `userSpaceOnUse` yang di-split TEPAT di posisi piksel
`splitPoint` (dibaca dari `useYAxisScale()`/`useChartHeight()`, BUKAN
persentase hardcode) — bagian atas split 1 warna, bawah warna lain.

**Implementasi**:
1. `SplitColorGradient` (util `useYAxisScale`/`useChartHeight` M7 net-
   expansion, sebelumnya LOKAL di `AreaChartWidget.tsx`) DIPUSATKAN ke
   `components/charts/shared/SplitColorGradient.tsx` — tambah prop
   `splitValue` (default 0, M7 tidak berubah) supaya bisa dipakai split di
   titik SEMBARANG, bukan cuma 0. Rename prop `positiveColor`/
   `negativeColor` → `aboveColor`/`belowColor` (lebih akurat krn splitValue
   sekarang bisa bukan 0). `AreaChartWidget.tsx` diupdate ikut rename,
   perilaku M7 TIDAK berubah (splitValue tetap default 0).
2. `LineAlertWidget.tsx`: gradient `gradientId` (dulu 1 warna solid) GANTI
   jadi `<SplitColorGradient splitValue={threshold} aboveColor={...}
   belowColor={...}>` — arah warna ikut `higherIsBetter`, SAMA PERSIS arah
   `ReferenceArea` (M8 atas=merah/bawah=hijau; M6/M10 kebalikan).
3. `baseValue="dataMax"` (keputusan 2026-08-24) DIGANTI `baseValue=
   {threshold}` — WAJIB berubah bareng poin 2: dgn `dataMax`, isian
   selalu membentang dari garis sampai PUNCAK chart, jadi begitu di-split
   di piksel `threshold`, sebagian besar isian tetap "merah" (area antara
   threshold & dataMax) WALAU nilai sebenarnya aman di bawah ambang.
   `baseValue={threshold}` menutup polygon TEPAT di ambang — nilai di
   bawah ambang isiannya SEMUA hijau, yang menembus SEMUA merah, pola
   SAMA PERSIS reference recharts (baseValue implisit 0, hijau di atas/
   merah di bawah 0).
4. `ReferenceArea` band hijau di bawah ambang (cabang `higherIsBetter=
   false`, M8) DITAMBAH — sebelumnya cuma band merah di atas, tidak
   simetris dgn cabang `higherIsBetter=true`.

Garis (`stroke`) TIDAK ikut split — tetap `resolvedLineColor` solid,
sesuai literal instruksi user ("Area cart", bukan garis).

Verifikasi: `tsc --noEmit`, `eslint`, `vite build` bersih.

**Susulan (masih 2026-08-26)**: *"Untuk background nya hapus saja biar
warna cart lebih terlihat"* — 2 band `ReferenceArea` (poin 4 di atas)
DIHAPUS total, jadi Area fill (poin 2/3) SATU-SATUNYA sumber warna ambang
di chart, bukan lagi 2 layer (band flat 0.1 opacity + fill split)
menumpuk dan meredam kontras satu sama lain. Import `ReferenceArea`
(recharts) juga dihapus, sudah tidak dipakai. `ReferenceLine` (garis
putus-putus + label "Ambang X%") TIDAK dihapus — beda elemen dari
background band.

Verifikasi: `tsc --noEmit`, `eslint` bersih.

---

### 36.12 M9 — bug "Total Potensi Kerugian" understated 93% + GAP gross profit (2026-08-26)

Definisi resmi (dipaste user): *"DCV adalah total nilai pendapatan atau
potensi gross profit yang hilang dari customer yang sudah masuk kategori
dormant dalam periode tertentu... Historical Revenue adalah rata-rata
atau total revenue yang pernah dihasilkan customer sebelum menjadi
dormant. Historical Gross Profit adalah laba kotor historis yang pernah
dihasilkan customer tersebut."*

**Bug ditemukan & diperbaiki** — kartu "Total Potensi Kerugian"
(`value_ranking_total_current`) SEBELUMNYA dihitung dari
`fetchDormantValueRanking(p, LIMIT 20, ...)` — cuma jumlah TOP 20
customer per lost-value, bukan SEMUA dormant customer. Diverifikasi via
`getDormantCustomerMetrics` langsung (data lokal, `company_id=all`): sum
top 20 = **Rp 2.807.182.082**, sum SEMUA dormant (`limit=null`, pola
sudah dipakai `getDormantBreakdown`/M8) = **Rp 37.594.149.575** — kartu
UNDERSTATED **93%**. Fix: `metrics.service.ts` `getDormantCustomerMetrics`
— fetch SEKALI dgn `limit=null`, top-20 utk chart/tabel di-`slice(0,20)`
di JS dari array penuh (bukan fetch 2x query terpisah), total dijumlah
dari array PENUH. Kartu "Customer Ter-ranking" (`ranking.length`, label
"Customer Ter-ranking"/"Ranked Customers") TIDAK diubah — labelnya sudah
jujur menyatakan "yang tampil di ranking" (≤20), bukan klaim total.

**GAP diketahui, BELUM diputuskan**: SSOT definisikan "Historical
Revenue" DAN "Historical Gross Profit" sbg 2 komponen paralel.
Implementasi SAAT INI 100% berbasis Revenue — TIDAK ADA field/komputasi
gross profit sama sekali di M9 (backend `DormantValueRow` maupun UI).
Kata "atau" di kalimat pembuka SSOT ("pendapatan ATAU potensi gross
profit") bisa dibaca 2 arah: (a) 2 lensa alternatif, revenue-only sudah
sah, ATAU (b) harus ada versi GP paralel juga. BELUM ditanyakan ke user,
dicatat sbg keputusan tertunda di `metrics_docs.md` (section M9 baru).

**Koreksi tone tooltip (ditegur user, screenshot)**: *"kenapa kamu selalu
referensi teknis yang tidak perlu"* — tooltip M9 yang baru saya tulis
sempat menyebut "(ambang sama dengan M8)" — user yang lihat tooltip di
UI TIDAK PERLU DAN TIDAK TAHU apa itu "M8" (kode internal dokumentasi),
pola KESALAHAN SAMA yang sudah ditegur di tooltip M3 (§36.2c, "JANGAN
SEBUT BEDA DENGAN M5"). Diperbaiki DI M9 tooltip (id/en) — kalimat
"(ambang sama dengan M8)" dihapus, cuma jelaskan aturannya tanpa
menyebut KPI lain. **Diaudit ulang SEMUA tooltip** (grep pola `M[0-9]`
di seluruh `customerMetrics.json`/`dormantCustomer.json`, id+en) —
ketemu 1 lagi sisa di tooltip M7 (§36.10, ditulis sesi ini juga,
"sama seperti M8"/"itu bagian M8") — turut diperbaiki. Setelah audit,
NOL referensi kode KPI tersisa di tooltip mana pun (diverifikasi via
script Python re-cek seluruh 4 file JSON).

**Tooltip M9** (id/en) ditulis ulang dgn kalimat pembuka tujuan (pola
sama M1-M8), lalu dikoreksi sesuai poin di atas.

**`metrics_docs.md`** — section "M9" BARU ditambahkan (SEBELUMNYA TIDAK
ADA sama sekali, beda dari M1-M7 yang REWRITE section existing) — formula
lengkap, SQL inti, catatan GAP gross profit, catatan bug fix di atas.

Verifikasi: `tsc --noEmit` bersih (frontend+backend), query verifikasi
langsung via `getDormantCustomerMetrics` (angka di atas), script temp
dihapus setelah dipakai.

**Susulan — GP paralel diimplementasikan** (keputusan user via
AskUserQuestion: "Tambah versi Gross Profit paralel"):
- Backend `m8m10.repository.ts` `fetchDormantValueRanking`: `inv` CTE
  tambah `i.total_gp::numeric AS gp` (kolom sudah jadi di `invoices`,
  pola sama M4, tidak perlu join invoice_items/COGS manual). `cust_agg`
  tambah `recent_12m_gp` (window 12 bulan sama persis `recent_12m_rev`).
  `ranked`/SELECT akhir tambah `avg_monthly_gp`/`estimated_lost_gp`
  (rumus sama persis versi revenue). Ranking (ORDER BY) TETAP basis
  revenue — GP murni field tampilan tambahan, bukan basis urutan baru.
- `metrics.types.ts`: `DormantValueRow` +2 field,
  `DormantMetricsData` +`value_ranking_total_gp_current`/`_comparison`.
- `metrics.service.ts`: `sumLostGp` (mirror `sumLostValue`), dijumlah
  dari `valueRankingAll`/`comparisonValueRankingAll` (array PENUH, bukan
  top-20 — konsisten dgn fix bug di atas).
- Frontend `types/metrics.ts`: mirror kedua tipe di atas.
- `M9DormantValue.tsx`: grid ringkasan 3→4 kartu (`md:4`→`md:3`), kartu
  baru "Total Potensi Kerugian (GP)" di posisi ke-2. `M9Tooltip` (hover
  bar chart) tambah baris "Estimasi Kerugian (Gross Profit)".
- i18n (id/en): `m9TotalLossGpLabel`, `colEstimatedLossGp` baru.

Verifikasi: `tsc --noEmit` bersih (backend+frontend), query langsung
konfirmasi angka GP masuk akal (margin ~15-30% dari revenue tiap
customer, bukan 0/negatif/di luar wajar).

---

### 36.13 M10 — verifikasi §36 + bug tooltip pakai field denominator SALAH

Definisi resmi (dipaste user): *"CRR adalah persentase customer dormant
yang berhasil kembali melakukan transaksi dalam periode tertentu setelah
sebelumnya tidak aktif... Customer Dormant yang Kembali Bertransaksi
adalah customer yang sebelumnya masuk kategori dormant, lalu melakukan
minimal 1 transaksi kembali dalam periode pengukuran. Total Customer
Dormant adalah seluruh customer yang berada dalam status dormant pada
AWAL PERIODE pengukuran."*

**Populasi diverifikasi cocok** — denominator `reactivation_rate`
(`m8m10.repository.ts`) pakai predikat "dormant per `me`" (`b.pe`,
bucket yang SUDAH digeser 1 periode di service layer) = SECARA EFEKTIF
"dormant di akhir periode sebelumnya" = TITIK WAKTU SAMA dgn "awal
periode ini" — cocok SSOT. Numerator pakai `last_at_live_me` (dicek s.d
HARI INI, bukan tunggu periode tutup) — cocok "minimal 1 transaksi
kembali dalam periode pengukuran". Tidak ada bug pola M9 (limit/slice) —
`reactivation_rate`/`reactivated_count`/`dormant_count` semua `COUNT()`
FILTER penuh 1 query, bukan dijumlah dari array terpotong.

**Bug ditemukan**: tooltip hover chart (`M10Tooltip`) masih pakai
`prev_dormant_count` (field BEDA titik waktu, snapshot `prev_me`) sbg
baris "dormant", padahal kartu ringkasan SUDAH dikoreksi ke
`dormant_count` (basis denominator yang BENAR) sejak 2026-08-24 —
tooltip ini TERLEWAT waktu itu. Akibat: `reactivated_count ÷ [dormant
di tooltip]` tidak match persis `reactivation_rate` yang ditampilkan di
baris pertama tooltip yang sama, membingungkan kalau user coba verifikasi
manual. Fix: tooltip ganti ke `dormant_count`, samakan dgn kartu.

Tooltip info (id/en) ditulis ulang dgn kalimat pembuka tujuan, sekalian
reword "populasi dormant di periode sebelumnya" → "di awal periode ini"
(lebih dekat ke bahasa SSOT, kurang teknis). `metrics_docs.md` — section
M10 BARU ditambahkan (sebelumnya tidak ada).

Verifikasi: `tsc --noEmit` bersih.

### Ringkasan status §36 (M1-M10 selesai direview, kecuali M8 penuh)

| KPI | Status |
|---|---|
| M1-M7 | ✅ Selesai penuh (populasi+bug+tooltip+doc) |
| M8 | Chart warna ambang diperbaiki (§36.11) — populasi/tooltip/doc BELUM direview §36 |
| M9 | ✅ Selesai penuh + bug total understated 93% diperbaiki + GP paralel ditambah |
| M10 | ✅ Selesai penuh + bug tooltip field salah diperbaiki |

Belum di-commit/push. M8 masih perlu 1 putaran review §36 (populasi/
tooltip/`metrics_docs.md`) biar konsisten dgn M1-M7/M9/M10.

---

### 36.14 Audit menu Laporan (Growth/Retention/Revenue) vs 10 definisi KPI (2026-08-26)

Pertanyaan user: *"Dari semua definisi tadi, apakah sudah tersedia
lengkap di menu laporan retention, growth dan revenue?"*

**Cakupan KPI per tab — SEMUA 10 KPI ADA**, beberapa sengaja digabung 1
tab (didokumentasikan di komentar kode, BUKAN gap):
- Report/Growth: tab "Cross Selling" = M1+M2 (1 dataset `useCrossSelling`,
  kolom `BreakdownTable` sudah cakup `category_count` M2 DAN
  `cross_sell_status`/`total_revenue` M1), tab "Expansion" = M7.
- Report/Retention: tab "ROR" = M6, tab "Dormant" = M8+M9 (1 dataset
  `fetchDormantValueRanking`, kolom sama persis), tab "Reactivation" = M10.
- Report/Revenue: tab "Revenue"=M3, "GP"=M4, "HM"=M5, masing2 tab sendiri.

**Data**: semua 3 halaman pakai hook (`useRevenueBreakdown`/
`useGpBreakdown`/`useHmBreakdown`/`useRorBreakdown`/`useDormantBreakdown`/
`useExpansionBreakdown`/`useCrossSelling`) yang SAMA PERSIS dgn halaman
dashboard utama — semua bugfix backend sesi ini (total_existing M3-M6, GP
paralel M9) OTOMATIS ikut, tidak ada logic backend terpisah utk Laporan.

**GAP ditemukan & diperbaiki**: kolom GP paralel M9 (§36.12, baru
ditambah) SEMPAT cuma masuk ke `M9DormantValue.tsx` (kartu+tooltip chart
sendiri) — file `dormantHelpers.tsx` (`useDormantBreakdownColumns`,
SATU definisi dipakai BERSAMA M8 dialog drilldown DAN Laporan Retention
tab "Dormant") TERLEWAT. Ditambahkan kolom `estimated_lost_gp` di situ —
1 titik fix, otomatis propagate ke M8 drilldown DAN Laporan sekaligus
(pola centralize yang sudah ada). `mobileFields` (Report/Retention +
M8DormantRate.tsx, 2 tempat terpisah yang masih hardcode array literal)
turut ditambah `estimated_lost_gp`.

**Catatan terpisah, BUKAN diperbaiki sesi ini**: ketiga halaman Laporan
TIDAK PUNYA tooltip/info-icon definisi KPI sama sekali (grep
`tooltipInfo`/`InfoOutlined`/`MuiTooltip` nol hasil di 3 file) — murni
tabel data, tanpa penjelasan formula/definisi. Semua tooltip yang ditulis
ulang sepanjang §36 (M1-M10) HANYA hidup di halaman dashboard utama
(Growth/Value/Retention), TIDAK ada di Laporan. Ini nyambung ke rencana
§37 (Halaman Help — deskripsi+rumus+referensi 10 KPI) yang masih
ditunda — belum diputuskan apakah Laporan JUGA perlu tooltip sendiri atau
cukup mengandalkan Halaman Help nanti.

Verifikasi: `tsc --noEmit` bersih.

---

## 36.15 Bug periode "Apply date cutoff" OFF di 3 halaman Laporan (2026-08-26)

Laporan user (dari testing task031 §10): JSON respons `getHmBreakdown`
kosong (`total_hm_revenue:0, hm_buyer_count:0, total_existing:67,
rows:[]`) utk periode Juni 2026 — "Untuk filter data gunakan filter
global saja". Dikonfirmasi via AskUserQuestion: TIDAK ada filter
tambahan aktif (cuma Entitas=Semua), jadi bukan soal populasi sempit.

**Root cause diverifikasi langsung ke DB**: saat toggle "Apply date
cutoff" OFF, `periodEnd` (state React) disimpan sbg TANGGAL 1 bulan yang
dipilih (`${picked}-01`, konvensi UI "penanda bulan") — tapi dikirim APA
ADANYA sbg `period_end` ke `useRevenueBreakdown`/`useGpBreakdown`/
`useHmBreakdown` (Report/Revenue), `useExpansionBreakdown` (Report/Growth,
tab Expansion), `useRorBreakdown`/`useDormantBreakdown`/
`useDormantStatusBreakdown` (Report/Retention) — SEMUA hook ini TIDAK
terima param `apply_date_cutoff` (beda dari `useCrossSelling`/
`useCustomerMetrics`/`useDormantCustomer` yang backend-nya sendiri yang
urus ekspansi periode). `date_from` di semua tempat ini SUDAH benar
dihitung via `getPeriodDateRange(...).start`, tapi `period_end` TIDAK
ikut dihitung simetris — akibatnya `date_from === period_end` (sama-sama
tanggal 1), window query jadi cuma 1 HARI, bukan 1 bulan penuh.
Reproduksi persis via query manual: `period_end=date_from='2026-06-01'`
→ `total_existing:67, hm_buyer_count:0` (SAMA PERSIS laporan user).
Versi benar (`period_end='2026-06-30'`) → `total_existing:1561,
hm_buyer_count:70`.

**Fix** (3 file, pola identik): tambah `periodEndEffective` — kalau
`applyDateCutoff` aktif, pakai `periodEnd` apa adanya (tanggal presisi
pilihan user, sudah benar); kalau TIDAK aktif, hitung akhir periode
SUNGGUHAN via `getPeriodDateRange(periodType, reportPeriodKey).end`,
di-clamp ke hari ini kalau periode masih berjalan via
`clampPeriodEndToToday` (pola SAMA PERSIS M1-M10 sepanjang sesi ini).
Semua pemanggilan hook breakdown di ke-3 halaman ganti dari `period_end:
periodEnd` ke `period_end: periodEndEffective`.

Verifikasi: `tsc --noEmit`/`eslint` bersih di 3 file. Playwright —
reproduksi persis skenario user (Juni 2026, cutoff OFF, tab HM Laporan
Revenue): SEBELUM fix 0 baris, SESUDAH fix 70 baris (cocok dgn angka
verifikasi DB). Screenshot before/after dikirim ke user.

---

## 36.17 Refactor tab Reaktivasi Laporan Retention (2026-08-26)

Instruksi user (spesifikasi detail, tech stack MUI eksplisit — sesuai
proyek): perbaiki UX tab Reaktivasi. Diselaraskan ke data REAL (bukan
implementasi buta), 3 gap ditemukan+dilaporkan ke user, TIDAK ditebak:

1. **"Durasi Dormant" selalu "—"** — diverifikasi ke DB: `dormant_since_date`
   genuinely `null` utk SEMUA customer reaktivasi (bug backend LAMA, bukan
   dari perubahan sesi ini) — logic hitung durasi (client-side, dari
   `dormant_since_date` s.d `reactivation_date`) sudah benar, cuma input-nya
   kosong. BELUM diperbaiki (di luar scope UI murni).
2. **Kolom "Unit Bisnis"** TIDAK ditambahkan — `CustomerDormantStatusRow`
   tidak punya field ini; menambahkannya butuh kerja backend spt task031
   (resolusi divisi dominan), bukan cuma UI.
3. **State "at_risk"** (3 kategori bertahan) TIDAK diimplementasi — cuma
   ada 2 sinyal nyata di data (`reactivated`/`relapsed`), "at_risk" butuh
   definisi bisnis baru yang belum ada.

**Kolom tabel** (`useDormantStatusColumns`, `dormantHelpers.tsx` — SHARED
dgn M10ReactivationRate.tsx dialog drilldown, perbaikan ikut ke sana jg):
KODE/STATUS chip lama/TGL DORMANT mentah dihapus, tambah "Durasi Dormant"
(chip warna: <30 hijau, 30-90 kuning, >90 merah), "Bertahan?" (icon
check/cancel dari status reactivated/relapsed), kolom tanggal center-align,
nama customer Tooltip+noWrap, revenue kolom diberi nama jujur
"Rata-rata Revenue/Bulan" (bukan "Revenue" — field aslinya avg_monthly,
bukan total).

**Tabel tetap DataGrid** (`ResponsiveListView`) — TIDAK diganti ke MUI
`<Table>` mentah spt spek awal, supaya konsisten dgn 7 tab Laporan lain
(1 paradigma tabel, bukan 2).

**Kartu ringkasan** — 3 ronde revisi user:
- Ronde 1: Paper+Avatar custom (DITOLAK — ukuran card tidak seragam,
  gaya ikon badge-lingkaran-solid tidak sesuai app).
- Ronde 2: coba `KpiCard` (shared component, diperluas +icon/+highlighted/
  +sub-opsional) — masih ikon di depan LABEL, beda dari mockup user.
- Ronde 3 (FINAL): user kirim mockup persis (label bold baris 1,
  "angka (persentase%)" + ikon status kanan baris 2) — diikuti PERSIS,
  ikon mockup (badge solid) diganti ikon POLOS (`fontSize="small"`, warna
  semantik MUI langsung `success`/`warning`/`error`/`primary`, TANPA
  circle bg) — sama gaya persis ikon kolom "Bertahan?" tabel di bawahnya
  & ikon section title app (dicontohkan user: "TREN RASIO CROSS SELLING").
  Card dibangun lokal (`ReactivationSummaryCards.tsx`) reuse `Card` UI
  dasar, BUKAN `KpiCard` (bentuknya beda cukup jauh dari 3-slot standar
  KpiCard, dipertahankan sbg komponen page-specific, bukan dipaksa masuk
  komponen shared yang tidak pas).

Verifikasi: `tsc --noEmit`/`eslint` bersih tiap ronde. Screenshot visual
via Playwright tiap ronde (login admin@mail.com, navigasi live) —
BUKAN ditebak dari kode saja.

**Ronde 4 (ditegur KERAS user: "TIDAK MEMPERHATIKAN INSTRUKSI MASALAH
ICON")** — ronde 3 SALAH: cuma menghapus badge Avatar lingkaran, TAPI
glyph ikon itu SENDIRI (`CheckCircleIcon`/`PauseCircleIcon`/`CancelIcon`)
tetap SOLID/terisi penuh (lingkaran padat berwarna) — bukan garis tipis
spt contoh yang diberikan user. Diganti ke varian resmi MUI
`CheckCircleOutlined`/`PauseCircleOutlined`/`HighlightOff` (BUKAN
"...Outline" tanpa 'd' — itu ikon BEDA, sempat salah nama modul, `tsc`
langsung menangkap). Diterapkan di 2 tempat: kartu ringkasan DAN kolom
"Bertahan?" tabel (dormantHelpers.tsx, sama-sama kena masalah yang sama).
Diverifikasi ulang via screenshot Playwright close-up sebelum lapor.

---

## 36.18 Layout tab Reaktivasi = STANDAR untuk semua tab Laporan (2026-08-26)

Keputusan user (tegas): *"layout reaktivasi adalah layout standar untuk
menu laporan"* — pola yang dipakai tab Reaktivasi (§36.17) WAJIB
diterapkan ke SEMUA tab Laporan lainnya (Repeat Order, Dormant, dan
eventually Growth/Revenue), BUKAN cuma khusus Reaktivasi. Standarnya:

1. **Kartu ringkasan** — Grid 5 (atau sejumlah metrik relevan) kartu
   ukuran SERAGAM (`height:'100%'`), tiap kartu: label bold baris 1,
   "angka (persentase%)" + ikon status POLOS (outline, warna semantik
   MUI success/warning/error/primary, TANPA badge lingkaran solid) di
   kanan baris 2. Kartu metrik "konteks tab aktif" diberi border highlight
   (`borderColor:'primary.main', borderWidth:2`).
2. **Card+header search/sort** — `ReportTabCard` (search KIRI, sort/filter
   KANAN, di dalam Card yang sama dgn tabel) — SUDAH standar sejak §36.16,
   TIDAK berubah.
3. **Kolom Status** — kalau tabelnya punya konsep status/kategori
   (active/dormant/reactivated/dst), WAJIB ditampilkan sbg kolom StatusChip
   eksplisit — JANGAN dihapus/disembunyikan jadi indikator implisit (pelajaran
   §36.17 ronde 5: kolom "Bertahan?" yang cuma representasi SEBAGIAN status
   bikin user bingung "kenapa tidak ada status di tabel").
4. **Data kosong pada kolom HITUNGAN/DURASI (angka)** → tampilkan `0`,
   BUKAN `"—"` (instruksi user eksplisit) — `"—"` cuma utk kolom yang
   BUKAN angka (tanggal, teks) yang genuinely tidak ada nilainya.

Komponen `ReactivationSummaryCards.tsx` (masih page-specific, task029.md
§36.17) PERLU digeneralisasi jadi shared component sblm dipakai
Dormant/Repeat Order (lihat §36.19 di bawah) — BELUM diekstrak saat
keputusan ini ditulis, dikerjakan sbg bagian §36.19.

## 36.19 Terapkan standar ke tab Dormant + Repeat Order (2026-08-26)

### Konteks

Susulan §36.18 — instruksi user: *"lanjutkan tab dormant dan repeat order.
Lengkapi juga kolom kolom data tabel nya agar lebih detail dan eksplisit
untuk analisa detail data per kategory."* Dua bagian: (1) pasang kartu
ringkasan gaya-standar di tab "ror" (Repeat Order) dan "dormant"; (2)
perkaya kolom tabel breakdown kedua tab itu.

### 1. Komponen `ReportSummaryCards` (generalisasi)

`ReactivationSummaryCards.tsx` (§36.17) tetap page-specific (belum
digeneralisasi — lihat catatan "belum dikerjakan" di bawah), tapi
pola kartu-nya sekarang tersedia sbg komponen shared baru:
`frontend/src/pages/Report/ReportSummaryCards.tsx` — terima
`items: ReportSummaryCardItem[]` (`label`, `value`, `pct?`, `icon?`,
`iconColor?`, `highlighted?`, `md?`), render grid kartu seragam
(`height:'100%'`, lebar kolom default `12/items.length`, bisa dioverride
per-item via `md`). Ini komponen SUMBER TUNGGAL untuk pola §36.18 poin 1
ke depannya — tab Growth/Revenue yang masih pakai `ReportTabCard`
`summaryItems` (pola caption-line lama, §36.16) BELUM dimigrasikan
(scope instruksi user eksplisit cuma sebut "dormant dan repeat order",
bukan permintaan migrasi total — ditahan sampai diminta).

### 2. Tab "ror" (Repeat Order) — `Report/Retention/index.tsx`

Kartu ringkasan baru via `ReportSummaryCards`: 2 kartu — "Total Existing"
(`PeopleOutlinedIcon`) dan "Repeat Count" (`RefreshIcon`, `highlighted`,
persentase = repeat/total). Diletakkan SEBELUM `ReportTabCard` (bukan lagi
prop `summaryItems` di dalam card header).

Kolom tabel (`useRorColumns`, `CustomerMetrics/rorHelpers.tsx`, SHARED
dgn M6RepeatOrder.tsx chart+dialog — 1 titik definisi, perubahan otomatis
ikut ke keduanya):
- `customer_code` DIHAPUS — NULL utk semua customer (temuan lama, sudah
  dihapus dari kolom lain di sesi ini juga, konsisten).
- **BARU** `avg_per_order` ("Rata-rata/Order") — dihitung client-side
  dari `total_revenue / invoice_count` yang sudah ada (bukan field
  backend baru) — kasih konteks nilai RATA-RATA per transaksi customer
  itu, bukan cuma total mentah + jumlah order terpisah yang harus
  dibagi manual oleh pembaca.

### 3. Tab "dormant" — `Report/Retention/index.tsx`

Kartu ringkasan baru via `ReportSummaryCards`: 3 kartu — "Dormant Count"
(`PauseCircleOutlinedIcon`, `highlighted`), "Total Loss Revenue"
(`TrendingDownIcon`), "Total Loss GP" (`TrendingDownIcon`). Diletakkan
SEBELUM `ReportTabCard`.

Kolom tabel (`useDormantBreakdownColumns`, `DormantCustomer/dormantHelpers.tsx`
— SHARED dgn M8DormantRate.tsx dialog drilldown DAN M9DormantValue.tsx
chart, 1 titik definisi, perubahan otomatis ikut ke ketiganya):
- `customer_code` DIHAPUS — sama alasan (NULL utk semua customer).
- **BARU** `avg_monthly_revenue` ("Rata-rata/Bulan") — field ini SUDAH
  ADA di `DormantValueRow` (basis hitung `estimated_lost_value`) tapi
  sebelumnya tidak pernah ditampilkan sbg kolom sendiri. Menambahkannya
  memberi konteks "seberapa besar omzet bulanan customer ini SEBELUM
  dormant" — sebelumnya pembaca cuma lihat angka total estimasi
  kerugian akumulatif tanpa tahu skala bulanannya, jadi sulit menilai
  customer mana yang sebenarnya "besar" vs "kecil tapi lama dormant".
  Diletakkan SEBELUM `estimated_lost_value`/`estimated_lost_gp` (urutan
  naratif: rata-rata dulu, baru total estimasi kerugian).

### 4. Verifikasi

`tsc --noEmit` dan `eslint` bersih (frontend) utk semua file yang diubah:
`Report/ReportSummaryCards.tsx` (baru), `Report/Retention/index.tsx`,
`CustomerMetrics/rorHelpers.tsx`, `DormantCustomer/dormantHelpers.tsx`.
Verifikasi visual Playwright BELUM dilakukan di sesi ini utk 2 tab ini
(ror/dormant) — cuma tab Reaktivasi (§36.17) yang sudah discreenshot
langsung; kartu ror/dormant pakai komponen yang SAMA (`ReportSummaryCards`
digeneralisasi dari implementasi Reaktivasi yang sudah diverifikasi
visual), risiko regresi visual rendah tapi belum dibuktikan screenshot.

### Belum dikerjakan (scope di luar instruksi eksplisit sesi ini)

- `ReactivationSummaryCards.tsx` BELUM direfactor memakai
  `ReportSummaryCards` yang baru digeneralisasi darinya — saat ini masih
  implementasi paralel sendiri (duplikasi kecil, bukan pelanggaran
  fungsional, tapi berlawanan dgn prinsip "centralize UI" kalau
  dibiarkan lama).
- Tab Growth (Cross Selling, Expansion) dan Revenue (Revenue, GP, HM
  Ranking) di menu Laporan MASIH pakai pola `ReportTabCard` `summaryItems`
  lama (§36.16, caption-line, bukan kartu grid) — BELUM dimigrasikan ke
  `ReportSummaryCards`. §36.18 mendeklarasikan standar ini berlaku utk
  "SEMUA tab Laporan", tapi instruksi paling baru user cuma eksplisit
  sebut "dormant dan repeat order" — perlu konfirmasi user apakah
  migrasi Growth/Revenue juga diminta sekarang atau menyusul terpisah.
- Key i18n `dormantCustomer.colSustain` jadi orphan (tidak dipakai lagi)
  sejak kolom "Bertahan?" dihapus §36.17 ronde 5 — belum dibersihkan,
  dampak minor (tidak mempengaruhi build/runtime).

---

Instruksi user: *"Jika aku ingin menambah 1 halaman help untuk semua
definisi. Deskripsi. Lalu rumus. Untuk setiap KPI ini bisa? Dan juga
referensi dokumen."* — halaman baru di aplikasi (bukan artifact/PDF
terpisah spt "Peta Populasi KPI" yang sudah dibuat), isinya deskripsi +
rumus tiap 10 KPI + link download dokumen sumber SSOT.

### 3 keputusan desain (dikonfirmasi user)

1. **Konten LEBIH DETAIL dari tooltip** (bukan reuse teks tooltip apa
   adanya) — halaman Help py ruang lebih luas dari popup chart, ditulis
   BARU (deskripsi lengkap tujuan bisnis + cara baca + rumus + definisi
   populasi + catatan interpretasi naik/turun), bukan i18n key yang sama.
2. **Dokumen referensi** — user akan UPLOAD file SSOT (`.docx`) ke sesi
   ini, disimpan sbg aset statis aplikasi (`frontend/public/`), halaman
   Help kasih tombol/link download. **Catatan risiko dicatat ke user**:
   folder `public/` bisa diakses langsung lewat URL TANPA login (di luar
   proteksi SPA router) — untuk dokumen definisi bisnis internal ini
   kemungkinan bukan masalah besar, tapi user sudah diberi tahu eksplisit,
   bukan disembunyikan.
3. **Menu** — item baru berdiri sendiri (ikon "?"), terlihat SEMUA user
   (bukan gated admin-only spt Settings).

### Rencana eksekusi (BELUM dikerjakan — nunggu file upload)

1. Terima file SSOT dari user, simpan ke `frontend/public/docs/` (nama
   file TBD setelah diterima).
2. Tulis konten detail 10 KPI (deskripsi+rumus+catatan) — M1-M4 tinggal
   diperkaya dari materi yg sudah diverifikasi §34-36, M5 perlu
   pelengkapan (§36.4 baru selesai kode, belum tooltip/doc lengkap), M6-M10
   perlu direview ulang dulu (belum sempat, lihat tabel status §36) SEBELUM
   halaman ini dianggap lengkap — supaya tidak campuran "sudah diverifikasi
   ketat" dan "belum direview" di 1 halaman yang sama.
3. Struktur konten — kemungkinan file baru terpisah (BUKAN reuse
   `customerMetrics.json`/`crossSelling.json`/`dormantCustomer.json` punya
   tooltip, sesuai keputusan #1 di atas) — nama TBD, mis. `help.json`.
4. Komponen halaman baru (`pages/Help/index.tsx` atau serupa) + route baru
   + item `NAV_ITEMS` (`config/menu.tsx`) icon "?" (`HelpOutlineIcon`),
   TANPA `permissionKey` (selalu terlihat).
5. Verifikasi `tsc`/`eslint`/`vite build` seperti biasa.

**Status: BELUM DIKERJAKAN** — nunggu (a) file upload dari user, (b)
M5-M10 selesai direview supaya kontennya lengkap konsisten.

### File sumber SUDAH DITERIMA (2026-08-25), eksekusi tetap ditunda

User upload dokumen aslinya, saat ini di root project (BUKAN
`frontend/public/docs/` — belum dipindah, sengaja ditunda sampai halaman
Help benar-benar dikerjakan, sesuai instruksi user: *"catat dalam
dokumentasi. Tapi saat ini kita kerjakan KPI yang belum selesai terlebih
dahulu"*):

```
/home/pacman/e-dashbord/DEFINISI OPERASIONAL CUSTOMER LOYAL DASHBOARD.docx
```
(Microsoft Word 2007+, 3.668.605 bytes, diverifikasi valid via `file`)

**Belum ter-track git** (sama seperti `presentasi-fitur-dashboard.docx` yang
sudah lebih dulu ada di root, keduanya untracked) — TIDAK di-`git add`
sampai jelas mau dipindah ke `frontend/public/docs/` sebagai bagian
eksekusi §37, supaya tidak nyangkut di riwayat git di 2 lokasi berbeda
(root DAN public/) kalau nanti dipindah.

Prioritas SEKARANG (instruksi user): lanjutkan review KPI yang belum
selesai (M6-M10, lihat tabel status §36) — §37 dilanjutkan setelah itu.

---

## 36.20 Tooltip info di kartu ringkasan Laporan (2026-08-26)

Instruksi user: *"Kamu harus verifikasi setiap data nya dan berikan info
tooltip agar user tidak salah faham"* — dipicu laporan sebelumnya bahwa
"Total Existing Customer" (855) di tab Repeat Order jauh lebih kecil dari
"Jumlah Dormant" (21.256) di tab Dormant.

**Verifikasi** (query langsung ke DB produksi lokal, bukan tebakan):
`established customers` (first_invoice_date < 2026-08-01) = 32.631 dari
32.994 total customer. Yang AKTIF (transaksi) di Agustus 2026 = 855 —
cocok persis dgn angka "Total Existing Customer". Dormant kasar (ambang
6 bulan flat) = 21.420 — dekat dgn angka aplikasi 21.256 (selisih wajar,
ambang aplikasi per-kategori divisi 3/6/12 bulan, bukan flat 6). Bukan
bug — 2 kartu itu memang menghitung populasi & jendela waktu yang beda:
"Total Existing" cuma yang aktif BULAN INI, "Jumlah Dormant" mencakup
SELURUH histori customer established.

**Ronde 1 (SALAH, ditegur keras)** — tooltip pertama ditulis berisi
penjelasan teknis ("populasi", "window", "established customer", "bukan
bug, sudah diverifikasi ke DB"), plus (saat verifikasi) membuka Playwright
cuma untuk mengecek TEKS yang baru saja ditulis sendiri ke file i18n —
2x ditegur: *"Yang menyuruhmu info toltip teknis itu siapa... Sudah
memperingatimu berulang kali"* dan *"KAMU PAKAI PKAYWRIGH? KAMU
MENULISNYA DI i18N BISA LU CEK LANGSUNG TANPA PEMBOROSAN TOKEN"*.

**Ronde 2 (final)** — SEMUA tooltip ditulis ulang jadi 1 kalimat pendek
bahasa awam, cuma jawab "apa arti angka ini" tanpa menyinggung kartu
lain/proses verifikasi/istilah teknis. Contoh: "Jumlah Dormant" →
*"Pelanggan yang sudah lama tidak beli, melewati batas waktu tidak aktif
untuk kategori bisnisnya."* Verifikasi teks dilakukan via Read/grep
langsung ke file JSON (bukan Playwright — itu cuma buat cek VISUAL/
layout, bukan ISI TEKS). Lesson disimpan sbg memory
`feedback_no_technical_jargon_user_facing_text`.

**Implementasi**: `ReportSummaryCardItem.info?: string` (baru) di
`ReportSummaryCards.tsx` — render `InfoOutlinedIcon` kecil (pola sama
persis `MuiTooltip`+`InfoOutlinedIcon` yang sudah dipakai M3-M7) di
sebelah label kartu. Sekalian `ReactivationSummaryCards.tsx` DIREFACTOR
pakai `ReportSummaryCards` (sebelumnya implementasi paralel/duplikat
sejak §36.19 — dibereskan sekarang, Centralize UI). Dipasang di tab
Repeat Order, Dormant, Reaktivasi (Report/Retention/index.tsx).

---

## 36.21 Terapkan standar ke Laporan Growth — Cross Selling + Ekspansi (2026-08-26)

Lanjutan §36.18/§36.19/§36.20 — instruksi user: *"LANJUTKAN UNTUK LAPORAN
GROWHT. CROS SELLING DAN EKSPANSI"*.

**Tab Cross Selling**: `ReportSummaryLine` (caption-line lama) diganti
`ReportSummaryCards` (3 kartu: Customer Aktif/`PeopleOutlineIcon`,
Cross-Selling Rate/`SwapHorizIcon` highlighted, Rata-rata Kategori/
Customer/`CategoryIcon` — icon dipilih SAMA PERSIS icon `SectionLabel`
M1/M2 di dashboard utama, konsisten bahasa visual). `BreakdownTable`
sendiri TIDAK diubah (tetap keputusan §36.16 — shared dgn
M1CrossSelling.tsx/M2AvgCategory.tsx, restrukturisasi internalnya di
luar scope halaman Laporan).

**Tab Ekspansi**: `ReportTabCard` `summaryItems` (caption-line lama)
dipindah jadi `ReportSummaryCards` di LUAR `ReportTabCard` (pola sama
persis Repeat Order/Dormant) — 4 kartu: Existing Customer
(`PeopleOutlineIcon`), Total Customer Active (`CheckCircleOutlineIcon`
success), Spending Naik (`TrendingUpIcon` primary, highlighted — KPI
utama tab ini), Spending Turun (`TrendingDownIcon` error). Icon
`TrendingUpIcon` SAMA PERSIS icon `SectionLabel` M7 di dashboard utama.

Semua 7 kartu baru dapat `info` tooltip bahasa awam (pola §36.20, id+en).
Verifikasi: `tsc --noEmit`+`eslint` bersih, screenshot Playwright kedua
tab (layout kartu rapi, tidak ada elemen tumpang tindih, icon+tooltip
ikon muncul benar) — Playwright dipakai di sini krn ini VERIFIKASI VISUAL
(layout kartu baru), bukan verifikasi teks (beda dari kesalahan §36.20
ronde 1).

**Belum dikerjakan**: tab Revenue/GP/HM Ranking (Report/Revenue/index.tsx)
masih pakai `ReportTabCard` `summaryItems` lama, belum dimigrasikan ke
`ReportSummaryCards` — menyusul kalau diminta.

---

## 36.22 Label kartu M7 (Ekspansi) bentrok istilah dgn M6 — diperbaiki (2026-08-26)

User menunjuk 3 angka berdampingan yang membingungkan: Growth·Cross
Selling "Customer Aktif" = 1.218, Growth·Ekspansi "Existing Customer" =
11.375 & "Total Customer Active" = 855, Retention·Repeat Order "Total
Existing Customer" = 855. *"KAMU MAU MEMBINGUNGKAN PEMAKAI?"*

**Verifikasi presisi ke source (bukan tebakan)**, per field:
- M1 `active_count` (Cross Selling, 1.218) — `m1.repository.ts`: SEMUA
  customer (baru+lama) dgn ≥1 transaksi periode ini, TANPA syarat riwayat
  sebelumnya. Ini keputusan bisnis resmi §34 (dokumen SSOT: populasi M1/M2
  MEMANG "Customer Aktif" murni, beda dari M3/M4/M6/M7 yang "Existing
  Customer"). Beda label ("Customer Aktif" vs "Existing Customer") DI SINI
  SUDAH BENAR — sengaja menandakan populasi lebih luas, bukan bug.
- M7 `total_existing` (Ekspansi, label lama "Existing Customer", 11.375) —
  `m3m7.repository.ts fetchExpansionBreakdown`: established customer YANG
  BELUM lewat ambang dormant per `filterDate` — TIDAK mensyaratkan
  transaksi di window periode yang sedang dilihat, populasi kumulatif
  jauh lebih luas.
- M7 `active_count` (Ekspansi, label lama "Total Customer Active", 855) —
  fungsi sama, subset `total_existing` dgn `cur_revenue > 0` di window
  periode ini = established DAN bertransaksi periode ini.
- M6 `total_existing` (Repeat Order, "Total Existing Customer", 855) —
  `m6.repository.ts`: `established_customers` JOIN `inv_active` (invoice
  APA PUN di window ini) — SECARA MATEMATIS IDENTIK definisi dgn M7
  `active_count` di atas (buktinya kedua angka = 855, sama persis).

**Akar masalah**: 2 field M7 (`total_existing`/`active_count`) sudah
POPULASINYA beda dari satu sama lain (benar, itu memang 2 metrik beda),
TAPI label i18n-nya SALAH PASANGAN — `summaryExisting` ("Existing
Customer") dipasang di `total_existing` yang populasinya BEDA dari label
sejenis di M3-M6, sementara `dialogActiveCount` ("Total Customer Active")
dipasang di `active_count` yang justru SAMA PERSIS definisi dgn "Total
Existing Customer" M3-M6 tapi diberi nama beda. Pola pembanding:
`dialogTotalExisting` (m7) SUDAH lama bernama presisi "Total Existing
Belum Dormant" (id) — cuma tidak dipakai di kartu ringkasan, cuma di
dialog drilldown.

**Perbaikan** (i18n saja, TIDAK ada perubahan data/query — angka tetap
sama, cuma namanya diluruskan):
- `customerMetrics.m7.summaryExisting`: "Existing Customer" → **"Total
  Existing Belum Dormant"** (en: "Total Existing Not-Yet-Dormant") — SAMA
  PERSIS teks `dialogTotalExisting` yang sudah ada, karena memang field
  yang sama.
- `customerMetrics.m7.dialogActiveCount`: "Total Customer Active" →
  **"Total Existing Customer"** (en sama) — SAMA PERSIS teks
  `customerMetrics.m3/m4/m5/m6.summaryExisting`, karena memang definisi
  yang sama (established + transaksi periode ini).

**Dampak** (1 titik ubah, 3 tempat kena — Centralize UI, key i18n dipakai
bersama): kartu ringkasan M7ExpansionGrowth.tsx (dashboard `/growth`),
dialog drilldown M7ExpansionGrowth.tsx + M7Expansion.tsx (workbench
Customer Metrics), kartu Report/Growth Ekspansi — SEMUA otomatis
konsisten sekaligus, bukan cuma di halaman Laporan.

Verifikasi: JSON valid + `tsc --noEmit` bersih. TIDAK dibuka Playwright
lagi (pelajaran §36.20 — ini murni perubahan teks label, sudah
dikonfirmasi lewat pembacaan langsung source+i18n, bukan visual baru).

---

## 36.23 Kartu Ekspansi dipecah berjenjang + label Cross Selling diperjelas (2026-08-26)

Susulan §36.22 — user menunjuk screenshot kartu Ekspansi yang BARU
diperbaiki labelnya, minta 1 langkah lebih jauh: *"Tambahkan Total
pelanggan -> All customer, Dormant, Belum dormant, aktif 855"* — dan
Cross Selling "Customer Aktif" (1.218) diminta jadi eksplisit "Total
Pelanggan Aktif + Baru" (menandakan populasinya BEDA dari "Existing"
KPI lain, per temuan §36.22).

**Cross Selling**: label kartu `crossSelling.activeCustomerLabel`
("Customer Aktif") TIDAK diubah (masih dipakai tempat lain), key BARU
`activeCustomerLabelFull` ("Total Pelanggan Aktif + Baru") dipasang
KHUSUS di kartu ringkasan Laporan Growth.

**Ekspansi — kartu dipecah jadi 6, urutan mengikuti hierarki pecahan
(bukan acak)**:
```
Total Pelanggan (32.631)
├─ Jumlah Dormant (21.256)     — reuse dormantCustomer.dormantCountLabel,
│                                 fetch BARU via useDormantBreakdown
│                                 (hook SAMA dipakai tab Dormant
│                                 Retention, scope+periode SAMA)
└─ Belum Dormant (11.375)      — field total_existing yang SUDAH ada,
    └─ Aktif (855)             cuma dipindah label (existing field)
        ├─ Spending Naik (589, highlighted)
        └─ Spending Turun (2.286)
```
Verifikasi matematis: 21.256 + 11.375 = 32.631 (Dormant + Belum Dormant =
Total Pelanggan, persis). "Total Pelanggan" DIHITUNG CLIENT-SIDE
(`dormantCount + belumDormantCount`), bukan query baru — kedua komponennya
sudah dari 2 fetch yang sudah ada/ditambahkan (`useExpansionBreakdown` +
`useDormantBreakdown` BARU), TIDAK ada perubahan backend.

Icon baru: `PauseCircleOutlinedIcon` (Dormant, warning — SAMA persis icon
tab Dormant Retention) dan `BoltIcon` (Aktif, primary — outline/line-art,
bukan filled, aman dari kesalahan icon ronde sebelumnya §36.17).

i18n key baru: `customerMetrics.m7.summaryTotalPelanggan(+Info)`,
`summaryDormantInfo`, `summaryBelumDormant`, `summaryAktif` (id+en) +
`crossSelling.activeCustomerLabelFull` (id+en). Info tooltip "Belum
Dormant"/"Aktif" REUSE teks yang sudah ada (`summaryExistingInfo`/
`dialogActiveCountInfo`, §36.22) — field yang sama, tidak perlu tulis
ulang.

Verifikasi: `tsc --noEmit`+`eslint` bersih, screenshot Playwright kedua
tab (dipakai krn ini VISUAL layout baru 6-kartu, bukan cuma teks) —
kartu 1 baris rapi di desktop 1440px, matematika breakdown cocok persis
dgn angka yang ditampilkan.

**Susulan — tooltip 3 kartu dirapikan** (instruksi user: "Perbaiki juga
tooltip nya"):
- Cross Selling "Total Pelanggan Aktif + Baru" — tooltip lama tidak
  menyebut "+ Baru" sama sekali (cuma "bertransaksi minimal 1 kali
  periode ini"), padahal itu justru poin utama kenapa labelnya diubah.
  Ditambah klausa "termasuk yang baru pertama kali beli".
- Ekspansi "Belum Dormant" — tooltip lama (`summaryExistingInfo`) masih
  bawa sisa kalimat pembanding dari versi sebelum kartu dipecah 6
  ("tidak dibatasi harus bertransaksi bulan ini") — dipotong jadi murni
  deskripsi kartu itu sendiri: "Pelanggan yang belum melewati batas
  waktu tidak aktif."
- Ekspansi "Total Pelanggan" — tooltip lama menyebut "gabungan yang
  dormant dan yang belum dormant" (menyinggung 2 kartu lain secara
  tersirat) — disederhanakan jadi kalimat SAMA PERSIS pola
  `dormantCustomer.m10SummaryAllInfo` yang sudah ada: "Semua pelanggan
  yang sudah pernah bertransaksi sebelum periode ini."
- "Aktif"/"Jumlah Dormant" TIDAK diubah — sudah plain sejak ditulis,
  tidak menyinggung kartu lain.

Verifikasi: JSON valid (Read langsung) + `tsc --noEmit` bersih. TIDAK
dibuka Playwright (murni teks, pelajaran §36.20).

---

## 36.24 "Belum Dormant" (Ekspansi) vs "Aktif"+"Reaktivasi" (Retention) — diverifikasi COCOK, bukan bug (2026-08-26)

User screenshot 2 tab bersebelahan: Growth·Ekspansi (Total Pelanggan
32.631, Jumlah Dormant 21.256, **Belum Dormant 11.375**, Aktif 855) vs
Retention·Reaktivasi (Total Pelanggan 32.631, **Aktif 11.271** (34.5%),
Dormant 21.256 (65.1%), **Reaktivasi 104** (0.3%), Dormant Kembali 0).
*"Data tidak sama"*.

**Verifikasi presisi** (bukan tebakan aritmatika kebetulan):
- Total Pelanggan (32.631) & Dormant (21.256) SUDAH cocok exact di kedua
  tab — konfirmasi kedua page pakai periode+scope yang sama saat
  screenshot diambil.
- 11.271 (Aktif) + 104 (Reaktivasi) = **11.375** — PERSIS sama dgn "Belum
  Dormant" Ekspansi.
- Ditelusuri ke source (`m3m7.repository.ts fetchExpansionBreakdown`
  `established_not_dormant` vs `m8m10.repository.ts
  fetchCustomerDormantStatusLog` `is_dormant_at_me`/klasifikasi status):
  KEDUANYA pakai formula IDENTIK (`last_invoice > filterDate -
  dormant_threshold`, `dormantThresholdCaseSql` yang SAMA, gerbang
  established/`is_existing_at_me` yang SAMA — `first_invoice < periodStart`)
  — bukan cuma angka kebetulan sama, RUMUSNYA MEMANG SAMA.

**Kesimpulan**: "Belum Dormant" (Ekspansi) itu pecahan 2-arah (Dormant vs
Bukan). "Aktif"/"Dormant"/"Reaktivasi"/"Dormant Kembali" (Reaktivasi)
itu pecahan 4-arah dari POPULASI YANG SAMA — "Reaktivasi" adalah SUBSET
dari "Belum Dormant" yang dipisah jadi kategori sendiri (customer yang
baru saja kembali dari dormant, bukan "belum pernah dormant" murni).
Bukan bug — Reaktivasi tab MEMANG dirancang lebih rinci dari Ekspansi.

**Perbaikan**: tooltip `customerMetrics.m7.summaryExistingInfo` ("Belum
Dormant") ditambah 1 klausa singkat supaya angkanya tidak dikira exclude
customer reaktivasi: *"...termasuk yang baru saja aktif kembali setelah
sempat dormant."* Verifikasi: JSON valid + `tsc --noEmit` bersih.

---

## 36.25 Kartu "Aktif" Reaktivasi digabung dgn "Reaktivasi" (2026-08-26)

Susulan §36.24 — instruksi user: *"Berarti angkanya aktif di halaman
reaktifasi itu tambahkan juga Aktif plus reaktivasi"*. Kartu "Aktif" tab
Reaktivasi SEBELUMNYA cuma status `active` murni (11.271) — sekarang
digabung `active + reactivated` (11.271 + 104 = **11.375**), supaya
angkanya cocok PERSIS dgn "Belum Dormant" tab Ekspansi (populasi sama,
sudah dibuktikan §36.24).

**Yang TIDAK berubah** (scope literal, sesuai instruksi — cuma "angka
Aktif"): kartu "Reaktivasi" TETAP terpisah menampilkan `reactivated`
sendiri (104, tidak dihapus/digabung ke Aktif secara visual sbg 1
kartu) — implikasinya SUM ke-5 kartu SEKARANG TIDAK LAGI = Total
Pelanggan (11.375+21.256+104+0 = 32.735, lebih dari 32.631, krn
Reaktivasi kehitung 2x — sekali di "Aktif" gabungan, sekali di kartu
sendiri) — trade-off SADAR, disetujui via instruksi eksplisit user
(prioritas: angka "Aktif" harus rekonsil dgn Ekspansi, bukan lagi
partisi 4-arah murni). Tabel + filter dropdown Status DI BAWAH kartu
TIDAK ikut berubah — masih 4 kategori terpisah (active/dormant/
reactivated/relapsed), cuma KARTU ringkasannya yang digabung.

Implementasi: `ReactivationSummaryCards.tsx` — `activeCombined = active
+ reactivated` dipakai utk value+pct kartu "Aktif" saja, prop `active`/
`reactivated` yang diterima komponen TIDAK berubah (tetap 2 angka
terpisah dari caller). Tooltip `dormantCustomer.m10SummaryActiveInfo`
disesuaikan (id+en), pola sama §36.24.

Verifikasi: JSON valid + `tsc --noEmit`+`eslint` bersih, screenshot
Playwright (perubahan ANGKA, bukan cuma teks — layak diverifikasi
visual) — kartu "Aktif" tampil 11.375 (34.9%), cocok dgn Ekspansi "Belum
Dormant".

---

## 36.26 Kartu "Aktif" Reaktivasi di-rename jadi "Belum Dormant" (2026-08-26)

Susulan §36.25 — user tanya: *"pelanggan existing itu berarti pelanggan
lama yang aktif transaksi kan? dihalaman repeat order? kenapa jumlah
nya 855 sedangkat aktif 11.375"* — membandingkan Repeat Order "Total
Existing Customer" (855) dgn Reaktivasi "Aktif" (11.375, hasil merge
§36.25).

**Jawaban (sudah diverifikasi, bukan cuma jawab pertanyaan)**: 855 =
established customer yang bertransaksi SPESIFIK bulan Agustus. 11.375 =
established customer yang BELUM lewat ambang dormant, TIDAK disyaratkan
harus beli spesifik bulan ini (bisa saja transaksi terakhirnya Mei,
tapi ambang divisinya 6 bulan → per Agustus belum dormant). 2 hal
berbeda, bukan bug.

**Tapi ditemukan MASALAH BARU** (efek samping §36.25 yang tidak
disadari saat itu): kata **"Aktif"** sekarang dipakai 2 kartu beda tab
dgn ARTI BEDA — Ekspansi "Aktif" (855, transaksi bulan ini) vs
Reaktivasi "Aktif" (11.375, belum lewat ambang dormant, setelah merge
§36.25). Tabrakan istilah PERSIS pola yang sudah diperbaiki §36.22
("Existing Customer" 2 arti beda) — kali ini justru saya yang tidak
sadar menciptakannya sendiri lewat merge §36.25.

**Perbaikan**: label kartu `dormantCustomer.m10SummaryActiveShort`
diganti dari "Aktif" → **"Belum Dormant"** (id), "Active" → **"Not Yet
Dormant"** (en) — SAMA PERSIS istilah `customerMetrics.m7.
summaryBelumDormant` (Ekspansi) utk angka yang SAMA PERSIS (11.375),
menghilangkan tabrakan tanpa mengubah nilai gabungan yang baru
diminta di §36.25. Nilai `activeCombined` (`active+reactivated`) TIDAK
berubah — cuma labelnya.

Verifikasi: JSON valid + `tsc --noEmit`+`eslint` bersih, screenshot
Playwright — kartu tampil "Belum Dormant / 11.375 (34.9%)".
