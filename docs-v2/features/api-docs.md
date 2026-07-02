# Feature: API Docs (Swagger UI)

> Status: ✅ Complete — 83 operasi / 63 path terdokumentasi (seluruh route di bawah protectedApi)
> Last updated: 2026-07-02 (sesi 29, dilengkapi)
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

## Cakupan Spec

Awalnya pilot 6 endpoint (Auth + Dashboard + Metrics/cross-selling). Dilengkapi sesi ini jadi **83 operasi / 63 path** — seluruh feature route di bawah `protectedApi` (lihat `router.ts`):

Auth, Dashboard, Metrics (10 endpoint: cross-selling, customer-metrics, gp/hm/ror-breakdown, dormant-customer, category-performance, category-products, high-margin-penetration/detail+customers, customer-products, avg-category), Users, Page Settings, Companies (+ branches), Roles, Permissions, Config (+ Accurate credentials/test-connection), Audit Log, Customers, Products (lokal + proxy live Accurate), Import (termasuk upload multipart & SSE stream), Classification Rules, Settings — High Margin, Settings — Channel Divisions, Transactions (invoices).

**Catatan cara dokumentasi untuk bentuk response non-JSON-biasa:**
- **File download** (`GET /import/template`, `/classification-rules/template`, `/settings/channel-divisions/template`) — didokumentasikan sebagai `content: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, schema: {type: string, format: binary}`. Swagger UI bisa "Try it out" dan browser akan download file-nya.
- **Multipart upload** (`POST /import/csv`, `/import/csv/stream`, `/classification-rules/import`, `/settings/channel-divisions/import`) — `requestBody.content: multipart/form-data` dengan field `file: {type: string, format: binary}`. Swagger UI render sebagai file picker asli.
- **SSE stream** (`POST /import/csv/stream`) — didokumentasikan `content: text/event-stream, schema: {type: string}`, dengan deskripsi bentuk tiap event (`progress`/`done`/`error`) di teks karena OpenAPI 3.1 tidak punya construct native untuk event-stream typing. "Try it out" akan menampilkan raw stream text, bukan event yang di-parse.
- **Proxy live ke Accurate** (`GET /products/accurate`, `/products/accurate/categories`) — didokumentasikan penuh (query params, response shape), tapi dicatat di description bahwa ini live call ke API eksternal tiap request (bisa lambat/gagal kalau Accurate down), bukan baca dari DB lokal.

**Ditemukan & dicatat apa adanya selama menulis spec** (bukan bug yang diperbaiki di sesi ini, murni dokumentasi transparan):
- `GET /config/accurate/credentials/:branchId` mengembalikan `api_token` & `signature_secret` dalam bentuk **plaintext** (di-decrypt server-side).
- `POST /settings/high-margin` mengambil `created_by` dari header `x-user-id` (default `1`), bukan dari session JWT yang login — beda pola dari fitur lain.
- Delete di `settings/high-margin` dan `settings/channel-divisions` return `200 {id}`, sedangkan delete di fitur lain (users, companies, roles, dll) return `204 No Content` — inkonsisten, didokumentasikan sesuai kode asli.
- Beberapa query param boolean (`active_only`, `high_margin_only`) menerima string literal `"true"`/`"false"`, bukan native boolean — hand-rolled karena `Boolean("false") === true` di JS.

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
**Status**: ✅ Complete — 83 operasi / 63 path terdokumentasi (seluruh route protectedApi)
