import { Hono } from 'hono'
import {
  handleListDivisions,
  handleGetDivisionById,
  handleCreateDivision,
  handleUpdateDivision,
  handleDeleteDivision,
} from './divisions.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const divisionsRoutes = new Hono()

// 20 mutasi per 5 menit per user (mirror channel-divisions) — divisions adalah
// katalog master yang dipakai validasi channel_divisions + scope RBAC
// (user_divisions), lihat docs-v2/task/task004.md.
const divisionMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

divisionsRoutes.get('/', requirePermission('settings.division:view'), handleListDivisions)
divisionsRoutes.get('/:id', requirePermission('settings.division:view'), handleGetDivisionById)
divisionsRoutes.post('/', requirePermission('settings.division:create'), divisionMutationRateLimit, handleCreateDivision)
divisionsRoutes.patch('/:id', requirePermission('settings.division:update'), divisionMutationRateLimit, handleUpdateDivision)
divisionsRoutes.delete('/:id', requirePermission('settings.division:delete'), divisionMutationRateLimit, handleDeleteDivision)
