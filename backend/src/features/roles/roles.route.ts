import { Hono } from 'hono'
import {
  handleGetRoles, handleGetRoleById, handleGetRolePermissions,
  handleCreateRole, handleUpdateRole, handleDeleteRole,
} from './roles.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const rolesRoutes = new Hono()

// 20 mutasi per 5 menit per user — lebih ketat dari user mutation biasa (Task002 Task B):
// role adalah privilege escalation surface (role baru bisa di-assign permission apa pun).
const roleMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

rolesRoutes.get('/', requirePermission('access.role:view'), handleGetRoles)
rolesRoutes.get('/:id', requirePermission('access.role:view'), handleGetRoleById)
rolesRoutes.get('/:id/permissions', requirePermission('access.permission:view'), handleGetRolePermissions)
rolesRoutes.post('/', requirePermission('access.role:create'), roleMutationRateLimit, handleCreateRole)
rolesRoutes.patch('/:id', requirePermission('access.role:update'), roleMutationRateLimit, handleUpdateRole)
rolesRoutes.delete('/:id', requirePermission('access.role:delete'), roleMutationRateLimit, handleDeleteRole)
