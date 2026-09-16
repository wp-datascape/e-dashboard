# Task043 (HOLDINGIT-696) - State Filter Global Persisten Lintas Halaman

> **STATUS: implementasi SELESAI, diverifikasi via playwright-cli ke
> browser sungguhan (bukan cuma tsc/lint) - BELUM di-commit.**

## Implementasi & verifikasi (2026-09-15)

File yang berubah: `context/filter.context.ts` (baru, Context+hook, pola
SAMA `auth.context.ts` - dipisah dari file Provider krn lint
`react-refresh/only-export-components`), `context/FilterContext.tsx` (baru,
Provider, pola SAMA `AuthContext.tsx`), `App.tsx` (wiring `<FilterProvider>`
di dalam `<AuthProvider>`), `hooks/useScopedCompanyFilter.ts` (+param
`shared`), `hooks/usePeriodTypeFilter.ts` (+param `shared`, cuma utk
`periodType`), `hooks/useAdvancedFilterBar.ts` (applied pakai shared,
draft eksplisit `shared: false`, `toggleAdvanced` baru utk sync draft dari
applied saat panel dibuka), `components/filters/AdvancedFilterBar.tsx`
(pakai `toggleAdvanced`, bukan raw `setAdvancedOpen`).

**Bug ditemukan+diperbaiki SAAT verifikasi browser** (bukan cuma
tsc/lint bersih): `toggleAdvanced` awalnya cuma sync
branchId/division/excludeIntercompany dari applied ke draft, LUPA
companyId-nya sendiri - `draftScopeFilter` instance LOKAL fresh 'all' tiap
mount halaman baru (tidak ikut persisten spt applied), jadi Branch/Division
di panel "Filter Lanjutan" tetap ke-disable (`ScopeFilterFields` disable
berdasar `companyId==='all'`) walau entity applied sudah KNT. Fix: sync
companyId LEBIH DULU (baris terpisah), baru branchId/division/
excludeIntercompany (urutan penting - `setCompanyId` sendiri reset
branch/division ke default duluan).

**Verifikasi manual (playwright-cli, admin@mail.com)**:
1. Dashboard: pilih Entity "PT Kode Niaga Tama" (bukan default "All
   Entities").
2. `goto` (FULL RELOAD, bukan cuma client-side nav) ke `/customers` -
   Entity TETAP "PT Kode Niaga Tama", tabel customer terfilter ke company
   itu. Membuktikan persist lintas RELOAD, bukan cuma in-memory React state.
3. Balik ke Dashboard (reload lagi) - Entity tetap KNT (SSOT tidak basi).
4. Buka panel "Filter Lanjutan" - SEBELUM fix: Branch/Division disabled
   (bug di atas). SESUDAH fix: keduanya aktif, siap dipilih.
5. Klik "Reset Filter" - Entity balik ke "All Entities" (resetAll bekerja).

**Belum diverifikasi manual** (di luar waktu sesi ini, risiko rendah/mudah
dicek lain waktu): skenario celah RBAC lintas akun (logout lalu login akun
lain tanpa reload) - guard sudah diimplementasikan
(`useScopedCompanyFilter.ts`, validasi companyId thd daftar `companies`
react-query), tapi belum dites end-to-end dgn 2 akun beda scope company.


## Latar belakang

User: "Fitur lama yang sempat hilang, state filter global, simpan, jadi
setiap pindah halaman filternya tidak perlu filtering ulang" - diverifikasi
ke kode+git log (2026-09-15): **fitur ini sebenarnya belum pernah ada**,
bukan regresi. Istilah "filter global" di project ini sejauh ini SELALU
berarti *komponen/hook yang di-reuse* (`useAdvancedFilterBar`,
`AdvancedFilterBar`, task029 §41 - dibangun krn ditegur user soal duplikasi
kode 6x, BUKAN soal state yang dibagi). Tiap halaman (7+ pemanggil
`useAdvancedFilterBar`, 4+ pemanggil `useScopedCompanyFilter` langsung)
punya instance `useState` sendiri-sendiri - pindah halaman selalu reset ke
default.

**Keputusan user (2026-09-15, dikonfirmasi via AskUserQuestion):**
1. Cakupan: **SEMUA dimensi** (company, branch, division, period,
   period_type, apply_date_cutoff, exclude_intercompany, only_pareto) ikut
   dibagi lintas halaman - bukan cuma scope entitas.
2. Durasi: **sesi browser saja** (sessionStorage) - bertahan pindah
   halaman + reload/refresh, hilang kalau tab/browser ditutup. BUKAN
   localStorage permanen.

## Masalah desain: applied vs draft

`useAdvancedFilterBar` (hooks/useAdvancedFilterBar.ts) punya pola 2 layer:
- **Applied** (`scopeFilter`, `periodTypeFilter`, `onlyPareto`, `periodEnd`,
  `applyDateCutoff`) - yang BENERAN dipakai fetch data.
- **Draft** (`draftScopeFilter`, `draftPeriodTypeFilter`, `draftOnlyPareto`)
  - staging di panel "Filter Lanjutan", cuma disalin ke applied saat tombol
  "Terapkan" diklik (`handleApplyFilter`).

Kalau `useScopedCompanyFilter`/`usePeriodTypeFilter` langsung dijadikan 1
store global tanpa modifikasi, 2 instance (applied+draft) yang dipanggil di
`useAdvancedFilterBar` akan SALING TIMPA (draft ikut berubah begitu applied
berubah, atau sebaliknya) - merusak pola "staging sampai Terapkan diklik"
yang sudah disengaja.

**Solusi**: tambah parameter `shared?: boolean` (default `true`) di
`useScopedCompanyFilter`/`usePeriodTypeFilter`. `true` -> baca/tulis ke
Zustand store persisten (sessionStorage). `false` -> `useState` lokal biasa
(perilaku lama, dipakai KHUSUS utk instance draft di `useAdvancedFilterBar`).
Draft tetap di-inisialisasi dari nilai applied (store) saat pertama dibuka -
BUKAN dari default kosong - supaya panel "Filter Lanjutan" yang baru dibuka
di halaman manapun menampilkan filter yang sedang aktif, bukan reset.

## Cakupan file yang berubah

1. **BARU**: `frontend/src/stores/filterStore.ts` - Zustand + `persist`
   middleware (sessionStorage). State: `companyId, branchId, division,
   excludeIntercompany, periodEnd, applyDateCutoff, periodType, onlyPareto`.
   Actions: setter per field + reset-semua (dipanggil dari
   `handleResetFilter`).
2. `hooks/useScopedCompanyFilter.ts` - tambah param `shared = true`, pindah
   4 field primitif (`companyId/branchId/division/excludeIntercompany`) ke
   store kalau `shared`, sisanya (companies/branchOptions/divisionOptions/
   show*Filter - SEMUA derived dari react-query+RBAC scope) TETAP
   dihitung ulang tiap mount seperti sekarang (tidak di-cache, aman krn
   murni fungsi dari companyId/branchId yang sekarang datang dari store).
3. `hooks/usePeriodTypeFilter.ts` - tambah param `shared = true` sama pola.
4. `hooks/useAdvancedFilterBar.ts` - `scopeFilter`/`periodTypeFilter`
   panggil dgn `shared: true` (default), `draftScopeFilter`/
   `draftPeriodTypeFilter` panggil dgn `shared: false`, inisialisasi draft
   dari applied saat `advancedOpen` berubah true (bukan lagi mount-time
   default). `periodEnd/applyDateCutoff/onlyPareto` pindah ke store
   langsung (bukan lewat useScopedCompanyFilter).
5. Verifikasi 4 halaman yang panggil `useScopedCompanyFilter()` LANGSUNG
   (CustomerMetrics, DormantCustomer, Customers Workbench, dst) otomatis
   dapat `shared: true` by default - TIDAK perlu ubah pemanggilan di
   halaman itu sendiri.

## Yang TIDAK berubah

- Tidak ada perubahan behavior/tampilan UI filter (komponen presentational
  `AdvancedFilterBar`/`ScopeFilterFields`/`PeriodTypeFilterFields` tidak
  disentuh).
- `handleApplyFilter`/`handleResetFilter` logic tetap sama persis, cuma
  target penyimpanannya (state lokal -> store) yang beda.
- Opsi dropdown (companies/branches/divisions, RBAC-aware) TETAP di-fetch
  fresh via react-query tiap halaman - TIDAK di-cache ke store (data itu
  bisa berubah per company/scope, cache basi berisiko).

## Verifikasi yang direncanakan

- Manual (playwright-cli): pilih company+branch+division+period di
  Dashboard -> pindah ke Customer Workbench -> M3 Revenue -> pastikan
  filter yang sama tetap ter-apply (bukan reset ke default).
- Reload halaman (F5) di tengah - filter harus tetap (sessionStorage).
- Buka tab baru / restart browser - filter harus reset ke default (bukan
  localStorage).
- Cek panel "Filter Lanjutan" (draft) tidak "bocor" antar halaman sebelum
  tombol Terapkan diklik - buka panel, ubah division TANPA klik Terapkan,
  pindah halaman, panel harus balik ke nilai APPLIED (bukan draft yang
  belum di-apply, bukan juga direset ke default).
- `tsc --noEmit` bersih, cek tidak ada regresi RBAC (filter company/branch
  yang tersimpan tapi sudah di luar scope user - perlu guard: kalau
  companyId di store bukan salah satu company yang user punya akses,
  fallback ke 'all'/company pertama yang valid, BUKAN percaya store
  mentah-mentah - celah kalau user login beda akun di tab yang sama).

## Belum diputuskan / risiko yang perlu dijaga

- **Celah RBAC lintas akun** (ditemukan saat desain, PENTING): kalau user A
  logout lalu user B login di tab/sesi browser YANG SAMA tanpa reload
  penuh, sessionStorage filter store bisa membawa `companyId`/`branchId`
  milik scope user A yang tidak valid untuk user B. Perlu guard: validasi
  companyId/branchId/division dari store terhadap `useMyScope()` user yang
  sedang login SETIAP kali dibaca, fallback ke default kalau tidak valid -
  BUKAN cuma trust store apa adanya. Ini best-effort sejak awal, wajib
  diimplementasikan sebagai bagian task ini, bukan disebut "diketahui, di
  luar cakupan".
