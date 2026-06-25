/**
 * features/products/products.route.ts
 *
 * Route untuk produk — integrasi dengan Accurate Online API.
 *
 * Auth + CompanyAccess sudah dihandle router.ts — JANGAN ditambah lagi di sini.
 * Permission: products:read
 */
import { Hono } from 'hono'
import { handleGetAccurateCategories, handleGetAccurateProducts } from './products.handler'

export const productsRoutes = new Hono()

productsRoutes.get('/accurate/categories', handleGetAccurateCategories)
productsRoutes.get('/accurate', handleGetAccurateProducts)
