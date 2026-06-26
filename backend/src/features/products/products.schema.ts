/**
 * features/products/products.schema.ts
 *
 * Zod schemas untuk endpoint produk dari Accurate API.
 */
import { z } from 'zod'

export const branchQuerySchema = z.object({
  branch_id: z.coerce.number().int().positive(),
})

export const fetchProductsQuerySchema = z.object({
  branch_id: z.coerce.number().int().positive(),
  page: z.coerce.number().int().positive().optional().default(1),
  per_page: z.coerce.number().int().positive().max(100).optional().default(50),
  keywords: z.string().optional(),
})

export const localProductsQuerySchema = z.object({
  company_id: z.coerce.number().int().positive(),
  category_id: z.coerce.number().int().positive().optional(),
})

export type BranchQuery = z.infer<typeof branchQuerySchema>
export type FetchProductsQuery = z.infer<typeof fetchProductsQuerySchema>
export type LocalProductsQuery = z.infer<typeof localProductsQuerySchema>
