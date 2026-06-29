import { Hono } from 'hono'
import {
  handleGetPermissions, handleCreatePermission,
  handleUpdatePermission, handleDeletePermission,
  handleUpdateRolePermissions,
} from './permissions.handler'
import { requirePermission } from '@/middleware/permission'

export const permissionsRoutes = new Hono()

permissionsRoutes.get('/', requirePermission('access.permission:view'), handleGetPermissions)
permissionsRoutes.post('/', requirePermission('access.permission:update'), handleCreatePermission)
permissionsRoutes.put('/:id', requirePermission('access.permission:update'), handleUpdatePermission)
permissionsRoutes.delete('/:id', requirePermission('access.permission:update'), handleDeletePermission)
permissionsRoutes.put('/roles/:id/permissions', requirePermission('access.permission:update'), handleUpdateRolePermissions)
