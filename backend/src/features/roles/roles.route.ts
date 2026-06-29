import { Hono } from 'hono'
import {
  handleGetRoles, handleGetRoleById, handleGetRolePermissions,
  handleCreateRole, handleUpdateRole, handleDeleteRole,
} from './roles.handler'
import { requirePermission } from '@/middleware/permission'

export const rolesRoutes = new Hono()

rolesRoutes.get('/', requirePermission('access.role:view'), handleGetRoles)
rolesRoutes.get('/:id', requirePermission('access.role:view'), handleGetRoleById)
rolesRoutes.get('/:id/permissions', requirePermission('access.permission:view'), handleGetRolePermissions)
rolesRoutes.post('/', requirePermission('access.role:create'), handleCreateRole)
rolesRoutes.patch('/:id', requirePermission('access.role:update'), handleUpdateRole)
rolesRoutes.delete('/:id', requirePermission('access.role:delete'), handleDeleteRole)
