import { Hono } from 'hono'
import {
  handleGetPermissions, handleCreatePermission,
  handleUpdatePermission, handleDeletePermission,
  handleUpdateRolePermissions,
} from './permissions.handler'

export const permissionsRoutes = new Hono()

permissionsRoutes.get('/', handleGetPermissions)
permissionsRoutes.post('/', handleCreatePermission)
permissionsRoutes.put('/:id', handleUpdatePermission)
permissionsRoutes.delete('/:id', handleDeletePermission)
permissionsRoutes.put('/roles/:id/permissions', handleUpdateRolePermissions)
