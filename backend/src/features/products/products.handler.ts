import type { Context } from 'hono'
import { success } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateQuery } from '@/utils/validator'
import { branchQuerySchema, fetchProductsQuerySchema, localProductsQuerySchema } from './products.schema'
import { fetchCategoriesFromAccurate, fetchProductsFromAccurate } from './accurate-products.service'
import { findProducts } from './products.repository'
import { db } from '@/config/db'
import { product_categories } from '@/db/schema'
import { eq } from 'drizzle-orm'

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

export async function handleGetLocalProducts(c: Context) {
  try {
    const query = validateQuery(c, localProductsQuerySchema)
    const result = await findProducts(query.company_id, query.category_id)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar produk', 500)
  }
}

export async function handleGetLocalCategories(c: Context) {
  try {
    const query = validateQuery(c, localProductsQuerySchema)
    const result = await db
      .select()
      .from(product_categories)
      .where(eq(product_categories.company_id, query.company_id))
      .orderBy(product_categories.name)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar kategori', 500)
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
