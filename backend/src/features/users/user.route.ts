import { Hono } from 'hono'
import {
  handleGetUsers, handleGetUserById, handleCreateUser,
  handleUpdateUser, handleDeleteUser,
} from './user.handler'

export const usersRoutes = new Hono()

usersRoutes.get('/', handleGetUsers)
usersRoutes.get('/:id', handleGetUserById)
usersRoutes.post('/', handleCreateUser)
usersRoutes.put('/:id', handleUpdateUser)
usersRoutes.delete('/:id', handleDeleteUser)
