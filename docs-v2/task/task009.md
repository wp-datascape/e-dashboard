# Task 009 — Infrastruktur Multi-Entitas: Domain per Entitas di VPS

> Status: 📝 Planning — belum mulai implementasi, baru diskusi arsitektur
> Dibuat: 2026-07-26
> Baca juga: `shared/deployment.md` (setup live saat ini: Railway + Vercel), `features/companies.md` (3 entitas: MKO, KNT, SKI)

---

## 1. Latar Belakang

Rencana ke depan: pindah/tambah deployment ke VPS sendiri, dengan `semanggi.com` sebagai root domain holding. Selain user Semanggi yang akses multi-company lewat `dashboard.semanggi.com` (perilaku sekarang, **tidak berubah**), tiap entitas (mis. PT Mesin Kasir Online/MKO) bisa dapat domain/subdomain sendiri sebagai "pintu masuk" khusus untuk staff entitas itu — instance app & backend yang **sama**, bukan deployment terpisah.

**Poin penting yang sudah dikonfirmasi saat diskusi**: isolasi data ANTAR entitas **sudah otomatis terjamin** oleh `company_id` scoping + RBAC yang sudah jadi critical rule aplikasi ini (`CRITICAL_RULES.md` — "Every query MUST filter company_id"). User MKO yang cuma di-assign ke company MKO **memang cuma lihat data MKO**, baik dia login lewat `dashboard.semanggi.com` maupun lewat domain entitasnya sendiri. Domain BUKAN mekanisme isolasi data — itu levelnya sudah beres di RBAC/query layer.

Yang domain-nya BELUM handle: mencegah user MKO login lewat `dashboard.semanggi.com` (kalaupun secara data tidak masalah karena RBAC tetap membatasi, tapi kalau mau isolasi "pintu masuk" yang ketat — MKO cuma bisa lewat domainnya sendiri, tidak pernah lihat portal multi-company Semanggi sama sekali).

---

## 2. Rencana Implementasi (belum dieksekusi)

### a. Reverse proxy
Domain/subdomain baru per entitas diarahkan ke instance app yang sama (Nginx/Caddy vhost). Tidak perlu deployment terpisah — sama app, sama backend, sama database.

### b. `CORS_ORIGIN` backend
Tambah entry domain baru tiap kali ada domain entitas baru (`backend/src/router.ts:70`, sudah dukung multi-origin dipisah koma — lihat pola yang sama seperti fix whitelist `127.0.0.1:5173` sebelumnya). Backend akan reject request dari origin yang tidak terdaftar.

### c. TLS certificate per domain baru
Kalau domain entitas adalah **subdomain** dari `semanggi.com` → cukup 1 wildcard cert (`*.semanggi.com`). Kalau entitas pakai **apex domain sendiri** (mis. `mesinkasironline.com`, bukan subdomain semanggi.com) → butuh cert terpisah per domain (Let's Encrypt manual per domain, atau Caddy on-demand TLS).

### d. Backend cek `Host` header saat login (opsional — hardening, bukan syarat isolasi data)
Kalau mau MKO **hanya** bisa login lewat domainnya sendiri (tidak bisa/tidak seharusnya muncul di `dashboard.semanggi.com` sama sekali): tambah pengecekan di flow login — baca `Host` header request, cocokkan ke company yang di-assign ke user tsb, tolak (403) kalau tidak sesuai. **Belum ada implementasinya sekarang** — dicek langsung ke `auth.handler.ts`, tidak ada logika berbasis hostname/origin sama sekali di alur auth saat ini.

Perlu didesain lebih lanjut sebelum implementasi:
- Field mana yang jadi sumber "domain resmi" per company — tambah kolom baru di tabel `companies` (mis. `allowed_domain`)?
- Bagaimana kalau user (superadmin/Semanggi) memang butuh akses ke MULTI company — mereka tidak boleh kena block ini, cuma user yang di-scope ke SATU company tertentu.
- Apakah berlaku di level login saja, atau tiap request (mis. cek ulang di middleware auth, bukan cuma saat `POST /auth/login`).

---

## 3. Catatan Cross-Domain (kalau entitas pakai apex domain sendiri, bukan subdomain semanggi.com)

Kalau nanti entitas pakai domain sendiri sepenuhnya (bukan `*.semanggi.com`), ini BEDA dari kasus subdomain biasa:
- Cookie JWT **tidak bisa** di-share pakai `domain=.semanggi.com` — beda apex domain, browser anggap situs benar-benar terpisah. Sesi login MKO di `mesinkasironline.com` tidak akan nyambung ke `dashboard.semanggi.com`, meskipun pakai backend yang sama (ini justru bisa jadi keuntungan buat isolasi "pintu masuk", bukan cuma keterbatasan).
- Mirip kasus Railway↔Vercel yang sudah dihandle (`shared/deployment.md` §1) — beda domain = cross-site, cookie butuh `SameSite=None; Secure`, sudah otomatis aktif kalau `NODE_ENV=production`.

---

## 4. Verifikasi (setelah implementasi nanti)
1. User Semanggi tetap bisa akses multi-company seperti biasa lewat `dashboard.semanggi.com` — tidak regresi.
2. User entitas (mis. MKO) login lewat domain entitasnya sendiri → cuma lihat data company itu (harusnya sudah otomatis lolos, existing RBAC).
3. Kalau host-check login diimplementasi: user MKO coba login lewat `dashboard.semanggi.com` → ditolak (403), pesan jelas.
4. Kalau host-check diimplementasi: superadmin/user multi-company tetap bisa login dari mana saja — tidak ikut ke-block.
5. `CORS_ORIGIN` domain baru sudah terdaftar → request dari domain itu tidak kena CORS error.
6. TLS valid di semua domain (tidak ada mixed content/certificate warning).
