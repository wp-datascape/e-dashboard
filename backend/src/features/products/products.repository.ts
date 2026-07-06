import { and, eq, sql, desc } from 'drizzle-orm'
import { db } from '@/config/db'
import { products } from '@/db/schema'
import type { NewProduct } from '@/db/schema'

export async function upsertProduct(data: {
  company_id: number
  product_name: string
  product_category_id?: number | null
}) {
  const upperName = data.product_name.trim().toUpperCase()

  const existing = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.company_id, data.company_id),
        eq(sql`UPPER(${products.product_name})`, upperName),
      ),
    )
    .limit(1)

  if (existing.length > 0) {
    const current = existing[0]
    // Update category jika berubah
    if (data.product_category_id && current.product_category_id !== data.product_category_id) {
      const [updated] = await db
        .update(products)
        .set({ product_category_id: data.product_category_id, updated_at: new Date() })
        .where(eq(products.id, current.id))
        .returning()
      return updated
    }
    return current
  }

  const [created] = await db
    .insert(products)
    .values({
      company_id: data.company_id,
      product_name: upperName,
      product_category_id: data.product_category_id ?? null,
    })
    .returning()
  return created
}

export async function findProducts(companyId: number, categoryId?: number) {
  return db
    .select()
    .from(products)
    .where(
      categoryId
        ? and(eq(products.company_id, companyId), eq(products.product_category_id, categoryId))
        : eq(products.company_id, companyId),
    )
    .orderBy(desc(products.updated_at))
}

export async function findProductById(id: number) {
  const [result] = await db.select().from(products).where(eq(products.id, id))
  return result ?? null
}
