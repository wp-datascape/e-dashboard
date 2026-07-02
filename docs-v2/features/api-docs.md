# Feature: API Docs (Swagger UI)

> Status: ✅ Complete — pilot 6 endpoint (Auth + Dashboard + Metrics/cross-selling)
> Last updated: 2026-07-02 (sesi 29)
> Baca juga: `shared/api-conventions.md`

---

## Overview

Dokumentasi API interaktif (Swagger UI) di `/api/v1/docs`, di-serve dari spec **statis** yang ditulis manual (`src/docs/openapi.yaml`) — bukan auto-generate dari Zod schema.

### Kenapa manual, bukan auto-generate

Sempat dicoba pakai `hono-openapi` + `zod-openapi` (auto-generate spec dari Zod schema yang sudah dipakai validasi). Ditinggalkan karena:
- Peer-dependency rapuh: `zod-openapi` versi v6 (default `bun add`) ternyata untuk Zod v4, sedangkan project ini masih Zod v3 — perlu pin manual ke `zod-openapi@^4`. Root cause-nya disamarkan oleh pesan error yang tidak jelas (`"Missing dependencies zod-openapi v4"` padahal dependency-nya ada, cuma versi salah).
- `hono-openapi`'s `validator()` middleware (satu-satunya cara query param ke-detect otomatis dari Zod schema) ternyata **selalu memvalidasi dan bisa memblokir request** — tidak bisa dibuat "read-only untuk docs doang". Perlu custom hook supaya format error match `AppError` existing, menambah kompleksitas.
- Ada isu urutan module-loading kalau mau pakai `.openapi()` metadata Zod (butuh `extendZodWithOpenApi(z)` dipanggil sebelum schema file manapun di-import).

Spec statis jauh lebih sederhana: 1 file YAML, 1 dependency ringan (`swagger-ui-dist`, cuma static assets, tanpa peer-dependency Zod sama sekali), zero risiko ke handler/service yang sudah ada.

**Tradeoff**: spec tidak auto-sync dengan kode — kalau endpoint berubah, `openapi.yaml` harus di-update manual.

---

## File Structure

```
backend/src/
├── docs/
│   └── openapi.yaml              — spec OpenAPI 3.1, ditulis manual
└── features/docs/
    └── docs.route.ts             — serve spec + Swagger UI HTML + static assets
```

Tidak ada `.schema.ts`/`.service.ts`/`.repository.ts` — fitur ini murni static file serving, tidak ada business logic.

---

## Route

Semua route di bawah `/api/v1/docs`, **di-mount di dalam `protectedApi`** (lihat `router.ts`) — wajib `access_token` cookie valid (login sungguhan) untuk akses. Non-aktif kalau `NODE_ENV=production`.

| Route | Deskripsi |
|---|---|
| `GET /api/v1/docs` | Halaman utama Swagger UI (HTML) |
| `GET /api/v1/docs/openapi.yaml` | Spec mentah, di-parse Swagger UI di browser |
| `GET /api/v1/docs/assets/:file` | Static assets `swagger-ui-dist` (JS/CSS) |

Semua response docs dikirim dengan header `Cache-Control: no-store` — halaman ini protected, browser tidak boleh cache supaya request selalu tervalidasi ulang oleh server (relevan setelah logout, lihat Implementation Notes).

---

## Implementation Notes

### "Try it out" pakai cookie & CSRF ASLI dari login sungguhan

`docs.route.ts` inject `requestInterceptor` custom ke `SwaggerUIBundle` yang baca cookie `csrf_token` (sengaja non-httpOnly, readable JS) dan pasang otomatis ke header `X-CSRF-Token` pada tiap request. Cookie `access_token`/`refresh_token` (httpOnly) dikirim otomatis oleh browser karena Swagger UI di-serve dari origin yang sama (`localhost:3000`).

Ini artinya "Try it out" **tidak pakai token palsu/bypass** — memakai session browser yang sama dengan app utama. Diverifikasi end-to-end: login via Swagger endpoint `/auth/login` → cookie ter-set → GET `/dashboard` via Try it out → data asli kembali → POST `/auth/logout` via Try it out → CSRF ter-inject otomatis, tervalidasi server, berhasil.

### Catatan: Swagger UI juga bisa dipakai untuk login (bukan cuma testing endpoint lain)

Karena `POST /auth/login` didokumentasikan di spec dan endpoint ini publik (`security: []`, tidak butuh cookie), user yang **belum login** secara teori tidak bisa membuka `/api/v1/docs` (route protected, wajib auth) — tapi begitu **sudah** login sekali untuk membuka halaman docs, mereka bisa pakai form login di Swagger untuk generate access_token/csrf baru kapan saja (misal token lama sudah kedaluwarsa) tanpa perlu buka app utama. Ini konsekuensi wajar dari mendokumentasikan endpoint login apa adanya — dicatat di sini sebagai pengingat, bukan bug: akses ke `/api/v1/docs` itu sendiri tetap terkunci di belakang auth normal, cuma begitu masuk, user punya jalan pintas re-login lewat Swagger.

### Bug ditemukan saat verifikasi manual (tidak terkait Swagger, tapi terungkap gara-gara testing fitur ini): tombol Logout di AppBar tidak invalidasi sesi server

Saat testing "docs route harus ke-block setelah logout", ditemukan tombol logout asli di `AppBar.tsx` (dan `LogoutButton.tsx`) memanggil `useAuth().logout()` dari `AuthContext.tsx` — fungsi itu **cuma clear state React + localStorage**, TIDAK PERNAH memanggil `POST /auth/logout`. Akibatnya cookie httpOnly (`access_token`, `refresh_token`, `csrf_token`) tetap valid di server walau UI sudah redirect ke `/login` — sesi sebenarnya tidak pernah berakhir sampai `access_token` expired sendiri (15 menit) atau `refresh_token` expired (7 hari).

Fix: `AppBar.tsx` dan `LogoutButton.tsx` diganti pakai `useLogoutMutation()` (`hooks/useAuth.ts`) — hook ini sudah ada sebelumnya tapi tidak pernah dipakai di mana pun. Sekarang benar-benar memanggil `POST /auth/logout` (hapus 3 cookie di server) sebelum clear state lokal + redirect.

---

## References

- **Backend**: `backend/src/features/docs/docs.route.ts`, `backend/src/docs/openapi.yaml`
- **Router mount**: `backend/src/router.ts` — `protectedApi.route('/docs', docsRoutes)`, gated `NODE_ENV !== 'production'`
- **Fix terkait**: `frontend/src/components/ui/AppBar/AppBar.tsx`, `frontend/src/components/ui/LogoutButton/LogoutButton.tsx` — logout sekarang pakai `useLogoutMutation()`

---

**Last Updated**: 2026-07-02
**Status**: ✅ Pilot — 6/40+ endpoint terdokumentasi (Auth lengkap, Dashboard, Metrics/cross-selling)
