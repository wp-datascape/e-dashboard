# Task 033 — Halaman "What's New & Guide"

> Status: Selesai diimplementasikan & diverifikasi (2026-08-27), belum
> di-commit/push. `tsc -b` (backend+frontend) bersih, `eslint .` bersih
> (0 error), `vite build` sukses. Playwright live (login sungguhan):
> menu sidebar muncul benar (di atas Help), tab All/What's New/Guides/
> Tips berfungsi, kartu What's New/Guides/Tips/Features tampil sesuai
> desain (Card+StatusChip+Tabs reuse dari design system), dialog detail
> Guide buka/tutup normal, klik kartu Features menavigasi ke halaman
> yang benar, mobile 390px single-column tanpa overflow horizontal
> (dicek `document.body.scrollWidth`), halaman Help TIDAK regresi. Bug
> ditemukan+diperbaiki saat verifikasi: `i18n.language` bisa berupa kode
> region penuh ("en-US", bukan "en") kalau sempat tersimpan begitu di
> localStorage — lookup konten per-file (`getHelpContent`/
> `getGuideContent`) mencocokkan string persis, jadi diam-diam jatuh ke
> fallback bahasa Indonesia meski UI sudah berbahasa Inggris; diperbaiki
> lewat helper `normalizeLangCode()` (`utils/langCode.ts`), dipakai di
> KEDUA loader konten (bug laten ini kemungkinan sudah ada juga di
> halaman Help sebelum task ini, ikut kebetulan diperbaiki).
>
> **Susulan sama hari**: user tanya "apakah sudah semua fitur dimasukkan"
> — audit ulang lewat `git log` (bukan tebakan) menemukan 3 fitur besar
> yang sudah lama live tapi belum pernah diberitahukan ke user di
> halaman mana pun: PWA installable (eksplisit diminta "di-blow up" —
> ditaruh PALING ATAS + Guide 3 platform Desktop/Android/iPhone),
> Customer Pareto di halaman Analisis (task016, live sejak 2026-07-30 -
> halaman ini sendiri TIDAK ada link sidebar sejak restrukturisasi menu
> task029, jadi entry What's New ini juga jadi satu-satunya jalan
> masuk), dan Target Upsell/High Margin (metodologi diperketat task031).
> Konten ditambah: 3 WHATS_NEW_ITEMS + 2 GUIDES baru, semua field
> (rumus rekomendasi, tab UI, label filter) dicek ulang ke kode asli
> sebelum ditulis. `WhatsNewItem` diperluas dengan `ctaGuideKey` (CTA
> buka dialog Guide langsung, bukan cuma navigasi halaman — dipakai PWA
> karena "cara install" bukan halaman untuk dikunjungi).
>
> Spesifikasi lengkap dari user (12
> section: konsep, batas fungsi vs Help, struktur konten, layout,
> content style, changelog behavior, batasan panjang halaman, reuse
> design system, responsive, accessibility, constraint, expected
> result) — lihat pesan asli user untuk detail spesifikasi, dokumen ini
> fokus ke keputusan arsitektur & implementasi.

## 1. Batas fungsi (WAJIB, instruksi eksplisit user)

- **Help** (sudah ada, `/help`, task029 §37) TIDAK diubah/dipindah
  sama sekali — tetap fokus "apa arti istilah ini" (glosarium, definisi
  KPI M1-M10).
- **Halaman baru** ("What's New & Guide") fokus "apa yang baru dan
  bagaimana cara pakainya" — TIDAK boleh berisi definisi istilah
  teknis (itu tanggung jawab Help, jangan duplikasi).

## 2. Inspeksi design system (sebelum implementasi, instruksi eksplisit)

Dicek langsung ke kode sebelum menulis UI baru:

- `Card` (`components/ui/Card`) — wrapper tipis `Paper` (`elevation=0`,
  `border:1px solid divider`, `bgcolor:background.paper`) — dipakai
  ulang, BUKAN bikin card style baru.
- `StatusChip` (`components/ui/StatusChip`) — chip oval outlined,
  warna semantik (`success`/`warning`/`error`/`info`/`primary`/
  `default`) — dipakai utk label `NEW`/`IMPROVED`/`FIXED`.
- `Dialog` (`components/ui/Dialog`) — modal generik (title/subtitle/
  actions/maxWidth/fullScreen) — dipakai utk detail artikel Guide,
  BUKAN Drawer (Drawer di app ini cuma dipakai Sidebar, bukan pola
  konten).
- `Tabs`+`Tab` MUI (dipakai di `Report/Growth`, `Report/Retention`,
  `Report/Revenue`, `Config/Integration`) — pola persis: `borderBottom:
  1, borderColor:'divider'`, `textTransform:'none'` — dipakai utk
  filter All/What's New/Guides/Tips.
- `Grid` MUI v7 (`size={{xs:12, sm:6, md:4}}`, `spacing={2}`) — pola
  grid card yang sudah dipakai StatCard Dashboard.
- Typography `variant="pageTitle"/"pageSubtitle"` (token warna ikut
  palette aktif, didefinisikan terpusat di `theme/index.ts`) — dipakai
  utk header halaman, sama seperti Help/AppSettings/dst.
- `MarkdownContent` (`components/ui/MarkdownContent`, dibangun di
  task029 §37 lanjutan untuk halaman Help) — dipakai ulang utk isi
  artikel Guide detail (paragraf rata kiri-kanan, list, tabel
  responsive, code block) — TIDAK bikin renderer baru.
- Icon: gaya `*Outlined` MUI konsisten dgn `HelpOutlineOutlined` yang
  sudah dipakai menu Help.

## 3. Keputusan arsitektur

- **Route baru** `/whats-new` (key `whats-new`), menu item BERDIRI
  SENDIRI di sidebar (pola sama Help — `permissionKey` TIDAK di-set,
  terlihat semua user login apa pun role-nya, task029 §37 keputusan
  yang sama berlaku di sini: halaman discovery umum, bukan fitur
  bisnis yang perlu digate RBAC).
- **Konten statis dari kode** (config array + i18n), BUKAN CRUD admin -
  keputusan yang SAMA seperti banner pengumuman (task032 §"Untuk
  banner yang ini: statis dari kode, bukan CRUD" — alasan sama: nambah
  entry baru = edit file + deploy, developer-only tapi cepat; CRUD
  baru masuk akal kalau nanti publish rutin butuh self-service admin,
  ditunda jadi task terpisah kalau dibutuhkan).
- **4 kategori**: What's New (badge NEW/IMPROVED/FIXED via
  `StatusChip`), Guides (kartu ringkas -> klik buka `Dialog` detail
  berisi `MarkdownContent`), Tips (kartu pendek, tanpa detail view -
  seluruh isinya muat di kartu), Features (daftar statis, BUKAN
  filterable, SELALU tampil di bawah - product overview, bukan
  changelog, mengikuti struktur menu ASLI: Business/Growth/Retention/
  Revenue, Data/Customer/Product/Transaksi/Proyek).
- **Filter Tabs** (All/What's New/Guides/Tips) cuma mengontrol 3
  section dinamis (What's New/Guides/Tips) — Features section statis
  di bawah TIDAK ikut difilter (selalu tampil, sesuai instruksi user
  "berfungsi sebagai product overview, bukan changelog").
- **Konten ditulis dari fitur yang BENAR-BENAR sudah dirilis** di app
  ini (dicek dulu - bukan contoh hipotetis "Customer Lifecycle" dari
  spesifikasi user, fitur itu TIDAK ADA di codebase). Materi diambil
  dari histori fitur nyata sesi ini: halaman Help (§37), banner
  pengumuman (task032), filter granularitas periode (task029 §30),
  overhaul responsive mobile/PWA, dan cara ganti tema/warna aksen
  (`Settings > Pengaturan Aplikasi`, dicek path aslinya di
  `AppSettings/index.tsx` - BUKAN "Settings > Appearance" seperti
  contoh generik user, app ini tidak punya sub-tab Appearance
  terpisah).

## 4. Struktur file

- `frontend/src/config/whatsNewContent.ts` — 4 array:
  `WHATS_NEW_ITEMS`, `GUIDES`, `TIPS`, `FEATURE_GROUPS`. Tiap item
  referensi i18n key (title/description) + metadata (date, category,
  ctaTo, guideSlug utk yang py detail).
- `frontend/src/i18n/locales/{id,en}/whatsnew.json` — string halaman
  (title/subtitle/tab label/section header/badge label) + title/
  description tiap item (pendek, tidak perlu markdown terpisah).
- `frontend/src/i18n/locales/{id,en}/guides/*.md` — isi detail tiap
  Guide (langkah-langkah), pola PERSIS sama seperti
  `i18n/locales/{id,en}/help/*.md` (file terpisah biar gampang
  dibaca/diedit, dirender via `MarkdownContent`).
- `frontend/src/pages/WhatsNew/index.tsx` — halaman utama.
- `frontend/src/pages/WhatsNew/GuideDetailDialog.tsx` — modal detail
  artikel Guide (reuse `Dialog` + `MarkdownContent`).
- `frontend/src/pages/WhatsNew/guideContent.ts` — loader kecil
  (`import.meta.glob` raw), pola sama `pages/Help/helpContent.ts`.

## 5. Verifikasi

- `tsc -b` (backend+frontend), `eslint .` bersih.
- `vite build` sukses.
- Playwright live: desktop + mobile (390px, cek single column card,
  tidak ada horizontal overflow), tab filter berfungsi, buka/tutup
  dialog detail Guide, badge NEW/IMPROVED/FIXED tampil benar, menu
  sidebar + halaman Help TIDAK berubah/rusak.
- `page_settings` (`page_key='whats-new'`) ditambah ke `seed.ts` +
  insert manual ke DB lokal (pola sama Help, task029 §37 poin 6).
