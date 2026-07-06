import { Hono } from 'hono'
import {
  handleGetUsers, handleGetUserById, handleCreateUser,
  handleUpdateUser, handleDeleteUser,
  handleImportUsers, handleDownloadUsersTemplate,
} from './user.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const usersRoutes = new Hono()

// 30 mutasi per 5 menit per user — batasi damage kalau 1 akun admin di-abuse/kompromis,
// tanpa mengganggu kerja normal (bulk-edit beberapa user tetap longgar). Task002 Task B.
const userMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 30, keyFn: keyByUser })

usersRoutes.get('/', requirePermission('access.user:view'), handleGetUsers)
usersRoutes.get('/template', requirePermission('access.user:create'), handleDownloadUsersTemplate)
usersRoutes.post('/import', requirePermission('access.user:create'), userMutationRateLimit, handleImportUsers)
// :id WAJIB terakhir — kalau didaftarkan sebelum /template, "template" akan
// ketangkap sebagai :id (lalu gagal di userIdParamSchema, error membingungkan)
usersRoutes.get('/:id', requirePermission('access.user:view'), handleGetUserById)
usersRoutes.post('/', requirePermission('access.user:create'), userMutationRateLimit, handleCreateUser)
usersRoutes.put('/:id', requirePermission('access.user:update'), userMutationRateLimit, handleUpdateUser)
usersRoutes.delete('/:id', requirePermission('access.user:delete'), userMutationRateLimit, handleDeleteUser)
