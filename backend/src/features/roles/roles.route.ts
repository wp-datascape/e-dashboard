import { Hono } from 'hono'
import {
  handleGetRoles, handleGetRoleById, handleGetRolePermissions,
  handleCreateRole, handleUpdateRole, handleDeleteRole,
} from './roles.handler'

export const rolesRoutes = new Hono()

rolesRoutes.get('/', handleGetRoles)
rolesRoutes.get('/:id', handleGetRoleById)
rolesRoutes.get('/:id/permissions', handleGetRolePermissions)
rolesRoutes.post('/', handleCreateRole)
rolesRoutes.patch('/:id', handleUpdateRole)
rolesRoutes.delete('/:id', handleDeleteRole)
