import { Hono } from 'hono'
import { requirePermission } from '@/middleware/permission'
import { handleGetActivityLogs, handleGetActivityLogById, handleCreatePageView } from './activity-log.handler'

export const activityLogRoutes = new Hono()

// Self-report navigasi user sendiri — tidak butuh permission khusus, cukup
// authMiddleware global (sudah dihandle di router.ts).
activityLogRoutes.post('/page-view', handleCreatePageView)

activityLogRoutes.get('/', requirePermission('activity.log:view'), handleGetActivityLogs)
activityLogRoutes.get('/:id', requirePermission('activity.log:view'), handleGetActivityLogById)
