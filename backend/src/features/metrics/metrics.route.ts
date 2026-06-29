import { Hono } from 'hono'
import { handleGetCustomerMetrics, handleGetGpBreakdown, handleGetHmBreakdown, handleGetRorBreakdown } from './metrics.handler'
import { requirePermission } from '@/middleware/permission'

export const metricsRoutes = new Hono()

metricsRoutes.get('/customer-metrics', requirePermission('metrics:view'), handleGetCustomerMetrics)
metricsRoutes.get('/gp-breakdown', requirePermission('metrics:view'), handleGetGpBreakdown)
metricsRoutes.get('/hm-breakdown', requirePermission('metrics:view'), handleGetHmBreakdown)
metricsRoutes.get('/ror-breakdown', requirePermission('metrics:view'), handleGetRorBreakdown)
