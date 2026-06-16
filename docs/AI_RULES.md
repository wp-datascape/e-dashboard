# AI_RULES.md — Panduan Wajib untuk AI Assistant

> Instruksi wajib untuk AI (Cursor, Copilot, Claude, dll) sebelum membantu project ini.
> **Baca file ini PERTAMA sebelum generate kode apapun.**

---

## 1. Identitas Project

| Key | Value |
|-----|-------|
| Nama | Executive Dashboard — Holding Company |
| Konteks | Dashboard statistik bisnis untuk 3 entitas perusahaan |
| Fase | MVP — import faktur penjualan Accurate Online (upload file + API Accurate), 10 metrik bisnis |
| Arsitektur | Monolith modular (Bun + Hono backend + React Vite SPA) |

---

## 2. Tech Stack yang Digunakan

| Layer | Teknologi | Catatan |
|-------|-----------|---------|
| Runtime | Bun | Bukan Node.js — gunakan Bun API |
| Backend | Hono v4+ | HTTP framework, TypeScript-first |
| ORM | Drizzle ORM | Bukan Prisma, bukan TypeORM |
| Database | PostgreSQL 15+ | |
| Frontend | React 18+ + Vite 5+ + TypeScript | SPA |
| Auth | JWT (httpOnly Cookie) + CSRF | Bukan localStorage |
| Validasi | zod | Wajib di semua DTO backend & frontend |
| Logger | winston + winston-daily-rotate-file | Bukan console.log di production |
| Upload CSV | papaparse | Parsing file CSV manual |
| Upload Excel | xlsx (SheetJS) | Parsing file .xlsx manual |
| Accurate API | axios (server-side) | Fetch faktur dari Accurate Online API |
| Charts | recharts | Bukan chart.js, bukan d3 langsung |
| UI | materialUI V6 | |

> ❌ Jangan sarankan teknologi di luar daftar ini kecuali diminta secara eksplisit.
> ❌ Jangan gunakan Prisma, TypeORM, Express, atau Next.js.

---

## 3. Konvensi Kode

### Backend (Bun + Hono)

- Gunakan **Hono** sebagai HTTP framework — jangan `Bun.serve` langsung untuk routing
- Semua query wajib via **Drizzle ORM** — raw SQL hanya jika ada alasan performa yang jelas
- Struktur wajib: `Route → Handler → Service → Repository`
- Validasi input wajib pakai **zod** di setiap handler sebelum memanggil service
- Error handling eksplisit — jangan pernah `catch (e) {}` tanpa handling
- Gunakan **TypeScript strict mode** — tidak ada `any` kecuali benar-benar tidak bisa dihindari
- Semua response API menggunakan helper `utils/response` — jangan tulis `c.json()` manual
- Semua error dikembalikan sebagai `AppError` dari `utils/error`
- Gunakan `async/await` — jangan callback style

```typescript
// ✅ Benar
const items = await db.select()
  .from(invoiceItems)
  .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
  .where(eq(invoices.companyId, companyId))

// ❌ Salah — raw SQL tanpa alasan
const items = await db.execute(sql`SELECT * FROM invoice_items WHERE company_id = ${id}`)
```

### Backend — Logger (Winston)

Gunakan wrapper dari `utils/logger` — **jangan import winston langsung di luar package logger**.

**Aturan output per level:**

| Level | Konsol | File |
|-------|--------|------|
| `info` (activity, HTTP request) | ✅ | ❌ tidak ditulis ke file |
| `warn` | ✅ | ✅ → `log/warn/YYYY-MM-DD.log` |
| `error` | ✅ | ✅ → `log/error/YYYY-MM-DD.log` |

```typescript
// Activity / HTTP request — konsol saja
logger.info('Import faktur berhasil', { companyId, source: 'file', invoiceCount: 200 })

// Warning — konsol + file log/warn/
logger.warn('Invoice duplikat dilewati', { invoiceNumber, companyId })

// Error — konsol + file log/error/
logger.error('Gagal fetch dari Accurate API', { error: err.message, companyId })
```

Folder log (masuk `.gitignore`):
```
log/
├── warn/
│   └── 2024-01-15.log
└── error/
    └── 2024-01-15.log
```

> ❌ Tidak ada `log/combined/` atau `log/activity/` — info tidak ditulis ke file.

### Backend — Audit Log (Database)

Audit log untuk **create, update, delete** disimpan ke tabel `audit_logs` di PostgreSQL — **bukan file**.

```typescript
// Dipanggil di Service layer setelah mutasi berhasil
await logAudit(ctx, {
  action: 'invoice.import',
  entity: 'import_logs',
  entityId: importLogId,
  meta: { companyId, source: 'accurate_api', invoiceCount: 185 }
})
```

**Aksi yang WAJIB di-audit:**

| action | Kapan |
|--------|-------|
| `invoice.import` | Import faktur berhasil (file atau API) |
| `user.create/update/delete` | Mutasi data user |
| `role.create/update/delete` | Mutasi role |
| `permission.assign/revoke` | Assign/cabut permission dari role |
| `user_role.assign/revoke` | Assign/cabut role dari user |
| `config.update` | Update app_configs |
| `category.update` | Update is_high_margin / is_service |

**Tidak perlu audit log:** GET request, login/logout.

### Backend — Utils (Jangan Tulis Ulang)

| Package | Fungsi |
|---------|--------|
| `utils/response` | `success(c, data)`, `error(c, appError)`, `paginated(c, data, meta)` |
| `utils/error` | `AppError`, konstanta error standar |
| `utils/jwt` | `generateToken(payload)`, `verifyToken(token)` |
| `utils/hash` | `hashPassword(plain)`, `comparePassword(plain, hashed)` |
| `utils/csrf` | `generateCsrfToken()`, `validateCsrfToken(token)` |
| `utils/audit` | `logAudit(ctx, opts)` — tulis ke tabel `audit_logs` |
| `utils/parser` | `parseCsv(buffer)`, `parseExcel(buffer)` |
| `utils/accurate` | `fetchInvoices(companyId, params)` — wrapper Accurate API |
| `utils/validator` | `validateDto(schema, data)` — wrapper zod |

### Frontend (React + Vite)

- Gunakan **functional component** dan React Hooks — tidak ada class component
- State management: `useState` / `useReducer` / Context API — tidak ada Redux atau Zustand untuk MVP
- Auth state di `AuthContext` — termasuk `permissions[]` untuk cek akses di UI
- Gunakan `PermissionGuard` (cek permission), bukan `RoleGuard` (cek role name)
- Setiap API call wajib melalui service layer di `src/api/`
- Axios instance di `src/api/axios.ts` wajib menyertakan CSRF token
- Penamaan komponen: `PascalCase` | File: `PascalCase.tsx`
- Pisahkan logic dari UI dengan custom hooks di `src/hooks/`
- Semua tipe data API wajib di `src/types/`

### Database — Drizzle ORM

- Schema tabel di `src/db/schema/`
- Nama tabel: `snake_case` plural
- Semua tabel wajib: `id` (serial), `created_at`, `updated_at`
- Soft delete: `deleted_at` — tidak boleh hard delete data faktur
- Migration: `drizzle-kit generate` → `drizzle-kit migrate`
- Urutan migrasi wajib ikuti dependency FK (lihat `DATA_MODEL.md`)

---

## 4. Struktur Data Faktur (KRITIS)

```
Invoice INV-2024-001  → tabel invoices (1 baris = 1 header)
  ├── Item: Scanner   → tabel invoice_items (baris 1)
  ├── Item: Printer   → tabel invoice_items (baris 2)
  └── Item: Ribbon    → tabel invoice_items (baris 3)
```

- **Jangan** gabungkan header dan item dalam satu tabel
- **Deduplication key**: `invoice_number + company_id` di tabel `invoices`
- Metrik berbasis kategori (Cross Selling, Avg Category, High Margin) → query dari `invoice_items`
- Metrik revenue/GP → bisa dari `invoices.total_revenue` / `invoices.total_gp`

---

## 5. Sumber Data — Accurate Online

| Cara | Endpoint |
|------|----------|
| Upload file | `POST /import/file` — CSV atau XLSX |
| API Accurate | `POST /import/accurate` — fetch server-side via `utils/accurate.ts` |

Kedua cara menghasilkan data yang masuk ke tabel `invoices` + `invoice_items` yang sama.
Credential Accurate (API key) per company disimpan di `app_configs` dengan `is_secret = true`.

---

## 6. Multi-Entitas (Holding)

> ⚠️ Prinsip utama: jangan over-engineering.

Satu database, kolom `company_id` di semua tabel data.

```typescript
// WAJIB filter company_id di setiap query
const data = await db.select()
  .from(invoiceItems)
  .innerJoin(invoices, eq(invoiceItems.invoiceId, invoices.id))
  .where(and(
    eq(invoices.companyId, companyId),
    // ... filter lain
  ))
```

`superadmin` dan `admin` bypass cek `user_companies`. Role lain dibatasi per entitas via middleware `requireCompanyAccess`.

---

## 7. RBAC — Dinamis seperti Spatie

Role dan permission **fully dynamic** — dikelola dari dashboard, tidak hardcoded.

```typescript
// ✅ PREFER ini — fleksibel, bisa diubah dari dashboard
app.get('/metrics/cross-selling', requirePermission('metrics:read'), handler)

// ⚠️ Gunakan hanya jika benar-benar tied ke role spesifik
app.post('/rbac/roles', requireRole('superadmin', 'admin'), handler)
```

- Role dengan `is_system = true`: tidak bisa dihapus, tidak bisa diubah namanya
- Permission format: `resource:action` — misal `metrics:read`, `users:manage`, `roles:manage`
- Halaman RBAC di dashboard: manage role, manage permission, assign permission ke role (matrix), assign role ke user

---

## 8. Import Data — Aturan Penting

- File: `.csv` dan `.xlsx` saja, max 10MB
- Import **idempotent**: `invoice_number + company_id` — import ulang tidak duplikasi
- Setiap import catat `import_logs` (status, row counts)
- Baris error tetap diproses: yang valid diinsert, yang error dicatat di `import_log_errors`
- Setelah import berhasil: `logAudit('invoice.import')` WAJIB dipanggil

---

## 9. Metrik — Aturan Kalkulasi

> Detail definisi → `METRICS_SPEC.md`

- Kalkulasi di **backend service layer** — tidak boleh di frontend
- Cache di tabel `metric_cache` dengan `expires_at`
- Parameter wajib: `company_id`, `period_month` (YYYY-MM), `active_window` (3/6/12)
- Jangan hardcode threshold — ambil dari `app_configs`

---

## 10. Keamanan

| Aspek | Implementasi |
|-------|--------------|
| Auth cookie | JWT `httpOnly; Secure; SameSite=Strict` |
| CSRF | Header `X-CSRF-Token`, validasi di middleware |
| CORS | Whitelist domain dari env |
| Input validasi | zod schema di semua handler |
| Password | bcryptjs cost ≥ 12 |
| Upload | Validasi MIME + ekstensi whitelist |
| Accurate API key | `app_configs` is_secret=true — tidak pernah dikembalikan ke frontend |
| Error response | Tidak expose stack trace ke client |
| Audit trail | Mutasi penting → tabel `audit_logs` |
| Company isolation | Filter `company_id` wajib di semua query |

---

## 11. Scope MVP

### Ada ✅
- Auth + RBAC dinamis (manage dari dashboard)
- Import faktur: upload file + API Accurate
- 10 metrik bisnis
- Filter: entitas, periode, window aktif (3/6/12 bulan)
- Dashboard tren bulanan per metrik
- Detail customer (cross selling, dormant)
- Audit log (DB) + logger file (warn/error)
- Konfigurasi dinamis

### Tidak Ada ❌
- Export PDF/Excel laporan
- Notifikasi realtime / email / WhatsApp
- Scheduled auto-sync Accurate (manual trigger di MVP)
- Mobile app
- Prediksi / forecasting AI
- Multi-database per entitas

---

## 12. Aturan Tambahan

- Selalu cek `CONTEXT_STATE.md` sebelum lanjut kerja
- Baca `METRICS_SPEC.md` sebelum kerjakan fitur metrik apapun
- Perubahan arsitektur → update `ARCHITECTURE.md` + ADR
- Perubahan data model → update `DATA_MODEL.md`
- Endpoint baru/berubah → update `API_SPEC.md`
- Perubahan definisi metrik → update `METRICS_SPEC.md`
- Commit: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`
