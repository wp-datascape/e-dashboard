import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { crossSellingQuerySchema, customerMetricsQuerySchema, gpBreakdownQuerySchema, hmBreakdownQuerySchema, rorBreakdownQuerySchema, dormantCustomerQuerySchema, categoryPerformanceQuerySchema, categoryProductsQuerySchema, hmDetailQuerySchema, upsellTargetQuerySchema, customerProductsQuerySchema } from './metrics.schema'
import { getCrossSellingMetrics, getCustomerMetrics, getGpBreakdown, getHmBreakdown, getRorBreakdown, getDormantCustomerMetrics, getCategoryPerformance, getCategoryProducts, getHmPenetrationDetail, getUpsellTargets, getCustomerProducts } from './metrics.service'

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

export async function handleGetCategoryPerformance(c: Context) {
  const query = validateQuery(c, categoryPerformanceQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const { data, total } = await getCategoryPerformance(query)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetCategoryProducts(c: Context) {
  const query = validateQuery(c, categoryProductsQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const { data, total } = await getCategoryProducts(query)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetHmDetail(c: Context) {
  const query = validateQuery(c, hmDetailQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const { data, total } = await getHmPenetrationDetail(query)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetCustomerProducts(c: Context) {
  const query = validateQuery(c, customerProductsQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const { data, total } = await getCustomerProducts(query)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}

export async function handleGetUpsellTargets(c: Context) {
  const query = validateQuery(c, upsellTargetQuerySchema)
  resolveCompanyScope(c, query.company_id)
  const { data, total } = await getUpsellTargets(query)
  return paginated(c, data, { page: query.page, per_page: query.per_page, total })
}
