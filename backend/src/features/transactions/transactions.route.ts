import { Hono } from 'hono'
import { handleGetInvoices, handleGetInvoicesSummary, handleExportInvoices, handleGetInvoiceDetail } from './transactions.handler'
import { requirePermission } from '@/middleware/permission'

export const transactionsRoutes = new Hono()

transactionsRoutes.get('/', requirePermission('transaction:view'), handleGetInvoices)
// /summary dan /export WAJIB terdaftar sebelum /:id — kalau tidak, Hono
// bisa mencocokkan "summary"/"export" sbg param :id.
transactionsRoutes.get('/summary', requirePermission('transaction:view'), handleGetInvoicesSummary)
// permission `transaction:export` (2026-08-30) — sudah ada di seed sejak
// lama (db/seed.ts), TIDAK PERNAH dipakai endpoint manapun sampai sekarang,
// lebih presisi dari `transaction:view` generik utk aksi export.
transactionsRoutes.get('/export', requirePermission('transaction:export'), handleExportInvoices)
transactionsRoutes.get('/:id', requirePermission('transaction:view'), handleGetInvoiceDetail)
