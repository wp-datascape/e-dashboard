/**
 * features/settings/item-types.route.ts
 *
 * CRUD Item Type per company (task011) — dikelola dari halaman Classification
 * Rules, permission REUSE config.classification:* (hidup di halaman yang sama,
 * bukan permission baru).
 *
 * Endpoints:
 *   GET    /settings/item-types          — List (CRUD admin, semua termasuk nonaktif)
 *   GET    /settings/item-types/values   — List aktif saja, TANPA requirePermission
 *                                           (dipakai dropdown filter lintas halaman,
 *                                           mirror pola channel-divisions /values)
 *   POST   /settings/item-types          — Create
 *   PATCH  /settings/item-types/:id      — Update (label/is_active)
 *   DELETE /settings/item-types/:id      — Delete (ditolak kalau masih dipakai)
 */
import { Hono } from 'hono'
import {
  handleListItemTypes,
  handleListItemTypeValues,
  handleCreateItemType,
  handleUpdateItemType,
  handleDeleteItemType,
} from './item-types.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const itemTypesRoutes = new Hono()

const itemTypeMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

itemTypesRoutes.get('/values', handleListItemTypeValues)
itemTypesRoutes.get('/', requirePermission('config.classification:view'), handleListItemTypes)
itemTypesRoutes.post('/', requirePermission('config.classification:create'), itemTypeMutationRateLimit, handleCreateItemType)
itemTypesRoutes.patch('/:id', requirePermission('config.classification:update'), itemTypeMutationRateLimit, handleUpdateItemType)
itemTypesRoutes.delete('/:id', requirePermission('config.classification:delete'), itemTypeMutationRateLimit, handleDeleteItemType)
