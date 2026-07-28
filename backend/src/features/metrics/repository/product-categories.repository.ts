import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import { buildCompanyConditionRaw } from '@/utils/scope'

export interface ProductCategoryOptionsRepoParams {
  cid: number
  companyScopeIds?: number[]
  itemType?: string | null
}

export interface ProductCategoryOptionDbRow {
  id: number
  name: string
}

// Opsi dropdown filter Kategori di halaman Products (flat list produk, task010) -
// permission `product:view`, BUKAN reuse GET /products/categories (permission
// `settings.product:view`, endpoint Product Settings di Administration) supaya
// role dengan akses lihat Product Workbench tapi tanpa akses Settings tetap bisa
// pakai filter kategori.
export async function fetchProductCategoryOptions(
  p: ProductCategoryOptionsRepoParams,
): Promise<ProductCategoryOptionDbRow[]> {
  const companyCond = buildCompanyConditionRaw('pc.company_id', p.cid, p.companyScopeIds)
  const itemType = p.itemType ?? null

  const rows = await db.execute(sql`
    SELECT DISTINCT pc.id, pc.name
    FROM product_categories pc
    WHERE ${companyCond}
      AND (${itemType}::text IS NULL OR pc.item_type = ${itemType}::text)
    ORDER BY pc.name
  `)

  return (rows as unknown[]).map((r) => {
    const row = r as Record<string, unknown>
    return {
      id:   Number(row.id),
      name: String(row.name),
    }
  })
}
