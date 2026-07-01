import { Hono } from 'hono'
import { handleGetCrossSelling, handleGetCustomerMetrics, handleGetGpBreakdown, handleGetHmBreakdown, handleGetRorBreakdown, handleGetDormantMetrics, handleGetCategoryPerformance, handleGetCategoryProducts } from './metrics.handler'
import { requirePermission } from '@/middleware/permission'

export const metricsRoutes = new Hono()

metricsRoutes.get('/cross-selling',         requirePermission('metrics:view'), handleGetCrossSelling)
metricsRoutes.get('/customer-metrics',      requirePermission('metrics:view'), handleGetCustomerMetrics)
metricsRoutes.get('/gp-breakdown',          requirePermission('metrics:view'), handleGetGpBreakdown)
metricsRoutes.get('/hm-breakdown',          requirePermission('metrics:view'), handleGetHmBreakdown)
metricsRoutes.get('/ror-breakdown',         requirePermission('metrics:view'), handleGetRorBreakdown)
metricsRoutes.get('/dormant-customer',      requirePermission('metrics:view'), handleGetDormantMetrics)
metricsRoutes.get('/category-performance',  requirePermission('metrics:view'), handleGetCategoryPerformance)
metricsRoutes.get('/category-products',     requirePermission('metrics:view'), handleGetCategoryProducts)
