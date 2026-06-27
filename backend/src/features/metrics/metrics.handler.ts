import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { customerMetricsQuerySchema } from './metrics.schema'
import { getCustomerMetrics } from './metrics.service'

export async function handleGetCustomerMetrics(c: Context) {
  const query = validateQuery(c, customerMetricsQuerySchema)
  const data = await getCustomerMetrics(query)
  return success(c, data)
}
