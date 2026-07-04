# Feature: Auth (Autentikasi)

> Status: ✅ 100% — Login, Logout, Me, Refresh, Rate Limiting selesai. JWT HttpOnly Cookie + CSRF aktif.
> Last updated: 2026-07-04
> Baca juga: `shared/architecture.md`, `shared/api-conventions.md`, `features/permissions.md`

---

## File Structure

```
src/features/auth/
├── auth.schema.ts      — Zod DTO (login input validation)
├── auth.repository.ts  — Drizzle queries (find user, roles, permissions, companies)
├── auth.service.ts     — Business logic (loginService, getMeService)
├── auth.handler.ts     — HTTP handlers (handleLogin, handleLogout, handleMe)
└── auth.route.ts       — Route definitions (public + protected per endpoint)

src/middleware/
└── auth.ts             — JWT verification + CSRF validation middleware
```

---

## Auth Flow Overview

```
POST /auth/login
  → validasi email + password (bcrypt)
  → query: companyIds, primaryRole, permissions
  → sign JWT access token (15m) + refresh token (7d)
  → set HttpOnly cookies
  → return: { csrf_token, data: { token, user, permissions } }

Request ke protected route (setelah login)
  → browser kirim cookie 'access_token' otomatis (withCredentials: true)
  → authMiddleware: verify JWT → validasi CSRF (kalau mutasi) → load permissions dari DB
  → c.var.user (JwtPayload) + c.var.permissions (string[]) tersedia di handler

POST /auth/logout
  → hapus kedua cookie → selesai
```

---

## Cookies

| Cookie          | HttpOnly | SameSite | MaxAge   | Isi                  |
|-----------------|----------|----------|----------|----------------------|
| `access_token`  | ✅        | Lax      | 15 menit | JWT signed (HS256)   |
| `refresh_token` | ✅        | Lax      | 7 hari   | JWT signed (HS256)   |

- `Secure: true` hanya di production (`NODE_ENV === 'production'`)
- Frontend **tidak bisa** membaca cookies ini dari JavaScript (HttpOnly)
- Browser mengirim cookies otomatis karena `axios` dikonfigurasi `withCredentials: true`

---

## JWT Payload

```typescript
interface JwtPayload {
  userId: number       // users.id
  email: string
  companyIds: number[] // dari tabel user_companies
  isSuperAdmin: boolean // true jika primary role === 'superadmin'
  iat: number
  exp: number
}
```

**Permissions tidak disimpan di JWT** — di-load fresh dari DB setiap request oleh `authMiddleware`.
Ini memastikan revoke permission langsung efektif tanpa perlu tunggu token expire.

---

## CSRF Protection

- CSRF token di-generate saat login menggunakan `HMAC-SHA256(random, CSRF_SECRET)`
- Format: `<random_hex>.<hmac_signature>`
- Token dikembalikan di response body → frontend simpan di memory (`setCsrfToken()`)
- Setiap mutasi (POST/PUT/PATCH/DELETE), frontend kirim di header `X-CSRF-Token`
- `authMiddleware` validasi header ini sebelum request diteruskan ke handler

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/auth`

> Semua endpoint `/auth/*` adalah **public** (tidak butuh JWT).
> Endpoint `/logout` dan `/me` tetap menggunakan `authMiddleware` secara internal (di-apply per-route di `auth.route.ts`).

---

### `POST /api/v1/auth/login`

**Request body:**
```json
{
  "email": "admin@company.com",
  "password": "password123"
}
```

| Field      | Type   | Rules              |
|------------|--------|--------------------|
| `email`    | string | valid email format |
| `password` | string | min 1 char         |

**Response 200:**
```json
{
  "message": "Login berhasil",
  "data": {
    "csrf_token": "a3f2...hex.hmac_signature",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "1",
        "name": "Wahyu Prasetyo",
        "email": "admin@company.com",
        "role": "superadmin"
      },
      "permissions": ["user.read", "user.create", "invoice.import"]
    }
  }
}
```

> **Catatan:** `token` di body adalah access JWT yang sama dengan yang ada di cookie.
> Frontend menyimpannya di `localStorage` hanya untuk `isAuthenticated` state check.
> Request ke protected API mengandalkan cookie — bukan token di localStorage.

**Side effect:** Server set 2 HttpOnly cookies (`access_token`, `refresh_token`).

**Error:**
```json
{ "error": "UNAUTHORIZED", "message": "Email atau password salah" }
```
```json
{ "error": "VALIDATION_ERROR", "message": "..." }
```

> Pesan error login dibuat **generik** untuk mencegah user enumeration (email tidak ditemukan vs password salah → respon identik).

---

### `POST /api/v1/auth/logout`

Requires: JWT cookie valid + `X-CSRF-Token` header valid.

**Response 200:**
```json
{ "message": "Logout berhasil", "data": null }
```

**Side effect:** Server hapus kedua cookies (`access_token`, `refresh_token`).

---

### `GET /api/v1/auth/me`

Requires: JWT cookie valid.

Load data user + permissions **fresh dari DB** (bukan dari JWT cache).

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "user": {
      "id": "1",
      "name": "Wahyu Prasetyo",
      "email": "admin@company.com",
      "role": "superadmin"
    },
    "permissions": ["user.read", "user.create", "invoice.import"]
  }
}
```

**Error:**
```json
{ "error": "UNAUTHORIZED", "message": "Sesi tidak valid" }
```

---

## authMiddleware

Dipasang di `router.ts` untuk semua protected routes (`/api/v1/*` selain `/api/v1/auth/*`).

```
Request masuk
  ↓
getCookie('access_token')  — jika tidak ada → 401 UNAUTHORIZED
  ↓
verifyToken(token)         — jika expired/invalid → 401 UNAUTHORIZED
  ↓
[Jika mutasi POST/PUT/PATCH/DELETE]
  validateCsrfToken(X-CSRF-Token header) — jika gagal → 403 CSRF_INVALID
  ↓
getUserPermissions(userId) — load dari DB (fresh)
  ↓
c.set('user', jwtPayload)
c.set('permissions', string[])
  ↓
next()
```

**Akses di handler:**
```typescript
const { userId, email, companyIds, isSuperAdmin } = c.var.user
const permissions = c.var.permissions  // string[]
```

---

## Error Codes

| HTTP | Code               | Kondisi                                         |
|------|--------------------|-------------------------------------------------|
| 400  | `VALIDATION_ERROR` | Body tidak valid / field tidak sesuai schema    |
| 401  | `UNAUTHORIZED`     | Tidak ada cookie / token expired / invalid      |
| 401  | `UNAUTHORIZED`     | Email atau password salah saat login            |
| 401  | `UNAUTHORIZED`     | User tidak aktif (`is_active = false`)          |
| 403  | `CSRF_INVALID`     | Header `X-CSRF-Token` tidak ada atau tidak valid|

---

## DB Queries yang Terlibat (saat login)

```sql
-- 1. Find user by email (exclude soft-deleted)
SELECT id, name, email, password, is_active
FROM users
WHERE email = $1 AND deleted_at IS NULL
LIMIT 1;

-- 2. Get company IDs
SELECT company_id FROM user_companies WHERE user_id = $1;

-- 3. Get primary role
SELECT r.name FROM user_roles ur
JOIN roles r ON ur.role_id = r.id
WHERE ur.user_id = $1 LIMIT 1;

-- 4. Get all permissions (via roles)
SELECT DISTINCT p.name FROM user_roles ur
JOIN role_permissions rp ON ur.role_id = rp.role_id
JOIN permissions p ON rp.permission_id = p.id
WHERE ur.user_id = $1;

-- 5. Update last login
UPDATE users SET last_login_at = NOW() WHERE id = $1;
```

Queries 2–4 dijalankan **paralel** (`Promise.all`) untuk efisiensi.

---

## Implementation Notes

**User enumeration prevention.**
Login mengembalikan pesan error generik "Email atau password salah" untuk kedua kasus (user tidak ditemukan & password salah). Ini mencegah attacker mendeteksi email mana yang terdaftar.

**Password comparison timing.**
`bcrypt.compare()` dari `bcryptjs` menggunakan constant-time comparison secara internal.

**Permissions dynamic (bukan dari JWT).**
Setiap request ke protected route, `authMiddleware` query permissions dari DB. Trade-off: 1 extra DB query per request vs RBAC yang langsung efektif saat permission di-revoke.

**Token di localStorage hanya untuk state management.**
`AuthProvider` menyimpan `token` di `localStorage` hanya untuk `isAuthenticated = !!token`. Request ke API tetap mengandalkan HttpOnly cookie — token di localStorage tidak pernah dikirim ke server.

---

---

## RBAC Permission Contract

Setiap domain menggunakan pola `<key>:<action>`. Kontrak ini berlaku konsisten di frontend dan backend:

| Action | Frontend | Backend |
|--------|----------|---------|
| `<key>:menu` | Muncul di sidebar (`menu.tsx` → `permissionKey`) | — (tidak dicek backend) |
| `<key>:view` | Buka halaman (`ProtectedRoute` → `permissionKey`) + tampil data | `GET /api/v1/<key>/*` |
| `<key>:input` | Tampilkan tombol tambah / form create | `POST /api/v1/<key>` |
| `<key>:update` | Tampilkan tombol edit / form update | `PUT /api/v1/<key>/:id`, `PATCH /api/v1/<key>/:id` |
| `<key>:delete` | Tampilkan tombol hapus | `DELETE /api/v1/<key>/:id` |

**Contoh:**
```
metrics:menu      → Dashboard tampil di sidebar
metrics:view      → Bisa buka /dashboard + GET /api/v1/metrics/*
companies:menu    → Companies tampil di sidebar
companies:view    → Bisa buka /companies + GET /api/v1/companies
companies:input   → Bisa tambah company/branch (POST)
companies:update  → Bisa edit company/branch (PUT/PATCH)
companies:delete  → Bisa hapus company/branch (DELETE)
```

**Parent collapsible sidebar** (`settings:menu`, `config:menu`) — jika dimatikan, seluruh grup anak ikut hilang dari sidebar.

**Sumber kebenaran:**
- Sidebar visibility → `frontend/src/config/menu.tsx` (field `permissionKey`)
- Route guard → `frontend/src/route/routeConstants.tsx` (field `permissionKey`, selalu `:view`)
- Backend guard → `requirePermission()` middleware (belum diimplementasi — lihat Pending)

---

## RBAC Permission Toggle UI

Halaman RBAC (`/rbac`) menampilkan permission per role dalam bentuk **accordion dropdown per kategori**.

**Komponen:** `frontend/src/pages/RBAC/components/SetPermissionDialog.tsx`

### Cara Kerja

Permissions di DB dikelompokkan berdasarkan field `category` (dari tabel `permissions`).
Setiap kategori tampil sebagai accordion row yang bisa dibuka untuk melihat action tersedia.

```
[ Dashboard & Metrics ]  2/2  ▼         ← kategori, badge aktif/total
  ● Menu    [toggle ON ]
  ● View    [toggle ON ]
  ○ Input   (tidak tersedia)
  ○ Update  (tidak tersedia)
  ○ Delete  (tidak tersedia)

[ Companies ]  0/5  ▼
  ○ Menu    [toggle OFF]
  ○ View    [toggle OFF]
  ○ Input   [toggle OFF]
  ○ Update  [toggle OFF]
  ○ Delete  [toggle OFF]
```

### Kolom Tetap (`ACTION_COLUMNS`)

```typescript
const ACTION_COLUMNS = [
  { key: 'menu',   label: 'Menu' },
  { key: 'view',   label: 'View' },
  { key: 'input',  label: 'Input' },
  { key: 'update', label: 'Update' },
  { key: 'delete', label: 'Delete' },
]
```

Toggle hanya muncul aktif jika permission `<category_key>:<action>` **ada di DB**. Jika tidak ada, baris ditampilkan dengan label `(tidak tersedia)` dan switch disabled.

### Syarat Permission Muncul di Toggle

Permission **harus** mengikuti format `<key>:<action>` — contoh: `companies:menu`, `users:delete`.
Permission dengan format lain (misal `companies:manage`) **tidak akan muncul** di kolom manapun.

### Mapping Category → DB

| `category` di DB | Ditampilkan sebagai grup |
|---|---|
| `Dashboard & Metrics` | Dashboard & Metrics |
| `Customers` | Customers |
| `Companies` | Companies |
| `Settings` | Settings |
| `Config` | Config |
| `Users` | Users |
| `Roles` | Roles |
| `Import` | Import |
| `Audit Log` | Audit Log |

Kategori `Settings` berisi child-level permissions (`settings-app:menu`, `settings-divisions:view`, dst.) — setiap sub-halaman settings punya entri tersendiri.

---

## Refresh Token

```
POST /api/v1/auth/refresh
  → baca cookie 'refresh_token'
  → verifyToken(refreshToken)
  → generate access_token baru (15m) + csrf_token baru
  → set cookie 'access_token' baru
  → return: { csrf_token }
```

Frontend menangani token expire secara **silent** via axios interceptor:
- Response 401 → intercept → POST /auth/refresh → retry original request
- Jika refresh gagal → `forceLogout()` → redirect ke `/login?expired=true`
- Race condition (multiple 401 serentak) → queue mutex (`isRefreshing` flag)

---

## Logout Flow (Frontend)

`useLogoutMutation` (`hooks/useAuth.ts`) hanya menghapus `localStorage` lalu langsung `window.location.href = '/login'` (hard redirect, bukan SPA navigate).

**Kenapa tidak panggil `logout()` context / `queryClient.clear()` sebelum redirect:**
`window.location.href` tidak langsung unload halaman — ada jeda singkat di mana React masih sempat re-render. `App.tsx` generate seluruh route table (termasuk `/dashboard`) dari `pageSettings` (`usePageSettings()`, `enabled: !!token`). Jika `logout()`/`queryClient.clear()` dipanggil lebih dulu, token jadi `null` dan cache `page-settings` kosong di jeda itu — route table jadi kosong, dan URL lama (mis. `/dashboard`) jatuh ke wildcard `*` → render `<NotFound />` (404) sebelum redirect ke `/login` sempat terjadi. Reload penuh sudah otomatis membuang semua state React & cache di memori, jadi kedua panggilan itu redundant sekaligus jadi penyebab bug-nya.

---

## Rate Limiting (Login)

- **Algoritma:** Sliding window in-memory (`Map<IP, timestamp[]>`)
- **Limit:** 10 percobaan / 15 menit per IP
- **Response saat limit:** `429 RATE_LIMITED` + header `Retry-After: <detik>`
- **Implementasi:** `middleware/rate-limit.ts` — replaceable dengan Redis untuk multi-instance

---

## Permissions Sync (Frontend)

Permissions di-sync dari server setiap kali halaman dimuat:

```
App mount
  → useQuery(['me']) di AppRouter (TanStack Query)
  → GET /auth/me → { user, permissions }
  → syncUser(user, permissions) → update AuthContext + localStorage
```

Ini memastikan perubahan RBAC via admin panel langsung efektif tanpa user perlu logout.

**Arsitektur:** `AuthContext` = state container murni (tidak ada API call di context).

---

## Company Scope Filter

User hanya bisa melihat data dari company yang ia miliki aksesnya, sesuai tabel `user_companies`.
`companyIds` sudah tersedia di JWT payload dan di-load saat login.

### Backend

`c.var.user.companyIds` berisi array company ID yang boleh diakses user.

```typescript
// Contoh di handler — filter data berdasarkan company scope user
const { companyIds } = c.var.user

// Jika user punya akses ke semua company (superadmin / assign ke semua) →
// companyIds berisi semua ID → query tidak dibatasi secara efektif

// Query WAJIB selalu filter company_id — tidak boleh return data lintas entitas
const data = await getCustomers({ companyIds, ...otherFilters })
```

### Frontend — Dropdown Filter Company

Dropdown filter company di tiap halaman (Customers, Products, Transactions, dll) harus:

1. **Fetch hanya company milik user** — bukan semua company di DB
2. **Jika user punya 1 company** → filter tidak perlu ditampilkan (data langsung terfilter)
3. **Jika user punya >1 company** → tampilkan dropdown dengan pilihan:
   - `All` (default) → query semua company yang dimiliki user
   - `PT MKO`, `PT KNT`, dst. → filter ke 1 company spesifik

```
user_companies.company_id = [1, 2]   → dropdown: All | PT MKO | PT KNT
user_companies.company_id = [1]      → tidak ada dropdown (data otomatis PT MKO saja)
superadmin (semua company)           → dropdown: All | PT MKO | PT KNT | PT SKI
```

### Sumber Data Dropdown

Endpoint yang akan dipakai frontend untuk populate dropdown:
```
GET /api/v1/companies?scope=mine
```
Backend membaca `companyIds` dari `c.var.user` dan hanya return company dalam list tersebut.
Frontend tidak perlu kirim `companyIds` — sudah otomatis dari session.

### Catatan Penting

- Query di backend **wajib** selalu include filter `company_id IN (companyIds)` — tidak boleh ada endpoint yang return data lintas entitas tanpa filter ini
- `companyIds` dari JWT **tidak boleh** dipercaya dari frontend — selalu ambil dari `c.var.user` di backend

---

## Yang Belum (Pending)

| Item | Keterangan |
|------|------------|
| `requirePermission` middleware | Untuk RBAC per-endpoint di backend. `c.var.permissions` sudah tersedia, tinggal guard-nya. Ikuti kontrak `<key>:view/input/update/delete` di atas. |
| Blacklist token saat logout | Saat ini logout hanya hapus cookie. Token yang sama masih valid sampai expire jika disimpan di tempat lain. |
| Button-level guard di UI | Tombol tambah/edit/hapus belum cek `input/update/delete` permission. Harus diimplementasi per halaman. |
