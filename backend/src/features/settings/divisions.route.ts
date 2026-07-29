/**
 * features/settings/divisions.route.ts
 *
 * CRUD Division per company (task012 v2, FK-based) — dikelola dari halaman
 * Settings/Divisions (sub-widget, halaman yang sama dengan Channel Division
 * mapping), permission BARU settings.division:* (BUKAN reuse
 * settings.channel.division:*) karena division menyentuh RBAC/scope akses user
 * lain — lihat docs-v2/task/task012.md §2g.
 *
 * Endpoints:
 *   GET    /settings/divisions          — List (CRUD admin, semua termasuk nonaktif)
 *   GET    /settings/divisions/values   — List aktif saja, TANPA requirePermission
 *                                          (dipakai dropdown filter lintas halaman +
 *                                          AssignmentTreePicker)
 *   POST   /settings/divisions          — Create
 *   PATCH  /settings/divisions/:id      — Update (label/dormant_category/is_active)
 *   DELETE /settings/divisions/:id      — Delete (ditolak kalau protected atau masih dipakai)
 */
import { Hono } from 'hono'
import {
  handleListDivisions,
  handleListDivisionValues,
  handleCreateDivision,
  handleUpdateDivision,
  handleDeleteDivision,
} from './divisions.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const divisionsRoutes = new Hono()

const divisionMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

divisionsRoutes.get('/values', handleListDivisionValues)
divisionsRoutes.get('/', requirePermission('settings.division:view'), handleListDivisions)
divisionsRoutes.post('/', requirePermission('settings.division:create'), divisionMutationRateLimit, handleCreateDivision)
divisionsRoutes.patch('/:id', requirePermission('settings.division:update'), divisionMutationRateLimit, handleUpdateDivision)
divisionsRoutes.delete('/:id', requirePermission('settings.division:delete'), divisionMutationRateLimit, handleDeleteDivision)
