# CLAUDE.md — Entry Point AI Agent

## Project Snapshot
Name     : Executive Dashboard — Holding Company

Purpose  : Business stats dashboard for 3-entity holding company

Backend  : Bun + Hono v4 + Drizzle ORM → PostgreSQL 15

Frontend : React 19 + Vite 8 + TypeScript 6 + MUI v9 (SPA)

Auth     : JWT httpOnly Cookie + CSRF (dev: localStorage + MSW)

Status   : Frontend ~99% | Backend ~98% | live di production (Railway backend + Vercel frontend, lihat `shared/deployment.md`)

## Read Order
1. `CRITICAL_RULES.md` — hard constraints, tech stack, conventions
2. `CURRENT_STATE.md` — what's done, what's next, blockers
3. Module docs based on task:

| Working on...         | Read                                    |
|-----------------------|-----------------------------------------|
| Any feature           | `shared/architecture.md`               |
| Backend code          | `shared/backend.md` ⚠️ REQUIRED        |
| DB schema / migration | `shared/data-model.md`                 |
| API endpoint          | `shared/api-conventions.md`            |
| UI component          | `shared/ui-patterns.md`                |
| Metrics (M1–M10)      | `executive-dashboard/metrics.md` ⚠️ REQUIRED |
| Dashboard page        | `executive-dashboard/overview.md`      |
| Customer Workbench    | `customer-workbench/overview.md`       |
| Product Workbench     | `product-workbench/overview.md`        |
| Transaction Workbench | `transaction-workbench/overview.md`    |
| Admin pages           | `admin/overview.md`                    |
| Dashboard feature (backend `/dashboard`) | `features/dashboard.md`  |
| Companies feature          | `features/companies.md`                |
| Customers feature          | `features/customers.md`                |
| Roles feature              | `features/roles.md`                    |
| Permissions feature        | `features/permissions.md`              |
| Users feature              | `features/users.md`                    |
| Page Settings feature      | `features/page-settings.md`            |
| Products feature           | `features/products.md`                 |
| Import (file upload)       | `features/import.md`                   |
| Classification Rules       | `features/classification.md`           |
| Channel Divisions          | `features/channel-divisions.md`        |
| High Margin Products       | `features/high-margin-products.md`     |
| Metrics / KPI (M1–M10), Product Trend | `features/metrics.md`       |
| Transactions (Order Ledger) | `features/transactions.md`             |
| Formula detail M3–M5      | `shared/metrics_docs.md`               |
| Audit Log                  | `features/audit.md`                    |
| Activity Log                | `features/activity-log.md`             |
| Login Log                   | `features/login-log.md`                |
| Accurate Integration       | `features/accurate.md`                 |
| Deployment (Render/Vercel) | `shared/deployment.md`                 |
| CI/CD (GitHub Actions, dependency audit) | `shared/ci-cd.md`         |

## Core Business Flow
Admin imports invoices (CSV/Excel upload OR Accurate API fetch)

→ Parse + validate + deduplicate (invoice_number + company_id)

→ Store → invoices (header) + invoice_items (N rows per invoice)

→ Upsert master: customers, product_categories

→ Compute 10 metrics on-demand + cache (metric_cache table)

→ Executives/Managers view dashboard (filter: entity, period, active_window)

## Menu Architecture (Finalized 2026-06-17)
Group 1: Executive Dashboard  ← Makro / Primary (10 KPIs)

Group 2: Customer Workbench   ← Mikro: Who buys?

Group 3: Product Workbench    ← Mikro: What sells?

Group 4: Transaction Workbench← Mikro: When/how?

Group 5: Admin                ← System operations

## Key Constraints (details in CRITICAL_RULES.md)
- Stack is LOCKED — no Prisma, Express, Tailwind, Redux, shadcn
- All metrics calculated backend-only, cached in `metric_cache`
- Every query MUST filter `company_id`
- CSRF token required on all mutations
- No hard-delete on invoice data (soft delete only)

## Writing Style — Konten & Copy (STRICT)

Berlaku untuk semua teks yang dibaca pengguna: halaman Help, What's New/Guide, tooltip, label UI, pesan error/toast, dokumentasi user-facing (docs-v2/task/*), dan draft PR/commit message. Aplikasi ini bilingual (i18n id+en) — aturan di bawah berlaku di KEDUA bahasa, bukan cuma Indonesia.

### Gaya bahasa

- Bahasa langsung, jelas, dan praktis, bukan formal berlebihan atau "sophisticated" tanpa perlu.
- Kalimat pendek, langsung ke insight utama, bukan berputar-putar dulu sebelum sampai ke poin.
- Hindari pembukaan kalimat yang repetitif antar item sejenis (list/kartu tidak boleh semua mulai dengan kata yang sama).
- Jangan over-explain instruksi sederhana yang sudah jelas dari konteks/UI.
- Jangan tambahkan pembuka atau penutup generik ("Secara keseluruhan...", "Sebagai kesimpulan...") kecuali benar-benar menambah informasi.
- Fokus langsung ke apa yang perlu diketahui/dilakukan pengguna.
- Istilah dipakai konsisten di seluruh dokumen, samakan dengan label yang benar-benar tampil di UI aplikasi (nama menu, nama tombol, nama field), bukan istilah teknis internal (query/populasi/nama variabel).
- Struktur paragraf sederhana: satu gagasan per paragraf, tidak menumpuk banyak klausa dengan tanda baca berat.
- Bahasa Indonesia natural, bukan gaya terjemahan kaku dari Inggris.

### Frasa ciri khas AI (DILARANG)

Bahasa Indonesia: "Secara keseluruhan...", "Penting untuk dicatat bahwa...", "Perlu diketahui bahwa...", "Dapat disimpulkan bahwa...", "Sebagai kesimpulan...", "Di era digital saat ini...", "Dalam lanskap digital saat ini...", "Mari kita telusuri/selami...", "Dengan mengikuti langkah-langkah ini...", "Dengan fitur ini, Anda dapat...", "Secara mulus...", "Tanpa hambatan..."

English: "It is important to note that…", "In today's digital landscape…", "Whether you are…", "This comprehensive guide…", "Let's dive into…", "By following these steps…", "With this feature, you can…", "In conclusion…", "Overall…", "Seamlessly…", "Effortlessly…"

Juga dilarang: klaim berlebihan, bahasa promosi/marketing, dan kalimat retoris yang tidak perlu ("Bayangkan jika...", "Pernahkah Anda...").

### Tanda baca

- **DILARANG** memakai em dash (`—`) sama sekali, di teks JSON i18n, konten Markdown, maupun komentar kode. Ganti dengan titik dua, koma, tanda kurung, atau pecah jadi kalimat baru.
- Hindari en dash (`–`) kecuali untuk rentang angka (mis. "10–20").

### Formatting Markdown (konten Help/Guide)

Pakai Markdown hanya kalau benar-benar menambah keterbacaan, jangan berlebihan pakai bold/heading/bullet:
- `#`/`##`/`###` untuk heading.
- **Bold** untuk istilah penting, label UI, nama tombol/menu.
- Bullet list untuk beberapa item sejenis yang tidak berurutan.
- Numbered list untuk langkah-langkah berurutan.
- Blockquote hanya untuk catatan/peringatan.
- Code formatting hanya untuk kode, command, atau nilai teknis asli (nama field, endpoint), bukan untuk penekanan biasa.

### Cek akhir sebelum konten dianggap selesai

1. Tidak ada em dash sama sekali.
2. Tidak ada frasa ciri khas AI (daftar di atas, kedua bahasa).
3. Tidak ada pembuka/penutup generik yang tidak perlu.
4. Kalimat terasa natural dan praktis, bukan terjemahan kaku.
5. Ringkas, tidak ada bagian yang mengulang informasi yang sama.
6. Formatting Markdown konsisten dan tidak berlebihan.
7. Istilah konsisten dengan label yang benar-benar tampil di UI.

## Backend Layer Responsibilities (MANDATORY)

```
Repository  → raw DB query only, may throw PostgresError
     ↓
Service     → business logic + catch raw errors → translate to AppError
               isNotFoundError(err)  → AppError(NOT_FOUND, ..., 404)
               isDuplicateError(err) → AppError(DUPLICATE_ENTRY, ..., 409)
               err instanceof AppError → re-throw
               else → AppError(INTERNAL_ERROR, ..., 500)
     ↓
Handler     → validate input → call service → return response
               NO try-catch, NO AppError, NO error logic in handler
     ↓
Global Error Handler → catches AppError → sends HTTP response
```

**Handler must be thin:**
```ts
export async function handleGetX(c: Context) {
  const query = validateQuery(c, schema)   // validate only
  const result = await serviceFn(query)    // delegate to service
  return paginated(c, result.data, {...})  // return response
}
```

Every feature MUST have all 4 layers: Route → Handler → Service → Repository
