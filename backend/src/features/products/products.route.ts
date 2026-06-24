/**
 * features/products/products.route.ts
 *
 * Route untuk produk — integrasi dengan Accurate Online API.
 *
 * Auth + CompanyAccess sudah dihandle router.ts — JANGAN ditambah lagi di sini.
 * Permission: products:read
 */

import { Hono } from 'hono'
import { success } from '@/utils/response'
import { validateQuery } from '@/utils/validator'
import { branchQuerySchema, fetchProductsQuerySchema } from './products.schema'
import { fetchCategoriesFromAccurate, fetchProductsFromAccurate } from './accurate-products.service'

export const productsRoutes = new Hono()

// GET /products/accurate/categories
// Fetch item categories dari Accurate Online API untuk branch tertentu
// Query params: branch_id (required)
productsRoutes.get('/accurate/categories', async (c) => {
  const query = validateQuery(c, branchQuerySchema)
  const result = await fetchCategoriesFromAccurate(query.branch_id)
  return success(c, result)
})

// GET /products/accurate
// Fetch products dari Accurate Online API untuk branch tertentu
// Query params: branch_id (required), page, per_page, keywords
productsRoutes.get('/accurate', async (c) => {
  const query = validateQuery(c, fetchProductsQuerySchema)
  const result = await fetchProductsFromAccurate(query.branch_id, {
    page: query.page!,
    per_page: query.per_page!,
    keywords: query.keywords,
  })
  return success(c, result)
})
