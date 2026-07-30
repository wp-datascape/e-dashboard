import { Hono } from 'hono'
import {
  handleListParetoCustomers,
  handleCreateParetoCustomer,
  handleUpdateParetoCustomer,
  handleDeactivateParetoCustomer,
  handleDeleteParetoCustomer,
  handleListParetoCustomerOptions,
} from './pareto-customers.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const paretoCustomersRoutes = new Hono()

// 20 mutasi per 5 menit per user, mirror pola high-margin/divisions
const paretoCustomerMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

paretoCustomersRoutes.get('/customer-options', requirePermission('settings.pareto:view'), handleListParetoCustomerOptions)
paretoCustomersRoutes.get('/', requirePermission('settings.pareto:view'), handleListParetoCustomers)
paretoCustomersRoutes.post('/', requirePermission('settings.pareto:create'), paretoCustomerMutationRateLimit, handleCreateParetoCustomer)
paretoCustomersRoutes.patch('/:id', requirePermission('settings.pareto:update'), paretoCustomerMutationRateLimit, handleUpdateParetoCustomer)
paretoCustomersRoutes.patch('/:id/deactivate', requirePermission('settings.pareto:update'), paretoCustomerMutationRateLimit, handleDeactivateParetoCustomer)
paretoCustomersRoutes.delete('/:id', requirePermission('settings.pareto:delete'), paretoCustomerMutationRateLimit, handleDeleteParetoCustomer)
