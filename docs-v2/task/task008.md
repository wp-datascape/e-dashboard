# Task 008 — Drill-down Tab "Penetrasi Kategori" Harus Filter Produk High Margin Saja

> Status: 🚧 Drill-down sudah commit (57b77f4). Fix tambahan di tabel utama (lihat §4) sudah diimplementasi & diverifikasi, belum di-commit.
> Dibuat: 2026-07-26
> Baca juga: `task007.md` (drill-down awal, ternyata salah scope), `features/high-margin-products.md`

---

## 1. Latar Belakang

Task007 menyambungkan klik baris kategori di tab "Penetrasi Kategori" ke `CategoryProductsDialog` yang sudah ada. Ternyata **salah** — dialog itu (`fetchCategoryProducts`, `backend/src/features/metrics/repository/category-products.repository.ts`) cuma filter `ii.product_category_id = categoryId`, artinya menampilkan **SEMUA produk yang pernah terjual di kategori itu**, bukan cuma produk yang benar-benar ditandai high margin di tabel `high_margin_products`.

User mau: klik kategori → tampil HANYA produk yang statusnya high margin di kategori tersebut.

**Kenapa keduanya bisa beda**: `high_margin_products` bisa nandain di 2 level (lihat `hmCatsCte` di `high-margin-penetration.repository.ts:66-80`):
- **Level kategori** (`product_category_id` diisi) → SEMUA produk di kategori itu otomatis high margin.
- **Level produk** (`product_id` diisi) → HANYA produk itu spesifik yang high margin, produk lain di kategori yang sama TIDAK ikut, meski kategori itu tetap muncul di laporan penetrasi (karena laporan grouping by kategori, cukup 1 produk ditandai untuk kategori itu "punya" penetrasi HM).

`CategoryProductsDialog` dipakai di 3 tempat — cuma 1 yang perlu diperbaiki:

| Pemakai | Perlu filter HM-only? |
|---|---|
| Tab "Penetrasi Kategori" (`ProductsHighMargin`, task007) | **Ya** — ini yang dilaporkan salah |
| Tab "Target Upsell", chip "Belum Beli High Margin" | Tidak diubah (di luar scope, dikonfirmasi user) |
| Halaman Products biasa (`/products`) — drill-down kategori umum | Tidak (tidak terkait high margin sama sekali) |

---

## 2. Rencana Implementasi

**Backend** — tambah parameter opsional `onlyHighMargin` ke query yang sudah ada (bukan endpoint baru), supaya 2 pemakai lain tidak berubah perilaku (default `false`/tidak dikirim = sama seperti sekarang):

- `backend/src/features/metrics/repository/category-products.repository.ts`:
  - Tambah `onlyHighMargin?: boolean` ke `CategoryProductsRepoParams`.
  - Tambah CTE `hm_products` yang resolve produk-produk yang EFEKTIF high margin utk kategori ini pada `periodEnd` — union dari (a) produk yang ditandai langsung (`high_margin_products.product_id`) dan (b) kalau kategori itu sendiri yang ditandai (`high_margin_products.product_category_id = categoryId`), maka SEMUA produk di kategori situ ikut. Mirror pola `hmCatsCte` di `high-margin-penetration.repository.ts:66-80`, tapi resolve ke `product_id` bukan `product_category_id`.
  - Tambah kondisi filter: kalau `onlyHighMargin` true → `AND ii.product_id IN (SELECT product_id FROM hm_products)`, kalau false → tidak ada filter tambahan (perilaku existing, `sql\`TRUE\``).
- `metrics.service.ts::getCategoryProducts` — terima & teruskan `onlyHighMargin`.
- `metrics.handler.ts::handleGetCategoryProducts` — validasi query param baru `only_high_margin` (opsional, boolean).
- Cek `metrics.schema.ts` — tambah `only_high_margin: z.coerce.boolean().optional()` ke schema query endpoint `/metrics/category-products`.

**Frontend**:
- `frontend/src/types/products.ts` — `CategoryProductsParams` tambah `only_high_margin?: boolean`.
- `frontend/src/api/products.api.ts::getCategoryProducts` — kirim param kalau ada.
- `frontend/src/hooks/useProducts.ts::useCategoryProducts` — terima & terusin, masuk ke queryKey (supaya cache terpisah dari mode tanpa filter).
- `frontend/src/pages/Products/components/CategoryProductsDialog.tsx` — tambah prop opsional `onlyHighMargin?: boolean` (default undefined/false), terusin ke `useCategoryProducts`.
- `frontend/src/pages/ProductsHighMargin/index.tsx`, `HighMarginCategoryTab` — pasang `onlyHighMargin` saat render `<CategoryProductsDialog>`.
- **Tab "Target Upsell" & halaman Products TIDAK disentuh** — pemanggilan `<CategoryProductsDialog>` di situ tetap tanpa prop baru (default lama).

---

## 3. Verifikasi

1. `bunx tsc --noEmit` & `bun run lint` backend+frontend bersih.
2. `bun test` backend tidak regresi.
3. Manual: klik kategori di tab "Penetrasi Kategori" → daftar produk yang tampil HANYA yang ditandai high margin (cek silang ke Settings → High Margin utk kategori/produk yang sama, harus cocok).
4. Manual: klik chip "Belum Beli High Margin" di tab "Target Upsell" → tetap tampilkan SEMUA produk kategori seperti sebelumnya (tidak regresi).
5. Manual: halaman `/products` → klik kategori → tetap tampilkan SEMUA produk seperti sebelumnya (tidak regresi).

---

## 4. Tambahan (2026-07-26) — Baris kategori di tabel utama juga ikut salah hitung

**Bug yang dilaporkan user** (screenshot): baris kategori "RECEIPT PRINTER THERMAL KASSEN" (id 7) di tab "Penetrasi Kategori" tampil 96 customer / Rp 1.8M revenue / Rp 415.2jt GP / margin 22.8%. Kategori ini punya 10 produk, tapi cuma 1 (`KASSEN BTP 3050 UE`, id 291) yang ditandai high margin — di level produk, bukan level kategori. Angka baris kategori ternyata menjumlah SEMUA 10 produk, bukan cuma produk yang ditandai. Diverifikasi lewat query langsung ke DB: angka lama (semua produk kategori) = persis sama dgn screenshot; versi yang benar (hanya produk HM) = 16 customer / Rp 115.6jt revenue / Rp 28.2jt GP.

**Akar masalah**: `hmCatsCte` di `high-margin-penetration.repository.ts` cuma resolve ke `product_category_id` (`hm_cats`), lalu `fetchHmDetail` filter `invoice_items` pakai `ii.product_category_id IN (SELECT ... FROM hm_cats)` — ini benar kalau kategori ditandai di LEVEL KATEGORI (semua produk ikut), tapi salah kalau ditandai di LEVEL PRODUK (harusnya cuma produk itu yang ikut, bukan seluruh kategori).

**Fix** (`high-margin-penetration.repository.ts`):
- `hmCatsCte` pecah jadi 3 CTE: `hm_cats` (dipakai `fetchUpsellTargets`, tidak berubah), `hm_cat_level` (kategori yang ditandai langsung di level kategori), `hm_product_level` (produk yang ditandai spesifik).
- `fetchHmDetail` — kondisi filter `hm_items` diganti jadi `ii.product_category_id IN (hm_cat_level) OR ii.product_id IN (hm_product_level)` — mirror pola resolusi yang sama dipakai `category-products.repository.ts` (drill-down), supaya angka baris kategori & angka drill-down produknya konsisten.
- `fetchUpsellTargets` TIDAK diubah — tetap pakai `hm_cats` (grouping per kategori, bukan per transaksi, jadi tidak kena bug yang sama).

**Fix tambahan lain yang menyertai** (biar kartu summary dialog drill-down sinkron dgn tabel produk di bawahnya, bukan angka kategori utuh):
- `category-products.repository.ts::fetchCategoryProducts` — sekarang balikin `{ rows, summary }`, summary dihitung query terpisah (CTE sama, tanpa `GROUP BY` per produk) supaya tetap balik 0 (bukan hilang) kalau hasil produk kosong.
- `metrics.service.ts`, `metrics.handler.ts`, `utils/response.ts`, `frontend/src/types/api.ts` — teruskan `summary` sampai ke `PaginationMeta.summary` (generic, opsional).
- `CategoryProductsDialog.tsx` — kalau `highMarginOnly`, kartu summary pakai `meta.summary` (agregat produk terfilter), bukan `category.total_revenue` dkk (angka kategori utuh) yang dikirim caller.
- `ProductsHighMargin/index.tsx` — `onRowClick` tidak lagi kirim `total_revenue`/`total_gp`/`gp_margin_percent`/`customer_count` dari baris kategori ke dialog (mencegah kartu summary sempat nampilin angka kategori utuh sebelum `meta.summary` datang).

**Verifikasi yang sudah dilakukan**: `bunx tsc --noEmit` backend+frontend bersih, `bun test` backend 73 pass/0 fail, cross-check manual query SQL terhadap kategori id 7 (lihat di atas). Belum: verifikasi visual di browser (dev server belum dijalankan), belum di-commit.

---

## 5. Tambahan (2026-07-26) — Badge high margin per produk di drill-down

Sebelumnya status "high margin" cuma kelihatan di level kategori (badge di judul dialog, badge di baris `/products`) — daftar produk di dalam `CategoryProductsDialog` tidak menunjukkan produk MANA yang sebenarnya ditandai HM, khususnya penting di mode default (bukan `highMarginOnly`, dipakai tab Target Upsell & halaman Products) yang menampilkan SEMUA produk kategori bercampur (ada yang HM, ada yang bukan).

**Fix**:
- `category-products.repository.ts::fetchCategoryProducts` — tambah kolom `is_high_margin` di query per-produk, memanfaatkan CTE `hm_products` yang sudah ada (sebelumnya cuma dipakai buat filter `onlyHighMargin`, sekarang juga dipakai buat flag per baris terlepas dari filter aktif atau tidak). `CategoryProductDbRow` tambah field `is_high_margin: boolean`.
- `frontend/src/types/products.ts::CategoryProductRow` — tambah `is_high_margin: boolean`.
- `CategoryProductsDialog.tsx` — kolom `product_name` sekarang render badge `StatusChip` (label sama dgn `products.highMarginBadge`, dipakai ulang, tidak ada key i18n baru) di sebelah nama produk kalau `row.is_high_margin`.

Diverifikasi lewat query manual ke kategori id 7: cuma `KASSEN BTP 3050 UE` (id 291) yang balik `is_high_margin = true` dari 8 produk yang punya transaksi, sesuai isi tabel `high_margin_products`. `bunx tsc --noEmit` backend+frontend bersih, `bun test` backend 73 pass/0 fail. Belum verifikasi visual & belum commit.
