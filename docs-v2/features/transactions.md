# Feature: Transactions

> Status: ✅ Complete — GET list + GET detail, real DB (sebelumnya MSW mock)
> Last updated: 2026-07-02
> Baca juga: `transaction-workbench/overview.md`, `transaction-workbench/api.md`, `features/customers.md`, `features/high-margin-products.md`

---

## Overview

Transactions feature menampilkan ledger invoice — satu baris per invoice (bukan agregat per customer seperti Customers feature). Read-only: tidak ada create/update/delete dari UI, data invoice masuk lewat fitur Import.

Menu sidebar & permission key bernama **Transaction** (sebelumnya **Order**, di-rename 2026-07-02 karena halaman ini hanya menampilkan data invoice, bukan melakukan proses order). Resource REST tetap `/invoices` — nama fitur "transactions" adalah penamaan kode internal saja.

---

## Rename: Order → Transaction (2026-07-02)

Permission key lama `order:menu` / `order:view` / `order:export` (kategori "Order") diganti `transaction:menu` / `transaction:view` / `transaction:export` (kategori "Transaction").

- `order:*` dipindah ke `OLD_PERMISSION_NAMES` di `backend/src/db/seed.ts` — otomatis dihapus dari DB saat `bun run src/db/seed.ts` dijalankan
- Permission baru otomatis di-assign ke role `superadmin` (perilaku default `seedRolePermissions()`)
- Aman untuk migrasi: hanya `superadmin` yang punya `order:*` di database sebelum rename, role lain (`admin`, `user`) belum pernah diberi akses — tidak ada role yang kehilangan akses
- Frontend: `config/menu.tsx` (`labelKey: 'nav.transactionLedger'`), `route/routeConstants.tsx` (`permissionKey: 'transaction:view'`), i18n `en.json`/`id.json` (`"Orders"/"Pesanan"` → `"Transactions"/"Transaksi"`)

**Penting untuk environment lain (staging/production):** jalankan `bun run src/db/seed.ts` setelah deploy agar permission baru ter-seed dan permission lama terhapus.

---

## File Structure

```
backend/src/features/transactions/
├── transactions.schema.ts      — Zod DTO (invoicesQuerySchema, invoiceIdParamSchema)
├── transactions.repository.ts  — findInvoices() + findInvoiceDetail() dengan Drizzle
├── transactions.service.ts     — try/catch → AppError
├── transactions.handler.ts     — handleGetInvoices + handleGetInvoiceDetail
└── transactions.route.ts       — GET / + GET /:id, permission transaction:view

frontend/src/
├── api/transactions.api.ts             — getInvoices(), getInvoiceDetail()
├── hooks/useTransactions.ts            — useInvoices(), useInvoiceDetail()
├── types/transactions.ts               — InvoiceRow, InvoiceParams, InvoiceDetail, InvoiceItem
├── pages/Transactions/index.tsx        — DataGrid server-side pagination/sort + filter
├── pages/Transactions/components/
│   ├── BuChip.tsx                      — chip warna per division
│   └── InvoiceDetailDrawer.tsx         — drawer detail + line items + badge High Margin
└── mocks/handlers/transactions.handler.ts — DISABLED, tidak lagi di-spread ke handlers.ts
```

**Tabel DB yang dipakai:**
- `invoices` — header invoice (soft delete via `deleted_at`)
- `invoice_items` — line items per invoice
- `customers` — nama/kode customer, filter `is_placeholder = false`
- `companies` — nama perusahaan
- `channel_divisions` — lookup division dari `invoices.channel_name` (sama pola dengan Customers)
- `import_logs` — sumber import (`source`: `file` | `accurate_api`) via `invoices.import_log_id`
- `products`, `product_categories` — nama produk & kategori per line item
- `high_margin_products` — flag `is_high_margin` per line item (time-based, lihat `features/high-margin-products.md`)

---

## API Endpoints

Base URL: `http://localhost:3000/api/v1/invoices`

Permission: `transaction:view` (semua endpoint)

---

### `GET /api/v1/invoices`

List invoice dengan filter, sort, dan paginasi.

**Query params:**
| Param | Tipe | Default | Keterangan |
|-------|------|---------|------------|
| `company_id` | integer \| `"all"` | `"all"` | Company scope via `resolveCompanyScope()` |
| `business_unit` | division value | — | Filter via `channel_divisions.division` (bukan kolom mentah `invoices.business_unit`) |
| `customer_search` | string | — | Cari nama ATAU kode customer (`ILIKE`) |
| `date_from` | `YYYY-MM-DD` | — | Awal range `invoice_date` |
| `date_to` | `YYYY-MM-DD` | — | Akhir range `invoice_date` |
| `sort_by` | `"invoice_date"` \| `"total_revenue"` \| `"total_gp"` | `"invoice_date"` | Kolom sort |
| `sort_dir` | `"asc"` \| `"desc"` | `"desc"` | Arah sort |
| `page` | integer | 1 | Halaman |
| `per_page` | integer (1–200) | 50 | Jumlah per halaman |

Nilai valid `business_unit`: `distribution` \| `project` \| `e_commerce` \| `intercompany` \| `freelancer` \| `support`

**Response 200:**
```json
{
  "message": "Success",
  "data": [
    {
      "id": 6408,
      "invoice_number": "SI.2026.06.25.004",
      "invoice_date": "2026-06-25",
      "customer": {
        "id": 271,
        "code": "",
        "name": "MEGATRONIX MITRANIAGA, PT",
        "business_unit": "distribution"
      },
      "company": { "id": 1, "name": "PT Mesin Kasir Online" },
      "total_revenue": 1486488,
      "total_gp": 134892.15,
      "gp_margin_percent": 9.1,
      "category_count": 1,
      "import_source": "file"
    }
  ],
  "meta": { "page": 1, "per_page": 50, "total": 6408, "total_pages": 129 }
}
```

---

### `GET /api/v1/invoices/:id`

Detail satu invoice — header + line items.

**Response 200:**
```json
{
  "message": "Success",
  "data": {
    "id": 4418,
    "invoice_number": "SI.2026.01.05.xxx",
    "invoice_date": "2026-01-05",
    "customer": { "id": 5, "code": "CUST-005", "name": "PT ABC Sejahtera" },
    "company": { "id": 1, "name": "PT Mesin Kasir Online" },
    "total_revenue": 7432430,
    "total_gp": 1409158.75,
    "items": [
      {
        "id": 7149,
        "product_name": "KASSEN DT 640 BK",
        "category": { "id": 2, "name": "BARCODE PRINTER DIRECT THERMAL KASSEN", "is_high_margin": true },
        "revenue": 7432430,
        "gross_profit": 1409158.75
      }
    ]
  }
}
```

**Error:**
```json
{ "error": "NOT_FOUND", "message": "Invoice dengan id 99999 tidak ditemukan" }
```

---

## Implementation Notes

### Kenapa Drizzle query builder, bukan raw SQL CTE

Berbeda dari metrics repository (yang pakai raw SQL karena banyak window function/CTE), fitur ini memakai Drizzle query builder seperti `customers.repository.ts` — cukup JOIN + GROUP BY sederhana tanpa rolling window, jadi query builder lebih ringkas dan type-safe.

### `total_revenue` / `total_gp` sudah denormalisasi

Diambil langsung dari kolom `invoices.total_revenue` / `invoices.total_gp` — **tidak** perlu `SUM()` dari `invoice_items`, karena kolom ini sudah diisi saat import. `gp_margin_percent` tetap dihitung on-the-fly (`total_gp / total_revenue * 100`) karena bukan kolom fisik.

### `category_count` butuh JOIN + GROUP BY

`COUNT(DISTINCT invoice_items.product_category_id)` per invoice — LEFT JOIN `invoice_items` ke query utama, group by `invoices.id` (functional dependency Postgres mengizinkan select kolom lain dari tabel yang sama tanpa masuk `GROUP BY` selama primary key-nya ada di klausa `GROUP BY`, pola sama dengan `customers.repository.ts`).

### `is_high_margin` per line item — EXISTS subquery time-based

```sql
EXISTS (
  SELECT 1 FROM high_margin_products hmp
  WHERE hmp.company_id = <invoice.company_id>
    AND hmp.effective_from <= <invoice.invoice_date>
    AND (hmp.effective_until IS NULL OR hmp.effective_until >= <invoice.invoice_date>)
    AND (hmp.product_id = ii.product_id OR hmp.product_category_id = ii.product_category_id)
)
```

Match berdasarkan `product_id` ATAU `product_category_id` (`high_margin_products` bisa menyasar salah satu), window aktif relatif ke **tanggal invoice**, bukan tanggal hari ini — invoice lama tetap menampilkan status HM yang berlaku saat itu, bukan status HM saat ini.

### Detail endpoint scoped ke company user

`handleGetInvoiceDetail` memanggil `resolveCompanyScope(c, 'all')` (bukan langsung fetch by id tanpa scope check) untuk mencegah IDOR — user non-superadmin tidak bisa lihat invoice company lain lewat tebak ID, walau frontend tidak mengirim `company_id` di request detail.

### Division filter — pola sama dengan Customers

`business_unit` di response & filter SELALU dari `channel_divisions.division` (join by `invoices.channel_name`), bukan kolom mentah `invoices.business_unit` atau `customers.business_unit` (format berbeda: `B2B_DC` dst). Lihat `features/customers.md` bagian "Channel Division Concept".

---

## Error Codes

| HTTP | Code | Kondisi |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Query/param tidak valid |
| 403 | `FORBIDDEN` | Company scope ditolak (bukan superadmin, akses company lain) |
| 404 | `NOT_FOUND` | Invoice ID tidak ada / bukan milik company user |
| 500 | `INTERNAL_ERROR` | Server/DB error |

---

## MSW Mock Status

`transactionsHandlers` — **DISABLED**. Import dikomentari di `frontend/src/mocks/handlers.ts`, tidak lagi di-spread ke `handlers`.

---

## References

- **Backend**: `backend/src/features/transactions/`
- **Router mount**: `backend/src/router.ts` — `protectedApi.route('/invoices', transactionsRoutes)`
- **DB Schema**: `backend/src/db/schema/schema-transaction.ts` (tables `invoices`, `invoice_items`, `import_logs`), `schema-product.ts` (table `high_margin_products`)
- **Permission seed**: `backend/src/db/seed.ts` (`transaction:menu/view/export`, kategori "Transaction")
- **Frontend Types**: `frontend/src/types/transactions.ts`
- **Frontend Page**: `frontend/src/pages/Transactions/`
- **Frontend Hooks**: `frontend/src/hooks/useTransactions.ts`
- **Planning doc**: `transaction-workbench/overview.md`, `transaction-workbench/api.md` (4.1 Order Ledger — nama planning doc belum di-rename, konten tetap relevan)

---

**Last Updated**: 2026-07-02
**Status**: ✅ Production Ready
