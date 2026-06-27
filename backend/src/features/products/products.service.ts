import { AppError, ErrorCode } from '@/utils/error'
import { db } from '@/config/db'
import { product_categories } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { findProducts } from './products.repository'

export async function getLocalProducts(companyId: number, categoryId?: number) {
  try {
    return await findProducts(companyId, categoryId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar produk', 500)
  }
}

export async function getLocalCategories(companyId: number) {
  try {
    return await db
      .select()
      .from(product_categories)
      .where(eq(product_categories.company_id, companyId))
      .orderBy(product_categories.name)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar kategori', 500)
  }
}
