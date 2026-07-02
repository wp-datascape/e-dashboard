import { Hono } from 'hono'
import { handleGetDashboard } from './dashboard.handler'
import { requirePermission } from '@/middleware/permission'

export const dashboardRoutes = new Hono()

dashboardRoutes.get('/', requirePermission('dashboard:view'), handleGetDashboard)
