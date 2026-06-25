import type { Context } from 'hono'
import { success } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateQuery } from '@/utils/validator'
import { branchQuerySchema, fetchProductsQuerySchema } from './products.schema'
import { fetchCategoriesFromAccurate, fetchProductsFromAccurate } from './accurate-products.service'

export async function handleGetAccurateCategories(c: Context) {
  try {
    const query = validateQuery(c, branchQuerySchema)
    const result = await fetchCategoriesFromAccurate(query.branch_id)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.ACCURATE_API_ERROR, 'Failed to fetch categories from Accurate', 502)
  }
}

export async function handleGetAccurateProducts(c: Context) {
  try {
    const query = validateQuery(c, fetchProductsQuerySchema)
    const result = await fetchProductsFromAccurate(query.branch_id, {
      page: query.page!,
      per_page: query.per_page!,
      keywords: query.keywords,
    })
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.ACCURATE_API_ERROR, 'Failed to fetch products from Accurate', 502)
  }
}
