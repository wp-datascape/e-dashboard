import { Hono } from 'hono'
import { handleGetCustomerMetrics, handleGetGpBreakdown, handleGetHmBreakdown, handleGetRorBreakdown } from './metrics.handler'

export const metricsRoutes = new Hono()

metricsRoutes.get('/customer-metrics', handleGetCustomerMetrics)
metricsRoutes.get('/gp-breakdown', handleGetGpBreakdown)
metricsRoutes.get('/hm-breakdown', handleGetHmBreakdown)
metricsRoutes.get('/ror-breakdown', handleGetRorBreakdown)
