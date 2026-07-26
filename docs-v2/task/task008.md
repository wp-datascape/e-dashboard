# Task 008 — Drill-down Tab "Penetrasi Kategori" Harus Filter Produk High Margin Saja

> Status: 📝 Planning — belum mulai implementasi
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
