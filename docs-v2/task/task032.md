# Task 032 — Banner Pengumuman Dismissible (Panduan Penggunaan)

> Status: Selesai diimplementasikan & diverifikasi (2026-08-27), belum
> di-commit/push. Verifikasi: `tsc` (backend+frontend) bersih, live
> Playwright (login sungguhan) - banner muncul di Overview, klik × dan
> klik "Open Help" (dua-duanya) dikonfirmasi mengirim PATCH
> `/auth/me/preferences` 200, dicek LANGSUNG ke database
> (`users.preferences`) hasilnya `{"dismissed_banners":["help-intro-v1"]}`,
> banner tidak muncul lagi setelah reload penuh, kembali muncul lagi
> setelah preferences direset manual (memverifikasi kondisi awal juga
> benar, bukan cuma kondisi akhir). Layout mobile 390px dicek tidak
> overflow. Scope disepakati: mekanisme generik + 1 banner Help sekarang,
> changelog/versioning per rilis DITUNDA jadi task terpisah nanti (lihat
> §5 Catatan).

## 1. Latar belakang

Setelah halaman Help (task029 §37) selesai, user minta banner pengumuman
di Dashboard yang mengarahkan user ke menu Bantuan — contoh yang diminta:

```
Panduan Penggunaan
Temukan panduan penggunaan dan informasi fitur aplikasi melalui menu
Bantuan.
[Buka Bantuan]  ×
```

Keputusan eksplisit user: **jangan permanen** — kalau selalu tampil,
lama-lama dianggap bagian dari layout dan diabaikan (apalagi dashboard
isinya KPI/data penting). Pola yang diminta: tampil sekali sampai
di-dismiss (klik CTA atau ×), lalu tidak muncul lagi — status dismiss
**per user**, bukan flag global.

User juga menyinggung kemungkinan ke depan dipakai untuk changelog per
rilis versi ("notif hanya untuk user yang belum pernah lihat saat notif
itu diterbitkan"). Diputuskan (AskUserQuestion): bangun mekanismenya
supaya generik/bisa dipakai banner lain nanti, tapi CUMA pasang 1 banner
Help sekarang — changelog+bump versi app jadi task terpisah.

## 2. Investigasi (sebelum desain)

Dicek dulu 2 hal via kode langsung, bukan tebakan:

1. **Fitur notifikasi (bell icon) yang sudah ada TIDAK cocok dipakai
   ulang** — tabel `notifications` (per-user, `is_read`) memang ada,
   tapi endpoint-nya digerbang permission `notifications:view`, dan role
   dasar `user` **sengaja tidak diberi** permission itu (komentar di
   `seed.ts`: *"Alert notifikasi cuma dikirim ke admin/superadmin... user
   biasa tidak pernah dapat isinya, sengaja tidak dimasukkan ke
   USER_PERMISSION_NAMES (bell yang selalu kosong cuma bikin bingung)"*).
   Kalau banner Help numpang di sini, role `user` (mayoritas end user)
   akan 403 pas cek/dismiss — padahal halaman Help sendiri sengaja bisa
   diakses SEMUA user login apa pun role-nya (task029 §37, tanpa
   `permissionKey`). Banner pengantarnya harus konsisten dengan itu.

2. **Kolom `users.preferences` (JSONB) sudah ada** dan sudah punya
   mekanisme PATCH-merge per user (`PATCH /auth/me/preferences`,
   dipakai theme_mode/color_palette/language, task003) — TIDAK
   digerbang permission RBAC (cuma butuh login). Ini pas dipakai
   ulang, cukup nambah 1 field baru di JSON-nya, TIDAK PERLU tabel/
   migrasi/endpoint baru sama sekali.

## 3. Keputusan desain

- Field baru `dismissed_banners: string[]` di `UserPreferences`
  (JSONB `users.preferences`, sudah ada). Tiap banner identitasnya
  `banner_key` string unik (mis. `help-intro-v1`).
- Dismiss = PATCH `dismissed_banners` (array penuh, bukan endpoint
  "append" khusus) lewat endpoint `PATCH /auth/me/preferences` yang
  sudah ada — pola sama persis `useUpdateMyPreferences` yang dipakai
  AppSettings, invalidate query `['me']` React Query supaya banner
  langsung hilang tanpa reload.
- Konten banner didaftar sebagai array config di frontend (bukan
  hardcode di halaman) — nambah banner baru (termasuk changelog nanti)
  = tambah 1 entry ke array + teks i18n, TANPA ubah kode
  komponen/halaman.
- Klik CTA ATAU × sama-sama menghitung sebagai dismiss (sesuai alur
  yang diminta user).
- Render sebagai MUI `Alert` + `AlertTitle` (primitif bawaan, bukan
  komponen custom baru dari nol) — konsisten gaya minimalis yang sudah
  dipakai di halaman Help.

## 4. Perubahan

**Backend** (tanpa migrasi DB — cuma field baru di JSONB yang sudah ada):
- `db/schema/schema-auth.ts` — `UserPreferences` tambah
  `dismissed_banners?: string[]`.
- `features/auth/auth.schema.ts` — `updatePreferencesSchema` tambah
  `dismissed_banners: z.array(z.string()).optional()`.
- `features/auth/auth.service.ts` — `DEFAULT_PREFERENCES` tambah
  `dismissed_banners: []`.

**Frontend**:
- `api/auth.api.ts` — `UserPreferencesInput` tambah
  `dismissed_banners?: string[]`.
- `hooks/useMe.ts` (baru) — baca `dismissed_banners` dari cache query
  `['me']` (pola sama `useMyScope.ts`, share cache key, tidak fetch
  ulang) + `useDismissBanner()` mutation (append key ke array lalu
  PATCH, reuse `useUpdateMyPreferences`).
- `config/announcements.ts` (baru) — daftar banner aktif:
  `{ key, titleKey, bodyKey, ctaLabelKey?, ctaTo? }[]`.
- `components/ui/AnnouncementBanner.tsx` (baru) — render SEMUA banner
  dari config yang belum di-dismiss, stack dengan spacing, tiap item
  `Alert` MUI (severity info) + judul/isi `Typography` manual (pola sama
  `ResultBanner.tsx` di halaman Import, bukan `AlertTitle`) + 1 slot
  `action` custom berisi tombol CTA + `IconButton` close, keduanya
  memanggil dismiss.
- `i18n/locales/{id,en}/announcements.json` (baru) — konten banner
  `help-intro-v1` (title/body/cta) sesuai teks yang diminta user.
- Dipasang 1 baris di `pages/Dashboard`/Overview (lokasi sesuai contoh
  user: setelah login, di halaman Dashboard).

**Bug ditemukan+diperbaiki saat verifikasi**: MUI `Alert` cuma render
ikon × OTOMATIS kalau prop `action` kosong (lihat source `Alert.js`:
`action == null && onClose ? <IconButton.../> : null`) — begitu `action`
diisi tombol CTA, ikon close bawaan HILANG SAMA SEKALI, bukan digabung.
Percobaan pertama (Alert dengan `onClose` + `action` terpisah) cuma
menampilkan tombol "Open Help" tanpa ×. Fix: tombol close ditaruh manual
di dalam `action` yang sama (1 `Stack` berisi CTA + `IconButton`), prop
`onClose` di level Alert dihapus (sudah tidak efektif).

## 5. Catatan (belum dikerjakan, task terpisah nanti)

- Changelog per rilis versi + bump versi app (footer `v1.0.0`) —
  mekanisme `banner_key` unik per rilis SUDAH cukup buat "tampil sekali
  per user per rilis", tapi authoring konten changelog (di mana
  ditulis, format apa, ada dialog riwayat versi lama atau tidak) dan
  proses bump versi belum didesain — user eksplisit minta ditunda,
  dikerjakan terpisah.
