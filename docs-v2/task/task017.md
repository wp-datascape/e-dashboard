# Task 017 — High Margin Product per Divisi (KPI Produk Fokus)

> Status: **SELESAI** — dikerjakan & di-deploy production 2026-08-02 (PR #90,
> merge ke `main`, Vercel+Railway sukses). Lihat §6 untuk perubahan dari desain
> awal di dokumen ini (terutama: view flat per-produk jadi DEFAULT, bukan cuma
> toggle sekunder — lihat [[high-margin-products]] §10 untuk detail final).

## 1. Latar Belakang

Ditemukan saat audit isolasi data lanjutan (setelah [[task015]]): laporan High
Margin Category Penetration (`ProductsHighMargin`, tab pertama) sudah punya filter
Divisi di UI (`useScopedCompanyFilter()`, sama seperti halaman lain), tapi filter itu
cuma membatasi **transaksi mana yang dihitung** (invoice yang resolve ke divisi
itu) — bukan **produk mana yang dianggap fokus/high-margin milik divisi itu**.
Fungsi `hmCatsCte()` (`backend/src/features/metrics/repository/high-margin-
penetration.repository.ts:73`) menentukan daftar produk/kategori HM murni dari
`company_id`, sama sekali tidak sadar konsep divisi.

Akibatnya: kalau Divisi A menjual PRODUK APAPUN yang di-flag HM di level company
(termasuk yang sebenarnya "milik" Divisi B), itu ikut terhitung sebagai capaian
produk fokus Divisi A. Tidak ada cara membedakan "produk fokus KPI Divisi A" dari
"produk fokus KPI Divisi B" walau kedua divisi sama-sama boleh menjualnya.

Kebutuhan bisnis (dari diskusi dengan user):
- 1 produk BOLEH jadi produk fokus lebih dari 1 divisi sekaligus (mis. Produk HM-A
  → fokus Divisi A **dan** Divisi B).
- 1 produk BOLEH juga fokus cuma 1 divisi (mis. Produk B → fokus Divisi B saja),
  sementara divisi lain (Divisi A) tetap boleh jual produk itu sebagai barang
  dagangan biasa — transaksinya tetap normal muncul di Transactions/Analisis
  Divisi A, TAPI tidak ikut dihitung di angka "capaian produk fokus" Divisi A.
- Tujuannya murni untuk KPI/filtering laporan: "Divisi A capaian omzet produk
  fokusnya berapa" vs "Divisi B penyerapan produk fokusnya berapa" — dua angka
  yang harus bisa independen walau basis datanya (invoice, produk) sama.

## 2. Keputusan Desain (hasil diskusi dengan user)

| Aspek | Keputusan |
|---|---|
| Model data | Tabel junction baru `high_margin_product_divisions` (many-to-many), BUKAN kolom `division_id` langsung di `high_margin_products` — supaya 1 flag (dengan note/effective_date-nya) bisa di-assign ke banyak divisi tanpa duplikasi baris |
| Data lama (mapping HM existing tanpa info divisi) | TIDAK di-migrasi otomatis, TIDAK ada fallback "berlaku semua divisi" — begitu fitur ini live, mapping lama otomatis 0 divisi ter-assign, admin **wajib re-assign manual** satu per satu lewat halaman Settings |
| Assign divisi saat create/edit | WAJIB pilih minimal 1 divisi (tidak ada state "company-wide, tidak spesifik divisi manapun") |
| Efek ke transaksi "numpang jual" | Transaksi tetap normal muncul di semua laporan lain (Transactions, Analisis) — filter divisi ini HANYA memengaruhi bagian "hm_cats" (produk mana yang dihitung HM), tidak menyembunyikan transaksi itu sendiri |
| Scope pilihan divisi di form | Daftar divisi yang muncul di Autocomplete di-scope ke company yang dipilih (pola sama dengan filter RBAC di halaman lain) |
| Indikator/badge utk mapping belum di-assign divisi | TIDAK PERLU — ditangani manual oleh admin, tidak ada UI peringatan otomatis |
| Tab **Upsell Targets** (`fetchUpsellTargets`) | **DI LUAR SCOPE task ini** — tetap company-wide seperti sekarang, tidak ikut logic per-divisi. Alasan: konsepnya beda (segmentasi `business_unit`, bukan capaian per-divisi) dan user menilai konsep ini sendiri sudah sulit dijelaskan ke manajemen, jadi tidak ditambah kompleksitas dulu |
| Divisi "Intercompany" di form assignment | **DI-EXCLUDE dari daftar pilihan** Autocomplete divisi (Settings/HighMargin) — Intercompany bukan divisi penjualan yang punya target KPI produk fokus (biasanya malah di-exclude dari laporan revenue lewat toggle "Exclude Intercompany" yang sudah ada). Confirmed dgn user: "penyerapan produk ke transaksi mana saja" (termasuk Intercompany) TETAP terbaca lewat menu **Products** (halaman terpisah, `product-performance.repository.ts`, independen dari `hmCatsCte()` — lihat §3b), jadi tidak hilang, cuma memang bukan bagian dari KPI penetration per-divisi ini |
| Makna angka "All Division" (tanpa filter divisi spesifik) | **Grand total company-wide, TIDAK dikurangi/disaring oleh tag divisi** (mis. produk fokus Divisi A+B yang total penjualannya Rp100jt, dengan Rp10jt di antaranya lewat divisi/channel yang tidak ditag — angka "All Division" tetap Rp100jt penuh, BUKAN Rp90jt). Ambiguitas ini diselesaikan dengan menampilkan KEDUANYA (lihat §3c) — tabel utama tetap grand total, breakdown per-divisi ada di dialog drill-down — supaya tidak perlu "milih" 1 angka yang menyembunyikan makna yang lain |
| Kolom "Assign To" | Tabel utama (kategori/produk) dan dialog drill-down tampilkan kolom/badge "Assign To" berisi chip nama divisi (multi) yang di-tag fokus untuk baris itu — supaya user tidak perlu buka dialog dulu buat tahu produk itu fokus divisi mana saja |
| Tampilan Kategori vs Produk | Tab Category Penetration ditambah toggle "Kategori / Produk" — mode Produk jadi tabel flat semua produk HM langsung (bukan cuma lewat drill-down kategori) |
| Dialog drill-down customer pembeli | **Fitur baru total** (belum ada endpoint serupa di codebase sama sekali) — digabung ke dialog drill-down yang sudah ada (bukan dialog terpisah), jadi 1 dialog per produk/kategori berisi: Ringkasan (total) + Capaian per Divisi (breakdown) + List Customer Pembeli |
| RBAC — divisi di luar scope viewer | **TIDAK PERNAH ditampilkan sama sekali** (bukan cuma disembunyikan angkanya) — baik di breakdown "Capaian per Divisi", list "Customer Pembeli", MAUPUN chip "Assign To". Kalau user cuma punya akses Divisi B, dan produk itu di-tag ke Divisi A+B, chip "Assign To" yang dia lihat cuma "Divisi B" (bukan "Divisi A, Divisi B") — prinsip "kalau tidak punya akses, tidak usah kelihatan ada apa-apa di sana", bukan cuma revenue-nya yang disembunyikan. Semua query breakdown/customer HARUS reuse `buildDivisionConditionRaw`/`buildBranchConditionRaw` (`divisionScope`/`branchScope`) persis seperti `fetchHmDetail` sekarang |

## 3. Desain Teknis

### 3a. Skema — tabel baru

```sql
CREATE TABLE high_margin_product_divisions (
  id                       serial PRIMARY KEY,
  high_margin_product_id  integer NOT NULL REFERENCES high_margin_products(id) ON DELETE CASCADE,
  division_id              integer NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (high_margin_product_id, division_id)
);
```

`high_margin_products` (`backend/src/db/schema/schema-product.ts:67`) TIDAK berubah
strukturnya — tetap 1 baris = 1 keputusan "produk/kategori ini di-flag HM"
(company_id, product_id/product_category_id, effective_from/until, note). Divisi
jadi tabel terpisah supaya edit note/tanggal cukup 1x, berlaku ke semua divisi yang
di-assign.

### 3b. Backend

- `backend/src/db/schema/schema-product.ts` — tambah `high_margin_product_divisions`
  table definition + relations.
- `backend/src/features/settings/high-margin.schema.ts` — create/update schema
  terima `division_ids: number[].min(1)`.
- `backend/src/features/settings/high-margin.repository.ts` — insert/update/delete
  baris junction sinkron dengan `division_ids` yang dikirim (replace-all pattern,
  hapus yang tidak ada di payload baru + insert yang baru).
- `backend/src/features/settings/high-margin.service.ts`/`.handler.ts` — thread
  `division_ids` melalui alur yang sudah ada (create/update/deactivate tetap pakai
  `resolveCompanyScope` yang sudah benar dari [[task015]]).
- `backend/src/features/metrics/repository/high-margin-penetration.repository.ts`
  — `hmCatsCte()` tambah parameter `divisionId: number | null`. Kalau terisi,
  `hm_flags` di-JOIN/intersect ke `high_margin_product_divisions` filter
  `division_id = :divisionId`. Kalau `null` (company-wide/tanpa filter divisi),
  tetap union semua seperti sekarang (backward compatible utk view company-wide).
  `fetchHmDetail()` sudah punya `p.division` — tinggal diteruskan ke `hmCatsCte()`.
  `fetchUpsellTargets()` TIDAK disentuh (lihat keputusan §2).
- `backend/src/features/metrics/repository/category-products.repository.ts`
  (drill-down produk per kategori) — cek apakah `hm_products` CTE di sini perlu
  fix serupa supaya konsisten dengan angka kategori (mirror alasan fix
  task007/008 dulu — kategori dan drill-down produknya harus selalu sinkron).
  Tambah juga resolusi "Assign To" (nama-nama divisi ter-tag) per baris produk.
- **BARU** — repository utk drill-down customer pembeli, mis.
  `backend/src/features/metrics/repository/hm-customers.repository.ts`,
  `fetchHmCustomers({ targetType: 'category' | 'product', targetId, ...scope })`
  — list customer (nama, revenue, GP, invoice_count, tanggal beli terakhir) yang
  transaksinya match produk/kategori itu, pakai scope company/branch/division RBAC
  yang sama dengan repository lain (bukan filter divisi-fokus — ini soal "siapa
  yang beli", bukan "capaian KPI mana").
- **BARU** — query "capaian per divisi" (dipakai dialog drill-down §3c) — untuk 1
  produk/kategori, group revenue/GP per `division_id` dari
  `high_margin_product_divisions` (cuma divisi yang di-tag), pakai
  `channel_divisions` resolve seperti biasa utk tahu invoice mana masuk divisi
  mana. Bisa satu query dgn util `fetchHmCustomers` di atas atau fungsi
  terpisah — didetailkan saat implementasi.

### 3c. Tampilan Laporan (`ProductsHighMargin`)

- **Toggle "Kategori / Produk"** di tab Category Penetration — mode Produk
  menampilkan tabel flat semua produk HM (bukan dikelompokkan per kategori),
  reuse row-shape yang sekarang cuma ada di `CategoryProductsDialog`
  (`product_name`, `total_revenue`, `total_gp`, `gp_margin_percent`,
  `customer_count`) sebagai tabel utama, bukan cuma drill-down.
- **Kolom baru "Assign To"** — di kedua mode (Kategori & Produk), tampilkan chip
  nama divisi yang di-tag utk baris itu (multi). Baris kategori = union semua
  divisi dari flag category-level DAN flag product-level di dalamnya (kalau
  campuran). Baris produk = divisi dari flag-nya sendiri, atau warisan dari
  kategori kalau HM-nya di-set di level kategori.
- **Dialog drill-down diperkaya** — `CategoryProductsDialog` (dan versi produk
  kalau modenya beda) sekarang, selain ringkasan yang sudah ada, tambah 2 seksi
  baru:
  1. **Capaian per Divisi** — chip/mini-tabel breakdown revenue per divisi yang
     di-tag (mis. "Divisi A: Rp 60jt (60%) · Divisi B: Rp 30jt (30%)"), dihitung
     dari query baru di §3b. Total di ringkasan TETAP grand total company-wide
     (keputusan §2, "All Division" tidak dikurangi tag) — breakdown ini
     pelengkap, bukan pengganti.
  2. **List Customer Pembeli** — tabel baru (nama, **Divisi**, revenue, GP,
     invoice count, terakhir beli), dari `fetchHmCustomers` (§3b), sortable, dgn
     pagination kalau customer-nya banyak. Divisi BUKAN properti tetap customer
     (sama seperti produk — resolve per transaksi lewat `channel_divisions`/
     `customer.division_override_id`, pola sama dgn `hm_items`/`active` CTE di
     `fetchHmDetail`) — kalau 1 customer beli produk ini lewat >1 divisi berbeda,
     dia muncul sebagai baris TERPISAH per divisi (GROUP BY customer_id,
     division_id, bukan cuma customer_id), supaya jumlah barisnya nyambung ke
     angka breakdown "Capaian per Divisi" di atasnya. Kalau halaman lagi
     difilter ke 1 divisi spesifik, list ini otomatis ikut ke-filter (reuse
     filter divisi yang sama dari halaman, bukan filter baru di dalam dialog).

### 3d. Settings UI

- `frontend/src/pages/Settings/HighMargin/` — form create/edit dialog tambah
  Autocomplete multi-select Divisi (wajib ≥1), daftar divisi difilter oleh company
  yang dipilih di form yang sama, DAN exclude divisi berkode `key='intercompany'`
  dari pilihan (lihat keputusan §2 — bukan target KPI penetration).
- `frontend/src/api/`+`frontend/src/hooks/` terkait High Margin settings — payload
  create/update ikut `division_ids`.
- i18n: label baru (mis. "Divisi Fokus"/"Focus Divisions", "Assign To", "Capaian
  per Divisi"/"Achievement by Division", "Customer Pembeli"/"Buying Customers") di
  namespace terkait, id+en.

### 3e. Migration & Rollout

- Migration baru (`bun run db:generate` setelah schema diubah) — tabel baru murni
  additive, TIDAK ada backfill data (sesuai keputusan §2, data lama sengaja
  dibiarkan kosong utk di-assign manual).
- Perlu dijalankan manual ke Neon production seperti biasa (lihat
  [[project_edashboard_deploy_workflow]]), SEBELUM PR di-merge (pelajaran dari
  insiden 2026-07-31 di task016 — kode jangan deploy duluan sebelum migration).
- **Peringatan rollout**: begitu fitur ini live, SEMUA laporan High Margin yang
  difilter per-Divisi akan menunjukkan 0 data sampai admin re-assign mapping lama
  satu per satu. Ini kesepakatan sadar (§2), bukan bug — tapi perlu di-komunikasikan
  ke user/admin sebelum deploy production supaya tidak dikira error.

## 4. Housekeeping Terkait — Reusable Range Filter

Ditemukan saat kerjakan §3c: dropdown "Rentang" (lookback bulan, dulu "Active
Window") ternyata BELUM jadi komponen reusable — di-duplikasi manual di 3 halaman
dengan opsi yang TIDAK KONSISTEN:

| Halaman | Opsi saat ini | Default |
|---|---|---|
| `Transactions/index.tsx:95-104` | 1, 3, 6, 12 | 3 |
| `ProductsHighMargin/index.tsx:416-425` | 3, 6, 12 (tanpa 1 bulan) | 6 |
| `Products/index.tsx:224-233` | 3, 6, 12 (tanpa 1 bulan) | 6 |

Key i18n `filters.range1Month` SUDAH ADA (dipakai Transactions), tidak perlu key
terjemahan baru. Rencana: extract jadi `frontend/src/components/filters/
RangeFilter.tsx`, mirror pola `ExcludeIntercompanyToggle.tsx` (presentational
murni, props `value`/`onChange`/`size?`/`sx?`, tanpa hook sendiri) — opsi SELALU
1/3/6/12 di semua tempat. Refactor ketiga halaman di atas supaya pakai komponen
ini, ganti default ProductsHighMargin/Products dari 6 → tetap 6 (default tidak
diminta berubah, cuma opsi 1 bulan ditambahkan + komponennya di-satukan).

## 5. Di Luar Scope Task Ini

- Tab Upsell Targets (§2, sengaja dibiarkan company-wide).
- Fix RBAC `GET /customers/:id` (branch/division isolation gap, ditemukan di sesi
  yang sama) — task TERPISAH, tracking-nya lihat [[project_rbac_scope_audit_task015]]
  bagian lanjutan, dieksekusi independen dari task ini (scope-nya beda: itu security
  fix kecil mirror pola existing, ini feature design baru). Digabung 1 PR (#90)
  dengan task017 murni karena keduanya dikerjakan berurutan di working tree yang
  sama tanpa commit perantara, bukan karena scope-nya sama.

## 6. Status Akhir & Perubahan dari Desain Awal (2026-08-02)

Implementasi §3 selesai persis seperti desain (junction table, backend
division-aware, dialog drill-down Capaian per Divisi + Customer Pembeli). Dua
perubahan signifikan terjadi SETELAH desain awal ini ditulis, dipicu feedback
user langsung selama eksekusi — dicatat di sini karena dokumen §3c di atas
sudah tidak menggambarkan UI final:

1. **View flat per-produk jadi DEFAULT, tab Kategori DIHAPUS (bukan toggle).**
   §3c awalnya cuma menyebut "toggle Kategori/Produk". Setelah toggle itu
   dibangun (Produk default, Kategori sekunder), user menegaskan ulang lebih
   keras: *"product high margin adalah produk, bukan kategory!"* — root cause:
   SEMUA flag `high_margin_products` yang ada di data production selalu level
   produk (`product_id` terisi), 0 yang level-kategori, jadi tab Kategori
   (agregat per kategori) tidak pernah punya nilai tambah nyata, cuma
   menyamarkan identitas aslinya (produk). Toggle & `HighMarginCategoryTab`
   dihapus total dari `ProductsHighMargin/index.tsx` — halaman utama SEKARANG
   cuma render `HighMarginProductTab` (endpoint baru `GET /metrics/
   high-margin-penetration/products`, `fetchHmProductDetail()` di
   `high-margin-penetration.repository.ts`, reuse `hmCatsCte()`). Detail
   lengkap & konsekuensinya ke `CategoryProductsDialog` (jadi cuma dipakai tab
   Upsell Targets lagi) ada di [[high-margin-products]] §10.
2. **Chip "Divisi Fokus" digabung jadi 1 chip**, bukan 1 chip per divisi
   ditumpuk (`row.assign_to.map(d => d.label).join(' + ')`) — permintaan user,
   N chip kecil ditumpuk susah dibaca di kolom sempit tabel.

Konsekuensi lain yang tidak diminta tapi berlaku otomatis: dialog drill-down
kategori (`CategoryProductsDialog`) sempat didesain 2-tabel-ditumpuk (produk +
customer breakdown sekaligus terlihat) — ditegur user sebagai "keputusan desain
SANGAT BURUK", diperbaiki jadi 1 view yang saling gantian sebelum toggle
Kategori akhirnya dihapus. Lihat [[feedback_no_stacked_tables_in_dialog]].
