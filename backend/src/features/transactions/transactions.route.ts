import { Hono } from 'hono'
import { handleGetInvoices, handleGetInvoiceDetail } from './transactions.handler'
import { requirePermission } from '@/middleware/permission'

export const transactionsRoutes = new Hono()

transactionsRoutes.get('/', requirePermission('transaction:view'), handleGetInvoices)
transactionsRoutes.get('/:id', requirePermission('transaction:view'), handleGetInvoiceDetail)
