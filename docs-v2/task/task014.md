# Task 014 — Redesign UI Settings: Division & Customer Intercompany Jadi Halaman Terpisah

> Status: draft, belum dikerjakan. Task doc ditulis dulu sebelum coding sesuai konvensi proyek.
> Follow-up dari [[task013]] (backend sudah live), murni perbaikan UI berdasarkan feedback user pasca-review production.

## 1. Latar Belakang

Task013 mengimplementasikan fitur Customer Intercompany (dulu "Sister Company Names") dan sudah live di production (PR #62, #63). Setelah dicoba langsung, user memberi 3 feedback UI terhadap halaman `frontend/src/pages/Settings/Divisions/index.tsx` yang sekarang menumpuk 3 hal sekaligus:

1. **Chip style tidak konsisten** — chip "Nama Customer Intercompany" pakai `variant="filled" color="warning"`, sementara konvensi chip lain di app (`DivisionChip`, `StatusChip`, chip Division nonaktif) pakai `variant="outlined"`.
2. **Halaman terlalu padat** — "3 seting bertumpuk ini akan membingungkan pengguna" (Channel Division mapping + Division CRUD + Customer Intercompany semua di 1 halaman). Keputusan: **pisah jadi halaman/menu tersendiri** (bukan Tabs, bukan Accordion).
3. **Model CRUD berantakan** — *"untuk model tampilan CRUD gunakan seperti division jangan hanya tambahkan dan muncul cip tapi pakai tabel switch on off juga di tabel jangan berantakan seperti sekarang"* — ganti pola chip-bag + inline form jadi tabel proper dengan kolom Switch (toggle aktif/nonaktif) + Aksi (Edit/Hapus) + dialog Tambah.

Pola tabel+Switch yang sudah ada dan jadi acuan: **`frontend/src/pages/Config/Classification/index.tsx`** (`ResponsiveListView` + kolom Switch di `renderCell` yang langsung memanggil mutation + `ActionMenu` Edit/Delete + `Dialog` shared untuk form + Dialog kedua untuk confirm-delete).

## 2. Keputusan Desain — Kolom Switch di Customer Intercompany

Tabel `intercompany_customer_names` (task013) **tidak punya kolom `is_active`** — beda dengan `divisions` yang memang punya. Ditanyakan ke user: tambah kolom `is_active` beneran, atau cukup kolom Aksi Hapus tanpa Switch.

**Keputusan user: tambah kolom `is_active`.** Konsekuensi: perlu migration + endpoint PATCH baru + perubahan sync logic (lihat §3).

## 3. Scope Backend

### 3a. Migration — `intercompany_customer_names.is_active`
Tambah `is_active: boolean('is_active').notNull().default(true)` di `backend/src/db/schema/schema-transaction.ts` (dekat definisi tabel `intercompany_customer_names`, baris ~68-82), generate via `bun run db:generate` (jangan tulis SQL migration manual).

### 3b. Sync logic — `division_override_id` ikut status `is_active`
`syncCustomerDivisionOverride` (`intercompany-names.repository.ts:52-57`) dipanggil saat create (set override) dan delete (clear override). Toggle `is_active` harus punya efek yang sama:
- `is_active: false` → panggil `syncCustomerDivisionOverride(company_id, customer_name, null)` (clear override, sama seperti delete tapi record TIDAK dihapus).
- `is_active: true` (reaktivasi) → panggil `syncCustomerDivisionOverride(company_id, customer_name, divisionId)` (set lagi, sama seperti create — perlu `loadDivisionFallbackIds('intercompany')` seperti di `createIntercompanyNameService`, `intercompany-names.service.ts:47-48`).

### 3c. Endpoint & permission baru
- `PATCH /api/v1/settings/intercompany-names/:id` — body `{ is_active: boolean }`, permission baru `settings.intercompany:update`.
- Tambah 4 file layer (route/handler/service/repository update) mengikuti pola PATCH di `divisions.route.ts:37` / `divisions.handler.ts` / `divisions.service.ts` (audit log old/new value, pola `item-types.service.ts:77`).
- Handler **wajib** `resolveCompanyScope(c, existing.company_id)` (ambil row dulu, cek company, baru update) — pola sama seperti `deleteIntercompanyNameService` (`intercompany-names.service.ts:72-91`), bukan `resolveCompanyScope(c, body.company_id)` karena PATCH body tidak bawa `company_id`.
- Seed: tambah definisi permission `{ name: 'settings.intercompany:update', description: 'Update Sister Company Name', category: 'Division' }` (`backend/src/db/seed.ts`, dekat baris 136).

### 3d. Permission `:menu` untuk 2 halaman baru + WAJIB update `ADMIN_PERMISSION_NAMES`
Saat ini `settings.division:*` dan `settings.intercompany:*` tidak punya varian `:menu` (karena keduanya masih widget, bukan halaman, gate lewat `settings.channel.division:menu` di halaman gabungan). Tambah definisi permission baru di seed.ts:
- `settings.division:menu` — akses sidebar menu "Division"
- `settings.intercompany:menu` — akses sidebar menu "Customer Intercompany"

**Kritis — audit permission (lihat percakapan) menemukan gap ini**: menambah permission baru SAJA tidak cukup. Role `admin` (bukan superadmin) dapat permission lewat whitelist eksplisit `ADMIN_PERMISSION_NAMES` (`seed.ts:218-240`), BUKAN otomatis dari kategori/pola nama. Baris 233-234 saat ini:
```
'settings.division:view', 'settings.division:update',
'settings.intercompany:view', 'settings.intercompany:create', 'settings.intercompany:delete',
```
Kalau `:menu` baru tidak ditambahkan ke array ini, role Admin **kehilangan akses** ke 2 fitur ini begitu redesign jalan (regresi — sekarang mereka akses lewat `settings.channel.division:menu` yang menaungi halaman gabungan, nanti gate-nya pindah ke permission baru yang mereka belum punya). Wajib update jadi:
```
'settings.division:view', 'settings.division:update', 'settings.division:menu',
'settings.intercompany:view', 'settings.intercompany:create', 'settings.intercompany:delete', 'settings.intercompany:update', 'settings.intercompany:menu',
```
`settings.division:create/delete` **sengaja TETAP tidak ditambah** ke Admin (kebijakan existing, komentar `seed.ts:210-217`: division dianggap master data berisiko, hapus berdampak ke data transaksi — sama seperti Company/Branch/Channel Division). Superadmin otomatis dapat semua permission (`seed.ts:408-415`, tidak perlu disentuh). Role `user` tidak dapat apa pun di sini (di luar scope Administration group, `USER_PERMISSION_NAMES`, konsisten dengan sekarang).

### 3e. `page_settings` seed — 2 page_key baru
`backend/src/db/seed.ts` (dekat baris 300, pola `{ page_key: 'settings-divisions', ready: true }`):
- `{ page_key: 'settings-division-management', ready: true }`
- `{ page_key: 'settings-customer-intercompany', ready: true }`

## 4. Scope Frontend

### 4a. Halaman baru — Division Management
Route baru (belum ada path final — pakai `/settings/division-management` kecuali ada masukan lain), komponen baru di `frontend/src/pages/Settings/DivisionManagement/index.tsx`, mengambil isi widget Division CRUD yang sekarang ada di `Divisions/index.tsx:233-325` dan dipindah jadi halaman sendiri dengan pola `Config/Classification/index.tsx`:
- Tabel `ResponsiveListView`, kolom: `label`, `dormant_category`, `is_active` (Switch, `renderCell` langsung panggil `updateDivision.mutate`), Aksi (Edit/Delete via `ActionMenu`).
- Tombol "Tambah" buka `Dialog` shared (form: `label` TextField, `dormant_category` Select) — ganti inline TextField+Select yang sekarang.
- Hormati `is_protected` (division yang di-protect tidak bisa dihapus/nonaktifkan — cek logic existing di `Divisions/index.tsx` sebelum pindah).
- Reuse hooks yang sudah ada: `useDivisions`, `useCreateDivision`, `useUpdateDivision`, `useDeleteDivision` — tidak perlu hook baru.

### 4b. Halaman baru — Customer Intercompany
Route baru (`/settings/customer-intercompany`), komponen baru `frontend/src/pages/Settings/CustomerIntercompany/index.tsx`, isi dipindah dari `Divisions/index.tsx:327-406`:
- Tabel `ResponsiveListView`, kolom: `customer_name`, `is_active` (Switch → hook baru `useUpdateIntercompanyName`, perlu ditambah di `frontend/src/hooks/useIntercompanyNames.ts` memanggil endpoint PATCH baru §3c), Aksi (Hapus saja, tidak ada Edit karena satu-satunya field selain status adalah nama yang sudah unik+immutable).
- Tombol "Tambah" buka `Dialog` shared berisi `Autocomplete` pilih dari `customerNameChoices` (pola exact-match yang sudah ada, `Divisions/index.tsx:363-373`) — ganti Autocomplete inline yang sekarang.
- Widget "Channel Ambigu" (`Divisions/index.tsx:385-404`, `useAmbiguousChannels`) ikut pindah ke halaman ini (masih relevan di sini, bukan di Division Management).
- Chip kalau masih dipakai di tempat lain (mis. badge ringkas) → ganti ke `variant="outlined"` sesuai feedback #1. Kalau chip-bag sepenuhnya diganti tabel, cek ulang apakah masih ada chip yang perlu disentuh di luar halaman ini.

### 4c. Halaman existing — `Divisions/index.tsx` disederhanakan
Setelah §4a dan §4b, halaman ini tinggal berisi **Channel Division mapping** saja (bagian yang sudah proper — `ResponsiveListView` + `DivisionMappingDialog`, tidak perlu diubah). Hapus bagian Division CRUD (baris 233-325) dan Customer Intercompany (baris 327-406) beserta import/hook yang jadi tidak terpakai.

### 4d. Registrasi route + menu (3 tempat, per hasil riset)
1. `frontend/src/route/routeLazyComponents.tsx` — 2 lazy import baru.
2. `frontend/src/route/routeConstants.tsx` — 2 entry `routeRegistry` baru, `permissionKey: 'settings.division:menu'` dan `'settings.intercompany:menu'`.
3. `frontend/src/config/menu.tsx` (grup Settings, baris ~140-184) — 2 child item baru, ikuti pola item existing (`key`, `path`, `labelKey`, `icon`, `permissionKey`).
4. Tambah key i18n baru (`nav.settingsDivisionManagement`, `nav.settingsCustomerIntercompany`) di file locale yang dipakai `labelKey` sekarang (cek `nav.settingsDivisions` dipakai di mana).

## 5. Test Plan
- Backend: unit/integration test PATCH `/settings/intercompany-names/:id` — toggle `is_active` false→clear `division_override_id`, true→re-set; RBAC 403 kalau company di luar akses (regresi pola §2 task013).
- Backend: seed idempotent (permission baru & page_settings baru tidak duplikat kalau seed dijalankan ulang — pola existing sudah handle ini, cek tetap konsisten).
- Frontend: manual test di kedua halaman baru — toggle Switch reflect ke DB, Dialog Tambah/Edit/Delete berfungsi, sidebar menu muncul sesuai permission.
- Regresi: pastikan Channel Division mapping di `/settings/divisions` masih berfungsi normal setelah widget lain dipindah keluar.
- Migrate + seed production dijalankan manual setelah merge (ada kolom baru + permission baru + page_settings baru) — ingat [[project-edashboard-deploy-workflow]], PR ke main dulu baru migrate manual.

## 6. Scope yang SENGAJA tidak dikerjakan
- Tidak redesign ulang Channel Division mapping (§4c) — sudah proper, di luar keluhan user.
- Tidak menambah fitur Edit nama customer intercompany (hanya toggle status + hapus) — nama customer terikat exact-match ke data customer riil, edit manual di luar scope.
- Tidak audit ulang RBAC company-scope di fitur lain (sudah selesai di task013 §2).
