import { Hono } from 'hono'
import {
  handleListHighMargins,
  handleCreateHighMargin,
  handleUpdateHighMargin,
  handleDeactivateHighMargin,
  handleDeleteHighMargin,
} from './high-margin.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const highMarginRoutes = new Hono()

// 20 mutasi per 5 menit per user (Task002 Task B, audit 2026-07-06)
const highMarginMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

highMarginRoutes.get('/', requirePermission('settings.product:view'), handleListHighMargins)
highMarginRoutes.post('/', requirePermission('settings.product:create'), highMarginMutationRateLimit, handleCreateHighMargin)
highMarginRoutes.patch('/:id', requirePermission('settings.product:update'), highMarginMutationRateLimit, handleUpdateHighMargin)
highMarginRoutes.patch('/:id/deactivate', requirePermission('settings.product:update'), highMarginMutationRateLimit, handleDeactivateHighMargin)
highMarginRoutes.delete('/:id', requirePermission('settings.product:delete'), highMarginMutationRateLimit, handleDeleteHighMargin)
