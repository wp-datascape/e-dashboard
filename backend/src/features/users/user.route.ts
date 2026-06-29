import { Hono } from 'hono'
import {
  handleGetUsers, handleGetUserById, handleCreateUser,
  handleUpdateUser, handleDeleteUser,
} from './user.handler'
import { requirePermission } from '@/middleware/permission'

export const usersRoutes = new Hono()

usersRoutes.get('/', requirePermission('access.user:view'), handleGetUsers)
usersRoutes.get('/:id', requirePermission('access.user:view'), handleGetUserById)
usersRoutes.post('/', requirePermission('access.user:create'), handleCreateUser)
usersRoutes.put('/:id', requirePermission('access.user:update'), handleUpdateUser)
usersRoutes.delete('/:id', requirePermission('access.user:delete'), handleDeleteUser)
