import { Hono } from 'hono'
import {
  handleListHighMargins,
  handleCreateHighMargin,
  handleUpdateHighMargin,
  handleDeactivateHighMargin,
  handleDeleteHighMargin,
} from './high-margin.handler'
import { requirePermission } from '@/middleware/permission'

export const highMarginRoutes = new Hono()

highMarginRoutes.get('/', requirePermission('settings.product:view'), handleListHighMargins)
highMarginRoutes.post('/', requirePermission('settings.product:create'), handleCreateHighMargin)
highMarginRoutes.patch('/:id', requirePermission('settings.product:update'), handleUpdateHighMargin)
highMarginRoutes.patch('/:id/deactivate', requirePermission('settings.product:update'), handleDeactivateHighMargin)
highMarginRoutes.delete('/:id', requirePermission('settings.product:delete'), handleDeleteHighMargin)
