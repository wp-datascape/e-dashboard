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

### Task A — Security Headers
- [ ] A1. Pasang `hono/secure-headers` (atau setara) di `router.ts`, scope global (`app.use('*', ...)`)
- [ ] A2. Konfigurasi minimal: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY` atau `frame-ancestors 'none'`, `Strict-Transport-Security` (HTTPS only, prod saja)
- [ ] A3. Verifikasi tidak mematahkan CORS/embed yang sudah jalan (cek response header via curl ke tiap environment)

### Task B — Perluasan Rate Limit
- [ ] B1. Identifikasi endpoint sensitif selain login yang butuh rate limit (`/auth/refresh`, endpoint mutasi RBAC/user, dll — perlu diskusi cakupan persis)
- [ ] B2. Terapkan `rateLimit()` (sudah ada di `middleware/rate-limit.ts`) ke endpoint terpilih dengan window/threshold sesuai sensitivitas masing-masing

### Task C — Account Lockout
> **Keputusan (2026-07-06):** kombinasi per-akun DAN per-IP, bukan salah satu saja.
- [ ] C1. Tambah kolom `failed_login_count`/`locked_until` di tabel `users` (lockout per-akun)
- [ ] C2. Rate-limit per-IP di layer login **tetap dipertahankan** (`middleware/rate-limit.ts` — sudah ada) sebagai lapis kedua, independen dari lockout per-akun
- [ ] C3. Desain threshold & durasi: berapa kali gagal berturut-turut sebelum akun terkunci, berapa lama lock bertahan (auto-unlock) — belum diputuskan, perlu dibahas saat mulai coding
- [ ] C4. Unlock manual oleh admin (di halaman Users) sebagai jalan keluar kalau auto-unlock durasinya kepanjangan untuk kasus tertentu

### Task D — Invalidasi Sesi saat Reset Password
> **Keputusan (2026-07-06):** auth session **stateless, tanpa tabel DB** (lihat §1.3) — jadi revoke token individual tidak mungkin tanpa redesign. Pendekatan yang cocok untuk constraint ini: `token_version` bukan token blocklist.
- [ ] D1. Tambah kolom `token_version` (integer, default 0) di tabel `users`
- [ ] D2. Sertakan `token_version` di payload JWT (access + refresh token) saat login/refresh
- [ ] D3. `authMiddleware()` bandingkan `token_version` di JWT vs nilai terbaru di DB (reuse query yang sudah fetch data user per request — tidak nambah round-trip DB baru, lihat pola `getUserPermissions`/`getUserCompanyIds` yang sudah fresh-fetch tiap request)
- [ ] D4. `updateUserService()` — saat `password reset`, increment `token_version` user itu → semua token lama (access & refresh) otomatis invalid di request berikutnya, tanpa perlu tabel blocklist

### Task E — Audit/Alert Aksi Sensitif
> **Keputusan (2026-07-06):** channel webhook, platform **Telegram** (dipilih dari perbandingan Slack/Discord/Telegram — alasan: reach paling luas karena kemungkinan besar semua anggota tim sudah pakai Telegram tanpa perlu install app baru, gratis tanpa limit retensi, push notification cepat/reliable). Setup teknis: bot via `@BotFather` → dapat bot token, ambil `chat_id` tujuan (personal atau grup) sekali di awal, lalu kirim alert dengan POST ke `api.telegram.org/bot<token>/sendMessage`.
- [ ] E1. Definisikan daftar aksi "sensitif" (mis. `role.update` ke superadmin, `permission.assign` kategori Access Control, `user.update` dengan `passwordReset:true` ke akun superadmin)
- [ ] E2. Buat bot Telegram (`@BotFather`) + ambil `chat_id` tujuan, simpan bot token sebagai secret (bukan hardcode)
- [ ] E3. Hook ke `logAudit()` existing (`utils/audit.ts`) supaya tidak duplikasi jalur pencatatan — kirim ke Telegram di titik yang sama tempat `logAudit()` dipanggil untuk aksi-aksi di E1

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

**Rencana bertahap — bagian CI (belum dieksekusi — masih dokumentasi):**
- [ ] F1. **Stage 1 — CI dasar**: workflow `.github/workflows/ci.yml`, trigger push `dev` + PR `main`, jalankan install dependency (bun) → typecheck backend+frontend → `bun test` backend → build frontend
- [ ] F2. **Stage 2 — Dependency scanning**: tambah step `bun audit --audit-level=high` ke workflow yang sama + file `.github/dependabot.yml` (scan `backend/` dan `frontend/` terpisah)
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

- `backend/src/router.ts` — setup CORS, request-id, request-logger, tempat pasang security headers baru
- `backend/src/middleware/rate-limit.ts` — in-memory sliding window rate limiter, sudah dipakai di `auth.route.ts:9`
- `backend/src/middleware/auth.ts` — JWT + CSRF validation
- `backend/src/utils/csrf.ts`, `backend/src/utils/hash.ts` — CSRF token, bcrypt hashing
- `backend/src/utils/audit.ts` — `logAudit()`, dipakai sebagai basis Task E
- `backend/src/features/users/user.service.ts` — `updateUserService()`, titik reset password (Task D)
- `docs-v2/CRITICAL_RULES.md` § Security Rules — daftar aturan security yang sudah ditetapkan, jadi acuan "yang sudah ada"
