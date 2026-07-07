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

// BUG FIX (2026-07-06, ditemukan saat audit permission Task002 Task B): create/delete
// sebelumnya SALAH pakai 'access.permission:update' - permission granular
// 'access.permission:create'/'access.permission:delete' sudah ada di DB (seed.ts) tapi
// tidak pernah dipakai di mana pun. Kalau ada role custom yang di-assign HANYA
// 'access.permission:create' (tanpa :update), harusnya tetap bisa create - sebelum fix
// ini, tidak bisa (kode cuma cek :update). Saat ini TIDAK ada dampak ke role manapun
// (admin/superadmin) karena role non-superadmin belum ada yang di-assign permission ini
// sama sekali - fix ini soal benar/salah desain, bukan insiden akses nyata.
permissionsRoutes.get('/', requirePermission('access.permission:view'), handleGetPermissions)
permissionsRoutes.post('/', requirePermission('access.permission:create'), permissionMutationRateLimit, handleCreatePermission)
permissionsRoutes.put('/:id', requirePermission('access.permission:update'), permissionMutationRateLimit, handleUpdatePermission)
permissionsRoutes.delete('/:id', requirePermission('access.permission:delete'), permissionMutationRateLimit, handleDeletePermission)
permissionsRoutes.put('/roles/:id/permissions', requirePermission('access.permission:update'), permissionMutationRateLimit, handleUpdateRolePermissions)
