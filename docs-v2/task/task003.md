# Task 003 — Preferensi User (Theme/Palette/Bahasa) + Avatar Menu

> Status: 📝 Planning — semua keputusan desain sudah diambil, belum mulai implementasi.
> Dibuat: 2026-07-07
> Baca juga: `frontend/src/theme/index.ts`, `frontend/src/theme/ThemeContext.tsx`, `backend/src/features/auth/`

---

## 1. Latar Belakang & Tujuan

Dua kebutuhan terpisah tapi saling terkait, digabung dalam satu task karena sama-sama menyentuh AppBar + akun user:

1. **Preferensi user tidak ikut akun** — dark/light mode (`localStorage: exec-dashboard-theme`) dan bahasa (`localStorage: exec-dashboard-lang`) saat ini tersimpan per-browser saja. User yang login dari device/browser lain kehilangan preferensinya. Sekalian ditambah fitur baru: **pilihan palette warna** (selain dark/light).
2. **AppBar cuma ada tombol Logout polos** — tidak ada cara cepat untuk lihat informasi akun sendiri (company/branch/division apa yang aktif, email login sebagai apa) tanpa buka halaman lain.

**Tujuan task ini:**
- Preferensi (theme mode + color palette + bahasa) tersimpan ke akun (backend), bukan cuma localStorage — ikut ke mana pun user login.
- Tombol Logout di AppBar diganti avatar user — klik membuka menu berisi info dasar akun + tombol Settings + tombol Logout.

---

## 2. Keputusan Desain

### 2.1 Preferensi User

| Keputusan | Pilihan | Alasan |
|---|---|---|
| Lokasi penyimpanan | Backend (kolom baru di tabel `users`), bukan cuma localStorage | Supaya ikut user login dari device mana pun (disepakati 2026-07-07) |
| Bentuk data | **1 kolom JSONB** `preferences` = `{ theme_mode, color_palette, language }` | Digabung jadi satu (bukan 3 kolom terpisah) — lebih fleksibel untuk tambah preferensi baru nanti tanpa migration baru tiap kali |
| Cakupan warna yang ikut ganti per palette | **Cuma `primary` + `secondary`** | `success`/`warning`/`error`/`info` tetap warna semantik tetap (hijau/kuning/merah/cyan) di semua palette — supaya sinyal warna (misal "error" = merah) tidak pernah ambigu walau user pilih palette hijau |
| Palette awal | **Blue** (default, warna sekarang — tidak berubah), **Green**, **Yellow** | Sesuai contoh yang diminta; masing-masing punya varian light+dark sendiri (pola sama seperti `BRAND` sekarang di `theme/index.ts`) |
| Endpoint | `PATCH /auth/me/preferences`, cukup `authMiddleware()` tanpa permission tambahan | Self-service, scoped ke user login sendiri (`c.var.user.userId`) — pola self-service PERTAMA di codebase ini, mirror `GET /auth/me` yang sudah ada |
| Fallback saat belum pernah di-set | `theme_mode` ikut system preference, `color_palette` = "blue", `language` ikut browser (behavior sekarang, tidak berubah untuk user existing) | User existing tidak tiba-tiba berubah tampilannya begitu fitur ini deploy |
| Sinkronisasi awal (sebelum `/auth/me` selesai fetch) | `ThemeContext`/i18n tetap baca localStorage dulu (fallback cepat, anti-flash), lalu di-override begitu `/auth/me` resolve dan ada `preferences` tersimpan | Konsisten dengan pola `syncUser()` yang sudah ada di `App.tsx` |

### 2.2 Avatar Menu (pengganti tombol Logout)

| Keputusan | Pilihan |
|---|---|
| Trigger | Avatar **inisial nama** (lingkaran warna `primary.main`, 2 huruf — mis. "Wahyu Prasetyo" → "WP") di `AppBar`, menggantikan posisi tombol Logout polos yang sekarang. **Tanpa upload foto** — diputuskan (2026-07-07) upload foto avatar (perlu storage eksternal, Railway tidak punya filesystem persisten — kandidat: Vercel Blob, dipanggil via token dari backend Railway mana pun) jadi task terpisah (`task004`) kalau memang dibutuhkan nanti |
| Isi menu saat diklik | Nama, Email, Company (aktif/di-assign), Branch, Division — lalu tombol **Settings** (navigasi ke `/settings/app`) dan tombol **Logout** (perilaku sama seperti tombol lama) |
| Sumber data company/branch/division | `scope` dari `GET /auth/me` (sudah ada, dipakai juga oleh `useMyScope()`) — **bukan** query baru |
| Superadmin / user dengan banyak company-branch-division | Tampilkan ringkas (mis. nama company pertama + "+N lainnya" kalau lebih dari 1) — bukan daftar penuh yang bisa sangat panjang |

---

## 3. Breakdown Implementasi

### Task A — Backend: kolom preferences + endpoint self-service
- [ ] A1. Migration: tambah kolom `preferences` (JSONB, default `{}`) di tabel `users` (`schema-auth.ts`)
- [ ] A2. `auth.schema.ts`: tambah `updatePreferencesSchema` (zod) — semua field optional, `color_palette` divalidasi terhadap enum key palette yang valid (`blue`/`green`/`yellow`)
- [ ] A3. `auth.repository.ts`: extend `findActiveUserById()` select `preferences`; tambah `updateUserPreferences(userId, partial)` (merge JSONB, bukan replace penuh)
- [ ] A4. `auth.service.ts`: extend `getMeService()` return `preferences` (dengan default kalau kosong); tambah `updateMyPreferencesService()`
- [ ] A5. `auth.handler.ts` + `auth.route.ts`: `PATCH /auth/me/preferences`, `authMiddleware()` saja

### Task B — Frontend: infrastruktur palette
- [ ] B1. `theme/palettes.ts` (baru): registry 3 preset (blue/green/yellow), masing-masing `{ primary: {light, dark}, secondary: {light, dark} }`
- [ ] B2. `theme/index.ts`: refactor dari 2 export statis (`lightTheme`/`darkTheme`) jadi 1 factory `createAppTheme(mode, paletteKey)`
- [ ] B3. `theme/theme.context.ts` + `ThemeContext.tsx`: tambah state `palette`, localStorage cache (`exec-dashboard-palette`), setter `setPalette()`

### Task C — Frontend: sinkronisasi ke backend
- [ ] C1. Hook baru `useUpdateMyPreferences()` (mutation, pola sama seperti `useUpdateConfig`)
- [ ] C2. `App.tsx`: extend efek `syncUser` yang sudah ada — begitu `/auth/me` dapat `preferences`, terapkan ke `ThemeContext` + `i18n.changeLanguage()`, override cache localStorage
- [ ] C3. `Settings/AppSettings/index.tsx`: section "Color Palette" (sekarang cuma preview read-only) diubah jadi selector 3 swatch yang bisa diklik; toggle dark/light & ganti bahasa juga panggil `useUpdateMyPreferences()`

### Task D — Avatar Menu
- [ ] D1. Komponen baru `components/ui/UserMenu` (avatar + `Menu` MUI) — ganti tombol Logout polos di `AppBar.tsx`
- [ ] D2. Isi menu: Nama/Email dari `user` (context), Company/Branch/Division dari `scope` (`useMyScope()` atau query `['me']` langsung)
- [ ] D3. Tombol Settings → `navigate('/settings/app')`; tombol Logout → reuse logic `useLogoutMutation()` yang sudah ada (persis seperti tombol lama)

---

## 4. Verifikasi

- **Backend**: login → `GET /me` (cek `preferences` default) → `PATCH /auth/me/preferences {"color_palette":"green"}` → `GET /me` lagi (konfirmasi tersimpan)
- **Frontend**: Playwright — klik palette hijau di App Settings → screenshot konfirmasi warna primary berubah app-wide (sidebar highlight, tombol) → reload halaman (masih hijau, dari backend bukan cuma cache) → logout lalu login lagi user yang sama (masih hijau, konfirmasi ikut akun bukan browser)
- **Avatar menu**: klik avatar → screenshot menu terbuka menampilkan nama/email/company/branch/division → klik Settings (navigasi benar) → klik Logout (behavior sama seperti tombol lama, sesi berakhir)
