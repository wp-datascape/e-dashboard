# Deployment — Backend (Render) + Frontend (Vercel)

> Status: 📋 Checklist — belum pernah deploy ke production, ini panduan pertama kali.
> Arsitektur: split deployment, backend dan frontend di domain berbeda (cross-site).

---

## 1. Kenapa Cross-Site Itu Penting

Render (`*.onrender.com`) dan Vercel (`*.vercel.app`) adalah domain yang berbeda — browser menganggapnya **cross-site**, bukan cuma cross-port seperti di local dev (`localhost:5173` ↔ `localhost:3000` masih dianggap *same-site*).

Auth di aplikasi ini pakai httpOnly cookie (`access_token`, `refresh_token`, `csrf_token`). Cookie cross-site butuh `SameSite=None; Secure` — kalau tidak, browser diam-diam tidak pernah kirim cookie itu di request `fetch`/`axios`, dan login akan terlihat sukses tapi request berikutnya selalu 401. **Sudah diperbaiki** di `backend/src/features/auth/auth.handler.ts` (`SAME_SITE` otomatis `'None'` saat `NODE_ENV=production`).

Implikasi lain dari cross-site: cookie tidak akan pernah bisa dibaca kalau diakses lewat **HTTP** (bukan HTTPS) di production, karena `Secure=true` mewajibkan HTTPS. Render dan Vercel keduanya otomatis HTTPS, jadi ini aman selama kamu tidak custom domain tanpa TLS.

---

## 2. Docker atau PM2?

**Tidak perlu keduanya untuk Render.** Render adalah PaaS dengan process supervisor sendiri (auto-restart, health check, scaling) — PM2 jadi redundant dan berpotensi konflik dengan graceful shutdown yang sudah ada (`SIGTERM`/`SIGINT` handler di `backend/src/index.ts`).

Docker **opsional** — Render punya native runtime Bun, cukup Build Command + Start Command tanpa Dockerfile. Pakai Docker kalau nanti butuh portabilitas ke provider lain atau dependency sistem non-standar.

### Soal `Makefile` di root repo

Repo ini sudah punya `Makefile` (git workflow shortcuts, dev server, docker/db management) — **jangan** arahkan Build/Start Command Render ke situ langsung. Sebagian besar target-nya (`commit`, `feature`, `finish`, `db-reset`, `generate-key`) pakai `read -p` (prompt interaktif) yang bakal hang di environment non-interaktif kayak Render, dan belum ada target "start backend versi production" (yang ada cuma `dev-backend`, itu mode watch).

Yang aman & relevan dipakai dari `Makefile` ini buat proses deploy (dijalankan manual dari lokal, bukan sebagai Start Command Render):
- `make db-migrate` — jalankan migration ke DB manapun (lihat §3)
- `make db-seed` — seed data awal (lihat §3)

Untuk Build/Start Command Render sendiri, langsung pakai `bun install` / `bun run start` (lihat §3) — simpel, tidak ada risiko hang.

---

## 3. Checklist — Backend (Render)

### Setup awal
- [ ] Buat **Web Service** baru di Render, connect ke repo ini, root directory `backend/`
- [ ] Environment: **Bun** (native) — bukan Docker
- [ ] Build Command: `bun install`
- [ ] Start Command: `bun run start` (= `bun run src/index.ts`, sudah ada di `package.json`)
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
- [ ] SSL ke Postgres **sudah dihandle di kode** (`backend/src/config/db.ts` — `ssl: 'require'` otomatis saat `NODE_ENV=production`), tidak perlu utak-atik `DATABASE_URL`
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
- [ ] `frontend/vercel.json` **sudah dibuat** — rewrite semua path ke `index.html` supaya refresh/direct-link ke route React Router (mis. `/dashboard`) tidak 404 di level Vercel

### Environment Variables (Vercel dashboard → Settings → Environment Variables)
| Key | Value | Catatan |
|---|---|---|
| `VITE_API_URL` | `https://<backend>.onrender.com/api/v1` | **Wajib diisi** — default di `.env` (`/api`) cuma jalan kalau satu domain |
| `VITE_ENABLE_MOCK` | `false` (atau jangan di-set) | Pastikan MSW mock mati di production — `.env.local` (dev-only, tidak ke-deploy) yang set ini jadi `true`, `.env` production tidak punya key ini sama sekali → aman by default, tapi cek ulang |

### Verifikasi setelah deploy
- [ ] Buka `https://<frontend>.vercel.app/dashboard` **langsung** (bukan via klik dari `/login`) → harus render Dashboard, bukan 404 Vercel
- [ ] Login end-to-end → cek DevTools → Network → response `/auth/login` ada `Set-Cookie` dengan `SameSite=None`, lalu request berikutnya (`/auth/me`, dll) **bawa cookie itu** (cek header `Cookie` di request, bukan cuma response)
- [ ] Refresh halaman setelah login (bukan cuma navigasi SPA) → harus tetap login, bukan lempar ke `/login`

---

## 5. CORS — Multi Origin & Preview Deployment

`CORS_ORIGIN` di backend menerima banyak domain dipisah koma (`backend/src/router.ts:70`, `.split(',')`), contoh:

```
CORS_ORIGIN=https://myapp.vercel.app,https://myapp-git-main-username.vercel.app
```

Vercel preview deployment (tiap PR/branch) dapat subdomain **acak** — tidak praktis didaftarkan satu-satu. Untuk sekarang, cukup daftarkan domain production Vercel saja; kalau nanti butuh test preview deployment terhadap backend production, tambahkan domain preview-nya manual sementara, atau pertimbangkan backend staging terpisah untuk testing preview branch.

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
