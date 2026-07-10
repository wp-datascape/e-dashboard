import { Hono } from 'hono'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'
import {
  handleListDivisions,
  handleGetDivisionById,
  handleCreateDivision,
  handleUpdateDivision,
  handleDeleteDivision,
} from './branch-divisions.handler'
import { requirePermission } from '@/middleware/permission'

export const divisionsRoutes = new Hono()

const divisionMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

divisionsRoutes.get('/', requirePermission('settings.division:view'), handleListDivisions)
divisionsRoutes.get('/:id', requirePermission('settings.division:view'), handleGetDivisionById)
divisionsRoutes.post('/', requirePermission('settings.division:create'), divisionMutationRateLimit, handleCreateDivision)
divisionsRoutes.patch('/:id', requirePermission('settings.division:update'), divisionMutationRateLimit, handleUpdateDivision)
divisionsRoutes.delete('/:id', requirePermission('settings.division:delete'), divisionMutationRateLimit, handleDeleteDivision)