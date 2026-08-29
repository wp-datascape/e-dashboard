import { Hono } from 'hono'
import { handleGetInvoices, handleGetInvoicesSummary, handleGetInvoiceDetail } from './transactions.handler'
import { requirePermission } from '@/middleware/permission'

export const transactionsRoutes = new Hono()

transactionsRoutes.get('/', requirePermission('transaction:view'), handleGetInvoices)
// /summary WAJIB terdaftar sebelum /:id — kalau tidak, Hono bisa mencocokkan
// "summary" sbg param :id.
transactionsRoutes.get('/summary', requirePermission('transaction:view'), handleGetInvoicesSummary)
transactionsRoutes.get('/:id', requirePermission('transaction:view'), handleGetInvoiceDetail)
