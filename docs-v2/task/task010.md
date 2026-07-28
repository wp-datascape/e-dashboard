# Task 010 — Halaman Products: Grid Kategori → Flat List Produk

> Status: ✅ Done — diimplementasi & diverifikasi 2026-07-29
> Dibuat: 2026-07-29
> Baca juga: `features/products.md`, `features/metrics.md` §3.1, `features/high-margin-products.md` §9

---

## 1. Latar Belakang & Tujuan

Halaman `/products` (`frontend/src/pages/Products/index.tsx`) saat ini menampilkan grid **kategori** (`GET /metrics/category-performance`) — klik baris kategori buka popup (`CategoryProductsDialog`) yang isinya daftar produk dalam kategori itu (`GET /metrics/category-products`).

Permintaan user: ganti jadi **flat list produk langsung** — tiap baris = 1 produk (bukan kategori), kategori jadi kolom/filter biasa, popup drill-down dihapus dari halaman ini (barisnya sudah level produk, tidak perlu drill lagi).

**Catatan penting**: `CategoryProductsDialog` **TETAP DIPERTAHANKAN** sebagai komponen — masih dipakai di `ProductsHighMargin/index.tsx` (drill-down kategori → produk, use case beda, bukan bagian dari task ini). Task ini cuma ubah cara halaman `/products` sendiri menyajikan data & berhenti memanggil dialog itu.

---

## 2. Keputusan Desain

### a. Endpoint baru: `GET /metrics/product-performance`
Mirror `category-performance` (`category-performance.repository.ts`) tapi `GROUP BY` per `product_id`, bukan `product_category_id`. Kolom tambahan: `category_id`, `category_name` (join `product_categories`).

### b. Resolusi `is_high_margin` per produk
Sebuah produk dianggap high margin kalau:
- (a) ditandai LANGSUNG di `high_margin_products.product_id`, ATAU
- (b) seluruh kategorinya ditandai (`high_margin_products.product_category_id` cocok `products.product_category_id`)

Pola CTE ini **mirror persis** `hmCatsCte()` di `high-margin-penetration.repository.ts` (`hm_flags` → `hm_cat_level` / `hm_product_level`) — pakai ulang pola yang sama, jangan desain baru.

### c. Search
Ganti dari cari nama **kategori** → cari nama **produk** (`pr.product_name ILIKE`).

### d. Filter kategori (baru)
Karena grouping kategori hilang, tambah dropdown filter kategori opsional. **Revisi saat implementasi**: rencana awal mau reuse `GET /products/categories` yang sudah ada — ternyata endpoint itu permission-nya `settings.product:view` (Administration/Product Settings), BEDA dari `product:view` yang dipakai seluruh halaman Products Workbench. Reuse langsung berarti role dengan akses Product Workbench tapi TANPA akses Settings akan 403 pas load dropdown kategori. Jadi dibuatkan endpoint baru `GET /metrics/product-categories` (permission `product:view`, konsisten sama halaman-nya) — `product-categories.repository.ts`, query sederhana `SELECT DISTINCT id, name FROM product_categories` dengan company scope.

### e. Filter lain — tidak berubah
Company/Branch/Division (`ScopeFilterFields`), period month, active window, toggle High Margin Only, toggle Exclude Intercompany — semua tetap ada, logic filter sama seperti `category-performance` sekarang (division/branch/exclude_intercompany raw SQL conditions, pola yang sama di semua repository metrics lain).

### f. Sort
Tetap `total_revenue | total_gp | gp_margin_percent | customer_count` (whitelist kolom, pola sama seperti `SORT_COL` di `category-performance.repository.ts`).

---

## 3. Breakdown Implementasi

### Backend
- [x] `metrics.schema.ts` — `productPerformanceQuerySchema` (company_id, branch_id, division, category_id?, period_month, active_window, search, high_margin_only, exclude_intercompany, sort_by, sort_dir, page, per_page)
- [x] `repository/product-performance.repository.ts` — `fetchProductPerformance()`, mirror `category-performance.repository.ts` structur + resolusi HM ala §2b
- [x] `metrics.service.ts` — `getProductPerformance()` (pola sama seperti `getCategoryPerformance`)
- [x] `metrics.handler.ts` + `metrics.route.ts` — `GET /metrics/product-performance`, `requirePermission('product:view')` (sama seperti `category-performance`)
- [x] `metrics.repository.ts` — re-export `fetchProductPerformance`
- [x] (tambahan, lihat revisi §2d) `repository/product-categories.repository.ts` — `fetchProductCategoryOptions()`, `productCategoryOptionsQuerySchema`, `getProductCategoryOptions()`, `handleGetProductCategoryOptions`, `GET /metrics/product-categories`

### Frontend
- [x] `types/products.ts` — `ProductPerformanceRow`, `ProductPerformanceParams`, `ProductCategoryOption`
- [x] `api/products.api.ts` — `getProductPerformance()`, `getProductCategoryOptions()`
- [x] `hooks/useProducts.ts` — `useProductPerformance()` + `PRODUCTS_KEYS.productPerformance`, `useProductCategoryOptions()`
- [x] `pages/Products/index.tsx` — rewrite:
  - kolom: nama produk (+ badge High Margin inline), kategori (teks), revenue, GP, margin, customer, faktur, terakhir jual
  - search field: "Cari Produk" (bukan kategori)
  - filter baru: dropdown Kategori (opsional, dari `GET /metrics/product-categories` — lihat revisi §2d)
  - hapus `onRowClick` + `<CategoryProductsDialog />` dari halaman ini (tidak perlu drill-down lagi)
- [x] i18n `id`/`en` `products.json` — key baru: `productName`, `searchProductLabel`, `filterCategoryLabel`, `allCategories`; title/subtitle diupdate dari "kategori" jadi "produk"

### Tidak disentuh (pastikan tidak regresi)
- `CategoryProductsDialog` komponen — tetap ada, dipakai `ProductsHighMargin/index.tsx`
- `GET /metrics/category-performance` & `/category-products` — tetap ada (dipakai high-margin page's popup, atau sumber lain kalau ada)

---

## 4. Verifikasi
1. [x] `tsc -b` bersih FE + BE
2. [x] `bun test src/test/scope-isolation.e2e.test.ts` — 11 pass (memastikan `category-performance` yang masih di-exercise test ini tidak ikut rusak)
3. [x] Query langsung lewat `bun run` script (bypass HTTP, tes service function): `high_margin_only=true` → semua baris `is_high_margin: true`; `search="KASSEN MT"` → 6 hasil; `category_id` filter → semua baris category_id cocok
4. [x] Manual via browser (Playwright, login admin@mail.com): halaman `/products` tampil flat list produk, filter Kategori dropdown berfungsi (contoh: pilih "ACCESS DOOR KASSEN" → semua baris kategori itu), search "KASSEN MT" → 6 baris cocok dengan hasil query langsung di atas
5. [x] Halaman `ProductsHighMargin` (pemakai `CategoryProductsDialog` lain) tidak regresi — klik baris kategori masih buka popup drill-down dengan benar
6. RBAC scope company/branch/division — belum ditest manual dengan user non-superadmin (mirror pattern `category-performance` yang sudah teruji, risiko rendah, tapi belum diverifikasi langsung)

---

## 5. Revisi (2026-07-29, sesudah task awal selesai) — Filter Item Type + Kategori cascading

User minta filter dropdown Kategori diubah urutannya: **Item Type dulu, baru Kategori di bawahnya** — dan Kategori jadi **cascading** (opsinya cuma nampilin kategori yang `item_type`-nya cocok sama Item Type yang lagi dipilih; reset ke "Semua Kategori" tiap kali Item Type diganti).

- [x] `productPerformanceQuerySchema` + `productCategoryOptionsQuerySchema` — tambah `item_type` (enum `unit|sparepart|consumable|service`, sama seperti yang dipakai `customerProductsQuerySchema`)
- [x] `product-performance.repository.ts` — filter `pc.item_type` di WHERE
- [x] `product-categories.repository.ts` — filter `pc.item_type` juga (ini yang bikin cascading-nya jalan)
- [x] `metrics.service.ts` — teruskan `item_type` di `getProductPerformance()` & `getProductCategoryOptions()`
- [x] Frontend: dropdown "Item Type" baru, ditaruh SEBELUM dropdown "Kategori"; ganti Item Type → `categoryId` di-reset ke `'all'` otomatis; `useProductCategoryOptions()` sekarang terima param `itemType`
- [x] i18n `id`/`en` — `filterItemTypeLabel`, `allItemTypes`, `itemTypeUnit/Sparepart/Consumable/Service`
- [x] `tsc -b` bersih FE+BE
- [x] Verifikasi query langsung: `item_type=unit` → 105 produk; kategori utk `item_type=unit` → 51 opsi; `item_type=service` → 0 kategori (memang belum ada kategori jasa di data ini, bukan bug)
- [x] Verifikasi manual browser: pilih Item Type "Sparepart" → dropdown Kategori otomatis cuma nampilin kategori sparepart (mis. "Z. SPARE PART ..."), grid ikut kefilter (14 baris, semua kategori sparepart)
