import { Hono } from 'hono'
import { handleGetCustomers, handleExportCustomers, handleGetCustomerDetail } from './customers.handler'
import { requirePermission } from '@/middleware/permission'

export const customersRoutes = new Hono()

customersRoutes.get('/', requirePermission('customer:view'), handleGetCustomers)
// Export Excel (2026-08-31) — permission baru 'customer:export' (belum ada
// sebelumnya, lihat db/seed.ts).
customersRoutes.get('/export', requirePermission('customer:export'), handleExportCustomers)
customersRoutes.get('/:id', requirePermission('customer:view'), handleGetCustomerDetail)