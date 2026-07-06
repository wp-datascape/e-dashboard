import { Hono } from 'hono'
import {
  handleGetPermissions, handleCreatePermission,
  handleUpdatePermission, handleDeletePermission,
  handleUpdateRolePermissions,
} from './permissions.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const permissionsRoutes = new Hono()

// 20 mutasi per 5 menit per user (Task002 Task B) — sama ketat dengan role mutation,
// khususnya handleUpdateRolePermissions = titik privilege escalation paling langsung
// (assign permission apa pun ke role apa pun, termasuk superadmin).
const permissionMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

permissionsRoutes.get('/', requirePermission('access.permission:view'), handleGetPermissions)
permissionsRoutes.post('/', requirePermission('access.permission:update'), permissionMutationRateLimit, handleCreatePermission)
permissionsRoutes.put('/:id', requirePermission('access.permission:update'), permissionMutationRateLimit, handleUpdatePermission)
permissionsRoutes.delete('/:id', requirePermission('access.permission:update'), permissionMutationRateLimit, handleDeletePermission)
permissionsRoutes.put('/roles/:id/permissions', requirePermission('access.permission:update'), permissionMutationRateLimit, handleUpdateRolePermissions)
