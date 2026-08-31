# Task 034 — Mobile Bottom Navigation + Hierarchical Bottom Sheet

> Status: Selesai diimplementasikan & diverifikasi (2026-08-28), belum
> di-commit/push. `tsc -b` (frontend) bersih, `eslint .` bersih (0
> error), `vite build` sukses. Playwright live (login sungguhan, viewport
> 390x844): 5 tombol bottom nav (Overview/Business/Data/Laporan/Menu)
> tampil benar, tap grup membuka bottom sheet drill-down (level 2:
> Business/Data/Laporan/Menu; level 3: Settings/Configuration/Access
> Control/Log di dalam bucket "Menu"), tap item leaf navigasi + tutup
> sheet + highlight tab pindah otomatis, tombol back/close berfungsi,
> mode gelap kontras baik, desktop (1280px, `!isMobile`) TIDAK berubah
> sama sekali (sidebar + hamburger toggle tetap seperti sebelumnya).

## 1. Koreksi kondisi awal (instruksi eksplisit user sebelum coding)

Spesifikasi awal user menyebut "kondisi saat ini" sudah ada bottom nav
5-item — setelah `grep -rln "BottomNavigation\|bottom-nav" src` (nol
hasil) dan baca `DashboardLayout.tsx`, dikonfirmasi ini TIDAK BENAR:
sebelum task ini, mobile cuma pakai hamburger AppBar yang membuka
`Sidebar` sebagai `Drawer variant="temporary"` — isinya persis sama
dengan pohon menu desktop, tidak ada komponen bottom nav apa pun.
Temuan ini dilaporkan ke user sebelum menulis kode apa pun, sesuai
instruksi "inspect dulu, jelaskan, baru implementasikan".

## 2. Cakupan (instruksi user, ditegaskan ulang mid-task)

"Itu khusus nav untuk mode mobile view, tidak merubah layout yang ada
sekarang. Ini tambahan" — murni penambahan untuk `isMobile`
(`useMediaQuery(theme.breakpoints.down('md'))`, breakpoint yang sama
sudah dipakai `DashboardLayout.tsx`, tidak bikin breakpoint baru).
Desktop (`!isMobile`) sama sekali tidak disentuh — `Sidebar` desktop
tetap `variant="permanent"` seperti sebelumnya.

## 3. Struktur data — data-driven dari NAV_ITEMS, bukan daftar paralel

`frontend/src/config/mobileNav.tsx` (baru) — `buildMobileNavGroups()`
menurunkan 5 bucket LANGSUNG dari `NAV_ITEMS` (`config/menu.tsx`,
single source of truth yang sama dipakai Sidebar desktop):

- **Overview** → item `dashboard` (leaf, tap langsung navigasi).
- **Business** → grup `business` (Growth/Retention/Revenue).
- **Data** → grup `data` (Customer/Produk/Transaksi/Proyek).
- **Laporan** → grup `report` (3 sub-laporan).
- **Menu** → bucket SINTETIS (satu-satunya bagian non-derivasi murni)
  menggabungkan 6 top-level `NAV_ITEMS` yang tidak dapat slot sendiri
  (`settings`, `config`, `access-control`, `log`, `whats-new`, `help`)
  — 4 di antaranya (`settings`/`config`/`access-control`/`log`) sudah
  punya children sendiri di data asli, jadi drill-down level 3
  (bottom sheet dalam bottom sheet, mis. Menu → Settings → 8
  sub-halaman) pakai data ASLI, bukan contoh buatan.

Perubahan `menu.tsx`/`Sidebar.tsx` tidak boleh menyimpang jadi 2
sumber kebenaran — `isPathActive()` dan `isNavItemVisible()`
(sebelumnya fungsi privat di `Sidebar.tsx`) DIPINDAH & di-export dari
`config/menu.tsx`, dipakai ULANG oleh `Sidebar.tsx` (desktop) DAN
`MobileNav/*` (mobile) — bukan didefinisikan ulang di 2 tempat
(instruksi proyek "Centralize UI, No Duplication").

## 4. Komponen UI (baru, `components/ui/MobileNav/`)

- **`BottomNav.tsx`** — `MobileBottomNav`, `Paper` fixed di bawah +
  `BottomNavigation`/`BottomNavigationAction` MUI (5 tombol, tanpa
  dependency baru). Filter RBAC pakai `isNavItemVisible`/`canSee` yang
  SAMA dengan Sidebar desktop (bukan aturan visibility terpisah). Tap
  leaf → `navigate()` langsung. Tap grup → buka `NavigationSheet`.
  Highlight tab aktif dihitung dari `isGroupActive()` (cek path
  langsung + descendant, termasuk cucu di dalam bucket "Menu").
- **`NavigationSheet.tsx`** — `SwipeableDrawer anchor="bottom"`
  (`disableSwipeToOpen`, `onOpen` no-op — sheet cuma dibuka lewat tap
  tombol nav, bukan gesture dari tepi layar), rounded top corners,
  `maxHeight:'75vh'` (content-based, bukan full-screen), drag handle
  dekoratif, header dengan tombol back (drill-down aktif) / close.
  State drill-down (`drillStack: NavItem[]`) di-reset lewat REMOUNT
  (`key={group.key}` pada komponen `SheetBody` internal), BUKAN
  `useEffect`+`setState` — proyek ini melarang keras
  `react-hooks/set-state-in-effect` (dikonfirmasi lewat eslint error
  saat percobaan pertama, diperbaiki dengan pola key-remount yang
  didokumentasikan React sebagai pengganti effect untuk reset state
  akibat perubahan prop).
- **`index.ts`** — barrel export `MobileBottomNav` +
  `MOBILE_BOTTOM_NAV_HEIGHT`.

## 5. Bug ditemukan saat verifikasi live (bukan dugaan, dari screenshot asli)

**Item terakhir tiap bottom sheet tidak kelihatan/tidak bisa diklik**
(dilaporkan user langsung: "Menu belum tampil semua", juga kejadian di
sheet Business sebelum diperbaiki) — root cause dikonfirmasi lewat
`page.evaluate` (bounding box + computed z-index tiap ancestor, bukan
tebakan): `SwipeableDrawer` MUI default zIndex-nya `theme.zIndex.drawer`
(1200), BUKAN `theme.zIndex.modal` (1300) seperti dugaan awal — MUI
memang menganggap Drawer/SwipeableDrawer sbg elemen level "drawer",
bukan modal generik. `MobileBottomNav`'s `Paper` sempat diberi
`zIndex: theme.zIndex.drawer + 1` (mengikuti pola lama `AppBar.tsx`
dulu utk menang dari Sidebar `Drawer` biasa) — nilai itu (1201) JUSTRU
mengalahkan sheet (1200), jadi bottom nav menutupi/menghalangi item
paling bawah tiap sheet secara visual DAN pointer-events. Diperbaiki:
`MobileBottomNav` turun ke `theme.zIndex.drawer` (1200, sama seperti
Sidebar desktop), `NavigationSheet` diberi `theme.zIndex.drawer + 1`
(1201) eksplisit lewat `sx` di root `SwipeableDrawer` supaya SELALU
menang saat terbuka. Diverifikasi ulang: 6 item bucket "Menu" semua
tampil+bisa diklik, item ke-3 "Revenue" di bucket Business juga.

## 6. Integrasi layout

- **`DashboardLayout.tsx`** — `isMobile ? <MobileBottomNav/> :
  <Sidebar .../>` (menggantikan render `Sidebar variant="temporary"`
  di mobile). Kolom kanan (main+Footer) diberi
  `pb: calc(${MOBILE_BOTTOM_NAV_HEIGHT}px + env(safe-area-inset-bottom))`
  KHUSUS mobile, supaya Footer (in-flow, sibling setelah `main`, bukan
  `position:fixed`) tidak ketutup bottom nav yang fixed — bukan cuma
  padding di `main` saja, karena Footer ada DI LUAR area scroll-nya.
- **`AppBar.tsx`** — prop baru `showMenuButton?: boolean` (default
  `true`), tombol hamburger disembunyikan saat `false`. Dipanggil
  `showMenuButton={!isMobile}` dari `DashboardLayout.tsx` — mobile
  tidak lagi punya Sidebar drawer untuk ditoggle, tombolnya jadi tanpa
  fungsi kalau tetap ditampilkan.
- **`i18n/locales/{id,en}/nav.json`** — tambah key `mobileMenu`:
  "Menu" (sama di kedua bahasa) untuk label bucket sintetis.

## 7. Referensi visual (ditanyakan, dijawab eksplisit)

User sempat memberi referensi eksternal (situs portfolio pribadi,
gaya bottom nav "floating pill" mengambang dengan FAB tengah
menonjol). Ditanyakan lewat AskUserQuestion karena ini keputusan
visual signifikan (bottom nav app ini sudah dibangun kotak/full-width,
konsisten dengan AppBar/Sidebar/Card yang semua pakai border tipis
tanpa shadow/rounded besar) — user memilih TETAP gaya kotak standar
yang sudah dibangun, bukan mengadopsi gaya floating pill referensi.

## 8. Verifikasi

- `tsc -b`, `eslint .` (frontend) bersih di setiap iterasi.
- `bun run build` sukses.
- Playwright live 390x844 (login sungguhan `admin@mail.com`): 5 tombol
  bottom nav benar, sheet Business (3 anak) & Menu (6 anak, termasuk
  drill-down Settings 8 sub-item) tampil+bisa diklik penuh setelah fix
  z-index, tombol back mengembalikan ke level sebelumnya, tombol close
  menutup sheet, navigasi dari sheet leaf item berpindah halaman +
  menutup sheet + memindah highlight tab otomatis, mode gelap dicek
  kontras.
- Desktop 1280px: sidebar permanent + hamburger toggle identik dengan
  sebelum task ini, tidak ada bottom nav yang muncul.
