import { and, eq, inArray, or, isNull, lte, gte, desc, sql } from 'drizzle-orm'
import { db } from '@/config/db'
import { high_margin_products, high_margin_product_divisions, products, product_categories, companies, divisions } from '@/db/schema'
import type { NewHighMarginProduct } from '@/db/schema'

// task017 — 1 flag high_margin_products di-assign ke BANYAK divisi sekaligus lewat
// tabel junction high_margin_product_divisions (replace-all pattern per edit, mirror
// replaceUserAssignments di user.repository.ts). WAJIB dalam transaksi — kalau parent
// row berhasil dibuat tapi insert divisi gagal di tengah jalan, flag itu jadi "0 divisi
// ter-assign" secara tidak sengaja (state yang seharusnya tidak valid, division_ids
// wajib minimal 1 di schema layer).
export async function createHighMargin(data: NewHighMarginProduct, divisionIds: number[]) {
  return db.transaction(async (tx) => {
    const [result] = await tx.insert(high_margin_products).values(data).returning()
    await tx.insert(high_margin_product_divisions).values(
      divisionIds.map((division_id) => ({ high_margin_product_id: result!.id, division_id })),
    )
    return result
  })
}

export async function findHighMarginById(id: number) {
  const [result] = await db
    .select()
    .from(high_margin_products)
    .where(eq(high_margin_products.id, id))
  return result ?? null
}

/** Divisi yang di-assign ke 1 flag HM — dipakai pre-fill form edit. */
export async function findHighMarginDivisionIds(highMarginProductId: number): Promise<number[]> {
  const rows = await db
    .select({ division_id: high_margin_product_divisions.division_id })
    .from(high_margin_product_divisions)
    .where(eq(high_margin_product_divisions.high_margin_product_id, highMarginProductId))
  return rows.map((r) => r.division_id)
}

/** Replace-all divisi utk 1 flag HM (dipakai saat update) — mirror
 * replaceUserAssignments, delete-then-insert dalam 1 transaksi. */
export async function setHighMarginDivisions(highMarginProductId: number, divisionIds: number[]) {
  await db.transaction(async (tx) => {
    await tx.delete(high_margin_product_divisions).where(eq(high_margin_product_divisions.high_margin_product_id, highMarginProductId))
    if (divisionIds.length === 0) return
    await tx.insert(high_margin_product_divisions).values(
      divisionIds.map((division_id) => ({ high_margin_product_id: highMarginProductId, division_id })),
    )
  })
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
      // Correlated subquery (bukan JOIN+GROUP BY) — divisi ter-assign per baris,
      // dipakai chip "Assign To" (task017). Subquery, bukan join biasa, supaya
      // tidak perlu GROUP BY seluruh kolom lain di select ini.
      division_ids: sql<number[]>`COALESCE((SELECT array_agg(hmd.division_id) FROM high_margin_product_divisions hmd WHERE hmd.high_margin_product_id = ${high_margin_products.id}), '{}')`,
      division_names: sql<string[]>`COALESCE((SELECT array_agg(d.label ORDER BY d.label) FROM high_margin_product_divisions hmd JOIN divisions d ON d.id = hmd.division_id WHERE hmd.high_margin_product_id = ${high_margin_products.id}), '{}')`,
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

// Bulk import commit (task036, 2026-08-31) — 1 baris = 1 insert, opsional
// didahului tutup mapping lama (supersede) dalam TRANSAKSI YANG SAMA supaya
// atomik (kalau insert baris baru gagal, penutupan mapping lama ikut
// dibatalkan — tidak ada state "mapping lama sudah ditutup tapi baris baru
// gagal masuk"). Mirror createHighMargin di atas, ditambah langkah close
// opsional sebelum insert.
export async function createHighMarginWithSupersede(
  data: NewHighMarginProduct,
  divisionIds: number[],
  supersedeId: number | undefined,
  supersedeUntil: string | undefined,
) {
  return db.transaction(async (tx) => {
    if (supersedeId != null && supersedeUntil != null) {
      await tx.update(high_margin_products)
        .set({ effective_until: supersedeUntil, updated_at: new Date() })
        .where(eq(high_margin_products.id, supersedeId))
    }
    const [result] = await tx.insert(high_margin_products).values(data).returning()
    await tx.insert(high_margin_product_divisions).values(
      divisionIds.map((division_id) => ({ high_margin_product_id: result!.id, division_id })),
    )
    return result
  })
}

export async function deleteHighMargin(id: number) {
  await db.delete(high_margin_products).where(eq(high_margin_products.id, id))
}

// "Kamus" nama produk+kategori 1 company (task036, 2026-08-31) — dipakai
// validasi bulk import by-name (lihat high-margin-import.service.ts),
// pola sama persis dedup existing app ini (UPPER(name)+company_id,
// docs-v2/features/high-margin-products.md §1.1) — nama di-uppercase +
// trim di service layer saat build lookup map, bukan di sini.
export async function findProductsAndCategoriesByCompany(companyId: number) {
  const [productRows, categoryRows] = await Promise.all([
    db.select({ id: products.id, name: products.product_name }).from(products).where(eq(products.company_id, companyId)),
    db.select({ id: product_categories.id, name: product_categories.name }).from(product_categories).where(eq(product_categories.company_id, companyId)),
  ])
  return { products: productRows, categories: categoryRows }
}
