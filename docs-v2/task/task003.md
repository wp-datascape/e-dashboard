# Task 003 — Preferensi User (Theme/Palette/Bahasa) + Avatar Menu

> Status: ✅ Selesai (2026-07-07) — semua task A–D diimplementasi & diverifikasi (backend curl + Playwright end-to-end), sudah di-merge ke `main` (PR #13). **Belum**: migration `0008_lowly_toad.sql` (kolom `preferences`) belum dijalankan ke database production — masih cuma di lokal, lihat §5 Runbook.
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
- [x] A1. Migration: tambah kolom `preferences` (JSONB, default `{}`) di tabel `users` (`schema-auth.ts`) — `0008_lowly_toad.sql`
- [x] A2. `auth.schema.ts`: `updatePreferencesSchema` (zod) — semua field optional, `color_palette` divalidasi terhadap `COLOR_PALETTES` (`blue`/`green`/`yellow`)
- [x] A3. `auth.repository.ts`: extend `findActiveUserById()` select `preferences`; `updateUserPreferences(userId, partial)` — fetch-merge-update di JS (bukan operator Postgres `||` — sempat dicoba, hasilnya rusak/tidak predictable, diganti pendekatan lebih aman)
- [x] A4. `auth.service.ts`: extend `getMeService()` return `preferences` (merge `DEFAULT_PREFERENCES` kalau kosong); `updateMyPreferencesService()`
- [x] A5. `auth.handler.ts` + `auth.route.ts`: `PATCH /auth/me/preferences`, `authMiddleware()` + rate limit 20/5menit per user

### Task B — Frontend: infrastruktur palette
- [x] B1. `theme/palettes.ts` (baru): registry 3 preset (blue/green/yellow) — masing-masing `primary`+`secondary` (light/dark) **plus `appBar`** (light/dark, ditambah belakangan sbg sentuhan akhir — lihat §2.3)
- [x] B2. `theme/index.ts`: refactor dari 2 export statis (`lightTheme`/`darkTheme`) jadi 1 factory `createAppTheme(mode, paletteKey)`
- [x] B3. `theme/theme.context.ts` + `ThemeContext.tsx`: state `palette`, localStorage cache (`exec-dashboard-palette`), setter `setPalette()`, `applyRemotePreferences()`

### Task C — Frontend: sinkronisasi ke backend
- [x] C1. Hook `useUpdateMyPreferences()` (`hooks/useAuth.ts`, mutation pola sama seperti `useUpdateConfig`)
- [x] C2. `App.tsx`: extend efek `syncUser` — begitu `/auth/me` dapat `preferences`, terapkan ke `ThemeContext` (`applyRemotePreferences`) + `i18n.changeLanguage()`
- [x] C3. `Settings/AppSettings/index.tsx`: section "Color Palette" diubah jadi selector 3 swatch yang bisa diklik; toggle dark/light & ganti bahasa juga panggil `useUpdateMyPreferences()`

### Task D — Avatar Menu
- [x] D1. Komponen baru `components/ui/UserMenu` (avatar inisial + `Menu` MUI) — ganti tombol Logout polos di `AppBar.tsx`
- [x] D2. Isi menu: Nama/Email dari `user` (context), Company/Branch/Division dari `scope` (`useMyScope()`), ringkas + "+N lainnya"
- [x] D3. Tombol Settings → `navigate('/settings/app')`; tombol Logout → reuse `useLogoutMutation()` yang sudah ada

### 2.3 Sentuhan akhir — AppBar ikut palette (ditambahkan setelah implementasi awal)
- [x] AppBar background: light mode pakai warna palette penuh (`colors.appBar.light` = `primary.light`), dark mode versi nyaris hitam ber-tint palette (`colors.appBar.dark`, hand-picked per palette) — bukan `background.paper` generik seperti sebelumnya
- [x] Teks/icon AppBar jadi `color: '#fff'` (inherit) — sebelumnya `text.primary`
- [x] Avatar (`UserMenu`) diberi border putih translusen 2px — tanpa ini avatar (warna `primary.main`) blend hilang ke background AppBar light mode (persis warna sama)

---

## 4. Verifikasi

- **Backend**: login → `GET /me` (cek `preferences` default) → `PATCH /auth/me/preferences {"color_palette":"green"}` → `GET /me` lagi (konfirmasi tersimpan)
- **Frontend**: Playwright — klik palette hijau di App Settings → screenshot konfirmasi warna primary berubah app-wide (sidebar highlight, tombol) → reload halaman (masih hijau, dari backend bukan cuma cache) → logout lalu login lagi user yang sama (masih hijau, konfirmasi ikut akun bukan browser)
- **Avatar menu**: klik avatar → screenshot menu terbuka menampilkan nama/email/company/branch/division → klik Settings (navigasi benar) → klik Logout (behavior sama seperti tombol lama, sesi berakhir)

Semua verifikasi di atas **sudah dijalankan dan lolos** (2026-07-07) di database lokal.

---

## 5. Belum Selesai — Migration ke Production

Migration `0008_lowly_toad.sql` (kolom `preferences`) **baru jalan di database lokal**, belum di
production (Railway/Neon). Tanpa ini, endpoint `PATCH /auth/me/preferences` akan error
(`column "preferences" does not exist`) begitu kode ter-deploy ke production. Jalankan sebelum
atau segera setelah deploy:

```bash
cd backend
DATABASE_URL="<connection-string-production>" bun run db:migrate
```

Non-destructive — cuma `ALTER TABLE users ADD COLUMN preferences jsonb DEFAULT '{}' NOT NULL`,
aman dijalankan kapan saja tanpa downtime.
