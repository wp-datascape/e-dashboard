# Deployment — Backend (Railway) + Frontend (Vercel)

> Status: ✅ **Sudah live di production** (sesi 31). Backend deploy ternyata di **Railway**, bukan Render seperti rencana awal dokumen ini — checklist §3 di bawah ditulis untuk Render, tapi Docker approach-nya (§2, §2a) sama persis berlaku untuk Railway (keduanya sama-sama tidak punya runtime Bun native di platform-nya). Domain backend aktual: `https://e-dashboard-production.up.railway.app` (dipakai `frontend/vercel.json` untuk proxy `/api/*`, lihat §5a).
> Arsitektur: split deployment, backend dan frontend di domain berbeda (cross-site).

---

## 1. Kenapa Cross-Site Itu Penting

Render (`*.onrender.com`) dan Vercel (`*.vercel.app`) adalah domain yang berbeda — browser menganggapnya **cross-site**, bukan cuma cross-port seperti di local dev (`localhost:5173` ↔ `localhost:3000` masih dianggap *same-site*).

Auth di aplikasi ini pakai httpOnly cookie (`access_token`, `refresh_token`, `csrf_token`). Cookie cross-site butuh `SameSite=None; Secure` — kalau tidak, browser diam-diam tidak pernah kirim cookie itu di request `fetch`/`axios`, dan login akan terlihat sukses tapi request berikutnya selalu 401. **Sudah diperbaiki** di `backend/src/features/auth/auth.handler.ts` (`SAME_SITE` otomatis `'None'` saat `NODE_ENV=production`).

Implikasi lain dari cross-site: cookie tidak akan pernah bisa dibaca kalau diakses lewat **HTTP** (bukan HTTPS) di production, karena `Secure=true` mewajibkan HTTPS. Render dan Vercel keduanya otomatis HTTPS, jadi ini aman selama kamu tidak custom domain tanpa TLS.

---

## 2. Docker atau PM2?

PM2 **tidak perlu** — Render adalah PaaS dengan process supervisor sendiri (auto-restart, health check, scaling), PM2 jadi redundant dan berpotensi konflik dengan graceful shutdown yang sudah ada (`SIGTERM`/`SIGINT` handler di `backend/src/index.ts`).

Docker **wajib dipakai, bukan opsional** — dicek langsung di dashboard Render: dropdown "Language" cuma ada Docker, Elixir, Node, Go, Python 3, Ruby, Rust. Tidak ada Bun native. Jadi Web Service backend ini pakai Language **Docker**, dengan `backend/Dockerfile` (image resmi `oven/bun`, multi-stage — lihat §2a).

### Soal `Makefile` di root repo

Repo ini sudah punya `Makefile` (git workflow shortcuts, dev server, docker/db management) — **jangan** arahkan Build/Start Command Render ke situ langsung. Sebagian besar target-nya (`commit`, `feature`, `finish`, `db-reset`, `generate-key`) pakai `read -p` (prompt interaktif) yang bakal hang di environment non-interaktif kayak Render, dan belum ada target "start backend versi production" (yang ada cuma `dev-backend`, itu mode watch).

Yang aman & relevan dipakai dari `Makefile` ini buat proses deploy (dijalankan manual dari lokal, bukan sebagai Start/Build Command Render):
- `make db-migrate` — jalankan migration ke DB manapun (lihat §3)
- `make db-seed` — seed data awal (lihat §3)

Untuk service Render sendiri, cukup Dockerfile yang sudah disiapkan (lihat §2a dan §3) — tidak ada risiko hang, dan source `.ts` tidak ikut ke image final.

---

## 2a. Proteksi Source Code (Obfuscation)

**Kenapa:** staff yang punya akses shell ke container yang jalan di Render TAPI tidak jadi collaborator di git repo — tanpa langkah ini mereka bisa `cat` file `.ts` apa saja di `src/` dan baca business logic mentah-mentah. Ini bukan proteksi terhadap orang yang memang punya akses ke repo (kalau iya, benahi permission repo, bukan build backend).

**Cara kerja** (`backend/Dockerfile`, multi-stage):
1. Stage `builder` (`oven/bun:1`) — `bun install`, lalu `bun run build` yang menjalankan `backend/scripts/build-prod.ts`:
   - `Bun.build` — bundle `src/index.ts` + semua import jadi **satu file** `dist/index.js` (target `bun`, minify, tanpa sourcemap)
   - `javascript-obfuscator` — obfuscate file hasil bundling itu (rename identifier ke hex, encode string ke base64, dst — sama seperti frontend, lihat `frontend/vite.config.ts`)
2. Stage final (`oven/bun:1`) — cuma `COPY --from=builder /app/dist/index.js ./index.js`. Source `.ts`, `node_modules`, devDependencies **tidak pernah ikut** ke image final sama sekali (bukan dihapus belakangan lewat `rm -rf` — memang tidak pernah di-`COPY` ke stage ini).

Sudah diverifikasi: `docker build` jalan sukses, dan container hasil build itu bisa serve `/health` + login end-to-end (bcrypt + JWT + query permission asli) padahal image final tidak punya `src/` maupun `node_modules/` sama sekali.

**Trade-off sengaja diambil:** `controlFlowFlattening` dan `deadCodeInjection` (dipakai di frontend) **dimatikan** di backend. Keduanya bagus untuk kode yang jalan sekali per page-load, tapi backend ini dieksekusi ulang di hot path tiap request masuk — kedua opsi itu dikenal menambah overhead signifikan (bisa 2-10x) tiap kali code path itu dieksekusi. Proteksi yang didapat tidak sepadan dengan risiko regresi latency API.

`selfDefending`/`debugProtection` juga OFF — alasan sama dengan frontend (rawan crash kalau bundle disentuh ulang, mempersulit debug production lewat log).

---

## 3. Checklist — Backend (Render)

### Setup awal
- [ ] Buat **Web Service** baru di Render, connect ke repo ini
- [ ] Language: **Docker** (bukan Node — dropdown Render tidak punya Bun native, lihat §2)
- [ ] Root Directory: `backend` (repo ini monorepo, `backend/` + `frontend/`)
- [ ] Dockerfile Path / Docker Build Context: pastikan mengarah ke `backend/Dockerfile` dengan context `backend/` — field persisnya bisa beda-beda tergantung versi UI Render, screenshot dulu kalau ragu
- [ ] Build/Start Command: **tidak perlu diisi** — sudah didefinisikan di dalam `backend/Dockerfile` (`RUN bun run build` saat build, `CMD ["bun", "index.js"]` saat start)
- [ ] Health Check Path: `/health` (endpoint sudah ada, cek koneksi DB juga)

### Environment Variables (Render dashboard → Environment)
| Key | Value | Catatan |
|---|---|---|
| `NODE_ENV` | `production` | Wajib — trigger `secure`/`SameSite=None` cookie + matikan `/api/v1/docs` |
| `PORT` | *(jangan di-set manual)* | Render inject otomatis, `Bun.serve` sudah baca dari `env.PORT` |
| `DATABASE_URL` | connection string Postgres | Dari Render Postgres, atau provider lain (Neon/Supabase) |
| `JWT_SECRET` | random ≥32 karakter | `openssl rand -hex 32` |
| `JWT_EXPIRES_IN` | `15m` | Default sudah oke, opsional di-override |
| `JWT_REFRESH_EXPIRES_IN` | `7d` | Default sudah oke, opsional di-override |
| `CSRF_SECRET` | random ≥32 karakter | Beda dari `JWT_SECRET` |
| `CREDENTIALS_ENCRYPTION_KEY` | random ≥32 karakter | Buat enkripsi kredensial Accurate di DB |
| `CORS_ORIGIN` | `https://<domain-vercel-kamu>` | Bisa multi, dipisah koma (lihat §5) |
| `UPLOAD_MAX_SIZE_MB` | `10` | Default sudah oke |

Generate secret cepat: `openssl rand -hex 32` (jalankan 3x untuk `JWT_SECRET`, `CSRF_SECRET`, `CREDENTIALS_ENCRYPTION_KEY` — jangan reuse).

### Database
- [ ] Provision Postgres (Render Postgres, atau eksternal — Neon/Supabase juga bisa)
- [ ] SSL ke Postgres **sudah dihandle di kode** (`backend/src/config/db.ts` — dideteksi dari hostname `DATABASE_URL`: `localhost`/`127.0.0.1` → SSL off, host lain → `ssl: 'require'`), tidak perlu utak-atik `DATABASE_URL`. Sengaja **bukan** dari `NODE_ENV` — `make db-migrate`/`make db-seed` dijalankan dari lokal (`NODE_ENV=development`) tapi target ke DB production, jadi deteksi berbasis `NODE_ENV` bikin migration lokal→production gagal "connection is insecure"
- [ ] Jalankan migration sekali sebelum service pertama kali live — pakai target `Makefile` yang sudah ada, timpa `DATABASE_URL` sementara ke connection string production:
  ```bash
  DATABASE_URL="<connection-string-production>" make db-migrate
  ```
  (jalankan dari lokal, **tidak otomatis** jalan saat deploy Render — jangan lupa tiap kali ada migration baru. `db-migrate` di `Makefile` cuma `cd backend && bun run db:migrate`, non-interaktif, aman dipakai gini)
- [ ] Jalankan seed **sekali saja** untuk data awal (companies, permissions, superadmin, page_settings, business_configs):
  ```bash
  DATABASE_URL="<connection-string-production>" make db-seed
  ```

### Verifikasi setelah deploy
- [ ] `GET https://<backend>.onrender.com/health` → `200`, `db: "connected"`
- [ ] `POST /api/v1/auth/login` dari Postman/curl → cek `Set-Cookie` header ada `SameSite=None; Secure`
- [ ] `GET /api/v1/docs` → harus **404/tidak bisa diakses** (memverifikasi `NODE_ENV=production` ke-set benar, karena route ini sengaja mati di production)

---

## 4. Checklist — Frontend (Vercel)

### Setup awal
- [ ] Import project di Vercel, root directory `frontend/`
- [ ] Framework preset: **Vite**
- [ ] Build Command: `npm run build` (= `tsc -b && vite build`)
- [ ] Output Directory: `dist`
- [ ] `frontend/vercel.json` **sudah dibuat** — rewrite semua path ke `index.html` supaya refresh/direct-link ke route React Router (mis. `/dashboard`) tidak 404 di level Vercel, **plus** rewrite `/api/*` ke backend Railway (lihat §5a)

### Environment Variables

| Key | Value | Catatan |
|---|---|---|
| `VITE_API_URL` | `/api` (relative — sudah di-set di `frontend/.env`, **bukan** absolute URL backend) | Berkat proxy §5a, frontend selalu panggil `/api/*` same-origin ke domain Vercel sendiri; Vercel yang meneruskan ke Railway di belakang layar. **Jangan** diisi absolute `https://...railway.app` — itu akan bypass proxy dan expose domain backend langsung di Network tab (justru masalah yang mau dihindari §5a) |
| `VITE_ENABLE_MOCK` | `false` (atau jangan di-set) | Pastikan MSW mock mati di production — `.env.local` (dev-only, tidak ke-deploy) yang set ini jadi `true`, `.env` production tidak punya key ini sama sekali → aman by default, tapi cek ulang |

### Verifikasi setelah deploy
- [ ] Buka `https://<frontend>.vercel.app/dashboard` **langsung** (bukan via klik dari `/login`) → harus render Dashboard, bukan 404 Vercel
- [ ] Login end-to-end → cek DevTools → Network → response `/auth/login` ada `Set-Cookie` dengan `SameSite=None`, lalu request berikutnya (`/auth/me`, dll) **bawa cookie itu** (cek header `Cookie` di request, bukan cuma response)
- [ ] Refresh halaman setelah login (bukan cuma navigasi SPA) → harus tetap login, bukan lempar ke `/login`
- [ ] PWA installable — buka di Chrome/Android atau Safari/iOS, cek opsi "Install app"/"Add to Home Screen" muncul (`vite-plugin-pwa` generate manifest + service worker otomatis saat `vite build`, tidak perlu langkah manual tambahan di Vercel)

---

## 5. CORS — Multi Origin & Preview Deployment

`CORS_ORIGIN` di backend menerima banyak domain dipisah koma (`backend/src/router.ts:70`, `.split(',')`), contoh:

```
CORS_ORIGIN=https://myapp.vercel.app,https://myapp-git-main-username.vercel.app
```

Vercel preview deployment (tiap PR/branch) dapat subdomain **acak** — tidak praktis didaftarkan satu-satu. Untuk sekarang, cukup daftarkan domain production Vercel saja; kalau nanti butuh test preview deployment terhadap backend production, tambahkan domain preview-nya manual sementara, atau pertimbangkan backend staging terpisah untuk testing preview branch.

---

## 5a. Proxy Vercel → Railway (same-origin dari sisi klien)

`frontend/vercel.json` rewrite `/api/*` ke domain backend Railway **sebelum** rewrite SPA catch-all (urutan penting — rewrite Vercel dicek berurutan):

```json
{
  "rewrites": [
    { "source": "/api/:path*", "destination": "https://e-dashboard-production.up.railway.app/api/:path*" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

**Kenapa:** tanpa proxy ini, request FE langsung ke domain Railway — URL/infra backend kelihatan langsung di DevTools Network tab pengguna. Dengan rewrite ini, browser klien selalu lihat request ke domain Vercel sendiri (same-origin), Vercel yang meneruskan ke Railway di belakang layar. **Catatan:** kalau domain Railway berubah (redeploy service baru, custom domain, dst), update juga `destination` di sini.

---

## 6. Yang TIDAK Perlu Disentuh (Sudah Siap)

- `PORT` sudah dibaca dari env, `Bun.serve` sudah bind ke semua interface — cocok dengan cara Render inject port
- `GET /health` sudah ada untuk health-check Render
- Rate limiter (`backend/src/middleware/rate-limit.ts`) sudah baca `X-Forwarded-For` dengan benar — aman di belakang proxy Render (catatan: in-memory, reset kalau instance restart/scale — cukup untuk single instance, ganti Redis kalau nanti multi-instance)
- CSRF validation pakai HMAC sign sendiri, bukan cek header `Origin`/`Referer` — tidak masalah lintas domain, asal cookie `csrf_token` sendiri bisa terkirim (lihat §1)
- File upload diproses di memory (`Buffer.from(arrayBuffer())`), tidak ditulis ke disk — aman dari masalah ephemeral filesystem Render

---

**Referensi kode terkait:**
- `backend/src/features/auth/auth.handler.ts` — cookie `SameSite`/`Secure` config
- `backend/src/config/db.ts` — Postgres SSL config
- `backend/src/config/env.ts` — daftar lengkap env var + validasi Zod
- `backend/src/router.ts` — CORS middleware
- `frontend/vercel.json` — SPA rewrite
- `frontend/src/api/axios.ts` — `VITE_API_URL` + `withCredentials`
