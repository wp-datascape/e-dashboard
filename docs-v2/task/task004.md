# Task 004 — Fitur Retention Cohort (Retained/Churned/New) per Customer & Produk

> Status: 📝 Planning — belum mulai implementasi
> Dibuat: 2026-07-21
> Baca juga: `features/customers.md`, `features/metrics.md`, `customer-workbench/overview.md`, `raw_transactions_export.sql` (root project — prototipe query mentah, belum di-commit)

---

## 1. Latar Belakang & Tujuan

Divisi terkait butuh analisis retention: per customer + produk, bandingkan belanja di satu rentang periode vs periode yang sama tahun berikutnya (mis. Jan-Jun 2025 vs Jan-Jun 2026), lalu klasifikasikan tiap baris jadi:
- **Retained** — beli di kedua periode
- **Churned** — beli di periode awal saja, tidak muncul lagi di periode berikutnya
- **New** — cuma muncul di periode kedua (belum pernah beli di periode pertama)

Riset di sesi ini (2026-07-21) konfirmasi: fitur ini **belum ada sama sekali** di dashboard, di branch manapun (`main`, `dev`, `Feature`, `frontend`, termasuk remote) — tidak ada endpoint backend, tidak ada halaman frontend, tidak ada history commit yang menyebut "retention"/"cohort". Yang paling dekat adalah **Churn Risk** (`GET /dormant-customer`, `m8m10.repository.ts`) — tapi itu ngukur *dormancy* (berapa bulan sejak transaksi terakhir per customer), bukan perbandingan cohort dua periode per customer+produk seperti yang diminta di sini.

Sebagai jembatan sementara, dibuat SQL manual (`raw_transactions_export.sql`, root project, **Query C**) yang dijalankan langsung lewat Navicat/psql ke database — bukan fitur dashboard. Task ini adalah rencana untuk mengangkat logic Query C itu jadi fitur permanen di dashboard (menu + endpoint + export Excel), supaya tidak perlu lagi export manual tiap kali dibutuhkan.

**Tujuan task ini:** halaman baru di dashboard yang menampilkan retention cohort per customer+produk untuk 2 rentang tanggal yang bisa dipilih user, dengan tombol export ke Excel.

---

## 2. Referensi Logic (dari prototipe SQL)

Query C di `raw_transactions_export.sql` (root project) sudah membuktikan logic-nya jalan terhadap data lokal:

- Grain: 1 baris = 1 customer + 1 produk (agregat lintas invoice dalam rentang periode)
- Kolom: `customer_code`, `customer_name`, `business_unit`, `branch_name`/`channel_name` (gabungan kalau lebih dari satu), `product_name`, `product_category`, tanggal transaksi pertama/terakhir, daftar bulan aktif, daftar nomor SI, `total_qty`/`total_revenue`/`total_gp` per periode, `jumlah_transaksi` per periode, `status_retention`
- Status ditentukan dari `SUM(revenue)` tiap periode: keduanya > 0 → Retained; cuma periode 1 → Churned; cuma periode 2 → New
- Join: `invoices` → `customers`, `invoice_items` → `products`, `LEFT JOIN product_categories` via `invoice_items.product_category_id` (snapshot kategori saat transaksi, bukan `products.product_category_id` — konsisten dengan `category-performance.repository.ts`)

## 3. Masih Perlu Keputusan (lihat §7 pola task001)

| Pertanyaan | Catatan |
|---|---|
| Rentang periode fixed atau bebas dipilih user? | Prototipe hardcode Jan-Jun 2025 vs Jan-Jun 2026. Fitur dashboard idealnya punya date-range picker bebas (2 rentang), bukan hardcode. |
| Granularitas: per produk, per kategori, atau toggle keduanya? | Prototipe per produk (paling detail). Kemungkinan user butuh opsi ringkas per kategori juga. |
| `is_placeholder` customer di-exclude? | Prototipe SENGAJA tidak exclude (user butuh data mentah apa adanya untuk diolah manual). Fitur dashboard permanen sebaiknya ikut konvensi existing (`c.is_placeholder = false`) seperti semua metrik lain, kecuali user minta lain. |
| Masuk menu Customer Workbench atau Product Workbench? | Karena grain per customer+produk, kandidat masuk ke **Customer Workbench** (mirip M6 Repeat Order) — perlu konfirmasi. |
| Permission key baru? | Ikut pola `<key>:menu/view/input/update/delete` — kandidat `customer_retention:view` (read-only, tidak butuh input/update/delete karena murni laporan). |
| Export Excel: generate di backend atau di frontend? | Cek pola export existing lain (kalau ada) di `utils/pdf/` atau template Excel `docs-v2/template/` sebelum bikin pola baru. |

## 4. Breakdown Implementasi (draft — belum dikerjakan)

### Backend
- [ ] Repository: query retention cohort (adaptasi Query C prototipe), terima parameter 2 date range + company/branch/division scope (WAJIB filter scope, lihat `CRITICAL_RULES.md`)
- [ ] Service: business logic (translate raw query error → `AppError`, terapkan default `is_placeholder = false` kalau disepakati)
- [ ] Handler + Route: `GET /customers/retention` (atau sesuai keputusan menu §3), validasi query param (2 date range, scope), permission guard
- [ ] Endpoint export Excel (kalau diputuskan generate di backend)

### Frontend
- [ ] Halaman baru di menu terkait (Customer Workbench, pending keputusan §3)
- [ ] Filter: 2 date range picker + `ScopeFilterFields` (company/branch/division, komponen existing — jangan bikin baru, lihat `docs-v2/task/task001.md` §Task H5)
- [ ] Tabel hasil (status Retained/Churned/New — badge warna, ikut pola `getActionColor`/badge existing kalau relevan)
- [ ] Tombol export Excel

---

## 5. Verifikasi (nanti setelah implementasi)

- Bandingkan hasil endpoint baru vs hasil Query C manual di `raw_transactions_export.sql` untuk rentang tanggal yang sama — angka harus identik (minus penyesuaian `is_placeholder` kalau diputuskan exclude).
