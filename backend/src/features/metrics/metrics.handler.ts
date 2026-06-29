import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { crossSellingQuerySchema, customerMetricsQuerySchema, gpBreakdownQuerySchema, hmBreakdownQuerySchema, rorBreakdownQuerySchema, dormantCustomerQuerySchema } from './metrics.schema'
import { getCrossSellingMetrics, getCustomerMetrics, getGpBreakdown, getHmBreakdown, getRorBreakdown, getDormantCustomerMetrics } from './metrics.service'

export async function handleGetCrossSelling(c: Context) {
  const query = validateQuery(c, crossSellingQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const data = await getCrossSellingMetrics(query)
  return success(c, data)
}

export async function handleGetCustomerMetrics(c: Context) {
  const query = validateQuery(c, customerMetricsQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const data = await getCustomerMetrics(query)
  return success(c, data)
}

export async function handleGetGpBreakdown(c: Context) {
  const query = validateQuery(c, gpBreakdownQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const data = await getGpBreakdown(query)
  return success(c, data)
}

export async function handleGetHmBreakdown(c: Context) {
  const query = validateQuery(c, hmBreakdownQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const data = await getHmBreakdown(query)
  return success(c, data)
}

export async function handleGetRorBreakdown(c: Context) {
  const query = validateQuery(c, rorBreakdownQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const data = await getRorBreakdown(query)
  return success(c, data)
}

export async function handleGetDormantMetrics(c: Context) {
  const query = validateQuery(c, dormantCustomerQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const data = await getDormantCustomerMetrics(query)
  return success(c, data)
}
