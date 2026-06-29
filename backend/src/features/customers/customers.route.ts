import { Hono } from 'hono'
import { handleGetCustomers, handleGetCustomerDetail } from './customers.handler'
import { requirePermission } from '@/middleware/permission'

export const customersRoutes = new Hono()

customersRoutes.get('/', requirePermission('customer:view'), handleGetCustomers)
customersRoutes.get('/:id', requirePermission('customer:view'), handleGetCustomerDetail)
