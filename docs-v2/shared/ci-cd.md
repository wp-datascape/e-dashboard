# CI/CD — GitHub Actions

> Status: CI Stage 1-2 sudah jalan (2026-07-07). CD (deploy ke VPS) belum dibangun — lihat `docs-v2/task/task002.md` Task F untuk rencana lengkap dan progres detail. Dokumen ini fokus ke **cara pakai** apa yang sudah ada, bukan riwayat pembangunannya.

---

## 1. Kapan CI Jalan

Workflow `.github/workflows/ci.yml` otomatis jalan di 2 kondisi:
- **Setiap `git push` ke branch `dev`** — feedback cepat tiap kerja harian
- **Setiap Pull Request yang menyasar `main`** — gate sebelum kode masuk `main`

Push ke branch lain (misal branch fitur pribadi) **tidak** memicu apa pun — kalau mau tes CI sebelum masuk `dev`, harus push ke `dev` dulu atau buka PR ke `main`.

## 2. Apa yang Dicek

2 job jalan **paralel** (bukan berurutan — lebih cepat):

**Job `backend`** (butuh Postgres, jadi ada service container sementara):
1. Typecheck (`tsc --noEmit`)
2. Dependency audit (`bun audit --audit-level=high`) — lihat §4
3. Migrate database (skema terbaru ke Postgres kosong)
4. Seed database (data awal — beberapa test butuh data seeder asli, mis. role `user` id 3)
5. `bun test` (38 test — unit + integration + e2e)
6. Build (`bun run build` — bundle+obfuscate, cuma cek proses bundling tidak error, TIDAK butuh koneksi DB)

**Job `frontend`**:
1. Lint (`eslint .`)
2. Dependency audit (`bun audit --audit-level=high`)
3. Build (`tsc -b && vite build` — typecheck sudah termasuk di sini)

Kalau salah satu job gagal, PR ke `main` akan menampilkan tanda ❌ di GitHub — **belum ada branch protection** yang memblokir merge (itu Stage 4, opsional, belum dibangun), jadi secara teknis masih bisa di-merge manual meski CI merah. Anggap ini sebagai sinyal peringatan, bukan penghalang keras, sampai Stage 4 dibangun.

## 3. Cara Baca Hasil Run

**Lewat browser**: buka tab **Actions** di `https://github.com/wp-datascape/e-dashboard/actions`, klik run yang mau dilihat, klik job yang gagal, expand step yang ada tanda ❌ untuk lihat log lengkap.

**Lewat terminal** (`gh` CLI — sudah terpasang di environment ini di `~/.local/bin/gh`, login pakai akun `wp-datascape`):
```bash
gh run list --limit 5                    # lihat run terbaru
gh run view <run-id>                     # ringkasan job+step
gh run view <run-id> --log --job=<job-id>  # log lengkap 1 job
gh run watch <run-id> --exit-status      # tunggu sampai selesai, langsung tampil hasil
```

## 4. Dependency Audit — Apa Artinya Kalau Gagal

Step "Dependency audit" (`bun audit --audit-level=high`) mengecek semua dependency (langsung maupun transitif) terhadap database kerentanan publik. **Gagal (exit code ≠ 0) kalau ada kerentanan tingkat high atau critical** — moderate/low tidak menggagalkan CI (`--audit-level=high` sengaja dipilih supaya CI tidak berisik untuk isu kecil).

**Kalau step ini gagal:**
1. Jalankan `bun audit --audit-level=high` di lokal (`backend/` atau `frontend/`, sesuai job yang gagal) untuk lihat detail paket & advisory-nya
2. Cek apakah ada versi fix di npm registry: `npm view <nama-paket> versions --json`
3. Kalau ada → `bun add <nama-paket>@<versi-fix>`, jalankan typecheck+test, verifikasi tidak ada breaking change sebelum commit (lihat contoh nyata: upgrade `drizzle-orm` 0.31→0.45.2 di commit "fix(security): update drizzle-orm...")
4. Kalau fix TIDAK ada di npm (kasus `xlsx`/SheetJS — makernya cuma distribusikan patch lewat CDN sendiri) → cek dokumentasi resmi paket itu untuk cara instalasi alternatif, atau pertimbangkan ganti library kalau memang sudah tidak dipelihara

**Dependency baru yang mau ditambah** — jalankan `bun audit` di lokal SEBELUM commit, supaya tidak kaget CI merah setelah push.

## 5. Dependabot (Update Dependency Otomatis)

`.github/dependabot.yml` sudah dikonfigurasi — package-ecosystem **`"bun"`** (bukan `"npm"`, ada ekosistem khusus Bun di Dependabot dengan parser `bun.lock` sendiri) untuk `backend/` dan `frontend/` terpisah, plus `github-actions` untuk file workflow, semua cek mingguan.

**Status saat ini: file konfigurasi sudah benar, TAPI fitur ini belum aktif** — GitHub mewajibkan toggle terpisah di level repository yang belum dinyalakan. Sampai toggle ini aktif, Dependabot **tidak** akan membuka PR otomatis, dan tab Security repo tidak akan menampilkan alert kerentanan (`bun audit` di CI tetap jalan normal terlepas dari ini — dua mekanisme yang independen).

**Cara aktifkan** (butuh akses admin repo, dilakukan manual oleh pemilik repo — tidak bisa lewat API/CLI):
1. Buka `https://github.com/wp-datascape/e-dashboard/settings/security_analysis`
2. Nyalakan **"Dependabot alerts"**
3. Nyalakan **"Dependabot security updates"**
4. **"Dependabot version updates"** biasanya otomatis aktif begitu `.github/dependabot.yml` terdeteksi di branch default — cek juga apakah ada tombol "Enable" terpisah untuk ini

Setelah aktif: PR update dependency muncul otomatis tiap minggu (kalau ada versi baru), dan tab Security menampilkan alert kerentanan real-time.

## 6. Env Dummy di CI (Bukan Rahasia Asli)

Job `backend` butuh beberapa env var (`JWT_SECRET`, `CSRF_SECRET`, `CREDENTIALS_ENCRYPTION_KEY`, dll — lihat `backend/src/config/env.ts` untuk daftar lengkap) supaya validasi Zod di `config/env.ts` lolos. Nilai yang dipakai di `ci.yml` (didefinisikan sekali di level `jobs.backend.env`, otomatis berlaku ke semua step) **cuma string dummy 32+ karakter**, bukan rahasia produksi — aman ditulis literal di file YAML karena database yang dipakai juga cuma service container sementara yang dibuang begitu job selesai.

Kalau nanti ada step yang BENAR-BENAR butuh rahasia asli (misal Stage 3: kirim notifikasi Telegram beneran saat CI gagal), itu **wajib** lewat GitHub Secrets (`Settings → Secrets and variables → Actions`), dipanggil di YAML dengan `${{ secrets.NAMA_SECRET }}` — bukan ditulis literal seperti env dummy di atas.

## 7. Yang Belum Dibangun

Lihat `docs-v2/task/task002.md` Task F untuk detail rencana dan keputusan teknis:
- **Stage 3** — notifikasi Telegram otomatis saat CI gagal di `main`
- **Stage 4** (opsional) — branch protection rule, `main` tidak bisa di-merge kalau CI merah
- **Stage 5-8** — CD (Continuous Deployment) ke VPS/server lokal via Docker + `docker-compose.yml`, menggantikan auto-deploy Railway/Vercel yang akan hilang setelah migrasi infrastruktur
