import { Hono } from 'hono'
import { handleGetCustomerMetrics } from './metrics.handler'

export const metricsRoutes = new Hono()

metricsRoutes.get('/customer-metrics', handleGetCustomerMetrics)
