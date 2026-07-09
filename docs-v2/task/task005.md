# Task 005 — Frontend Division Dinamis (Filter + Admin)

> Status: ✅ Selesai — Session A+B+C+D + backlog auto-derive branch & auto-create kode divisi semua tuntas 2026-07-09
> Dibuat: 2026-07-09
> Baca juga: `docs-v2/task/task004.md` (backend: tabel `divisions`, RBAC scope dinamis)
>
> **Dikerjakan per session, satu section per sesi kerja** — jangan lompat ke session berikutnya sebelum session sebelumnya selesai + terverifikasi. Update status per session di §3 begitu selesai.

---

## 1. Latar Belakang

Task004 (backend) bikin `division` jadi katalog dinamis per company+branch (tabel `divisions`), gantiin enum hardcode 7-value global. Frontend belum menyusul — masih ada beberapa titik yang bergantung pada asumsi lama (enum tetap, tidak sadar branch).

**Yang sudah benar (branch dropdown)**: `useBranchesByCompany()` sudah fetch dari tabel `company_branches` asli — MKO otomatis tidak menampilkan branch "Semarang" karena memang tidak punya.

**Yang bermasalah**:
1. Dropdown Division di halaman laporan/metric belum sepenuhnya ikut branch (bug spesifik di `useScopedCompanyFilter.ts` jalur unrestricted user).
2. Belum ada halaman admin untuk kelola katalog `divisions` (list/add/edit divisi per company/branch) — sekarang cuma bisa lewat seed/API langsung.
3. `AssignmentTreePicker` (RBAC picker) masih pakai `DIVISION_VALUES` hardcode 7-value.
4. `DivisionChip`/`BuChip` warna fallback generik untuk kode baru (KNT/SKI).

---

## 2. Keputusan Desain

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Sumber data endpoint `/values` | Ganti dari `DISTINCT channel_divisions.division` ke katalog `divisions` (`findActiveDivisionCodesForScope`) | Katalog = sumber kebenaran; divisi terdaftar tapi belum ada channel mapping tetap harus muncul |
| `branch_id` di endpoint `/values` | Ditambahkan, opsional | Dropdown bisa menyempit ke divisi branch spesifik + company-wide |
| Tipe `Division`/`DivisionOption.value` | Closed union → `string` biasa (di jalur filter dropdown) | Kode divisi dinamis per company, tidak bisa lagi jadi union tetap di TS |
| Model halaman admin Divisions (Session B) | Mirror Company+Branch: list utama = Division, row action View/Edit/**Edit Mapping** (nested channel_name→division, gantiin Channel Division sbg halaman utama) | Sudah disepakati di task004.md §Task D — permission `settings.division:*` terpisah dari `settings.channel.division:*` tapi 1 halaman |
| `AssignmentTreePicker` (Session C) | `DIVISION_VALUES.map()` diganti fetch dinamis per company+branch yang lagi dipilih di picker | RBAC admin harus bisa assign divisi KNT/SKI yang benar, bukan cuma 7 kode MKO |
| `DivisionChip`/`BuChip` (Session D) | Warna deterministik dari hash string kode (bukan lookup map tetap) | Kode dinamis tidak bisa di-pre-enumerasi; hash-based color tetap konsisten per kode tanpa maintenance |

---

## 3. Breakdown per Session

### Session A — Filter dropdown laporan/metric (✅ selesai 2026-07-09)
Scope: akurasi filter Company→Branch→Division di 9 halaman laporan/metric existing (Dashboard, Customer/Product/Transaction Workbench). Detail lengkap ada di §4 di bawah.
- [x] A1–A5 (backend `/values`), B1–B5 (frontend hook), C1–C4 (verifikasi) — lihat §4

### Session B — Halaman admin "Divisions" (✅ selesai 2026-07-09)
Scope: halaman baru mirror Companies — list semua divisi (per company/branch), tombol Add = tambah divisi baru, row action Edit/**Edit Mapping**/Delete (nested kelola `channel_divisions`).
- [x] B1. Halaman `frontend/src/pages/Settings/Divisions/index.tsx` ditulis ulang total (bukan lagi channel mapping) — list tabel: Code, Name, Company, Branch ("All branches" kalau company-wide), Dormant Bucket, Status, Actions. Filter Company dropdown (muncul kalau >1 company)
- [x] B2. `components/DivisionDialog.tsx` (baru) — form Add/Edit: Company (select, disabled saat edit — immutable) → Branch (select, opsional "All branches", cascading dari company) → Code → Name → Dormant Bucket (4 pilihan) → Active switch (edit only)
- [x] B3. `components/DivisionMappingSection.tsx` (baru, gantiin `DivisionMappingDialog.tsx` yang dihapus) — row action "Edit Mapping" buka dialog nested berisi semua `channel_divisions` utk division ini (scoped fix dari company_id/branch_id/code row, tidak perlu dipilih ulang) — list channel_name + delete icon, plus inline-add (Autocomplete dari channel belum ter-mapping + tombol Add), mirror pola `BranchSection.tsx`
- [x] B4. `hooks/useDivisions.ts` (baru) + `api/divisions.api.ts` (baru) + `types/divisions.ts` (baru: `DivisionRow`, `DormantBucket`, payload types) — konsumsi endpoint `/settings/divisions` dari task004
- [x] B5. Permission guard `settings.division:*` sudah otomatis aktif (permission di-seed task004); route `settings-divisions` di `routeConstants.tsx` diubah dari `settings.channel.division:view` ke `settings.division:view`; label nav diubah dari "Channel Divisions" ke "Divisions" (en/id)
- [x] B-extra. Backend: `divisions.repository.ts` `findDivisions()` ditambah LEFT JOIN `companies`+`company_branches` supaya response langsung bawa `company_name`/`branch_name` (dulu cuma raw table row) — dibutuhkan biar frontend tidak perlu lookup manual
- [x] B-extra. `types/channelDivisions.ts` disinkronkan ke kontrak backend task004 (`company_id` wajib, `branch_id` opsional, `division` jadi `string` bukan union) — mock handler `channelDivisions.handler.ts` disesuaikan (walau ternyata TIDAK terdaftar di `mocks/handlers.ts`, sudah dead/unused sejak fitur ini pindah ke real-backend-only, konsisten dengan pola customers/transactions/dll)
- [x] B6. Import CSV/XLSX — **selesai dengan desain berbeda dari rencana awal** (lihat §6 Backlog): bukan kolom `branch_code` manual, melainkan auto-derive dari histori invoice + auto-create kode divisi baru ke katalog
- [x] B7. Update `docs-v2/features/channel-divisions.md` mencerminkan struktur baru (halaman + 2 tabel) — selesai 2026-07-09, ditulis ulang total (tabel `divisions`+`channel_divisions`, endpoint `/settings/divisions`, struktur halaman baru)

**Verifikasi (Playwright, browser asli, MSW dimatikan)**:
- List 15 baris (7 MKO + 7 KNT + 1 SKI) tampil benar dengan company/branch/dormant bucket/status yang sesuai
- Filter by Company=KNT → list menyempit ke 7 baris KNT saja
- Dialog Add Division: pilih Company="PT Solusi Kartu Indonesia" → isi Code="sales_test", Name="Sales Test" → submit → berhasil tersimpan (dikonfirmasi via `GET /settings/divisions?company_id=3`), lalu dibersihkan (hard delete test data)
- Row action "Edit Mapping" pada divisi "Distribution" (MKO) → dialog nested "Channel Mapping — Distribution" menampilkan 8 channel_name mapping (DC EAST, DC EAST CARD, dst) dengan tombol hapus per baris — sesuai
- 0 error console di seluruh alur; `bunx tsc --noEmit` (FE+BE) bersih; `bun test` (BE) 38 pass 0 fail

### Session C — RBAC picker dinamis (✅ selesai 2026-07-09)
Scope: `AssignmentTreePicker.tsx` assign divisi ke user per branch harus pakai katalog dinamis, bukan `DIVISION_VALUES` hardcode.
- [x] C1. `AssignmentTreePicker.tsx`: `DIVISION_VALUES.map()` diganti — baris division diekstrak jadi komponen `BranchDivisionSection` tersendiri (Rules of Hooks: `useDivisionOptions()` tidak boleh dipanggil di dalam `.map()`), fetch `useDivisionOptions(companyId, branchAssignment.branch_id)` per baris branch yang sedang di-assign
- [x] C2. Label divisi: dropdown & `renderValue` pakai `opt.label` dari `useDivisionOptions()` (hasil `formatEnumLabel(code)`) — bukan `t('users.divisions.${d}')` i18n key statis lagi
- [x] C3. `ViewUserDialog.tsx`: chip label divisi read-only ganti `t('users.divisions.${d}')` → `formatEnumLabel(d)` (`@/utils/format`), konsisten dengan sumber label di tempat lain (DivisionChip, filter dropdown)
- [x] C4. i18n key `users.divisions.*` (7 kode hardcode) dihapus dari `en/users.json` + `id/users.json` — dikonfirmasi tidak ada pemakaian lain sebelum dihapus
- [x] `types/users.ts`: `DIVISION_VALUES` const dihapus, `DivisionValue` jadi alias `string`

**Verifikasi (Playwright, browser asli, end-to-end)**:
- Dialog "Add User" → pilih Company="PT Kode Niaga Tama" → Branch="Surabaya" → dropdown Select Divisions tampil **["Counter", "U Card", "Other"]** (bukan 7 kode MKO)
- Isi form lengkap (name/email/password/role/company/branch/division="Counter") → Save → user baru berhasil tersimpan, muncul di list dengan company "PT KNT"
- Buka "User Detail" user yang baru dibuat → tree Company→Branch→Division tampil benar: PT Kode Niaga Tama → Surabaya → chip "Counter" (label ter-format rapi dari kode `counter`)
- 0 error console; data test dibersihkan (hard delete) setelah verifikasi; `bunx tsc --noEmit` (FE+BE) bersih; `bun test` (BE) 38 pass 0 fail

### Session D — Polish visual (✅ selesai 2026-07-09)
Scope: warna chip/label dinamis, bukan prioritas fungsional.
- [x] D1. `frontend/src/utils/divisionColor.ts` (baru, shared) — `getDivisionColor(code)`: 6 kode MKO asli tetap warna lama (`KNOWN_COLORS` map), kode baru (KNT/SKI/dst) dapat warna deterministik dari hash string ke pool `['primary','success','warning','error','info']`. `DivisionChip.tsx`/`BuChip.tsx` diupdate pakai utility bersama ini, menggantikan 2 color-map hardcode duplikat yang identik
- [x] D2. Warna hash-based dibatasi ke palet `StatusChip`/MUI standar (bukan warna custom) — kontras light/dark mode otomatis ikut tema MUI existing, tidak perlu penanganan terpisah

---

## 4. Detail Session A

### Task A — Backend: endpoint `/values` terima `branch_id` + baca dari katalog
- [x] A1. `channel-divisions.schema.ts`: schema baru `listDivisionValuesQuerySchema` (`company_id` + `branch_id` opsional), dipisah dari `unmappedChannelsQuerySchema` (endpoint beda kebutuhan)
- [x] A2. `divisions.repository.ts`: fungsi baru `findDivisionCodesForFilter(companyId: number | 'all', branchId?: number)` — beda semantik sengaja dipisah dari `findActiveDivisionCodesForScope` (yang branchId=null artinya "cuma company-wide", dipakai validasi create/update) — di sini branchId undefined = union semua branch company itu
- [x] A3. `channel-divisions.service.ts`: `listDivisionValuesService(companyId, branchId?)` — pakai `findDivisionCodesForFilter`; `findDistinctDivisions` (fungsi lama, sudah tidak dipakai) dihapus sebagai dead code
- [x] A4. `channel-divisions.handler.ts` — terima & teruskan `branch_id` dari query (route.ts tidak perlu berubah)
- [x] A5. Update `docs-v2/features/channel-divisions.md` §`/values` endpoint

### Task B — Frontend: hook & API client
- [x] B1. `api/channelDivisions.api.ts`: `listDivisionValues(companyId, branchId?)` — kirim `branch_id` di query string
- [x] B2. `hooks/useChannelDivisions.ts`: `useDivisionValues(companyId, branchId?)` — `branchId` masuk `queryKey`
- [x] B3. `hooks/useDivisionOptions.ts`: `useDivisionOptions(companyId, branchId?)`, `DivisionOption.value: string`
- [x] B4. `hooks/useScopedCompanyFilter.ts`: **bug utama diperbaiki** — `fullDivisionOptions` sekarang teruskan `branchId` (`branchId==='all' → undefined`); state `division` jadi `string`
- [x] B5. `types/customers.ts`: `Division` diubah dari closed union 6-nilai jadi `string | null` — perubahan ini otomatis merambat benar ke semua pemakai `NonNullable<Division>` (jadi `string`) tanpa edit manual satu-satu, termasuk `DivisionChip`/`BuChip` yang pakai `Record<NonNullable<Division>, ...>` (tetap valid karena `Record<string,X>` tidak wajib exhaustive, fallback `?? 'default'` sudah ada)

### Task C — Verifikasi (✅ dijalankan dengan Playwright + browser asli, bukan cuma typecheck)
- [x] C1. `bunx tsc --noEmit`/`tsc -b` (frontend) + `bunx tsc --noEmit` (backend) bersih; `bun test` backend 38 pass 0 fail
- [x] C2. Manual via Playwright (login superadmin, MSW dimatikan supaya hit backend asli): pilih Entity="PT Kode Niaga Tama" → Branch="Surabaya" → dropdown Division tampil **["All Divisions", "Counter", "U Card", "Other"]** — persis 3 kode KNT, bukan tercampur kode company lain
- [x] C3. Manual: ganti Entity ke "PT Mesin Kasir Online" → dropdown Division tampil **["All Divisions", "Distribution", "E Commerce", "Freelancer", "Intercompany", "Other", "Project", "Support"]** — 7 kode MKO, otomatis reset dari KNT
- [x] C4. Branch dropdown KNT terkonfirmasi tampil ["All", "Jakarta", "Semarang", "Surabaya"] — 3 cabang riil
- [x] C5. Console browser bersih (0 error) selama seluruh alur; screenshot tersimpan (`04-division-dropdown-knt-surabaya.png`, `06-division-dropdown-mko.png`) menunjukkan `DivisionChip` di tabel tetap render warna benar (Intercompany/Distribution/Project) meski tipe `Division` sudah jadi `string`

---

## 5. File Kunci per Session

**Session A**: `backend/src/features/settings/channel-divisions.{schema,service,handler,route}.ts`, `backend/src/features/settings/divisions.repository.ts`, `frontend/src/api/channelDivisions.api.ts`, `frontend/src/hooks/{useChannelDivisions,useDivisionOptions,useScopedCompanyFilter}.ts`, `frontend/src/types/{customers,channelDivisions}.ts`

**Session B**: `frontend/src/pages/Settings/Divisions/index.tsx`, `frontend/src/pages/Settings/Divisions/components/{DivisionDialog,DivisionMappingSection}.tsx` (baru; `DivisionMappingDialog.tsx` lama dihapus), `frontend/src/api/divisions.api.ts` (baru), `frontend/src/hooks/useDivisions.ts` (baru), `frontend/src/types/divisions.ts` (baru), `frontend/src/types/channelDivisions.ts`, `frontend/src/route/routeConstants.tsx`, `frontend/src/i18n/locales/{en,id}/{divisions,nav}.json`, `backend/src/features/settings/divisions.repository.ts` (`findDivisions` + JOIN), `docs-v2/features/channel-divisions.md`

**Session C**: `frontend/src/pages/Users/components/AssignmentTreePicker.tsx`, `frontend/src/pages/Users/components/ViewUserDialog.tsx`, `frontend/src/types/users.ts`, `frontend/src/i18n/locales/{en,id}/users.json`

**Session D**: `frontend/src/utils/divisionColor.ts` (baru, shared antara 2 chip — dulu duplikat), `frontend/src/pages/Customers/components/DivisionChip.tsx`, `frontend/src/pages/Transactions/components/BuChip.tsx`

**B6 (redesain)**: `backend/src/features/settings/channel-divisions.repository.ts` (`findConsistentBranchIdForChannel`), `backend/src/features/settings/channel-divisions.service.ts` (`importChannelDivisionsService`, template description)

---

## 6. Backlog — Belum Dikerjakan

- ~~**Bulk import Channel Division belum dukung kolom branch** (B6)~~ — ✅ **selesai 2026-07-09, tapi dengan desain berbeda dari rencana awal.** Bukan nambah kolom `branch_code` manual (rawan typo/duplikat kode cabang — mis. "SMG" vs "SMRG", dikoreksi user), melainkan **auto-derive branch dari histori invoice riil**: `findConsistentBranchIdForChannel(channelName, companyId)` cek `invoices.branch_id` distinct untuk channel itu — kalau konsisten cuma 1 branch, otomatis dipakai (SSOT dari data faktur, nol input manual); kalau channel belum pernah ada di invoice atau nyebar ke >1 branch (ambigu), fallback company-wide seperti sebelumnya, tidak pernah menebak. Diverifikasi via curl: channel "SDR WEST CARD" (konsisten Jakarta di invoice) → `branch_id` ke-derive otomatis ke Jakarta; channel baru yang belum pernah ada di invoice → `branch_id: null` (company-wide), sesuai desain.
- ~~**Kode divisi belum terdaftar ditolak saat create/update/import mapping** (task004 §8)~~ — ✅ selesai 2026-07-09. Semula `channel-divisions.service.ts` menolak (`400`) kode divisi yang belum ada di katalog `divisions`, memaksa "daftarkan dulu divisinya" lewat langkah terpisah (seed atau halaman Divisions) sebelum bisa bikin mapping. User menunjukkan ini janggal: form/file mapping *sudah* berisi keputusan admin soal kode divisi apa yang dipakai — kenapa perlu didaftarkan dua kali? Solusi: `ensureDivisionCode()` (baru, di `divisions.service.ts`) — auto-create baris katalog kalau kode belum ada (nama default Title Case dari kode, `dormant_bucket` default `b2b_dc`, bisa diedit lewat halaman Divisions), dipanggil dari `createChannelDivisionService`/`updateChannelDivisionService`/`importChannelDivisionsService`. `validateDivisionCode` (strict, menolak kode tak dikenal) TETAP dipakai HANYA untuk RBAC assign user (`user.service.ts`) — assign akses user ke divisi tidak boleh auto-create divisi baru. Konsekuensi: `seedDivisions()`/`defaultDivisions` di `seed.ts` **dihapus total** — katalog `divisions` sekarang murni terisi dari pemakaian nyata (create/import channel mapping), bukan bootstrap hardcode.
- **Bulk import USER belum dukung branch & division** (dibahas 2026-07-09, ditunda) — fitur `POST /users/import` sudah ada (template: `name, email, role, company_code`), tapi cuma assign company-level access (`userCompanies`). Karena RBAC ini default-deny total (tidak ada bypass admin), user hasil bulk import **tidak lihat data apa pun** sampai branch+division di-assign manual lewat Edit User satu-satu — jadi bulk import saat ini cuma separuh jalan buat onboarding user baru.
  - Desain yang diusulkan (belum dieksekusi): tambah kolom `branch_codes`, `division_codes` (dipisah koma) ke template. Auto-assign penuh cuma berlaku kalau baris itu **1 company saja** — kalau `company_code` multi (dipisah koma), branch/division di-skip otomatis utk baris itu (ambigu branch mana punya company mana kalau direpresentasikan flat 1 baris), dicatat jelas di deskripsi template, sama pola dengan "role kosong = assign manual belakangan" yang sudah ada.
  - File yang bakal kena: `backend/src/features/users/user.service.ts` (`importUsersService`, `getUsersTemplate`), butuh helper cari branch by code (belum ada, mirip `findCompanyByCode`), plus `validateDivisionCode` dari `divisions.service.ts` buat validasi tiap kode.
- ~~**B7**: update `docs-v2/features/channel-divisions.md`~~ — ✅ selesai 2026-07-09.
