# Task 002 — Security Hardening Standar Produksi

> Status: 📝 Planning — semua keputusan desain sudah diambil termasuk target infra CD (VPS Ubuntu+Docker, migrasi kemungkinan Agustus 2026), kecuali detail teknis kecil di §3 Task C3 dan Task F6. Belum mulai implementasi.
> Dibuat: 2026-07-06
> Baca juga: `CRITICAL_RULES.md` (§ Security Rules), `shared/deployment.md`, `features/audit.md`

---

## 1. Latar Belakang & Tujuan

Setelah task001 (isolasi data Company/Branch/Division + isolasi data superadmin) selesai, dilakukan audit singkat terhadap `CRITICAL_RULES.md` § Security Rules dan kode aktual (`router.ts`, `middleware/*.ts`) untuk cek gap security standar produksi di luar cakupan isolasi data.

**Tujuan task ini:** menutup gap yang ditemukan, tanpa mengubah aspek security yang sudah berjalan baik.

### 1.1 Yang SUDAH ada (tidak perlu diubah)

| Aspek | Implementasi | Referensi |
|---|---|---|
| Auth | JWT httpOnly + Secure + `SameSite=None` (prod) / `Lax` (dev) | `middleware/auth.ts` |
| CSRF | `X-CSRF-Token` header wajib di semua mutation | `utils/csrf.ts`, `middleware/auth.ts` |
| Input validation | Zod schema di setiap handler | seluruh `*.schema.ts` |
| Password hashing | bcryptjs cost ≥ 12 | `utils/hash.ts` |
| Upload | Validasi MIME + ekstensi whitelist | `import.handler.ts`, `user.handler.ts` |
| Error handling | Stack trace tidak pernah dikirim ke client | `errors.ts` (global error handler) |
| Data isolation | `company_id` wajib di setiap query; branch/division/superadmin isolation (task001) | lihat `task/task001.md` |
| Rate limit | `POST /auth/login` — 10 request / 15 menit | `middleware/rate-limit.ts`, `auth.route.ts:9` |
| CORS | Dikonfigurasi via `hono/cors` di `router.ts` | `router.ts:69` |

### 1.2 Gap yang ditemukan (scope task ini)

| # | Gap | Dampak kalau tidak ditutup |
|---|---|---|
| 1 | Tidak ada security headers (`hono/secure-headers` atau setara) | Tidak ada `X-Content-Type-Options`, `X-Frame-Options`/`frame-ancestors`, `Strict-Transport-Security` — rawan clickjacking, MIME-sniffing |
| 2 | Rate limit cuma di `/auth/login` | Endpoint sensitif lain (`/auth/refresh`, mutasi lain) tidak dibatasi — rawan brute-force/abuse di luar login |
| 3 | Tidak ada account lockout | Rate-limit login cuma memperlambat, bukan mengunci akun setelah N kali gagal berturut-turut |
| 4 | Sesi tidak di-invalidasi saat reset password | Admin reset password user (`updateUserService`) tidak mencabut refresh token/sesi aktif — kalau akun dicurigai kompromis, sesi lama attacker tetap hidup |
| 5 | Tidak ada audit/alert aktif untuk aksi sensitif | Assign role superadmin, ubah permission, reset password tercatat di audit log (pasif) tapi tidak ada notifikasi real-time (email/Slack) |
| 6 | Dependency scanning belum ada di CI | Tidak ketemu `npm audit`/Snyk/Dependabot config — rawan lolos dependency dengan CVE diketahui |

**Sengaja TIDAK dimasukkan ke scope task ini:** MFA/2FA — **di-skip (keputusan 2026-07-06)**, dampak besar tapi butuh keputusan produk (semua role wajib, atau cuma superadmin/admin?) yang belum diperlukan sekarang. Dicatat sebagai kandidat task terpisah kalau nanti dibutuhkan, lihat §4 poin 4.

### 1.3 Constraint penting ditemukan saat audit: auth session **stateless**, tanpa tabel refresh token

`refreshService()` (`features/auth/auth.service.ts:63`) validasi refresh token murni lewat `verifyRefreshToken()` — signature JWT saja, **tidak ada tabel session/refresh-token di DB** untuk user auth (kolom `refresh_token` yang ada di `schema-company.ts:102` itu punya OAuth token Accurate API per company, bukan sesi user — jangan tertukar). Konsekuensi: token individual **tidak bisa di-revoke** langsung (tidak ada row untuk dihapus/di-blocklist). Ini constraint arsitektur nyata yang membatasi desain Task D — lihat §4 poin 2 untuk keputusan turunannya.

---

## 2. Prioritas Pengerjaan (disepakati: mulai dari yang termurah & berdampak langsung)

| Urutan | Item | Alasan prioritas |
|---|---|---|
| 1 | Security headers (#1) | Effort kecil (tambah 1 middleware), menutup celah langsung tanpa keputusan desain tambahan |
| 2 | Perluasan rate limit (#2) | Effort kecil-menengah, reuse `middleware/rate-limit.ts` yang sudah ada |
| 3 | Account lockout (#3) | Butuh keputusan desain (threshold, durasi lock, per-akun vs per-IP) |
| 4 | Invalidasi sesi saat reset password (#4) | Butuh audit mekanisme refresh token saat ini dulu |
| 5 | Audit/alert aksi sensitif (#5) | Butuh keputusan channel notifikasi (email/Slack/webhook) |
| 6 | Dependency scanning di CI (#6) | Infra/CI, bukan kode aplikasi — tergantung platform CI yang dipakai |

---

## 3. Breakdown Task

### Task A — Security Headers ✅ **Selesai (2026-07-06)**
- [x] A1. Pasang `hono/secure-headers` di `router.ts` — global, Layer 1, sebelum CORS.
- [x] A2. `xFrameOptions: 'DENY'` eksplisit (default hono cuma `SAMEORIGIN`); `strictTransportSecurity`
  cuma aktif saat `NODE_ENV === 'production'` (dev jalan di `http://localhost` — HSTS di situ
  bisa memaksa browser pakai https utk localhost, merepotkan dev). Header lain pakai default
  hono yang sudah aman: `X-Content-Type-Options: nosniff`, `Cross-Origin-Resource-Policy:
  same-origin`, `Referrer-Policy: no-referrer`, dll.
- [x] A3. Diverifikasi: curl cek header aktual muncul benar di response; preflight `OPTIONS` +
  login sungguhan dari origin frontend (`localhost:5173`) tetap lolos CORS; dashboard render
  normal via Playwright tanpa console error; 38 test backend tetap lolos.
- [x] A4. **Sekalian (2026-07-06, atas permintaan user):** refactor CORS + secure-headers
  dari inline `router.ts` ke `middleware/security.ts` sendiri (konsisten dengan pola
  `middleware/auth.ts`/`rate-limit.ts` lain). Sekaligus perketat CORS: `allowHeaders`
  eksplisit `['Content-Type', 'X-CSRF-Token']` (sebelumnya TIDAK di-set sama sekali — hono
  fallback REFLECT apa pun yang diminta browser di preflight, bukan whitelist nyata),
  `allowMethods` eksplisit, `maxAge: 600` (cache preflight browser). `origin` tetap whitelist
  dari `CORS_ORIGIN` env (bukan wildcard) — sudah benar sebelumnya. Diverifikasi: preflight
  `Access-Control-Allow-Headers` sekarang eksplisit (bukan reflect), mutasi sungguhan (PUT +
  `X-CSRF-Token`, toggle feature flag) dari browser real berhasil 2x tanpa CORS error.

### Task B — Perluasan Rate Limit ✅ **Selesai (2026-07-06)**
- [x] B1. Cakupan yang dipilih: `POST /auth/refresh` (sebelumnya TIDAK ada rate limit sama
  sekali), mutasi Users (`POST/PUT/DELETE /users`, `POST /users/import`), mutasi Roles
  (`POST/PATCH/DELETE /roles`), mutasi Permissions (`POST/PUT/DELETE /permissions`,
  `PUT /permissions/roles/:id/permissions` — titik privilege escalation paling langsung).
  GET (view-only) sengaja TIDAK dibatasi.
- [x] B2. `middleware/rate-limit.ts` ditambah `keyByUser()` (rate limit per authenticated
  user, bukan per IP — kantor dengan banyak admin di 1 IP tidak saling memblokir, tapi 1
  akun yang di-abuse/kompromis tetap dibatasi) + export `getIp()`. Threshold: refresh
  30/15menit per IP (belum lewat authMiddleware saat itu); user mutation 30/5menit per user;
  role/permission mutation 20/5menit per user (lebih ketat — privilege escalation surface).
  Diverifikasi: 21 request PATCH beruntun ke endpoint role — 20 lolos, ke-21 kena 429 dengan
  `Retry-After` benar; GET tetap 200 meski user sama kena limit di endpoint mutasi (rate
  limit per-route, bukan global per-user); 38 test backend tetap lolos.
- [x] B3. **Audit lanjutan (2026-07-06, atas permintaan user "cek setiap route endpoint"):**
  bandingkan SEMUA string permission yang dipakai `requirePermission()` di seluruh route vs
  yang benar-benar ada di `db/seed.ts` (data-driven, bukan tebak dari nama role). Ditemukan
  2 hal dan diperbaiki:
  - **BUG keamanan nyata**: `page.route.ts` `PUT /:pageKey` **TIDAK PUNYA `requirePermission`
    SAMA SEKALI** — role apa pun (termasuk `user` biasa tanpa permission apa pun) bisa
    mematikan/menyalakan visibility halaman mana pun di seluruh aplikasi. Dikonfirmasi via
    curl langsung sebelum fix (`user@mail.com` berhasil set `ready=false` di halaman
    dashboard). Fix: `requirePermission('config.features:update')`.
  - **Granularitas RBAC keliru**: `permissions.route.ts` create/delete permission salah pakai
    `access.permission:update` — padahal `access.permission:create`/`:delete` sudah ada di DB
    tapi tidak pernah dipakai. Fix: masing-masing endpoint pakai permission yang sesuai (tidak
    ada dampak akses nyata saat ini — belum ada role non-superadmin yang di-assign permission
    ini sama sekali, tapi desainnya sekarang benar).
  - Rate limit ditambah ke SEMUA endpoint mutasi yang sebelumnya 0 rate limit: companies/
    branches (15/5menit — paling ketat, fondasi hierarki Company→Branch→Division task001),
    channel-divisions (20/5menit — dipakai derive division scope RBAC), classification-rules
    & high-margin-products (20/5menit), import CSV (5/10menit — beda karakter, resource
    exhaustion bukan privilege escalation), business_configs PUT (20/5menit), accurate
    credentials PUT (15/5menit — simpan secret ter-encrypt), accurate test-connection
    (10/5menit — manggil API eksternal, threshold rendah supaya tidak jadi vektor hammer ke
    pihak ketiga).
  - **Keputusan (2026-07-06):** permission `config.integration:delete` ada di DB tapi tidak
    ada endpoint DELETE credentials Accurate sama sekali (orphaned — fitur "hapus kredensial"
    belum pernah dibangun). User memutuskan **dibiarkan saja dulu** — bukan bug/berbahaya,
    cuma permission menganggur di RBAC UI. Bangun fiturnya (atau hapus definisi permission-nya)
    kalau nanti memang dibutuhkan.

### Task C — Account Lockout ✅ **Selesai (2026-07-06)**
> **Keputusan (2026-07-06):** kombinasi per-akun DAN per-IP, bukan salah satu saja.
- [x] C1. Kolom `failed_login_count` (integer, default 0) dan `locked_until` (timestamp
  nullable) ditambahkan ke `users` (`schema-auth.ts`) — migration `0004_account_lockout.sql`.
- [x] C2. Rate-limit per-IP di `/auth/login` (sudah ada sebelumnya) **tetap dipertahankan**
  sebagai lapis kedua, independen dari lockout per-akun ini.
- [x] C3. **Threshold & durasi dikonfigurasi via ENV** (`ACCOUNT_LOCKOUT_THRESHOLD=5`,
  `ACCOUNT_LOCKOUT_DURATION_MINUTES=30` — standar industri, default di `config/env.ts`),
  BUKAN hardcode — bisa diubah kapan saja tanpa deploy kode baru. Alur: cek `locked_until`
  SEBELUM verifikasi password (password benar pun tetap ditolak selama terkunci); password
  salah → increment `failed_login_count`, kalau capai threshold → set `locked_until`; login
  sukses → reset keduanya ke 0/null.
- [x] C4. Unlock manual oleh admin: `POST /users/:id/unlock`, permission **baru**
  `access.user:unlock` (bukan reuse `access.user:update` — granular by design, role custom
  bisa di-assign cuma unlock tanpa full update). Ditambahkan lewat jalur lengkap: seeder DB →
  toggle RBAC UI (kolom action `SetPermissionDialog` otomatis data-driven) → `requirePermission`
  di route. UI Users list: chip "Locked"/"Terkunci" di kolom status + action "Buka Kunci Akun"
  (cuma muncul kalau user sedang terkunci DAN viewer punya permission).

  Diverifikasi end-to-end via curl: 5x password salah → terkunci tepat di percobaan ke-5;
  password BENAR pun tetap ditolak selama terkunci; admin unlock → reset → login berhasil
  lagi; user tanpa `access.user:unlock` → 403. Typecheck+build frontend bersih, 38 test
  backend tetap lolos.

### Task D — Invalidasi Sesi saat Reset Password ✅ **Selesai (2026-07-06)**
> **Keputusan (2026-07-06):** auth session **stateless, tanpa tabel DB** (lihat §1.3) — jadi revoke token individual tidak mungkin tanpa redesign. Pendekatan yang cocok untuk constraint ini: `token_version` bukan token blocklist.
- [x] D1. Kolom `token_version` (integer, default 0) ditambahkan ke `users` (`schema-auth.ts`) —
  migration `0005_token_version.sql`.
- [x] D2. `tokenVersion` disertakan di payload JWT (access DAN refresh token) saat
  login/refresh (`utils/jwt.ts` — `generateRefreshToken()` sekarang butuh parameter kedua).
- [x] D3. `authMiddleware()` bandingkan `tokenVersion` di JWT vs `token_version` terbaru di
  DB — masuk `Promise.all` batch yang sudah ada (fungsi baru `getUserTokenVersion()`, tidak
  nambah round-trip). `refreshService()` juga cek yang sama sebelum mint access token baru
  (refresh token lama harus ikut mati, bukan cuma access token).
- [x] D4. `updateUserService()` — saat field `password` terisi di `PUT /users/:id` (admin
  reset password), panggil `incrementTokenVersion()` sekali → SEMUA access & refresh token
  lama milik user itu, di device manapun, otomatis invalid di request berikutnya (401 "Sesi
  tidak valid, silakan login ulang"), tanpa tabel blocklist.

  Diverifikasi end-to-end via curl: login → JWT `tokenVersion:0` → admin reset password →
  `/me` dengan access token lama = 401, `/auth/refresh` dengan refresh token lama = 401 →
  login ulang dengan password baru → JWT baru `tokenVersion:1`, `/me` sukses lagi. Typecheck
  bersih, 38 test backend tetap lolos.

### Task E — Audit/Alert Aksi Sensitif ✅ **Selesai (2026-07-06)**
> **Keputusan (2026-07-06):** channel webhook, platform **Telegram** (dipilih dari perbandingan Slack/Discord/Telegram — alasan: reach paling luas karena kemungkinan besar semua anggota tim sudah pakai Telegram tanpa perlu install app baru, gratis tanpa limit retensi, push notification cepat/reliable). Setup teknis: bot via `@BotFather` → dapat bot token, ambil `chat_id` tujuan (personal atau grup) sekali di awal, lalu kirim alert dengan POST ke `api.telegram.org/bot<token>/sendMessage`.
- [x] E1. **Daftar aksi "sensitif" (final, 2026-07-06):**
  1. **Sinyal serangan** — account lockout (5x gagal login berturut-turut). BEDA jalur dari
     4 poin di bawah: terjadi SEBELUM autentikasi berhasil (belum ada `ctx.var.user`), jadi
     TIDAK lewat `logAudit()` — hook langsung di `loginService()` saat `justLocked` true.
  2. **Privilege escalation** — user baru dibuat DENGAN role admin/superadmin, atau user
     existing BARU mendapat role tersebut (bukan cuma "masih punya" — supaya tidak spam
     tiap update lain ke user yang memang sudah admin dari awal); permission kategori
     Access Control (Users/Roles/Permissions) BARU di-assign ke role apa pun.
  3. **Aksi destruktif** — `user.delete` pada akun admin (superadmin sendiri sudah diblokir
     hapus via `is_system`); `role.delete` (semua, tanpa syarat — jarang terjadi, selalu
     layak diketahui).
  4. **Reset password ke akun admin/superadmin** (bukan ke user biasa — supaya tidak spam
     kalau admin reset password banyak user biasa sekaligus).
  5. **Unlock manual oleh admin** (Task C4) — jejak siapa membuka kunci akun yang terkunci.
- [x] E2. Bot Telegram dibuat via `@BotFather`, `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID`
  disimpan di `.env` (optional di `config/env.ts` — kosong = `sendTelegramAlert()` no-op
  diam-diam, tidak wajib di semua environment, tidak pernah crash aplikasi kalau gagal kirim).
- [x] E3. `utils/telegram.ts` (`sendTelegramAlert()`) di-hook di titik yang sama dengan
  `logAudit()` yang sudah ada untuk poin 2–5 (tidak duplikasi jalur pencatatan); poin 1
  (lockout) hook terpisah langsung di `loginService()`. Semua panggilan fire-and-forget
  (`void`, tidak di-`await`) supaya lambatnya Telegram API tidak menambah latency respons.

  Diverifikasi end-to-end: test bot via curl `sendMessage` berhasil, lalu 6 skenario
  ditrigger langsung (privilege escalation, reset password admin, delete user admin,
  delete role, unlock manual, assign permission Access Control) — semua pesan masuk ke
  Telegram dengan format rapi (tanpa emoji). Typecheck bersih, 38 test backend tetap lolos.

### Task F — CI/CD dengan GitHub Actions (scope diperluas 2026-07-06)

> **Konteks keputusan:** semula Task F cuma "dependency scanning" (Dependabot). User menyatakan CI/CD adalah hal baru baginya dan ingin **membangunnya sekaligus mempelajarinya untuk keperluan devops** — scope diperluas jadi CI penuh via GitHub Actions, bukan cuma Dependabot. Dependency scanning (Dependabot + `bun audit`) tetap masuk sebagai salah satu step di dalam CI ini, bukan dihapus.
>
> **Konsep dasar CI vs CD (dicatat di sini supaya tidak hilang antar sesi):** CD (Continuous *Deployment*) di project ini **sudah ada** — Railway & Vercel auto-deploy tiap `git push` (lihat `shared/deployment.md`). Yang **belum ada** sebelumnya adalah CI (Continuous *Integration*): gate kualitas (typecheck/test/build/audit) yang jalan **sebelum** kode masuk `main`.
>
> **Update penting (2026-07-06, alasan CD tetap dibangun sendiri):** app ini rencananya akan **migrasi dari Railway/Vercel ke VPS atau server lokal milik perusahaan**. Begitu migrasi terjadi, auto-deploy dari Railway/Vercel **hilang** — CD manual/self-built jadi kebutuhan nyata, bukan cuma latihan. Jadi Task F sekarang mencakup **CI (Stage 1–4, dependency scan+CI dasar) DAN CD (Stage 5+)** — CD dibangun dari awal dengan asumsi target akhirnya VPS/on-prem, bukan Railway/Vercel, supaya begitu migrasi terjadi pipeline-nya sudah siap pakai (bukan dibongkar ulang).

**Keputusan yang sudah diambil (2026-07-06):**
- **Trigger workflow:** jalan di push ke `dev` **dan** di PR ke `main` (dipilih supaya feedback cepat tiap kerja harian, bukan cuma pas mau merge).
- **Cara membangun:** step-by-step sambil dijelaskan tiap bagian YAML (bukan langsung 1 file jadi) — karena tujuan eksplisit user adalah belajar devops, bukan cuma hasil akhir.
- **Command aktual yang akan dipakai di workflow** (dicek langsung ke `package.json`, bukan asumsi):
  - Backend: `bun test` (`package.json` script `test`), `tsc --noEmit` (typecheck, belum ada script package.json-nya — dipanggil langsung), `bun run scripts/build-prod.ts` (script `build`)
  - Frontend: `tsc -b && vite build` (script `build`, sudah termasuk typecheck), `eslint .` (script `lint`)

**Rencana bertahap — bagian CI:**
- [x] F1. **Stage 1 — CI dasar ✅ Selesai (2026-07-06)**: workflow `.github/workflows/ci.yml`,
  trigger push `dev` + PR `main`, 2 job paralel:
  - backend: typecheck → migrate+seed (postgres service container, kredensial sama dengan
    `docker-compose.yml` lokal) → `bun test` → build. Env dummy (JWT_SECRET/CSRF_SECRET/
    CREDENTIALS_ENCRYPTION_KEY, 32+ karakter, bukan rahasia asli) didefinisikan di level
    JOB (bukan per-step) — pelajaran dari run pertama: step Seed sempat gagal karena cuma
    dikasih `DATABASE_URL`, ternyata `seed.ts` import `config/env.ts` yang mewajibkan
    semua var, bukan cuma itu.
  - frontend: lint (eslint) → build (`tsc -b && vite build`, typecheck sudah termasuk)

  **Temuan penting saat setup**: `bun run lint` ternyata SUDAH gagal 19 error di lokal
  sebelum CI disentuh (utang teknis lama, belum pernah ke-gate). Semua diperbaiki di akar
  masalahnya (bukan disable rule) — lihat commit "fix(frontend): perbaiki 19 error ESLint".
  Diverifikasi: 2x run CI (`gh run watch`) sampai hijau penuh kedua job.
- [x] F2. **Stage 2 — Dependency scanning ✅ Selesai (2026-07-07)**: step "Dependency audit"
  (`bun audit --audit-level=high`) ditambah ke kedua job (backend setelah typecheck,
  frontend setelah lint) + `.github/dependabot.yml` — package-ecosystem **`"bun"`**
  (BUKAN `"npm"` — dicek langsung ke source `dependabot-core`, ada ekosistem khusus bun
  dengan parser `bun.lock` sendiri) untuk `backend/` dan `frontend/` terpisah, plus
  `github-actions` untuk workflow file, semua interval mingguan.

  **3 kerentanan high-severity yang sudah ada ditemukan & diperbaiki lebih dulu** (supaya
  gate baru ini tidak langsung merah, sama seperti pola Stage 1 dengan lint):
  - `drizzle-orm` <0.45.2 (SQL injection via improperly escaped identifiers) → upgrade ke
    0.45.2 (+ `drizzle-kit` 0.22→0.31.10 mengikuti). Dicek dulu: codebase cuma pakai query
    builder biasa (`select/insert/update/delete`), bukan Relational Query API — area
    breaking change utama Drizzle di rentang versi ini. Diverifikasi: typecheck bersih,
    38 test tetap lolos, `drizzle-kit generate` "No schema changes".
  - `xlsx` (SheetJS) <0.19.3 (prototype pollution + ReDoS) — fix-nya **tidak pernah
    dipublish ke npm**, cuma lewat CDN resmi SheetJS. Frontend: dicek ternyata dependency
    MATI (tidak ada satu pun `import` xlsx di source, cuma disebut sebagai string biasa) —
    dihapus. Backend: benar dipakai (import faktur/user/classification/channel-division +
    parser generik) tapi cuma API inti stabil (`read/write/utils.*`) — ganti sumber ke
    `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (cara install resmi
    didokumentasikan SheetJS sendiri). Diverifikasi fungsional nyata (bukan cuma test
    otomatis): upload file `.xlsx` asli via `POST /users/import` sukses, download
    template via `GET /users/template` menghasilkan file Excel valid.

  **Pending — butuh aksi manual user** (bukan sesuatu yang bisa diaktifkan lewat kode):
  `bun audit` di CI sudah jalan independen dan terverifikasi hijau, TAPI fitur native
  GitHub "Dependabot alerts" masih **disabled di level repository**
  (`gh api repos/.../dependabot/alerts` → 403 "Dependabot alerts are disabled for this
  repository"). File `dependabot.yml` sudah benar tapi PR update mingguan otomatis baru
  akan jalan setelah user aktifkan toggle di
  `https://github.com/wp-datascape/e-dashboard/settings/security_analysis` → nyalakan
  **"Dependabot alerts"** dan **"Dependabot security updates"** (butuh akses admin repo,
  tidak bisa dilakukan via API/CLI oleh Claude). Cara pakai: setelah aktif, GitHub akan
  otomatis buka PR mingguan tiap ada dependency baru + tab Security mulai menampilkan
  alert kerentanan secara real-time (terpisah dari `bun audit` di CI yang cuma jalan
  saat push/PR).
- [ ] F3. **Stage 3 — Notifikasi Telegram**: kirim pesan ke Telegram (Task E) saat CI gagal di `main`, bot token disimpan di GitHub Secrets (bukan hardcode di YAML)
- [ ] F4. **Stage 4 (opsional)**: branch protection rule di GitHub — `main` tidak bisa di-merge kalau CI gagal

**Rencana bertahap — bagian CD (sebagian terjawab 2026-07-06, lihat §4 poin 6):**
- [x] F5a. **OS & containerization — sudah dijawab (2026-07-06):** server **belum tersedia** (masih rencana, belum ada mesinnya), kemungkinan besar **Ubuntu Server**, dan akan pakai **Docker** untuk containerization. `backend/Dockerfile` **sudah ada** (dibuat untuk Railway) — kemungkinan besar bisa di-reuse langsung atau dengan penyesuaian kecil untuk VPS, bukan mulai dari nol.
- [x] F5b. **Frontend ikut migrasi — sudah dijawab (2026-07-06):** frontend **pasti ikut pindah** ke server yang sama (bukan tetap di Vercel), dengan **container terpisah dari backend** (masing-masing punya container dan port sendiri — bukan digabung 1 container). Konsekuensi teknis: butuh `frontend/Dockerfile` **baru** (belum ada — Vercel yang build otomatis selama ini, tidak pernah butuh Dockerfile), kemungkinan besar nginx (atau setara) untuk serve hasil `vite build` sebagai static file. Karena 2 container beda port, nanti butuh **reverse proxy** (nginx/Caddy/Traefik) di depan keduanya supaya frontend+backend bisa diakses dari 1 domain tanpa expose port mentah ke publik — detail ini masuk pembahasan `docker-compose.yml` di Stage 7.
- [x] F5c. **Akses SSH & timeline — sudah dijawab (2026-07-06):** user sendiri yang pegang akses SSH ke server nanti (bukan tim/pihak lain — jadi setup credential/secret untuk deploy tinggal dari 1 sumber). Timeline migrasi: **kemungkinan Agustus 2026** ("bulan depan" dari 2026-07-06) — belum pasti/final, tapi cukup dekat untuk jadi acuan prioritas (Task F bagian CD sebaiknya tidak ditunda terlalu lama).
- [ ] F6. **Stage 6 — Deploy mechanism**: karena target sudah pasti Docker dan SSH dipegang user sendiri, opsi **(b) GitHub-hosted runner push image lewat SSH** (`appleboy/ssh-action` atau setara) jadi paling praktis — tinggal simpan private key user sebagai GitHub Secret, tidak perlu install self-hosted runner di server (opsi a) atau setup registry terpisah (opsi c). Keputusan final tetap menyusul saat mulai coding Stage 6, ini baru kecondongan berdasarkan info yang sudah ada.
- [ ] F7. **Stage 7 — Container orchestration di server**: karena pakai Docker, ini jadi `docker-compose.yml` (bukan `pm2`/`systemd` manual) — restart policy (`restart: unless-stopped`) menggantikan kebutuhan process manager terpisah
- [ ] F8. **Stage 8 — Health check & rollback**: cek endpoint health setelah deploy, mekanisme rollback kalau image baru ternyata rusak (minimal: tag image versi sebelumnya tetap tersimpan di registry untuk di-restore manual lewat `docker compose` ganti tag)

---

## 4. Pertanyaan Terbuka

~~1. Account lockout (Task C)~~ — **sudah diputuskan (2026-07-06):** kombinasi per-akun DAN per-IP, bukan salah satu. Sisa detail (threshold gagal, durasi lock) masih perlu dibahas saat mulai coding — lihat Task C3.

~~2. Invalidasi sesi (Task D)~~ — **sudah dikonfirmasi (2026-07-06):** auth session stateless, tanpa tabel DB (dicek langsung ke kode, lihat §1.3). Karena itu, pendekatan revoke-per-token tidak mungkin tanpa redesign — dipilih pendekatan `token_version` (lihat Task D) sebagai solusi yang cocok untuk constraint stateless ini.

~~3. Channel alert (Task E)~~ — **sudah diputuskan (2026-07-06):** webhook Telegram. Dipilih dari perbandingan 3 opsi (Slack/Discord/Telegram) — Telegram menang di reach (kemungkinan besar tim sudah pakai, tanpa install baru) dan tanpa limit retensi pesan gratis. Setup: bot via `@BotFather` + `chat_id` tujuan.

~~4. MFA/2FA~~ — **di-skip untuk sekarang (2026-07-06)**, di luar scope task002. Kalau nanti dibutuhkan, jadi task terpisah dengan pertanyaan susulan: wajib untuk role apa saja, metode apa (TOTP app/email OTP/SMS).

~~5. CI platform (Task F)~~ — **scope berubah (2026-07-06):** awalnya direkomendasikan cukup Dependabot tanpa CI pipeline, tapi user secara eksplisit ingin **membangun CI/CD penuh via GitHub Actions sekaligus mempelajarinya untuk keperluan devops** — jadi Task F diperluas dari sekadar "dependency scanning" jadi CI bertahap 4 stage (lihat Task F). Trigger & cara membangun (step-by-step dengan penjelasan) sudah diputuskan, dicatat di breakdown Task F. **Belum dieksekusi** — masih tahap dokumentasi sesuai instruksi user, implementasi menyusul di sesi terpisah.

6. **Target infra VPS/lokal untuk CD (Task F5–F8, muncul 2026-07-06):** app rencananya migrasi dari Railway/Vercel ke VPS atau server lokal perusahaan — CD dibangun dari awal dengan asumsi ini (bukan cuma latihan, karena auto-deploy Railway/Vercel akan hilang begitu migrasi terjadi).
   - ~~VPS/server sudah ada atau masih rencana?~~ — **terjawab (2026-07-06):** belum tersedia, masih rencana, belum ada mesinnya.
   - ~~OS & containerization?~~ — **terjawab (2026-07-06):** kemungkinan besar **Ubuntu Server**, pakai **Docker** untuk containerization (`backend/Dockerfile` existing kemungkinan reusable — lihat Task F5a).
   - ~~Apakah frontend ikut pindah?~~ — **terjawab (2026-07-06):** ya, pasti ikut pindah ke server yang sama, container terpisah dari backend (beda port) — lihat Task F5b. Butuh reverse proxy di depan keduanya + `frontend/Dockerfile` baru.
   - ~~Akses SSH & timeline?~~ — **terjawab (2026-07-06):** user sendiri yang pegang akses SSH. Timeline migrasi kemungkinan **Agustus 2026** (belum pasti/final) — lihat Task F5c.

   **Semua sub-pertanyaan poin 6 sudah terjawab.** Task F5 (a/b/c) selesai secara desain, siap lanjut ke Task F6 (deploy mechanism) kapan pun mau mulai eksekusi.

---

## 5. Referensi Kode

- `backend/src/router.ts` — request-id, request-logger, mount `middleware/security.ts`
- `backend/src/middleware/security.ts` — konfigurasi CORS + secure-headers (Task A, selesai 2026-07-06)
- `backend/src/middleware/rate-limit.ts` — in-memory sliding window rate limiter, sudah dipakai di `auth.route.ts:9`
- `backend/src/middleware/auth.ts` — JWT + CSRF validation
- `backend/src/utils/csrf.ts`, `backend/src/utils/hash.ts` — CSRF token, bcrypt hashing
- `backend/src/utils/audit.ts` — `logAudit()`, dipakai sebagai basis Task E
- `backend/src/features/users/user.service.ts` — `updateUserService()`, titik reset password (Task D)
- `docs-v2/CRITICAL_RULES.md` § Security Rules — daftar aturan security yang sudah ditetapkan, jadi acuan "yang sudah ada"
