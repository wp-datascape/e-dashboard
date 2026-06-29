/**
 * features/products/products.route.ts
 *
 * Route untuk produk — integrasi dengan Accurate Online API.
 *
 * Auth + CompanyAccess sudah dihandle router.ts — JANGAN ditambah lagi di sini.
 * Permission: products:read
 */
import { Hono } from 'hono'
import {
  handleGetAccurateCategories,
  handleGetAccurateProducts,
  handleGetLocalProducts,
  handleGetLocalCategories,
} from './products.handler'

import { requirePermission } from '@/middleware/permission'

export const productsRoutes = new Hono()

// Local DB — dipakai dropdown di HighMargin settings
productsRoutes.get('/', requirePermission('settings.product:view'), handleGetLocalProducts)
productsRoutes.get('/categories', requirePermission('settings.product:view'), handleGetLocalCategories)

// Accurate API proxy — dipakai di Integration settings
productsRoutes.get('/accurate/categories', requirePermission('config.integration:view'), handleGetAccurateCategories)
productsRoutes.get('/accurate', requirePermission('config.integration:view'), handleGetAccurateProducts)
