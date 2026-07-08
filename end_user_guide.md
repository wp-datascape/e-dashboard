# Panduan Pengguna — Executive Dashboard

> Panduan cara memakai aplikasi sehari-hari untuk **pengguna bisnis** (eksekutif, manajer, staf) — cara membaca dashboard, memakai filter, dan memahami arti tiap angka/grafik. Untuk topik teknis (keamanan, RBAC, cara import data, formula perhitungan detail), lihat `admin_guide.md`.

---

## Daftar Isi

1. [Memulai](#1-memulai)
2. [Dashboard — Ringkasan Eksekutif](#2-dashboard--ringkasan-eksekutif)
3. [Customer Workbench](#3-customer-workbench)
4. [Product & Portfolio](#4-product--portfolio)
5. [Transaction & Revenue](#5-transaction--revenue)
6. [Tips Pemakaian Umum](#6-tips-pemakaian-umum)

---

## 1. Memulai

### 1.1 Masuk ke Aplikasi

Buka aplikasi di browser, masukkan email dan password yang diberikan admin. Kalau lupa password, hubungi admin untuk direset (bukan lewat aplikasi sendiri — belum ada fitur "lupa password" mandiri).

### 1.2 Mengenal Tampilan Utama

| Bagian | Fungsi |
|---|---|
| **Sidebar (kiri)** | Daftar menu, dikelompokkan per area (Executive Dashboard, Customer Workbench, Product & Portfolio, Transaction & Revenue, Administration). Bisa diciutkan (collapse) jadi ikon saja lewat tombol hamburger di pojok kiri atas, berguna kalau layar sempit. |
| **AppBar (atas)** | Nama aplikasi, tombol ganti tema terang/gelap, dan avatar akun di pojok kanan. |
| **Avatar (pojok kanan atas)** | Klik untuk lihat profil singkat (nama, email, entitas/cabang yang bisa diakses) dan tombol Logout. |

Menu yang muncul di sidebar **berbeda-beda per orang** — tergantung hak akses yang diberikan admin. Kalau ada menu yang menurut Anda seharusnya ada tapi tidak muncul, hubungi admin.

### 1.3 Mengganti Bahasa, Tema, dan Warna Tampilan

Klik avatar di pojok kanan atas → **Settings**, atau lewat menu **Administration → Settings → App Settings** (kalau punya akses). Tersedia:
- **Bahasa:** Indonesia / English
- **Tema:** Terang / Gelap
- **Warna aksen:** 6 pilihan (Biru, Hijau, Kuning, Ungu, Merah Muda, Indigo)

Semua pilihan ini **tersimpan ke akun Anda** — akan tetap sama walau login dari HP, laptop kantor, atau perangkat lain.

### 1.4 Filter yang Muncul di Hampir Semua Halaman

Di bagian atas kebanyakan halaman data, ada baris filter dengan pola yang konsisten:

| Filter | Fungsi |
|---|---|
| **Entity/Perusahaan** | Pilih 1 perusahaan tertentu, atau "Semua Entitas" untuk gabungan seluruh holding. |
| **Branch/Cabang** | Muncul setelah pilih Entity — persempit ke 1 cabang tertentu. |
| **Division** | Muncul setelah pilih Branch — persempit ke saluran penjualan tertentu (Distribution, Project, E-commerce, dst). |
| **Periode/Tanggal** | Tentukan bulan atau tanggal acuan untuk perhitungan. |

**Opsi yang muncul di dropdown filter ini otomatis menyesuaikan hak akses Anda** — Anda cuma akan melihat pilihan perusahaan/cabang/divisi yang memang boleh Anda akses, tidak akan ada opsi "tersembunyi" yang sebenarnya tidak boleh dilihat.

---

## 2. Dashboard — Ringkasan Eksekutif

Halaman pertama yang terbuka setelah login (menu **Dashboard**). Menampilkan **ringkasan seluruh 10 indikator kinerja (KPI)** dalam satu layar.

### 2.1 Struktur Halaman

**Baris pertama** — 10 kartu kecil (satu per KPI), masing-masing menampilkan: nama KPI, nilai saat ini, dan panah naik/turun dibanding periode sebelumnya beserta grafik mini tren.

**Baris kedua** — 8 grafik yang lebih besar, memvisualisasikan KPI-KPI utama dengan cara berbeda-beda (grafik batang, area, donat, radial, dsb.) sesuai jenis datanya.

**Semua kartu dan grafik bisa DIKLIK** — akan membawa Anda ke halaman detail KPI itu (misal klik kartu "Repeat Order Rate" akan membuka halaman Expansion Targets dengan detail lengkap + daftar pelanggan).

### 2.2 Cara Membaca Tiap Indikator (Bahasa Awam)

| KPI | Yang Diukur | Baca Sebagai |
|---|---|---|
| **Cross Selling Ratio** | Berapa persen pelanggan aktif yang beli lebih dari 1 jenis kategori produk sekaligus | Makin tinggi = pelanggan makin "lengket", peluang bundling/cross-sell makin besar |
| **Avg Category per Customer** | Rata-rata jumlah kategori produk yang dibeli tiap pelanggan | Angka kecil (mendekati 1) = pelanggan cenderung beli 1 jenis produk saja |
| **Avg Revenue Existing Customer** | Rata-rata pendapatan per pelanggan lama yang masih aktif | Turun terus-menerus = tanda pelanggan lama mulai mengurangi belanja |
| **Avg Gross Profit Existing Customer** | Sama seperti di atas, tapi dari sisi laba kotor, dipecah 3 tingkat (Atas/Tengah/Bawah) | Lihat komposisi warnanya — kalau "Tier Bawah" makin besar porsinya, margin sedang tertekan |
| **High Margin Penetration** | Berapa persen pelanggan lama yang beli produk margin tinggi | Rendah = ada peluang upsell produk margin tinggi yang belum digarap |
| **Repeat Order Rate** | Berapa persen pelanggan lama yang order lebih dari 1x dalam 30 hari terakhir | Hijau = sudah capai target, Merah = jauh di bawah target (target bisa diatur admin) |
| **Customer Expansion Rate** | Berapa persen pelanggan lama yang belanjanya NAIK dibanding 30 hari sebelumnya | Tinggi = bisnis sedang tumbuh dari pelanggan existing (bukan cuma pelanggan baru) |
| **Dormant Customer Rate** | Berapa persen dari SELURUH pelanggan yang sudah 90 hari tidak transaksi | Ada garis batas (threshold) merah — kalau melewati itu, perlu perhatian khusus |
| **Dormant Customer Value** | Estimasi nilai rupiah yang "hilang" dari pelanggan yang jadi dormant | Diurutkan dari yang paling besar potensi kerugiannya — prioritas untuk di-follow-up |
| **Customer Reactivation Rate** | Berapa persen pelanggan dormant yang berhasil "dibangunkan" kembali transaksi | Target minimum biasanya 15-20% |

> Penjelasan rumus/perhitungan detail di balik tiap KPI ini ada di `admin_guide.md` bagian Metrik & KPI — dokumen ini sengaja fokus ke cara BACA-nya, bukan cara HITUNG-nya.

---

## 3. Customer Workbench

Grup menu untuk analisis mendalam seputar pelanggan.

### 3.1 Customer

Daftar master seluruh pelanggan. Kolom yang ditampilkan: kode pelanggan, nama, perusahaan, divisi, status (Aktif/Existing/Dormant/New — lihat definisi di §2.2 `admin_guide.md`), jumlah kategori produk yang pernah dibeli, rata-rata belanja bulanan, total nilai transaksi sepanjang waktu (lifetime value), tanggal transaksi terakhir, dan total jumlah faktur.

**Cara pakai:**
- Ketik nama/kode di kolom pencarian untuk mencari pelanggan tertentu.
- Klik header kolom untuk mengurutkan (kolom tertentu, seperti kode/nama, tidak bisa diurutkan — cuma bisa dicari).
- Klik satu baris pelanggan untuk membuka detail lengkap riwayat transaksinya.

### 3.2 Expansion Targets

Berisi 5 metrik terkait pertumbuhan pelanggan existing (Avg Revenue, Avg Gross Profit, High Margin Penetration, Repeat Order Rate, Customer Expansion Rate — M3 sampai M7).

**Cara pakai:**
- Grafik Revenue & Gross Profit bisa **diklik per batang bulan** untuk membuka rincian: siapa saja pelanggan penyumbang terbesar bulan itu, berikut opsi export ke PDF.
- Grafik Repeat Order Rate (bentuk radial/lingkaran) bisa diklik untuk lihat daftar pelanggan yang termasuk "repeat order" bulan itu.
- Kalau ada tanda peringatan (⚠) di grafik Revenue/Gross Profit, artinya ada 1 pelanggan yang menyumbang lebih dari 25% total — konsentrasi tinggi, risiko kalau pelanggan itu berhenti.

### 3.3 Churn Risk

Berisi 3 metrik terkait pelanggan yang berhenti transaksi (Dormant Rate, Dormant Value, Reactivation Rate — M8 sampai M10).

**Cara pakai:**
- Grafik Dormant Value menampilkan **ranking pelanggan** dengan potensi kerugian terbesar — prioritaskan follow-up dari urutan teratas.
- Garis ambang batas merah di grafik Dormant Rate menandakan level yang dianggap kritis (bisa diubah admin di Settings → Threshold).

### 3.4 Cross Sell Matrix

Berisi 2 metrik (Cross Selling Ratio, Avg Category per Customer — M1 dan M2), plus **matrix/heatmap** yang menunjukkan kombinasi Pelanggan × Kategori Produk — berguna melihat pola pembelian mana yang sering muncul bersamaan (dasar untuk strategi bundling).

---

## 4. Product & Portfolio

### 4.1 Product Ledger

Daftar seluruh kategori produk dengan performa masing-masing: status high-margin atau tidak, total revenue, total gross profit, margin %, jumlah pelanggan pembeli, jumlah transaksi, dan bulan terakhir kategori itu terjual. Diurutkan default dari revenue tertinggi.

### 4.2 High Margin Push

Dua tab:
- **Category Penetration** — persentase pelanggan existing yang sudah membeli kategori high-margin, per kategori.
- **Upsell Targets** — daftar pelanggan yang BELUM membeli kategori high-margin tertentu (kandidat langsung untuk penawaran upsell tim sales). Klik chip kategori untuk melihat riwayat pembelian pelanggan itu, atau untuk melihat detail kategori high-margin yang belum mereka beli.

### 4.3 Product Trend

Tren rata-rata jumlah kategori yang dibeli per pelanggan, dibandingkan periode sekarang vs periode sebelumnya — indikator apakah pola belanja pelanggan makin bervariasi atau makin sempit.

---

## 5. Transaction & Revenue

### 5.1 Transaction Ledger

Daftar seluruh faktur/invoice — nomor faktur, tanggal, perusahaan, pelanggan, divisi/channel bisnis, total revenue, total gross profit, margin %, jumlah kategori dalam faktur itu, dan sumber datanya (upload file atau sinkron Accurate). Bisa difilter Company/Branch/Division/periode seperti halaman lain.

### 5.2 Project Milestone

Halaman ini masih berupa **placeholder** — belum ada fitur aktif di baliknya. Jangan bingung kalau isinya kosong.

---

## 6. Tips Pemakaian Umum

- **Filter itu "menyempit ke bawah"** — pilih Entity dulu baru Branch muncul, pilih Branch dulu baru Division muncul. Kalau tidak pilih apa-apa, data yang tampil adalah gabungan semua yang memang jadi hak akses Anda (bukan berarti kosong).
- **Grafik yang bisa diklik biasanya px punya kursor "tangan"** saat di-hover — itu tanda ada detail lebih lanjut kalau diklik.
- **Mode HP vs Desktop otomatis berbeda tampilan** — di layar sempit, tabel data berubah jadi bentuk kartu (card list) supaya lebih mudah dibaca, bukan tabel scroll horizontal.
- **Aplikasi bisa di-install ke HP/laptop** seperti aplikasi biasa (tanpa App Store) — buka lewat browser, cari opsi "Add to Home Screen"/"Install App" di menu browser.
- **Data selalu real-time** — angka yang tampil bukan dari cache/tersimpan lama, selalu dihitung ulang dari data faktur terbaru setiap halaman dibuka.
- Kalau melihat pesan **"Under Maintenance"** di suatu halaman, itu bukan error — admin sengaja menonaktifkan sementara halaman tersebut lewat Feature Config.
