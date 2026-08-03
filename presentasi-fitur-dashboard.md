# Skrip Presentasi — Fitur & Metrik Executive Dashboard

> Panduan penjelasan tiap menu/card untuk audiens awam (non-teknis). Setiap
> metrik dijelaskan: **apa itu**, **basis periode/pembanding**, **tujuan/output
> untuk pembaca**, **sumber data**, **parameter**.

---

## Parameter yang Berlaku di (Hampir) Semua Halaman

Supaya tidak diulang-ulang tiap metrik, ini parameter filter yang muncul di
hampir semua halaman:

| Parameter | Fungsi |
|---|---|
| **Entitas** | Pilih 1 perusahaan (PT) atau "Semua Entitas" (gabungan holding) |
| **Divisi** | Pilih 1 divisi/channel penjualan (Distribution, Project, dst.) atau semua |
| **Periode** | Bulan/tanggal acuan — "per kapan" data ini dihitung |
| **Rentang** | Lookback: 1 / 3 / 6 / 12 bulan ke belakang dari Periode — jendela waktu yang dianggap "transaksi masih relevan" |
| **Kecualikan Intercompany** | Buang transaksi antar-perusahaan dalam 1 holding (supaya tidak dobel hitung sebagai "penjualan ke luar") |

**Sumber data untuk SEMUA metrik**: faktur penjualan yang diimport ke sistem
(upload Excel/CSV atau tarik otomatis dari Accurate). Tidak ada angka yang
diinput manual — semua turunan dari data faktur asli.

### Ringkasan Basis Perbandingan per Bagian

Ini penting karena BEDA-BEDA tiap bagian — jangan disamaratakan saat presentasi:

| Bagian | Basis pembanding |
|---|---|
| Dashboard Utama (10 kartu M1–M10) | **Bulan berjalan vs 1 bulan sebelumnya** (month-over-month/PoP) — dihitung dari 2 titik terakhir di tren 12 bulan |
| Halaman detail M1–M10 (Cross Selling, Ekspansi, Risiko Churn, Tren Produk) | Tren 12 bulan penuh (bisa dibaca visual bulan-ke-bulan); M2/Tren Produk juga tampilkan angka eksplisit "vs bulan sebelumnya" |
| High Margin (Penetrasi & Upsell) | **Snapshot titik-waktu saja** — TIDAK ada pembanding periode sebelumnya sama sekali, murni kondisi "saat ini" |
| Analisis | **YoY** — periode saat ini vs **periode sama persis 1 tahun lalu** (bukan PoP), granularitas bisa Bulanan/Kuartalan/Semester/Tahunan/YTD |

---

## 1. Executive Dashboard (Halaman Utama)

Ringkasan tingkat tinggi — 10 kartu metrik (M1–M10) sebagai angka besar +
mini-chart + indikator naik/turun **vs bulan sebelumnya**, lalu di bawahnya
versi chart lebih besar untuk 7 dari 10 metrik. Klik kartu/chart mana pun
membawa ke halaman detail metrik itu.

**Tujuan halaman ini**: 1 layar untuk cek kesehatan bisnis secara cepat tanpa
buka satu-satu halaman detail — cocok dibuka pertama kali tiap pagi/rapat
mingguan.

Definisi istilah (Customer Aktif, Existing, Dormant, dst.) ada di kotak
"Definisi" di paling bawah halaman — buka duluan saat presentasi supaya
audiens punya konteks sebelum lihat angka.

---

## 2. Customer Workbench

### 2a. Customer — Direktori Pelanggan

**Apa itu**: Database master seluruh customer, dengan status & metrik
performa per customer (bukan agregat perusahaan).

**Periode**: Snapshot kondisi customer saat ini per tanggal Periode dipilih.

**Tujuan/output**: Cari 1 customer spesifik, cek riwayat & segmentasinya
sebelum meeting/telepon customer itu — tahu status aktif/dormant, kategori
favorit, dan value historisnya dalam 1 layar.

**Sumber data**: `customers` + agregat dari `invoices`

**Parameter**: Entitas, Divisi, Periode, cari nama/kode

---

### 2b. Ekspansi (M3–M7)

Lima metrik tentang **perilaku belanja existing customer** (customer yang
sudah pernah beli sebelumnya, bukan baru pertama kali).

**Basis periode**: Tren 12 bulan, tiap titik = window "Rentang" bulan
berjalan-mundur dari titik itu (independen per bulan, bukan akumulasi).

#### M3 — Revenue Existing Customer
- **Apa itu**: Total & rata-rata omset dari existing customer per bulan, +
  garis rata-rata & median.
- **Tujuan/output**: Menjawab pertanyaan "pertumbuhan omset kita datang dari
  pelanggan LAMA yang belanja lebih banyak, atau cuma dari terus dapat
  pelanggan baru?" Kalau M3 stagnan/turun sementara omset total naik, artinya
  pertumbuhan rentan — terlalu bergantung akuisisi baru yang lebih mahal &
  tidak sustainable. Garis median jauh di bawah rata-rata = omset numpuk di
  segelintir customer besar (risiko konsentrasi).

#### M4 — Gross Profit Existing Customer
- **Apa itu**: Sama seperti M3 tapi laba kotor, dipecah 3 tier (Atas/Tengah/
  Bawah berdasar median GP).
- **Tujuan/output**: Tahu SIAPA yang sebenarnya paling untung — omset besar
  belum tentu laba besar. Output-nya dipakai buat prioritas effort account
  management: fokus jaga tier Atas, cari cara naikkan margin tier Bawah.

#### M5 — Penetrasi Produk High Margin
- **Apa itu**: % existing customer yang membeli produk yang ditandai "high
  margin" dalam window aktif.
- **Tujuan/output**: Ukur keberhasilan dorong pelanggan lama beli produk
  margin tebal. Kalau rendah, sinyal campaign/edukasi sales soal produk
  fokus belum jalan efektif — perlu training atau insentif berbeda.

#### M6 — Repeat Order Rate
- **Apa itu**: % existing customer yang order **lebih dari 1x** dalam window
  aktif (bukan cuma "pernah beli").
- **Tujuan/output**: Ukur loyalitas jangka pendek riil, dibanding target
  (default 80%). Di bawah target = ada gejala masalah retensi (kepuasan,
  kualitas layanan, atau kompetitor) yang perlu digali lebih dalam.

#### M7 — Customer Expansion Rate
- **Apa itu**: % existing customer yang belanjanya **naik** dibanding window
  sebelumnya (metrik ini SENDIRI sudah membandingkan 2 window, terpisah dari
  indikator PoP dashboard).
- **Tujuan/output**: Indikator pertumbuhan organik dari base pelanggan lama.
  Expansion rate rendah = growth perusahaan terlalu bergantung pelanggan
  baru terus-menerus, bukan tanda sehat jangka panjang.

**Sumber data**: `invoices` + `invoice_items`

**Parameter**: Entitas, Divisi, Periode, Rentang

---

### 2c. Risiko Churn (M8–M10)

Tiga metrik tentang **pelanggan yang berhenti/berisiko berhenti beli**.
Basis periode: tren 12 bulan, snapshot per bulan.

#### M8 — Dormant Customer Rate
- **Apa itu**: % dari **seluruh** customer (bukan cuma existing) yang tidak
  transaksi selama 90 hari (default, bisa diatur per unit bisnis).
- **Tujuan/output**: Ukur SKALA masalah churn secara cepat — kalau lewat
  ambang alert (default 10%), jadi trigger untuk aksi reaktivasi
  besar-besaran, bukan cuma per-customer.

#### M9 — Dormant Customer Value
- **Apa itu**: Ranking customer dormant berdasar estimasi omset hilang
  (rata-rata omset bulanan historis × lama sudah dormant).
- **Tujuan/output**: Ini yang bikin follow-up jadi TERARAH — bukan hubungi
  semua customer dormant secara acak, tapi prioritaskan yang value-nya
  paling besar dulu. Output-nya langsung berupa daftar nama siap
  ditindaklanjuti sales/CS.

#### M10 — Reactivation Rate
- **Apa itu**: % customer dormant periode lalu yang berhasil kembali
  transaksi periode ini.
- **Tujuan/output**: Ukur EFEKTIVITAS usaha win-back yang sudah dilakukan
  (bukan cuma "berapa banyak yang dihubungi" tapi "berapa yang beneran balik
  beli"), dibanding target 15-20%. Rendah terus = strategi reaktivasinya
  perlu dievaluasi ulang, bukan cuma ditambah usahanya.

**Sumber data**: `customers` + tanggal transaksi terakhir dari `invoices`

**Parameter**: Entitas, Divisi, Periode. Threshold "dormant" diatur di
Settings → Threshold, beda-beda per unit bisnis.

---

### 2d. Cross Selling (M1, M1.1, M2)

**Basis periode**: Tren 12 bulan; M2 juga tampilkan angka eksplisit "vs bulan
sebelumnya".

#### M1 — Cross Selling Ratio
- **Apa itu**: % customer aktif yang dalam 1 transaksi membeli **lebih dari 1
  kategori produk** berbeda.
- **Tujuan/output**: Kalau rasio rendah, artinya banyak peluang cross-sell
  belum digarap — dasar keputusan untuk dorong sales tawarkan produk
  pelengkap saat closing.

#### M1.1 — Heatmap Customer × Kategori (drill-down M1)
- **Apa itu**: Matrix visual customer vs kategori produk yang dibeli.
- **Tujuan/output**: Paling actionable dari 3 metrik ini — langsung kelihatan
  kategori APA yang belum dibeli tiap customer, jadi bisa dibikin daftar
  rekomendasi konkret per customer untuk sales follow-up.

#### M2 — Rata-rata Kategori per Customer
- **Apa itu**: Rata-rata jumlah jenis kategori produk berbeda yang dibeli
  tiap customer aktif.
- **Tujuan/output**: Indikator umum "kedalaman belanja". Trennya turun = ada
  tanda pelanggan mulai menyempit belanjanya, layak diinvestigasi
  (kompetitor masuk? masalah stok/harga?).

**Sumber data**: `invoices` + `invoice_items` + `product_categories`

**Parameter**: Entitas, Divisi, Periode, Rentang

---

## 3. Product & Portfolio

### 3a. Produk — Buku Besar Kinerja Produk

**Apa itu**: Daftar semua produk dengan revenue, gross profit, dan margin %
masing-masing.

**Periode**: Snapshot kondisi per Periode+Rentang yang dipilih, tanpa
pembanding periode lain di tabel utama.

**Tujuan/output**: Keputusan operasional level produk — mana yang laku &
untung, jadi dasar keputusan stok, harga, atau discontinue produk tertentu
(beda dari M3/M4 yang levelnya per-customer, ini per-produk).

**Sumber data**: `invoices` + `invoice_items` + `product_categories`

**Parameter**: Entitas, Divisi, Periode, Rentang, kategori/item type, toggle
"High Margin"

---

### 3b. High Margin — Penetrasi & Target Upsell

**Apa itu**: Fitur 2-bagian seputar "produk fokus" — produk/kategori yang
ditandai admin sebagai prioritas margin tinggi per divisi.

**Periode**: **Snapshot murni, TIDAK ADA pembanding periode sebelumnya** —
beda dari kebanyakan metrik lain di dashboard ini. Kalau audiens tanya "naik
turunnya berapa persen dibanding bulan lalu", jawabannya: fitur ini memang
sengaja dirancang cuma tampilkan kondisi SAAT INI.

#### Tab Penetrasi Produk
- **Apa itu**: Tiap produk fokus: berapa customer sudah beli, revenue-nya,
  dan Divisi mana saja yang menandainya sebagai KPI.
- **Tujuan/output**: Evaluasi apakah target penetrasi produk fokus tiap
  divisi tercapai — basis rapat evaluasi strategi jual per divisi.

#### Tab Target Upsell
- **Apa itu**: Customer yang **BELUM PERNAH** beli kategori high margin
  tertentu, padahal aktif beli kategori lain.
- **Tujuan/output**: Paling langsung actionable di seluruh dashboard —
  outputnya BUKAN angka/persentase, tapi daftar nama customer siap
  ditindaklanjuti sales hari itu juga.

**Sumber data**: `high_margin_products` (memo diinput admin di Settings) +
`invoices`/`invoice_items`

**Parameter**: Entitas, Divisi, Periode, Rentang, Kecualikan Intercompany

---

### 3c. Tren Produk (M2 — versi detail)

**Apa itu**: Versi khusus M2 sebagai tren 12 bulan penuh dengan angka
eksplisit periode saat ini vs sebelumnya.

**Periode**: PoP (bulan berjalan vs bulan sebelumnya), sama seperti kartu M2
di Dashboard tapi dengan tampilan tren penuh.

**Tujuan/output**: Sama seperti M2, versi untuk presentasi tren jangka
panjang (bukan cuma 1 angka snapshot).

**Sumber data & parameter**: sama seperti M2.

---

## 4. Transaksi & Revenue

### 4a. Transaksi — Buku Besar Faktur

**Apa itu**: Daftar mentah semua transaksi/faktur, satu baris = satu faktur.

**Periode**: Rentang tanggal manual (bukan bulan-per-bulan seperti metrik
lain) — filter fleksibel sesuai kebutuhan cek.

**Tujuan/output**: BUKAN untuk pengambilan keputusan strategis — ini alat
audit/verifikasi. Dipakai buat cek transaksi spesifik, cross-check data yang
kelihatan janggal di metrik lain, atau lihat aktivitas harian mentah.

**Sumber data**: `invoices` + `invoice_items`

**Parameter**: Entitas, Divisi, Rentang tanggal, cari no. faktur/customer

---

### 4b. Proyek — Milestone Proyek

**Apa itu**: Pelacakan transaksi tergolong proyek (bukan penjualan
reguler/distribusi), dengan progres milestone-nya.

**Periode**: Status berjalan per Periode dipilih.

**Tujuan/output**: Pantau kesehatan proyek yang sedang berjalan, deteksi dini
proyek yang mundur dari target milestone sebelum jadi masalah besar.

**Sumber data**: `invoices` (teridentifikasi via divisi Project) + data
milestone terkait

**Parameter**: Entitas, Periode

---

## 5. Analisis — Perbandingan Performa Customer

**Apa itu**: Laporan revenue & margin **per customer**, dibandingkan ke
**periode sama tahun lalu**. Customer prioritas (Pareto — kontributor omset
terbesar) selalu ditampilkan duluan.

**Basis periode — PALING PENTING dijelaskan ke audiens**: Ini **YoY murni**,
BUKAN PoP seperti kebanyakan halaman lain. Kuartal 3 2026 dibandingkan ke
Kuartal 3 2025 (bukan ke Kuartal 2 2026). Granularitas periode bisa dipilih:
Bulanan, Kuartalan, Semester, Tahunan, atau YTD (year-to-date, tetap basis
YoY — Jan-bulan berjalan tahun ini vs Jan-bulan yang sama tahun lalu).

**Tujuan/output**: Deteksi dini customer yang tumbuh vs menyusut dibanding
periode yang SAMA tahun lalu (menghindari bias musiman — wajar kalau Q4 lebih
tinggi dari Q1, makanya dibandingkan ke Q4 tahun lalu bukan Q1 tahun ini).
Ada alert otomatis kalau penurunan lewat ambang batas (default 15%, diatur di
Settings → Threshold), jadi tim bisa follow up customer SEBELUM mereka jadi
dormant sepenuhnya — ini fungsi "peringatan dini", beda dari M8-M10 yang
sifatnya lebih ke "laporan setelah kejadian".

**Sumber data**: `invoices` + `invoice_items`, ditandingkan dengan data
periode yang sama persis 1 tahun sebelumnya

**Parameter**: Entitas, Divisi, jenis Periode, tanggal acuan, cari customer,
toggle "Customer Pareto" & "Kecualikan Intercompany"

---

## 6. Menu Administrasi (Sekilas)

Bagian ini bukan metrik analitik, cukup disebut singkat kalau ditanya:

| Menu | Fungsi Singkat |
|---|---|
| **Import** | Upload faktur (Excel/CSV) atau tarik otomatis dari Accurate Online |
| **Users / RBAC** | Kelola user, role, dan hak akses |
| **Settings → Threshold** | Atur ambang batas target tiap metrik per unit bisnis |
| **Config → Fitur** | Aktif/nonaktifkan halaman per environment |
| **Audit/Activity/Login Log** | Jejak siapa mengubah apa, kapan |

---

## Ringkasan Cepat (Kalau Waktu Presentasi Terbatas)

1. **Dashboard** → gambaran besar 10 metrik sekaligus, PoP vs bulan lalu
2. **Ekspansi (M3-M7)** → cerita "pelanggan lama": apakah growth kita sehat
   (dari existing customer) atau rapuh (cuma dari akuisisi baru terus)
3. **Risiko Churn (M8-M10)** → cerita "pelanggan hilang": skala masalah,
   prioritas siapa, dan efektivitas usaha win-back
4. **High Margin** → cerita strategi produk fokus per divisi + daftar
   konkret siap ditindaklanjuti (satu-satunya yang snapshot murni, tanpa
   pembanding periode)
5. **Analisis** → cerita YoY per customer dengan peringatan dini otomatis —
   tekankan ini beda dari 4 poin di atas karena basisnya tahun-ke-tahun,
   bukan bulan-ke-bulan
