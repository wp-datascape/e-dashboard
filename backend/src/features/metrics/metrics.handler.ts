import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { customerMetricsQuerySchema, gpBreakdownQuerySchema, hmBreakdownQuerySchema, rorBreakdownQuerySchema } from './metrics.schema'
import { getCustomerMetrics, getGpBreakdown, getHmBreakdown, getRorBreakdown } from './metrics.service'

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
