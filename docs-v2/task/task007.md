# Task 007 — Drill-down Produk di Tab "Penetrasi Kategori" (High Margin)

> Status: 📝 Planning — belum mulai implementasi
> Dibuat: 2026-07-26
> Baca juga: `features/high-margin-products.md`, `features/products.md`

---

## 1. Latar Belakang & Tujuan

User minta: di halaman **Products › High Margin** (`/products/high-margin`), tab pertama "Penetrasi Kategori" menampilkan daftar kategori high margin (nama kategori, tingkat penetrasi, jumlah pelanggan, revenue, GP, % margin GP) dalam bentuk tabel — tapi baris-barisnya belum bisa diklik. User ingin klik 1 baris kategori memunculkan isi kategori tersebut: **produk apa saja yang termasuk ke dalam kategori high margin itu**.

**Riset menemukan fitur ini SUDAH ADA dan sudah dipakai persis untuk kebutuhan yang sama di tab kedua halaman ini** ("Target Upsell"), tinggal disambungkan ke tab pertama:

- Setiap baris di tab "Penetrasi Kategori" (`HighMarginCategoryTab`, `frontend/src/pages/ProductsHighMargin/index.tsx:65-152`) sudah membawa `category_id` dari backend (`HighMarginCategoryRow.category_id`), jadi tidak perlu ubah backend sama sekali.
- Dialog drill-down per-kategori sudah ada: `CategoryProductsDialog` (`frontend/src/pages/Products/components/CategoryProductsDialog.tsx`), dipakai di tab "Target Upsell" (`UpsellTargetsTab`) saat user klik chip "Belum Beli High Margin" — memanggil endpoint yang juga sudah ada: `GET /metrics/category-products` (`backend/src/features/metrics/repository/category-products.repository.ts`).
- `ResponsiveListView` (dipakai kedua tab) sudah mendukung prop `onRowClick` — tab "Penetrasi Kategori" saat ini cuma tidak memasangnya.

**Tujuan task ini:** pasang `onRowClick` di tab "Penetrasi Kategori" supaya klik baris kategori membuka `CategoryProductsDialog` yang sama persis dengan yang dipakai di tab "Target Upsell" — murni penyambungan UI, tanpa endpoint/query baru.

---

## 2. Rencana Implementasi

**File**: `frontend/src/pages/ProductsHighMargin/index.tsx`, komponen `HighMarginCategoryTab` (baris 65-152).

1. Tambah state lokal `selectedCategory` (tipe `CategoryRef | null`, sama seperti yang dipakai `UpsellTargetsTab` di komponen bawahnya — lihat `openHmCategory`/`CategoryRef` di baris ~172-175 & import `CategoryProductsDialog` baris 30).
2. Tambah `onRowClick` di `ResponsiveListView` tab ini (baris ~138-151), set `selectedCategory` dari row yang diklik: `{ category_id: row.category_id, category_name: row.category_name, is_high_margin: true, total_revenue: row.total_revenue, total_gp: row.total_gp, gp_margin_percent: row.gp_margin_percent }`.
3. Render `<CategoryProductsDialog category={selectedCategory} onClose={() => setSelectedCategory(null)} .../>` — props & pola pemakaian ikut PERSIS yang sudah dipakai di `UpsellTargetsTab`, supaya konsisten (title, kolom produk, summary cards di dalam dialog tidak perlu diubah).
4. Cursor pointer di baris tabel — cek apakah `ResponsiveListView`/DataGrid sudah otomatis kasih `cursor:pointer` saat `onRowClick` terpasang (biasanya iya via MUI DataGrid), kalau belum tambahkan sedikit sx.

**Tidak ada perubahan backend.** Tidak ada endpoint/query baru. Tidak ada migrasi.

**i18n**: kemungkinan tidak perlu key baru — `CategoryProductsDialog` sudah pakai key dari `products.json` (`products.drawer.*`, `products.highMarginBadge`) yang sudah ada. Cek saat implementasi apakah title dialog perlu dibedakan konteksnya (klik dari "Penetrasi Kategori" vs klik dari "Target Upsell" chip) — kalau tidak perlu dibedakan, tidak ada string baru sama sekali.

---

## 3. Verifikasi

1. `bunx tsc --noEmit` & `bun run lint` frontend bersih.
2. Manual di browser: buka `/products/high-margin`, klik salah satu baris di tab "Penetrasi Kategori" → dialog `CategoryProductsDialog` terbuka menampilkan daftar produk di kategori itu (bukan dialog kosong/error), data cocok dengan kategori yang diklik (nama kategori di judul dialog sesuai baris yang diklik).
3. Pastikan tab "Target Upsell" (yang sudah ada sebelumnya) tidak regresi — dialog dari situ tetap berfungsi seperti semula.
