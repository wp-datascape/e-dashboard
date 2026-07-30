# Task 016 — Pareto Customer Monitoring & Alert

> Status: **Fase A selesai dikerjakan (2026-07-29)**, terverifikasi lokal
> (`bunx tsc --noEmit`/`tsc -b` bersih backend+frontend, `bun test` 82 pass/0 fail,
> `bun run build`+`lint` sukses, smoke test manual end-to-end via curl: create
> Pareto customer → threshold → report semua konsisten). Migration `0015` sudah
> diterapkan ke DB lokal. **PR #67 sudah dibuat** (branch
> `feature/task016-pareto-analisis`), belum di-merge — migrate/seed production
> belum dijalankan, tunggu PR merge dulu. Lihat §11 untuk detail lengkap apa
> yang sudah/belum dikerjakan.

## 1. Latar Belakang

Saat ini semua insight (dormant, high-margin, cross-selling) sifatnya pasif — admin
harus buka dashboard sendiri untuk tahu ada masalah. User ingin fitur pemantauan
proaktif khusus untuk customer prioritas ("Pareto" — analogi 80/20, customer yang
kontribusi revenue-nya besar), dengan alert otomatis kalau performa mereka turun,
dievaluasi per kuartal, semester, dan tahunan.

Pola UX yang diminta: mirip [[features/high-margin-products.md]] — admin secara
eksplisit *flag* customer mana yang masuk kategori "Pareto" lewat halaman Settings
(bukan dihitung otomatis dari 80/20 rule), baru customer yang di-flag itu yang
dipantau ketat.

## 2. Keputusan Desain (hasil klarifikasi dengan user)

| Aspek | Keputusan |
|---|---|
| Metrik dipantau | Revenue **dan** Margin (gross profit) |
| Cara flagging | Manual oleh admin, per customer (bukan auto-detect), mirror pola `high_margin_products` |
| Basis perbandingan | **Dua-duanya** — QoQ/SoS/YoY (vs periode sejenis sebelumnya) DAN vs periode sama tahun lalu — user pilih mode di UI |
| Periode evaluasi | Kuartal, semester, tahunan — threshold beda per periode |
| Channel alert | In-app (notification center) **dan** email |
| Threshold | Dikonfigurasi per company, per periode, per metrik (bukan hardcode) |
| Isolasi penerima | Berlapis **company → branch → division**, sama seperti isolasi data yang sudah berlaku sekarang — user cuma dapat alert customer yang ada dalam scope akses mereka |
| Email notifikasi | Field **baru**, terpisah dari email login (`users.email` dipakai autentikasi, belum tentu email kerja asli yang dipantau user) |
| Email provider | **Resend** — dipilih atas SMTP/SendGrid karena DX lebih cocok stack TS/Bun, deliverability lebih baik dari SMTP generic (SPF/DKIM sudah diurus provider), free tier cukup untuk volume alert periodik |
| Konfigurasi email | **Via UI Settings**, bukan `.env` — mirror pola [[features/accurate.md]] (kredensial terenkripsi di DB + tombol "Test Connection"), bukan hardcode |

## 3. Kelayakan Data (dicek di kode existing sebelum menulis rencana ini)

- `invoices.total_gp` dan `invoice_items.gross_profit` — **data GP riil per
  transaksi** sudah ada sejak awal (bukan estimasi dari `avg_margin_percent`
  kategori). Agregasi revenue+margin per customer per periode bisa langsung
  `SUM(total_revenue)`/`SUM(total_gp)` dari `invoices` di-filter `customer_id` +
  `invoice_date` range — tidak perlu data baru.
- Tidak ada infrastruktur cron/scheduler apa pun di backend saat ini (dicek: tidak
  ada `node-cron`, `nodemailer`, atau sejenisnya di `package.json`/kode). Backend
  jalan sebagai proses persisten di Railway (bukan serverless) — cocok untuk
  in-process scheduler (`node-cron` atau interval check sederhana), tidak perlu
  layanan cron eksternal.
- Tidak ada konsep "notification" (in-app) sama sekali di frontend/backend — bell
  icon, notification center, read/unread state semua baru.

## 4. Konfigurasi Resend via UI (mirror pola Accurate)

Sama persis pola `accurate_credentials` (`docs-v2/features/accurate.md`) — kredensial
disimpan di DB terenkripsi (reuse `utils/crypto.ts`, AES-256-GCM, key dari
`CREDENTIALS_ENCRYPTION_KEY` yang sudah ada di env), bukan raw di `.env`, dan ada
tombol "Test Connection" sebelum disimpan.

**Beda dari Accurate**: Accurate credentials per-`branch_id` (tiap cabang punya
akun Accurate sendiri). Email/Resend **satu row global untuk seluruh holding**
(dikonfirmasi user) — satu sender/domain di level holding, dipakai kirim alert ke
executive di masing-masing entitas (bukan per-company sender terpisah).

```
email_credentials          -- mirror accurate_credentials, tapi 1 row global (bukan per-branch)
  id, provider ('resend'),
  api_key           -- text, encrypted (AES-256-GCM, reuse utils/crypto.ts)
  sender_email, sender_name,
  is_active, tested_at,
  created_at, updated_at
```

**File structure** (mirror `features/config/accurate.*`):
```
backend/src/features/config/
  email.schema.ts       -- Zod: apiKey, senderEmail, senderName
  email.repository.ts   -- DB queries, encrypt sebelum insert/update
  email.service.ts      -- testConnection() via Resend API, saveCredentials()
  -- route ditambah ke config.route.ts/config.handler.ts yang sudah ada

frontend/src/
  pages/Config/Integration/index.tsx  -- tambah card "Email (Resend)" di samping Accurate
  api/email.api.ts
  hooks/useEmail.ts
```

**Test Connection**: Resend punya endpoint validasi API key (cek docs resmi saat
implementasi — lihat §7, perlu Context7 fetch docs Resend saat coding, jangan
asumsi dari memori training).

## 5. Data Model Baru — Pareto Monitoring (usulan)

```
pareto_customers          -- mirror high_margin_products
  id, company_id, customer_id, effective_from, effective_until (null=aktif),
  note, created_by, created_at, updated_at

pareto_alert_thresholds   -- 1 baris per (company_id, period_type, metric) — SETIAP
                             company independen, sama seperti pareto_customers, BUKAN
                             global. UI-nya tampil sbg section baru di halaman
                             Settings/Threshold yang sudah ada (bukan business_configs)
  id, company_id,
  period_type   -- quarter | semester | annual
  metric        -- revenue | margin
  drop_percent  -- turun berapa % baru dianggap alert-worthy
  is_active,
  created_at, updated_at

pareto_period_snapshots   -- hasil hitung per customer per periode tertutup, dihitung
                              sekali saat periode selesai (bukan real-time query)
  id, company_id, customer_id, period_type, period_key ('2026-Q3', '2026-S2', '2026'),
  revenue, margin, computed_at

notifications              -- generic, dipakai fitur ini + future
  id, user_id, type ('pareto_alert'), title, body, entity_ref (json),
  is_read, created_at
```

`pareto_period_snapshots` disimpan (bukan dihitung ulang tiap kali) supaya
perbandingan QoQ/YoY tinggal SELECT, dan histori tetap konsisten walau data invoice
lama di-edit di kemudian hari.

## 6. Alur Kerja

1. Admin flag customer sebagai Pareto di `Settings/ParetoCustomers` (halaman baru,
   pola sama seperti `Settings/HighMargin`: tabel + dialog tambah/nonaktifkan).
2. Admin set threshold per (periode, metrik) di halaman yang sama atau section
   terpisah.
3. Scheduler in-process jalan tiap hari, cek: "apakah ada periode (quarter/
   semester/tahun) yang baru saja tertutup dan belum di-snapshot untuk company
   ini?" — kalau ya, hitung `pareto_period_snapshots` untuk semua customer Pareto
   company itu.
4. Setelah snapshot baru dibuat, bandingkan ke snapshot periode sebelumnya (QoQ)
   dan periode sama tahun lalu (YoY) — kalau penurunan > threshold, buat
   `notifications` row + kirim email.
5. User lihat notifikasi via bell icon (badge unread count) di header dashboard +
   halaman riwayat alert.

**Penerima alert — isolasi berlapis company → branch → division** (dikonfirmasi
user, bukan cuma company-level). Sistem access-control berjenjang ini **sudah ada**
(`user_companies`, `user_branches`, `userDivisions` + utility `resolveCompanyScope`/
`resolveBranchScope`/`resolveDivisionScope` di `middleware/auth.ts`) — dipakai
untuk filter apa yang BOLEH dilihat user saat request. Untuk alert, arahnya
kebalik: dari 1 customer yang turun performanya, cari SEMUA user yang punya akses
ke scope customer itu.

- Resolve company/branch/division customer tsb — company dari `customers.company_id`
  langsung; branch+division diturunkan dari invoice terbarunya (sama seperti cara
  division ditampilkan di detail customer sekarang — `invoices.branch_id` +
  `channel_divisions` lookup by `channel_name`).
- Kandidat penerima = union dari: (a) semua superadmin (bypass, selalu dapat semua
  alert), (b) user non-superadmin yang py `user_companies` utk company itu **DAN**
  (kalau `branch_division_enforcement_enabled` aktif) py `user_branches`+
  `userDivisions` yang cocok dengan branch/division customer itu juga.
- Tidak ada role "executive" tersendiri di sistem ini — "Executive Admin" cuma
  nama tampilan untuk user ber-role `admin` (lihat `seed.ts`). Filter role
  (admin/superadmin vs role `user` biasa) masih perlu diputuskan saat implementasi
  Fase B — apakah SEMUA user dalam scope dapat alert, atau cuma yang role admin ke
  atas.

## 7. Email Notifikasi — Field Baru (terpisah dari email login)

`users.email` sekarang WAJIB+unik, dipakai autentikasi (login) — bukan otomatis
alamat kerja asli yang dipantau user, dan data existing di production kemungkinan
diisi placeholder. Ditambah kolom baru **`notification_email`** (nullable,
terpisah dari `email` login):

```
-- migration tambahan ke tabel users
notification_email  varchar(255), nullable
```

- User TANPA `notification_email` terisi → tetap dapat notifikasi in-app (Fase B),
  tapi di-skip dari pengiriman email (Fase C) sampai diisi.
- UI pengisian: ditambahkan sebagai field baru di `EditUserDialog.tsx` (pola sama
  seperti field "Reset Password" yang sudah ada di situ, task terkait: commit
  `42da027`), admin isi manual per user. Opsional lanjutan: user isi sendiri lewat
  halaman profil/`AppSettings` (self-service) — diputuskan nanti, tidak blocking
  Fase A.
- Field ini masuk scope **Fase A** (migration + UI field) meski baru benar-benar
  dipakai di Fase C — supaya data sempat diisi duluan sebelum email delivery jadi
  aktif, tidak nunggu Fase C baru mulai kumpul data.

## 8. Scope & Fase (usulan, supaya tidak satu PR raksasa)

- **Fase A** — Settings Pareto Customer + threshold config (company-scoped, §5) +
  halaman laporan on-demand + migration `notification_email` (§7, kolomnya saja,
  belum dipakai kirim). Isolasi company→branch→division (§6) dibangun ke DATA
  MODEL dari awal (kolom/relasi yang dibutuhkan sudah benar), meski logic
  resolve-penerima baru benar-benar dieksekusi di Fase B. Value langsung kepakai
  tanpa infra baru selain tabel-tabel di atas (minus `notifications`).
- **Fase B** — Scheduler otomatis + logic resolve-penerima berlapis (§6) +
  notification center in-app (tabel `notifications`, bell icon, badge, halaman
  riwayat).
- **Fase C** — Setup Resend (kredensial via UI §4) + email delivery (pakai
  `notification_email` yang sudah mulai diisi sejak Fase A).

**Keputusan**: mulai dari **Fase A** dulu (dikonfirmasi user), isolasi berlapis
dirancang dari awal di data model meski baru aktif penuh di Fase B.

## 9. Keputusan Final

- **Threshold default**: 15% penurunan (di-seed sebagai default, admin tetap bisa
  ubah per company/periode/metrik di UI — bukan hardcode permanen).
- **Customer baru tanpa histori YoY** (belum genap setahun) — di-skip dari
  perbandingan YoY (tidak dianggap "turun", karena tidak ada pembanding), tetap
  dievaluasi normal untuk QoQ/SoS begitu punya minimal 2 periode data.

## 10. Test Plan (nanti, saat eksekusi)
- Unit: perhitungan snapshot & perbandingan (edge case: customer baru tanpa
  histori, periode dengan 0 invoice).
- `resolveCompanyScope` wajib di semua endpoint baru (pelajaran [[task015]]) —
  cek dari awal, jangan nunggu audit terpisah lagi.
- Regresi: `bunx tsc --noEmit` + `bun test` full suite tetap hijau.

## 11. Status Implementasi Fase A (2026-07-29)

**Backend** (`backend/src/features/settings/`):
- `pareto-customers.*` (schema/repository/service/handler/route) — CRUD flag
  Pareto customer, `resolveCompanyScope` di semua endpoint sejak awal (bukan
  ditambal belakangan seperti gap yang ditemukan [[task015]]). Endpoint tambahan
  `GET /customer-options` untuk Autocomplete (mirror pola
  `intercompany-names/customer-options`, permission sendiri `settings.pareto:view`
  — sengaja tidak numpang permission `settings.intercompany:*` biar tidak ada
  kopling lintas fitur).
- `pareto-thresholds.*` — upsert (bukan create/delete terpisah) via
  `onConflictDoUpdate` pada unique index `(company_id, period_type, metric)`.
  Reuse permission `settings.threshold:*` (bukan permission baru) karena UI-nya
  numpang di halaman Settings/Threshold yang sama (§7).
- `pareto-report.*` + `pareto-period.util.ts` — laporan on-demand, agregasi
  `SUM(total_revenue)`/`SUM(total_gp)` LANGSUNG dari `invoices` (bukan join
  `invoice_items`, hindari duplikasi — pola sama seperti
  `customers.repository.ts` trend 12 bulan). Default periode = periode terakhir
  yang sudah tutup penuh (`getLatestClosedPeriodKey`), bukan periode berjalan.
  Threshold per company dari `pareto_alert_thresholds`, fallback
  `DEFAULT_PARETO_DROP_PERCENT=15` kalau company belum set custom.
- Migration `0015_furry_moondragon.sql` (via `drizzle-kit generate`, bukan tulis
  SQL manual) — tabel `pareto_customers`, `pareto_alert_thresholds`, kolom
  `users.notification_email`. **`pareto_period_snapshots` SENGAJA TIDAK dibuat di
  Fase A** — laporan on-demand hitung langsung dari `invoices` tiap request,
  tabel snapshot baru dibutuhkan Fase B (scheduler) supaya histori tidak berubah
  kalau invoice lama di-edit.
- Permission baru `settings.pareto:menu/view/create/update/delete`, sudah masuk
  `ADMIN_PERMISSION_NAMES` (pelajaran [[task014]] — jangan lupa whitelist admin).
- `users.schema.ts`/`.service.ts`/`.repository.ts` — `notification_email`
  ditambahkan ke `updateUserSchema` (transform `''` → `null` di level Zod, bukan
  cast paksa di service) dan SELECT list `findAllUsers`/`findUserById` (tidak
  otomatis ikut kalau cuma nambah kolom skema — eksplisit select list).

**Frontend**:
- `Settings/ParetoCustomers` — halaman baru, mirror persis pola
  `Settings/HighMargin` (tabel + dialog + Autocomplete customer riil).
- `Settings/Threshold` — section baru `ParetoThresholdSection` (matriks 3x2
  kuartal/semester/tahunan × revenue/margin, inline edit), ditambahkan ke
  halaman existing sesuai permintaan user, BUKAN numpang ke sistem
  `business_configs` key-value yang global (lihat §7 kenapa dipisah).
- `ParetoReport` — halaman laporan, dropdown periode + dropdown basis banding
  (QoQ/YoY/keduanya), navigator kuartal/semester/tahun (prev/next + badge
  "sedang berjalan"), badge Alert/Normal per baris. **Sengaja BUKAN di bawah
  Settings** — ini halaman analitik/viewing (mirip Cross-Selling, Dormant
  Customer), bukan konfigurasi. Ditempatkan di grup menu **Customer Workbench**,
  path `/pareto-report` (bukan `/settings/pareto-report`). Halaman flagging
  `Settings/ParetoCustomers` tetap di Settings karena itu memang aksi admin.
- `EditUserDialog.tsx` — field `notificationEmail` baru, terpisah dari email
  login (read-only).
- Menu, routes (`routeConstants.tsx`/`routeLazyComponents.tsx`), i18n (en+id,
  namespace baru `paretoCustomers`/`paretoThreshold`/`paretoReport` + key baru di
  `nav`/`users`) — lengkap.

**Verifikasi**: `bunx tsc --noEmit` (backend) dan `tsc -b` (frontend) bersih,
`bun test` backend 82 pass/0 fail (sama seperti baseline sebelum task016), `bun
run build` dan `bun run lint` frontend sukses (12 warning pre-existing, 0 error,
tidak ada regresi baru). Smoke test manual end-to-end via curl (login → create
Pareto customer → upsert threshold → GET report menunjukkan data konsisten →
data test dibersihkan lagi) — dev server sudah dimatikan setelah selesai.

**Belum dikerjakan / sengaja di luar scope Fase A**: Fase B (scheduler otomatis +
notification center in-app + tabel `notifications`) dan Fase C (integrasi Resend
+ email delivery sungguhan) — sesuai keputusan §7. `pareto-report.service.ts`
belum ada unit test otomatis untuk edge case (customer tanpa histori, invoice 0)
— dicatat sebagai gap, bukan blocker, konsisten dengan gap serupa yang dicatat di
[[task015]] §4.

**Belum dilakukan**: commit/push/PR — menunggu instruksi eksplisit user, sama
seperti pola [[task015]].

## 12. Revisi Laporan — Tampilkan SEMUA Customer, Bukan Cuma yang Di-flag (2026-07-29)

Setelah demo awal, user minta laporan direvisi supaya konsisten dengan pola
**High Margin di halaman Product Ledger** (`pages/Products/index.tsx`): produk
high-margin TIDAK punya halaman laporan terpisah — mereka tetap tampil di list
produk LENGKAP, cuma ditandai chip `is_high_margin`. Laporan Pareto direvisi
mengikuti pola yang sama:

- `GET /settings/pareto-report` sekarang mengembalikan **SEMUA customer di
  scope** (bukan cuma yang di-flag Pareto), masing-masing dengan flag
  `is_pareto: boolean` + chip `ParetoBadge` (mirror `highMarginBadge`).
  Customer yang di-flag Pareto **diprioritaskan tampil duluan** — `ORDER BY
  bool_or(pareto_customers aktif) DESC, customer_name ASC` di
  `pareto-report.repository.ts` (`findCustomersWithParetoFlag`), BUKAN sekadar
  filter/toggle seperti High Margin.
- Kalkulasi threshold/alert (QoQ, YoY, drop_percent) **SAMA untuk semua baris**,
  Pareto maupun bukan — supaya customer non-Pareto yang kebetulan turun tajam
  juga ketahuan, bukan cuma yang sudah di-flag.
- Karena sekarang bisa ratusan/ribuan baris (952 customer di data lokal saat
  dites), endpoint ditambah **pagination server-side** (`page`/`per_page`, pakai
  helper `paginated()` yang sama seperti endpoint list lain) + **search by nama
  customer** (`ilike`). Response envelope berubah dari array polos jadi
  `PaginatedResponse<ParetoReportRow>` (`{data, meta}`).
- **Untuk Fase C (email notifikasi) nanti**: user secara eksplisit minta email-nya
  terdiri dari **2 tabel** — tabel 1 = customer yang di-flag Pareto (prioritas),
  tabel 2 = SEMUA customer lain yang kena kondisi alert yang sama (drop >
  threshold) tapi belum di-flag Pareto. Backend sudah siap untuk ini karena
  `is_pareto` + alert flag sudah dihitung per baris yang sama — tinggal split
  jadi 2 grup saat compose email di Fase C, tidak perlu query terpisah.

**Penempatan menu direvisi 2x**:
1. Awalnya di Settings (salah — ini halaman analitik/viewing, bukan konfigurasi).
2. Dipindah ke Customer Workbench.
3. **Final: dipindah ke Transaction & Revenue** (permintaan eksplisit user,
   sejajar dengan Transactions/Projects) — path `/pareto-report`, key route
   `pareto-report`, label `nav.paretoReport`. Halaman `Settings/ParetoCustomers`
   (flagging, aksi admin) TETAP di Settings — itu memang tempatnya.

File pindah lokasi: `pages/Settings/ParetoReport/` → `pages/ParetoReport/`.
Verifikasi ulang setelah revisi: `tsc`/`bun test`/`build`/`lint` semua tetap
hijau (lihat riwayat commit — belum di-commit saat ini ditulis).

## 13. Rename Menyeluruh: "Pareto Report" → "Analisis" (2026-07-29)

User minta nama fitur laporan ini diganti total jadi **"Analisis"** — bukan cuma
label menu, tapi SEMUA (URL, nama file/folder, permission) "biar konsisten dan
tidak membingungkan maintenance" (kata user). Rename ini **HANYA untuk fitur
laporan/report** — fitur flagging (`pareto_customers` table, `Settings/
ParetoCustomers`, `pareto-customers.*`, `pareto-thresholds.*`) TETAP pakai nama
"Pareto" karena itu memang tentang konsep Pareto customer, bukan bagian yang
diganti.

**Backend** — pindah dari `features/settings/` ke folder baru
`features/analisis/`:
- `pareto-report.schema/repository/service/handler/route.ts` → `features/
  analisis/analisis.{schema,repository,service,handler,route}.ts`
- `pareto-period.util.ts` → `features/analisis/period.util.ts` (`ParetoPeriodType`
  → `PeriodType`, exclusive ke fitur ini, tidak dipakai fitur lain — dicek dulu
  sebelum rename, `pareto-thresholds.schema.ts` punya `periodTypeEnum` z.enum
  sendiri, tidak bergantung ke type ini)
- Identifier: `generateParetoReport`→`generateAnalisis`, `ParetoReportRow`→
  `AnalisisRow`, `findCustomersWithParetoFlag`→`findAnalisisCustomers`, dst.
- Sekaligus bersihkan dead code `findActiveParetoCustomers`/
  `ActiveParetoCustomerRow` (sisa sebelum revisi §12, sudah tidak dipanggil).
- **Permission baru `analisis:menu`/`analisis:view`** (SENGAJA dipisah dari
  `settings.pareto:*` yang dipertahankan untuk halaman flagging) — masuk
  `ADMIN_PERMISSION_NAMES`. Route API: `/settings/pareto-report` →
  **`/analisis`** (top-level, bukan di bawah `/settings`, konsisten dengan
  keputusan §12 kalau ini bukan halaman settings).
- `page_settings.page_key`: `pareto-report` → `analisis`.

**Frontend**:
- `pages/ParetoReport/` → `pages/Analisis/` (`ParetoReportPage`→`AnalisisPage`)
- `types/paretoReport.ts` → `types/analisis.ts` (`ParetoReportRow`→
  `AnalisisRow`, dst. — `ParetoPeriodType` di `types/paretoThresholds.ts` TETAP,
  shared dengan config threshold yang masih bernama Pareto)
- `api/paretoReport.api.ts` → `api/analisis.api.ts`,
  `hooks/useParetoReport.ts` → `hooks/useAnalisis.ts`,
  `utils/paretoPeriod.ts` → `utils/analisisPeriod.ts`
- i18n namespace baru `analisis.json` (en+id, ganti dari `paretoReport.json`) —
  termasuk judul halaman ("Laporan Pareto Customer" → "Analisis")
- Route path `/pareto-report` → `/analisis`, route key `pareto-report`→
  `analisis`, menu labelKey `nav.paretoReport`→`nav.analisis`

**Verifikasi setelah rename**: `bunx tsc --noEmit` (backend) bersih, `bun test`
82 pass/0 fail, `tsc -b` (frontend) bersih, `build`+`lint` sukses (0 error),
smoke test curl ke `/analisis` dengan permission baru `analisis:view` — data
identik dengan sebelum rename (952 customer, urutan Pareto tetap prioritas).
Grep akhir memastikan tidak ada sisa referensi `pareto-report`/`paretoReport`/
`ParetoReport`/`pareto-period` di seluruh codebase.

## 14. Toggle "Hanya Pareto" + Sort by Revenue (2026-07-29)

Dua tambahan di halaman Analisis, mirror pola `high_margin_only` di Product
Ledger:

- **Toggle "Hanya Pareto"** (`only_pareto` query param) — filter list ke
  customer yang di-flag Pareto saja. Di repository, filter ini pakai `HAVING
  bool_or(pareto_customers.id IS NOT NULL) = true` (bukan WHERE, karena
  `is_pareto` adalah hasil agregat dari LEFT JOIN, bukan kolom biasa). Query
  `COUNT` untuk pagination `meta.total` disesuaikan jadi `INNER JOIN` ke
  `pareto_customers` aktif kalau toggle nyala, supaya total tetap akurat.
- **Sort by revenue** (kolom "Periode Ini" jadi sortable, klik header
  DataGrid) — perubahan arsitektur penting: revenue/margin periode SAAT INI
  sekarang dihitung LANGSUNG di query `findAnalisisCustomers` (LEFT JOIN
  `invoices` + `SUM(CASE WHEN invoice_date BETWEEN ... THEN ... END)`), BUKAN
  lagi query terpisah `aggregateInvoicesByCustomer` sesudah paginasi. Alasan:
  kalau agregasi baru dihitung SETELAH `LIMIT/OFFSET`, sort by revenue tidak
  mungkin benar lintas halaman (cuma benar dalam 1 halaman yang sudah
  ke-paginate duluan berdasar urutan lain). `aggregateInvoicesByCustomer` tetap
  dipertahankan, tapi sekarang HANYA dipakai untuk periode previous/YoY (yang
  memang cuma perlu dihitung untuk customer di halaman yang sedang tampil, tidak
  perlu basis sorting).
- Default order (tanpa sort eksplisit) tetap `is_pareto DESC, customer_name
  ASC` seperti §12. Begitu user klik sort kolom "Periode Ini", urutan prioritas
  Pareto itu DIABAIKAN sepenuhnya — sort eksplisit user menang, bukan
  di-gabung/dipartisi dengan prioritas Pareto (konsisten dengan hasil test:
  "KODE NIAGA TAMA, PT" yang BUKAN Pareto muncul ranking #1 saat sort revenue
  desc, karena revenue-nya memang terbesar).
- Implementasi query pakai `.$dynamic()` (fitur drizzle-orm untuk conditional
  query building — dicek dulu versi terpasang `drizzle-orm@0.45.2`, BUKAN 0.31
  seperti disebut di memory lama, jadi `.$dynamic()` aman dipakai).

**Verifikasi**: smoke test curl — `only_pareto=true` mengembalikan tepat 2 baris
(customer yang di-flag), `sort_by=revenue&sort_dir=desc` menampilkan revenue
terbesar duluan (termasuk customer non-Pareto), `sort_dir=asc` kebalikannya.
`tsc`/`bun test` (82 pass)/`build`/`lint` semua tetap hijau setelah perubahan.

## 15. Bug `z.coerce.boolean()` + Perbaikan UX Tambahan (2026-07-29)

**Bug ditemukan user**: `only_pareto: z.coerce.boolean()` di schema salah — query
string HTTP selalu string, dan `Boolean("false")` di JS hasilnya `true`. Akibatnya
toggle "Hanya Pareto" AKTIF TERUS terlepas state UI, user sampai kaget data
"hilang". Codebase ini SUDAH punya catatan eksplisit soal bug yang sama persis
di 5+ file lain (`high-margin.schema.ts` dkk) — pelajaran: cek pola existing
sebelum nulis schema boolean baru dari query string. Fix: pola
`z.string().optional().default('false').transform(v => v === 'true')`.
Detail penuh + memory feedback baru: [[feedback_zod_coerce_boolean_query_string]].

**Perbaikan UX tambahan** (dari feedback user beruntun):
- Default order (`sortBy !== 'revenue'`) ditambah tiebreak `revenue DESC` setelah
  `is_pareto DESC` — sebelumnya tiebreak cuma `customer_name ASC`, bikin customer
  nol-transaksi berawalan angka/huruf awal nongol duluan di atas customer aktif
  ber-omset besar (contoh: "18DIMSUM.IDN" tampil sebelum customer jutaan rupiah).
- Kolom "Periode Ini" (`current`) diberi `sortingOrder: ['desc', 'asc', null]` —
  klik pertama header DataGrid langsung descending, bukan ascending default MUI
  (yang bikin sort kelihatan "salah arah"/tidak berfungsi kalau banyak baris 0).
- **Toggle Exclude Intercompany ditambahkan** — mirror `ExcludeIntercompanyToggle`
  yang sudah dipakai Products/Transactions/Customers. Butuh subquery
  `latestChannelSq` (channel_name invoice terbaru per customer, pola sama persis
  `latestSalespersonSq` di `customers.repository.ts`) + JOIN `channel_divisions`
  + `buildExcludeIntercompanyCondition` dari `utils/scope.ts` (COALESCE
  `division_override_id`, `channel_divisions.division_id`). Tervalidasi: customer
  "KODE NIAGA TAMA, PT" (contoh intercompany di komentar `ExcludeIntercompanyToggle.tsx`
  sendiri) otomatis ter-exclude saat toggle nyala, total 952→950.

**Verifikasi**: smoke test curl utk semua kombinasi (default/only_pareto/
exclude_intercompany/sort_by × asc/desc), `tsc` backend+frontend bersih,
`bun test` 82 pass, `build`+`lint` frontend sukses.
