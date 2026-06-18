# product-workbench/overview.md

> Ringkasan halaman untuk Product & Portfolio Workbench (Group 3).
> Sumber: `FINALIZED_MENU_STRUCTURE.md` Group 3, diverifikasi ulang terhadap `DATA_MODEL.md` asli.
> Baca juga: `customer-workbench/decisions.md` (split 3.2), `shared/data-model.md`

---

## Tujuan Group

Menjawab "apa yang terjual" — performa produk/kategori, analisis margin, kesehatan inventori (dalam batas data yang tersedia — lihat blocker di bawah).

---

## 3.1 Product Performance Ledger

Status: New — dan Blocked, bukan sekadar "New".

FINALIZED_MENU_STRUCTURE.md menyebut ini "Product master table with sales velocity," dengan kebutuhan tabel `products` berisi margin, SKU, qty_sold. Setelah dicek ke `DATA_MODEL.md` asli, gap ini lebih dalam dari "tabel belum ada": `invoice_items` hanya punya `product_category_id`, `category_code`, `category_name`, `revenue`, `gross_profit` — tidak ada kolom produk individual (nama/SKU) dan tidak ada kolom `quantity` sama sekali. Format import di `METRICS_SPEC.md` juga hanya mensyaratkan `product_category`, bukan nama produk atau SKU.

Implikasi: membuat tabel `products` baru tidak cukup tanpa sumber data SKU/quantity di level import. Perlu dikonfirmasi dulu apakah Accurate Online API/export punya field tersebut sebelum 3.1 didesain lebih lanjut.

Belum diputuskan — lihat `product-workbench/decisions.md`.

---

## 3.2 High Margin Push List

Status: Partial — sebagian dari CustomerMetrics existing, lihat split di `customer-workbench/decisions.md`.

Drill-down dari M5 (High Margin Product Penetration). Berbeda dari 3.1, halaman ini **tidak** terhambat gap SKU/quantity karena bekerja di level kategori, dan `product_categories.is_high_margin` sudah ada di schema. Data cukup dari `invoice_items` JOIN `product_categories` — tidak perlu tabel produk baru.

Alokasi kolom persis dari CustomerMetrics masih open decision bersama 2.2 — lihat `customer-workbench/decisions.md` Keputusan Terbuka #1.

---

## 3.3 Product Trend & Velocity

Status: Reusable (chart) — tapi nama halaman berpotensi menyesatkan.

FINALIZED_MENU_STRUCTURE.md memetakan ini ke "M2 Avg Category per Customer trend," reuse `AreaChartWidget` dari CrossSelling. M2 mengukur keragaman kategori yang dibeli **per customer** — bukan velocity produk dalam arti operasional. Nama halaman menyiratkan sisi-produk (kategori apa yang trennya naik), tapi chart yang direuse sebenarnya sisi-customer.

Perlu dikonfirmasi: apakah halaman ini memang mau menjawab "kategori apa yang trennya naik" (butuh agregasi per kategori, beda dari M2), atau cukup M2 yang direlabel. Catat sebagai open question, jangan asumsikan.

---

## 3.4 Dormant Product / Dead Stock

Status: New — Blocked, gap sama seperti 3.1 plus masalah terminologi tambahan.

"Low-velocity products" butuh konsep quantity yang tidak ada di schema (sama seperti 3.1). Selain itu, "Dead Stock" menyiratkan visibilitas ke inventori fisik, tapi sistem ini tidak mengimpor data stok sama sekali — hanya transaksi penjualan dari faktur. Yang bisa dideteksi paling jauh: "kategori yang belum terjual dalam X bulan" (analog dormant customer), bukan "stok yang menumpuk di gudang." Produk bisa saja tidak laku karena memang sudah tidak ada stok, bukan karena tidak diminati — sistem tidak bisa membedakan dua kasus ini.

Rekomendasi: jika halaman ini tetap masuk scope, beri nama yang akurat dengan kapabilitas data yang ada ("Kategori Tidak Terjual" bukan "Dead Stock"), kecuali ada keputusan menambah data inventori — yang berarti scope jauh lebih besar dari sekadar tabel `products`.

---

## Blocker Sebelum 3.1 dan 3.4 Didesain

1. Apakah Accurate Online API/export punya field SKU dan quantity per baris faktur?
2. Jika ya, apakah field itu ditambahkan ke `invoice_items` dan ke format import CSV/Excel di `METRICS_SPEC.md`?
3. Apakah data historis yang sudah diimport bisa di-backfill SKU/quantity, atau akan ada gap data untuk periode sebelum field ini ditambahkan?

Detail lanjutan dicatat di `product-workbench/decisions.md` (belum dikerjakan).
