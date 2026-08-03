# Task 019 — CD ke VPS (Docker) + Migrasi Frontend dari Vercel

> Status: 📝 Planning → sedang dikerjakan. Eksekusi [[task002]] Task F6-F8 (rencana CD yang
> sudah disepakati 2026-07-06), dipicu oleh migrasi infra ke VPS aaPanel milik perusahaan
> (lihat memory `project_vps_mail_server_aapanel`).

## 1. Keputusan yang sudah diambil (sesi ini, 2026-08-03)

- **Domain prod**: `dashboard.semanggi.id` (frontend), `api.semanggi.id` (backend — konsisten
  dengan rencana awal VPS).
- **Domain dev**: `dev-dashboard.semanggi.id` (frontend), `dev-api.semanggi.id` (backend —
  penamaan baru, konsisten dengan pola prod). Kedua domain sudah otomatis ke-cover wildcard
  DNS `*.semanggi.id` yang sudah ada di Cloudflare, tidak perlu record baru.
- **Database**: Postgres via Docker di VPS ini juga (BUKAN Neon) — untuk **dev DAN prod**,
  **data baru/kosong** (bukan migrasi data Neon yang sudah ada). Neon tetap ada sebagai DB
  Railway/Vercel yang masih live sampai keputusan cutover selanjutnya — task ini TIDAK
  menyentuh atau mematikan itu.
- **Deploy mechanism**: **direvisi dari keputusan awal F6** (yang tadinya "build langsung di
  server, tanpa registry") — dipikir ulang saat eksekusi (2026-08-03): VPS ini SEKALIGUS
  menjalankan mail server + database produksi + panel, jadi build image (typecheck+bundle)
  tiap push sebaiknya TIDAK membebani server yang sama. Dipakai **GHCR (GitHub Container
  Registry)**: GitHub Actions runner build+push image ke `ghcr.io/wp-datascape/e-dashboard-*`
  pakai `GITHUB_TOKEN` bawaan (tidak perlu PAT terpisah), VPS cuma `docker pull` + restart
  lewat SSH — lebih ringan buat VPS, dan rollback tinggal ganti tag image tanpa build ulang.
- **Reverse proxy**: nginx bawaan aaPanel (bukan Traefik/Caddy tambahan — lihat keputusan
  sebelumnya di memory VPS), tiap domain jadi 1 Website kosong di aaPanel yang proxy ke
  `127.0.0.1:<port container>`, SSL Let's Encrypt per domain lewat menu Website aaPanel biasa
  (BUKAN lewat mekanisme Settings > Domain binding yang dipakai panel.semanggi.id — itu
  auto-managed & rawan ke-overwrite, jangan disentuh untuk domain aplikasi ini).
- **Cross-subdomain cookie**: TIDAK perlu ubah kode — `SameSite=None; Secure` yang sudah ada
  (`auth.handler.ts`) tetap jalan meski sekarang cross-subdomain (bukan lagi cross-domain
  penuh Railway↔Vercel). Simplifikasi ke `Domain=.semanggi.id` + `SameSite=Lax` bisa jadi
  perbaikan terpisah nanti, TIDAK masuk scope task ini.

## 2. Layout Port & Container (di VPS)

| Environment | Service | Container port (internal) | Host bind |
|---|---|---|---|
| prod | postgres | 5432 | tidak diekspos ke host sama sekali (internal docker network saja) |
| prod | backend | baca `PORT` dari env | `127.0.0.1:3001` |
| prod | frontend (nginx serve `dist/`) | 80 | `127.0.0.1:8081` |
| dev | postgres | 5432 | tidak diekspos ke host |
| dev | backend | baca `PORT` dari env | `127.0.0.1:3002` |
| dev | frontend (nginx serve `dist/`) | 80 | `127.0.0.1:8082` |

aaPanel Website per domain reverse-proxy ke port host masing-masing.

## 3. File Baru/Diubah

- `frontend/Dockerfile` — **baru**, multi-stage: build (`tsc -b && vite build`) → serve
  `dist/` pakai `nginx:alpine` + SPA fallback (`try_files ... /index.html`), sama pola proteksi
  source seperti backend (stage build tidak ikut ke image final).
- `docker-compose.prod.yml` — **baru**, root repo: service `postgres`, `backend`, `frontend`
  untuk environment prod, `restart: unless-stopped`.
- `docker-compose.dev.yml` — **baru**, sama seperti di atas tapi untuk dev, port beda.
- `.github/workflows/cd.yml` — **baru**: job `deploy-prod` (trigger push `main`), job
  `deploy-dev` (trigger push `dev`). Tiap job: checkout → build+push image backend & frontend
  ke GHCR (`docker/build-push-action`, tag `latest` + SHA commit) → SSH ke VPS
  (`appleboy/ssh-action`) → `docker compose -f docker-compose.<env>.yml pull && ... up -d`
  → curl `/health` untuk verifikasi. `docker-compose.*.yml` di VPS pakai `image:
  ghcr.io/wp-datascape/e-dashboard-backend:<env>` (bukan `build:`) supaya cuma pull, tidak
  build lokal.
- `backend/.env.production` / `.env.dev.example` — **tidak commit isi asli**, cuma didaftarkan
  di `.gitignore` kalau belum; nilai asli disuntik dari GitHub Secrets ke file `.env` di VPS
  saat deploy (lewat step SSH, `cat > .env`).

## 4. GitHub Secrets yang Dibutuhkan (belum ada satupun sekarang, dicek `gh secret list`)

| Secret | Isi |
|---|---|
| `VPS_HOST` | `38.147.122.238` |
| `VPS_SSH_USER` | `deploy` |
| `VPS_SSH_KEY` | Private key **baru** khusus GitHub Actions (bukan reuse key admin manusia) |

**Catatan GHCR auth:** TIDAK perlu PAT jangka panjang tersimpan permanen di VPS. Login ke
`ghcr.io` di VPS dilakukan tiap deploy pakai `GITHUB_TOKEN` bawaan job (`permissions:
packages: read` di level job cukup), dikirim lewat SSH command saat itu juga lalu langsung
`docker compose pull`. Token ini otomatis expired begitu job selesai — tidak ada credential
jangka panjang yang perlu diamankan di server.
| `PROD_JWT_SECRET`, `PROD_CSRF_SECRET`, `PROD_CREDENTIALS_ENCRYPTION_KEY` | `openssl rand -hex 32` masing-masing, generate baru |
| `PROD_DATABASE_URL` | connection string ke container `postgres` prod (`postgresql://dashboard:<random>@postgres:5432/e_dashboard`) |
| `DEV_JWT_SECRET`, `DEV_CSRF_SECRET`, `DEV_CREDENTIALS_ENCRYPTION_KEY` | sama seperti prod, generate baru terpisah |
| `DEV_DATABASE_URL` | sama pola, ke container postgres dev |

## 5. Urutan Eksekusi

- [ ] 1. Generate SSH keypair baru khusus CI/CD, pasang public key ke `authorized_keys` user
      `deploy` di VPS, tambahkan `deploy` ke grup `docker` (belum masuk grup sampai sekarang).
- [ ] 2. Set semua GitHub Secrets di atas (`gh secret set`).
- [ ] 3. Buat `frontend/Dockerfile`, `docker-compose.prod.yml`, `docker-compose.dev.yml`.
- [ ] 4. Buat `.github/workflows/cd.yml`.
- [ ] 5. Di VPS: siapkan direktori target (`/home/deploy/e-dashboard-prod`,
      `/home/deploy/e-dashboard-dev`), test manual `docker compose up -d --build` sekali
      sebelum diserahkan ke CI.
- [ ] 6. aaPanel: buat 4 Website kosong (`dashboard.semanggi.id`, `api.semanggi.id`,
      `dev-dashboard.semanggi.id`, `dev-api.semanggi.id`), reverse-proxy ke port masing-masing,
      SSL Let's Encrypt tiap domain.
- [ ] 7. Migration + seed database prod & dev (skema kosong, `bun run db:migrate` +
      `bun run db:seed` dari masing-masing container backend).
- [ ] 8. Push percobaan ke branch `dev` → verifikasi CD jalan otomatis → cek
      `dev-dashboard.semanggi.id` + `dev-api.semanggi.id/health`.
- [ ] 9. PR ke `main` → merge → verifikasi CD prod jalan → cek `dashboard.semanggi.id` +
      `api.semanggi.id/health`.
- [ ] 10. Update `docs-v2/shared/deployment.md` (ganti Railway/Vercel checklist jadi VPS),
      `docs-v2/shared/ci-cd.md` (§7 centang Stage 5-8), `docs-v2/task/task002.md` (centang F6-F8).

## 6. Yang SENGAJA di luar scope task ini

- Tidak mematikan/migrasi Railway+Vercel+Neon yang masih live — dua environment jalan paralel
  sampai ada keputusan cutover terpisah.
- Tidak mengubah kode cookie/CORS (`SameSite=None` tetap dipakai, sudah cukup untuk
  cross-subdomain).
- Tidak setup registry Docker terpisah (GHCR dll) — build langsung di VPS sesuai F6.
- Tidak setup branch protection rule `main` (F4, opsional, belum diminta).
