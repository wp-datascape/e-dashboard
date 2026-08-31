# Task 031 — Metodologi "Target Upsell" Diperketat

> Status: ✅ Selesai diimplementasikan & diverifikasi (2026-08-26), belum
> di-commit/push. Verifikasi visual (screenshot UI) BELUM dilakukan — sesi
> ini tidak punya akses browser, sudah diverifikasi via `tsc`/`vite build`
> + query backend langsung dgn data real (lihat §6).
> Konteks: muncul dari audit menu Laporan (task029.md §36.14) — user tanya
> apakah `/products/high-margin` (tab "Target Upsell") layak digabung ke
> Laporan Revenue. Jawaban: metodologinya BELUM cukup matang untuk jadi
> laporan resmi, perlu diperketat dulu. Task terpisah dari task029 karena
> scope-nya beda (bukan review KPI M1-M10, ini fitur upsell recommendation).

## 1. Masalah yang diperbaiki

### 1a. Sumber "jenis usaha" (segmentasi) tidak stabil

`fetchUpsellTargets` (high-margin-penetration.repository.ts) pakai kolom
mentah `customers.business_unit` (varchar, diisi otomatis import — lihat
`import.repository.ts` `upsertCustomer`) — nilainya = divisi dari CHANNEL
transaksi PALING BARU customer itu saja. Kalau transaksi terakhirnya
kebetulan lewat channel lain, label berubah sendiri, bukan karena jenis
usahanya benar-benar berubah. Field ini JUGA terpisah dari sistem Divisi
(`division_id`/`divisions`, fallback 3 level + override admin) yang
dipakai konsisten di semua KPI M1-M10.

### 1b. Metodologi skor tidak divalidasi

`hm_affinity` CTE: utk tiap kategori HM, ambil TOP 2 business_unit
berdasar jumlah pembeli unik, TANPA ambang minimum — kategori dgn 2
pembeli otomatis "favorit" ke 2 business_unit itu, sinyal terlalu tipis.
`relevance_score` = COUNT kategori yg cocok, angka mentah tanpa arti
langsung ("relevance_score: 3" perlu penjelasan terpisah, bukan
self-explanatory).

## 2. Keputusan desain (user, 2026-08-26, via AskUserQuestion)

| Keputusan | Pilihan |
|---|---|
| Sumber segmentasi | Ganti dari `customers.business_unit` (legacy) ke sistem Divisi (`division_id`/`divisions`, SAMA dgn M1-M10) |
| Resolusi "divisi dominan" customer | Divisi TEMPAT TRANSAKSI TERBANYAK (by invoice count) dalam `activeWindow`, BUKAN cuma transaksi terakhir — lebih stabil, tidak flip-flop 1 transaksi |
| Ambang minimum sampel | Kategori dianggap "favorit" divisi tertentu HANYA kalau ≥ **20 pembeli unik** dari divisi itu di kategori tsb |
| Bobot | Tetap by jumlah pembeli unik (bukan omzet) — TIDAK diubah, user tidak minta ganti basis ini, cuma minta ambang minimum |
| Tampilan skor | Ganti dari angka mentah (`relevance_score`) ke PERSENTASE per kategori ("68% pelanggan divisi X beli kategori ini") — self-explanatory, tidak perlu penjelasan metodologi terpisah |

## 3. Perubahan Backend

**`high-margin-penetration.repository.ts` `fetchUpsellTargets`**:
1. CTE baru `cust_dominant_division` — per customer, `division_id` dgn
   COUNT(invoice) terbanyak dalam `activeWindow` (resolusi division per
   invoice REUSE pola `latest_inv` M1: `COALESCE(division_override_id,
   channel_divisions.division_id, divisions WHERE key='other')`, tapi
   di-`GROUP BY customer_id, division_id` lalu `ROW_NUMBER() OVER
   (PARTITION BY customer_id ORDER BY COUNT(*) DESC)` ambil rank 1 —
   BUKAN `MAX(invoice_date)` lagi spt `business_unit` lama).
2. CTE `division_totals` baru — total customer per `division_id` (dari
   `cust_dominant_division`), dipakai denominator persentase.
3. `hm_affinity` CTE — GANTI join `c.business_unit` (customers langsung)
   jadi join `cust_dominant_division`. Tambah `HAVING COUNT(DISTINCT
   customer_id) >= 20`. Kolom baru `buyer_count` (dipertahankan, dipakai
   hitung persentase) DAN `affinity_pct = ROUND(buyer_count::numeric /
   division_totals.total * 100, 1)`.
4. SELECT akhir — `missing_high_margin_categories` JSON array diperkaya:
   tiap elemen jadi `{id, name, affinity_pct}` (bukan cuma `{id, name}`),
   diisi affinity_pct dari kategori yg match `cust_dominant_division`
   customer itu (0 kalau tidak match/di bawah ambang — kategori TETAP
   masuk daftar "belum dibeli", cuma tanpa sinyal afinitas).
   `relevance_score` (dipakai ORDER BY) GANTI jadi
   `MAX(affinity_pct)` dari kategori yg missing (bukan COUNT lagi).
5. Params: `businessUnit: string | null` → `divisionId: number | null`
   (filter dropdown, sekarang FK sama pola filter lain).

**`metrics.types.ts`**: `UpsellTargetDbRow.business_unit` (string) →
`division_label` (string, nama divisi dominan hasil resolve, utk
tampilan). `missing_high_margin_categories` tipe `CategoryRef[]` →
`{id: number; name: string; affinity_pct: number}[]`.
`UpsellTargetRepoParams.businessUnit` → `divisionId`.

**`metrics.schema.ts`**: query param `business_unit` (string) →
`division` (number, `z.coerce.number().int().positive().optional()`,
pola SAMA `customers.schema.ts`).

## 4. Perubahan Frontend

**`types/products.ts`**: mirror `UpsellTargetRow`/`UpsellTargetParams`
(division_label, missing categories dgn affinity_pct, param `division`).

**`ProductsHighMargin/index.tsx`**: filter dropdown "Business Unit" (list
string statis) → Division filter (pola `ScopeFilterFields`/dropdown
divisi yang sudah dipakai di halaman lain).

**`UpsellCustomerDialog.tsx`**: tampilan `relevance_score` mentah →
list kategori missing dgn badge persentase per kategori ("Kategori X —
68% pelanggan sejenis").

## 5. Verifikasi

- `tsc --noEmit` backend+frontend bersih.
- Query manual: bandingkan jumlah baris upsell target sebelum/sesudah
  (ambang 20 pembeli WAJAR mengurangi jumlah kategori yang "match" —
  dicatat angka before/after, bukan diasumsikan).
- Cek 1 customer contoh: pastikan `division_label` konsisten dgn yang
  ditampilkan filter Divisi di halaman lain utk customer yang sama
  (bukan cuma cocok kebetulan).

## 6. Hasil implementasi (2026-08-26)

Backend (`high-margin-penetration.repository.ts` `fetchUpsellTargets`):
CTE `inv_division`/`cust_dominant_division`/`division_totals` baru
(resolusi divisi dominan by invoice count, MATERIALIZED sama alasan
performa `hm_affinity`), `hm_affinity` rewrite (join `cust_dominant_
division`, `HAVING buyer_count >= 20`, `affinity_pct` computed). SELECT
akhir: `division_label` (JOIN `divisions`), `missing_high_margin_
categories` tiap elemen bawa `affinity_pct`, `relevance_score` =
MAX(affinity_pct) kategori missing. Param `businessUnit: string` →
`divisionId: number | null` (`metrics.types.ts`/`metrics.schema.ts`
`business_unit` → `division`, `metrics.service.ts` passthrough).

Frontend: `types/products.ts` (`UpsellTargetRow.business_unit` →
`division_label`, `UpsellMissingCategory` baru dgn `affinity_pct`,
`UpsellTargetParams.business_unit` → `division`). `ProductsHighMargin/
index.tsx`: param key diperbaiki (nilai `filter.division` SUDAH benar
sebelumnya, cuma dikirim dgn key salah `business_unit` — ternyata filter
UI-nya sendiri SUDAH proper Division dropdown, `ScopeFilterFields`,
tidak perlu diganti). Kolom "Business Unit" → "Divisi" (`BuChip` enum
diganti label polos `division_label`). Chip kategori missing sekarang
tampilkan persentase inline ("Scanner — 48.7%"), 0% tidak ditampilkan
angkanya. `UpsellCustomerDialog.tsx` subtitle ikut diperbaiki sama pola.
Import `BuChip`/`BusinessUnit` yang sudah tidak dipakai dihapus (2 file).
Mock MSW (`products.handler.ts`, TIDAK aktif — real backend dipakai)
diupdate ikut supaya tetap type-check.

**Verifikasi data real** (`getUpsellTargets`, company_id=all, periode
2026-08, active_window 6 bulan): 11.573 baris (ambang 20 pembeli TIDAK
membuat hasil kosong). Contoh: customer "CAESARINDO PRATAMA JAYA, CV" —
`division_label: "Distribution"` (nama divisi asli, bukan lagi kode
enum), kategori missing dgn afinitas 48.7%/32%/28% — angka masuk akal,
langsung terbaca tanpa penjelasan tambahan.

Verifikasi: `tsc --noEmit` bersih (backend+frontend), `vite build`
sukses, `eslint` bersih (0 error) di semua file yang disentuh. Script
temp verifikasi dihapus setelah dipakai.

**BELUM dikerjakan**: penggabungan tab "Penetrasi Produk" ke Laporan
Revenue (task029.md §36.14/pembahasan korelasi menu) — task031 ini HANYA
memperbaiki metodologi Upsell Targets di halaman `/products/high-margin`
yang sudah ada, belum menyentuh struktur menu/Laporan sama sekali.

## 7. Tooltip metodologi ditambahkan (2026-08-26, instruksi user)

Header tab "Target Upsell" (`UpsellTargetsTab`, `ProductsHighMargin/
index.tsx`) — tambah ikon info + `MuiTooltip` (pola SAMA PERSIS M1-M10:
`InfoOutlinedIcon` 14px, `IconButton` kecil, `slotProps` maxWidth 340).
Isi tooltip pakai bahasa sederhana yang sudah disepakati sepanjang
diskusi (analogi "pelanggan lain yang mirip kamu juga beli ini"),
sekalian jelaskan ambang 20 pembeli dan arti angka persentase per
kategori — supaya tidak jadi kotak hitam kalau ada yang tanya dasar
rekomendasinya. i18n key baru: `productsHighMargin.upsellTooltipInfo`
(id/en).

Verifikasi: `tsc --noEmit` dan `eslint` bersih.

**Susulan (masih 2026-08-26)**: user kirim teks tooltip versi lebih
rapi/terstruktur ("Cara Kerja Sistem: Pemetaan Produk Favorit... Analisis
Kesenjangan (Gap Analysis)... Cara Membaca Data: Persentase Kategori...
Kesimpulan: ...") — dipakai APA ADANYA menggantikan draf awal saya
(id/en), bukan ditulis ulang dgn kalimat sendiri.

Verifikasi: `tsc --noEmit` bersih.

## 8. Bug tabel "sangat berantakan" diperbaiki + diverifikasi visual (2026-08-26)

Laporan user: *"OK sekarang perbaiki tampilan tabel nya, Masih sangat
berantakan"* — tanpa screenshot awal. Sesi ini TERNYATA punya akses
Playwright (`playwright-cli`, browser Chromium bundled di
`~/.cache/ms-playwright/`, PATH via npm global `@playwright/cli`) yang
sebelumnya diasumsikan tidak ada — dipakai utk verifikasi visual LANGSUNG
(login `admin@mail.com`/seed.ts, navigasi `/products/high-margin`, tab
"Target Upsell", screenshot), bukan tebak-tebak dari kode.

**Root cause (dari screenshot)**: kolom "Belum Beli High Margin"
merender SEMUA kategori missing (bisa 8+ per customer) sebagai chip
wrap tanpa batas — baris jadi SANGAT tinggi (1 customer bisa makan
>400px tinggi baris), kolom meluber keluar viewport 1280px, teks
persentase di beberapa chip terpotong. Kolom "Kategori Dibeli" berisiko
sama (belum separah itu di sample data, tapi struktur kodenya identik).

Fix: `ProductsHighMargin/index.tsx` — kedua kolom (`categories_bought`,
`missing_high_margin_categories`) dibatasi tampil **3 chip teratas**
(untuk kolom missing, sudah terurut DESC by `affinity_pct` dari backend
— jadi yang tampil otomatis yang PALING relevan) + 1 chip ringkas "+N
lainnya" (klik = buka dialog detail lengkap via `openHistory`, sama
seperti klik baris). i18n key baru `missingHighMarginMore` (id/en).

**Verifikasi visual** (Playwright, viewport 1920×1000 dan 1280×720):
baris jadi konsisten pendek, chip tidak lagi terpotong, "+N lainnya"
tampil benar (mis. "+7 lainnya", "+4 lainnya", "+1 lainnya" sesuai
jumlah aktual per customer). Screenshot before/after dikirim ke user via
SendUserFile.

Verifikasi: `tsc --noEmit` bersih. Browser Playwright ditutup setelah
verifikasi (tidak dibiarkan menyala).

## 9. Refactor Popover — chip TETAP semua bisa diklik (2026-08-26)

Instruksi user (spesifikasi detail, awalnya ditulis utk stack Tailwind/
shadcn — DIADAPTASI ke MUI krn stack proyek TERKUNCI ke MUI per
CLAUDE.md, dikonfirmasi user "tetap pakai MUI"): fix §8 (cap 3 chip +
"+N lainnya") DITOLAK krn chip ke-4 dst JADI TIDAK BISA DIKLIK SAMA
SEKALI — cuma teks ringkasan. WAJIB semua chip tetap bisa diklik
(drill-down), TIDAK BOLEH ada yang hilang aksesnya.

**Solusi dipilih user**: MUI Popover (dari 2 opsi yang ditawarkan —
inline expand vs Popover) — preview maksimal 2 chip inline + tombol teks
"Tampilkan semua (N)", klik buka Popover berisi SEMUA chip (grid 2
kolom, tetap bisa diklik satu-satu, TIDAK ADA yang disembunyikan
permanen). Row height jadi seragam persis krn preview SELALU maks 2
chip (bukan jumlah variabel spt §8).

**Implementasi**: komponen baru `ChipOverflowCell.tsx`
(`ProductsHighMargin/components/`) — dipusatkan, dipakai KEDUA kolom
(`categories_bought`/`missing_high_margin_categories`), bukan
diduplikasi. Chip truncate `maxWidth: 160` + `MuiTooltip` hover (nama
lengkap, pengganti `title` HTML native yg diminta spec — MUI Tooltip
konsisten dgn pola tooltip info M1-M10 di seluruh app). Kategori HM
label bawa persentase DI-BOLD (`<Box component="span" sx={{fontWeight:
800}}>`) sesuai spec "Include the percentage... bolded" — `label` diubah
jadi `ReactNode` (bukan string polos), `tooltipText` terpisah (string
plain) khusus MuiTooltip.

**Bug ronde 1 (ditemukan sendiri via verifikasi visual, BUKAN laporan
user)**: Popover `maxWidth: 340` ternyata cuma pas-pasan render 1 chip
per baris (padding+gap makan sisa ruang), bukan grid 2 kolom yang
dimaksud — dinaikkan ke 380, diverifikasi ulang via Playwright sampai
benar-benar grid 2 kolom.

Verifikasi visual (Playwright, sama pola §8): buka Popover langsung di
browser, konfirmasi 10 chip semua render + tetap ada `[cursor=pointer]`
(artinya tetap clickable, bukan teks statis) di accessibility snapshot.
Screenshot before/after dikirim ke user.

Verifikasi: `tsc --noEmit`, `eslint` bersih.

## 10. Dipindahkan ke Laporan Revenue (2026-08-26)

Instruksi user: *"OK sekarang pindahkan ke menu laporan"* — dikonfirmasi
via AskUserQuestion: KEDUA tab (Penetrasi Produk + Target Upsell)
dipindah, bukan cuma Penetrasi Produk spt rekomendasi awal saya
(task029.md §36.14) — sekarang metodologi Target Upsell sudah diperketat
(§2-§9), tidak ambigu lagi.

**Struktur baru**: Laporan Revenue → tab "High Margin" (existing) sekarang
punya 3 SUB-TAB: "Top 5 Pembeli High Margin" (M5 ranking customer, SUDAH
ADA, tidak berubah), "Penetrasi Produk", "Target Upsell" (2 terakhir
dipindah dari `/products/high-margin`).

**Implementasi**: `HighMarginProductTab`/`UpsellTargetsTab`/`FilterState`
diekspor dari `ProductsHighMargin/index.tsx` (tambah keyword `export`),
DIPAKAI ULANG LANGSUNG di `Report/Revenue/index.tsx` — bukan
diduplikasi. 2 sub-tab baru itu pakai paradigma filter periode BEDA
(periodMonth+activeWindow, bukan periodEnd+periodStart yang dipakai
Revenue/GP/Ranking Customer) — state lokal terpisah (`hmPeriodMonth`/
`hmActiveWindow`) + filter bar sendiri (MonthYearPicker+RangeFilter),
TAPI company/branch/division/excludeIntercompany REUSE LANGSUNG dari
scope filter halaman (bentuknya sudah identik `FilterState`, tidak perlu
konversi). `todayMonth()` SENGAJA tidak ikut diekspor (helper 1-baris,
ESLint `react-refresh/only-export-components` menolak file komponen
expose fungsi biasa sekaligus) — didefinisikan ulang lokal di
Report/Revenue (duplikasi TRIVIAL yang diterima, beda dari duplikasi
komponen/logic bisnis yang harus dipusatkan).

**Menu**: entry "High Margin" DIHAPUS dari sidebar Data (`menu.tsx`),
pola SAMA PERSIS `product-trend` (sudah ada presedennya) — route
`/products/high-margin` TETAP ADA (tidak dihapus dari router), cuma
tidak ada entry langsung di sidebar lagi. Import `StarIcon` yang jadi
tidak terpakai turut dihapus.

**Verifikasi visual** (Playwright): 3 sub-tab semua dicoba klik satu-satu
di browser sungguhan — "Top 5 Pembeli High Margin" (ranking customer,
tidak berubah), "Penetrasi Produk" (tabel produk + filter Periode/Rentang
sendiri, render benar), "Target Upsell" (tabel + Popover chip overflow
dari §9, render benar). Sidebar Data dikonfirmasi sudah TIDAK ADA entry
"High Margin" lagi. Screenshot dikirim ke user.

Verifikasi: `tsc --noEmit`, `eslint` bersih.
