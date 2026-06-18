# product-workbench/decisions.md

> Keputusan dan inferensi untuk Product & Portfolio Workbench (Group 3).
> Baca juga: `product-workbench/overview.md`, `product-workbench/api.md`, `customer-workbench/decisions.md`

## Keputusan yang Sudah Diambil

### 3.2 High Margin Push List tidak terhambat gap SKU/quantity

Halaman 3.2 bekerja di level kategori (`product_categories`), bukan level produk individual. Field `is_high_margin` sudah ada di schema. Data cukup dari `invoice_items JOIN product_categories`. Tidak perlu tabel `products` baru.

Status: bisa dikerjakan setelah split CustomerMetrics difinalisasi (lihat Keputusan Terbuka #1).

### 3.3 menggunakan M2 yang sudah ada, bukan metrik baru

Halaman 3.3 Product Trend & Velocity mereuse `AreaChartWidget` dari M2 (Avg Category per Customer) yang sudah ada. Tidak ada kalkulasi baru diperlukan — ini reuse chart yang sudah dibuat di halaman CrossSelling.

Catatan: M2 mengukur sisi customer (berapa kategori rata-rata per customer), bukan sisi kategori (kategori mana yang trennya naik). Lihat open decision #2 tentang apakah ini sudah cukup atau butuh agregasi berbeda.

---

## Keputusan Terbuka

### 1. Alokasi kolom CustomerMetrics ke 2.2 vs 3.2

Halaman CustomerMetrics existing berisi M3, M4, M5, M6, M7. Split yang disepakati:
- 2.2 Expansion: M3 + M4 + M7 (fokus customer relationship)
- 3.2 High Margin: M5 (fokus kategori margin)
- M6 Repeat Order Rate: dialokasikan ke 4.3 Transaction Workbench

Alokasi ini **belum final** — perlu konfirmasi apakah M6 di Group 4 atau tetap di Group 2. Beberapa kolom seperti `avg_gp` kemungkinan relevan di dua halaman sekaligus. Koordinasi dengan `customer-workbench/decisions.md` Keputusan Terbuka #1.

### 2. Scope halaman 3.3 — M2 saja atau tambah agregasi per kategori

Dua pilihan:
- **Opsi A**: halaman 3.3 cukup menampilkan M2 (AreaChartWidget existing, relabel), tidak ada metrik baru
- **Opsi B**: halaman 3.3 menambah chart "kategori apa yang tren penjualannya naik/turun" — ini butuh agregasi baru (revenue per kategori per bulan), berbeda dari M2

Opsi A lebih cepat. Opsi B lebih relevan untuk product manager tapi butuh endpoint baru. Belum diputuskan.

### 3. Scope halaman 3.4 — "kategori tidak terjual" vs "dead stock"

Dua interpretasi berbeda:
- **"Kategori tidak terjual"**: feasible dari `invoice_items` — deteksi kategori yang tidak ada di faktur dalam N bulan terakhir
- **"Dead stock"**: butuh data kuantitas inventori fisik — sistem tidak punya data ini, tidak bisa diimplementasi

Rekomendasi: gunakan terminologi "Kategori Tidak Aktif" atau "Kategori Dormant" untuk menghindari ekspektasi yang salah. Konfirmasi dengan tim apakah definisi "Kategori tidak terjual" sudah cukup memenuhi kebutuhan bisnis.

### 4. Apakah halaman 3.1 masuk MVP

Halaman 3.1 Product Performance Ledger butuh tabel `products` dengan kolom SKU, quantity, margin per produk — tidak ada di schema saat ini. Sumber data (Accurate API/export) belum dikonfirmasi punya field ini.

Opsi:
- **Tunda ke v2**: fokus MVP pada level kategori saja (sudah cukup untuk M1-M10)
- **Masuk MVP**: konfirmasi dulu format kolom Accurate, baru desain tabel dan endpoint

Blocker utama sama dengan yang tercatat di `product-workbench/overview.md`. Jangan mulai desain schema `products` sebelum konfirmasi dari tim tentang ketersediaan data sumber.

---

## Catatan untuk Sesi Selanjutnya

- Setelah keputusan terbuka #1 diselesaikan bersama `customer-workbench/decisions.md`, update tabel alokasi di sini.
- Endpoint di `product-workbench/api.md` bagian "Blocked" bisa di-unblock segera untuk 3.4 jika open decision #3 diselesaikan dengan memilih interpretasi "kategori tidak terjual" — tidak perlu konfirmasi data sumber Accurate.
