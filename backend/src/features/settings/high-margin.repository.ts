import { and, eq, inArray, or, isNull, lte, gte, desc, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { high_margin_products, products, product_categories, companies } from '@/db/schema'
import type { NewHighMarginProduct } from '@/db/schema/high_margin_products'

export async function createHighMargin(data: NewHighMarginProduct) {
  const [result] = await db.insert(high_margin_products).values(data).returning()
  return result
}

export async function findHighMarginById(id: number) {
  const [result] = await db
    .select()
    .from(high_margin_products)
    .where(eq(high_margin_products.id, id))
  return result ?? null
}

export async function findHighMargins(params: {
  period?: string      // 'YYYY-MM' — filter row yang overlap dengan bulan ini
  active_only?: boolean
}, scopeIds?: number[]) {
  const { period, active_only } = params

  // scopeIds undefined → superadmin + 'all' → tidak ada filter company (lihat semua)
  // scopeIds array     → company spesifik ATAU 'all' non-superadmin → filter ke company itu
  if (scopeIds && scopeIds.length === 0) return []
  const conditions = scopeIds ? [inArray(high_margin_products.company_id, scopeIds)] : []

  if (active_only) {
    const today = sql`CURRENT_DATE`
    // aktif = effective_from <= hari ini AND (effective_until IS NULL OR effective_until >= hari ini)
    conditions.push(lte(high_margin_products.effective_from, today))
    conditions.push(
      or(
        isNull(high_margin_products.effective_until),
        gte(high_margin_products.effective_until, today),
      )!,
    )
  }

  if (period) {
    const [year, month] = period.split('-').map(Number)
    const firstDay = `${period}-01`
    const lastDay = new Date(year, month, 0).toISOString().split('T')[0]

    // Row overlap dengan bulan: effective_from <= lastDay AND (effective_until IS NULL OR effective_until >= firstDay)
    conditions.push(lte(high_margin_products.effective_from, lastDay))
    conditions.push(
      or(
        isNull(high_margin_products.effective_until),
        gte(high_margin_products.effective_until, firstDay),
      )!,
    )
  }

  return db
    .select({
      id: high_margin_products.id,
      company_id: high_margin_products.company_id,
      company_name: companies.name,
      product_id: high_margin_products.product_id,
      product_name: products.product_name,
      product_category_id: high_margin_products.product_category_id,
      category_name: product_categories.name,
      effective_from: high_margin_products.effective_from,
      effective_until: high_margin_products.effective_until,
      note: high_margin_products.note,
      created_by: high_margin_products.created_by,
      created_at: high_margin_products.created_at,
      updated_at: high_margin_products.updated_at,
    })
    .from(high_margin_products)
    .leftJoin(companies, eq(high_margin_products.company_id, companies.id))
    .leftJoin(products, eq(high_margin_products.product_id, products.id))
    .leftJoin(product_categories, eq(high_margin_products.product_category_id, product_categories.id))
    .where(and(...conditions))
    .orderBy(desc(high_margin_products.effective_from))
}

export async function updateHighMargin(id: number, data: {
  effective_until?: string | null
  note?: string
}) {
  const [result] = await db
    .update(high_margin_products)
    .set({ ...data, updated_at: new Date() })
    .where(eq(high_margin_products.id, id))
    .returning()
  return result
}

export async function closeHighMargin(id: number, today: string) {
  const [result] = await db
    .update(high_margin_products)
    .set({ effective_until: today, updated_at: new Date() })
    .where(eq(high_margin_products.id, id))
    .returning()
  return result
}

export async function deleteHighMargin(id: number) {
  await db.delete(high_margin_products).where(eq(high_margin_products.id, id))
}
