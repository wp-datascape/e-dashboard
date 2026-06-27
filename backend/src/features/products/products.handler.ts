import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { branchQuerySchema, fetchProductsQuerySchema, localProductsQuerySchema } from './products.schema'
import { fetchCategoriesFromAccurate, fetchProductsFromAccurate } from './accurate-products.service'
import { getLocalProducts, getLocalCategories } from './products.service'

export async function handleGetAccurateCategories(c: Context) {
  const query = validateQuery(c, branchQuerySchema)
  const result = await fetchCategoriesFromAccurate(query.branch_id)
  return success(c, result)
}

export async function handleGetLocalProducts(c: Context) {
  const query = validateQuery(c, localProductsQuerySchema)
  const result = await getLocalProducts(query.company_id, query.category_id)
  return success(c, result)
}

export async function handleGetLocalCategories(c: Context) {
  const query = validateQuery(c, localProductsQuerySchema)
  const result = await getLocalCategories(query.company_id)
  return success(c, result)
}

export async function handleGetAccurateProducts(c: Context) {
  const query = validateQuery(c, fetchProductsQuerySchema)
  const result = await fetchProductsFromAccurate(query.branch_id, {
    page: query.page!,
    per_page: query.per_page!,
    keywords: query.keywords,
  })
  return success(c, result)
}
