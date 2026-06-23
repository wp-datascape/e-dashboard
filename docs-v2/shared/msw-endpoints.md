# MSW (Mock Service Worker) — Endpoint Mapping

> **Tujuan:** Dokumentasi semua endpoint API frontend vs handler MSW.
> MSW aktif di mode development (`VITE_ENABLE_MOCK=true`) untuk endpoint yang belum ada di backend.

---

## Status Handler per Domain

| Domain | File Handler | Status |
|--------|-------------|--------|
| Auth | `auth.handler.ts` | ✅ **Aktif** |
| Dashboard | `dashboard.handler.ts` | ✅ **Aktif** |
| Metrics | `metrics.handler.ts` | ✅ **Aktif** |
| Customers | `customers.handler.ts` | ✅ **Aktif** |
| Products | `products.handler.ts` | ✅ **Aktif** |
| Transactions | `transactions.handler.ts` | ✅ **Aktif** |
| Import | `import.handler.ts` | ✅ **Aktif** |
| RBAC | `rbac.handler.ts` | ❌ **Disabled** (bypass ke BE) |
| Users | `users.handler.ts` | ❌ **Disabled** (bypass ke BE) |
| Audit | `audit.handler.ts` | ❌ **Disabled** (bypass ke BE) |
| Page Settings | `page.handler.ts` | ❌ **Disabled** (bypass ke BE) |

---

## Endpoint dengan MSW Handler (Mocked)

### Auth (`auth.handler.ts`)
| Method | Path | Keterangan |
|--------|------|-----------|
| POST | `/auth/login` | Login user, return JWT + CSRF token |
| POST | `/auth/logout` | Logout |
| GET | `/auth/me` | Get current user profile |

### Dashboard (`dashboard.handler.ts`)
| Method | Path | Keterangan |
|--------|------|-----------|
| GET | `/dashboard` | Data utama dashboard (ringkasan KPI) |

### Metrics (`metrics.handler.ts`)
| Method | Path | Keterangan |
|--------|------|-----------|
| GET | `/metrics/cross-selling` | M1 + M1.1 + M2 — Cross selling trend, detail, heatmap |
| GET | `/metrics/customer-metrics` | M3–M7 — Customer metrics trend, detail, high margin, repeat order |
| GET | `/metrics/dormant-customer` | M8–M10 — Dormant trend, detail, reactivation |

### Products (`products.handler.ts`)
| Method | Path | Keterangan |
|--------|------|-----------|
| GET | `/metrics/category-performance` | 3.1 — Performa kategori (paginated, sortable) |
| GET | `/metrics/high-margin-penetration/detail` | 3.2 — Detail penetrasi high margin per kategori |
| GET | `/metrics/high-margin-penetration/customers` | 3.2 — Upsell targets per customer |
| GET | `/metrics/avg-category` | 3.3 — Rata-rata kategori per customer (trend) |

### Customers (`customers.handler.ts`)
| Method | Path | Keterangan |
|--------|------|-----------|
| GET | `/customers/360` | Data customer 360° (paginated, filterable) |
| GET | `/customers/:id/360` | Detail 360° satu customer |

### Transactions (`transactions.handler.ts`)
| Method | Path | Keterangan |
|--------|------|-----------|
| GET | `/transactions` | Data transaksi/faktur (paginated) |
| GET | `/transactions/:id` | Detail satu transaksi |

### Import (`import.handler.ts`)
| Method | Path | Keterangan |
|--------|------|-----------|
| POST | `/import/upload` | Upload file CSV/Excel faktur |
| GET | `/import/logs` | Riwayat import |
| GET | `/import/logs/:id/errors` | Error detail suatu import |

---

## Endpoint Tanpa MSW Handler (Bypass ke Backend)

Endpoint berikut **tidak punya handler MSW aktif** — request akan bypass ke `http://localhost:3000/api/v1/...` (backend real):

### Companies
| Method | Path | Ada di MSW? |
|--------|------|------------|
| GET | `/companies` | ❌ Tidak |
| GET | `/companies/:id` | ❌ Tidak |
| POST | `/companies` | ❌ Tidak |
| PATCH | `/companies/:id` | ❌ Tidak |
| DELETE | `/companies/:id` | ❌ Tidak |

### Roles
| Method | Path | Ada di MSW? |
|--------|------|------------|
| GET | `/roles` | ❌ Tidak |
| GET | `/roles/:id` | ❌ Tidak |
| POST | `/roles` | ❌ Tidak |
| PATCH | `/roles/:id` | ❌ Tidak |
| DELETE | `/roles/:id` | ❌ Tidak |

### Permissions
| Method | Path | Ada di MSW? |
|--------|------|------------|
| GET | `/permissions` | ❌ Tidak |
| POST | `/roles/:roleId/permissions` | ❌ Tidak |

### Users
| Method | Path | Ada di MSW? |
|--------|------|------------|
| GET | `/users` | ❌ Tidak |
| GET | `/users/:id` | ❌ Tidak |
| POST | `/users` | ❌ Tidak |
| PATCH | `/users/:id` | ❌ Tidak |
| DELETE | `/users/:id` | ❌ Tidak |

### Audit Log
| Method | Path | Ada di MSW? |
|--------|------|------------|
| GET | `/audit-logs` | ❌ Tidak |

### Page Settings
| Method | Path | Ada di MSW? |
|--------|------|------------|
| GET | `/page-settings` | ❌ Tidak |
| PUT | `/page-settings/:pageKey` | ❌ Tidak |

### Config
| Method | Path | Ada di MSW? |
|--------|------|------------|
| GET | `/config/business` | ❌ Tidak |
| PUT | `/config/business` | ❌ Tidak |

---

## Catatan Penting

1. **MSW hanya mencegat request yang handler-nya aktif** di `frontend/src/mocks/handlers.ts`
2. **Semua request tanpa handler akan bypass** (`onUnhandledRequest: 'bypass'`) ke backend real
3. **Service worker perlu di-reload** jika pertama kali MSW aktif — refresh browser atau restart dev server
4. **Endpoint yang handler-nya di-comment** (RBAC, Users, Audit, Page) sengaja bypass karena backend-nya sudah siap