import { Hono } from 'hono'
import { handleGetCrossSelling, handleGetCustomerMetrics, handleGetGpBreakdown, handleGetHmBreakdown, handleGetRorBreakdown, handleGetDormantMetrics } from './metrics.handler'
import { requirePermission } from '@/middleware/permission'

export const metricsRoutes = new Hono()

metricsRoutes.get('/cross-selling',      requirePermission('metrics:view'), handleGetCrossSelling)
metricsRoutes.get('/customer-metrics', requirePermission('metrics:view'), handleGetCustomerMetrics)
metricsRoutes.get('/gp-breakdown', requirePermission('metrics:view'), handleGetGpBreakdown)
metricsRoutes.get('/hm-breakdown', requirePermission('metrics:view'), handleGetHmBreakdown)
metricsRoutes.get('/ror-breakdown', requirePermission('metrics:view'), handleGetRorBreakdown)
metricsRoutes.get('/dormant-customer', requirePermission('metrics:view'), handleGetDormantMetrics)
