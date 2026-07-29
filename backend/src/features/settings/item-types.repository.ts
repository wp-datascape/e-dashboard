import { db } from '@/config/db'
import { item_types, product_categories, item_classification_rules } from '@/db/schema'
import { and, eq, isNull, or, inArray } from 'drizzle-orm'
import type { UpdateItemTypeDto } from './item-types.schema'

// task015 §2d — sebelumnya filter company_id cuma jalan kalau BUKAN 'all', tanpa
// scope check apa pun (defense-in-depth: config.classification:* saat ini
// superadmin-only, jadi belum exploitable, tapi pola tetap disamakan dengan
// divisions/intercompany-names supaya tidak jadi celah kalau permission ini
// suatu saat di-grant ke role lain).
export async function findItemTypes(scopeIds?: number[]) {
  if (scopeIds && scopeIds.length === 0) return []
  const condition = scopeIds ? inArray(item_types.company_id, scopeIds) : undefined
  return db
    .select()
    .from(item_types)
    .where(condition)
    .orderBy(item_types.label)
}

/**
 * Item type aktif saja, field minimal — dipakai dropdown filter (Products page)
 * dan dropdown form rule (Classification Rules page). TIDAK di-requirePermission
 * di level route (lihat item-types.route.ts) - siapa pun yang sudah login boleh
 * baca daftar ini buat keperluan filter, beda dari GET / (CRUD admin, permission
 * config.classification:view) yang balikin semua termasuk yang nonaktif.
 */
export async function findActiveItemTypes(companyId: number | 'all') {
  const conditions = [eq(item_types.is_active, true)]
  if (companyId !== 'all') conditions.push(eq(item_types.company_id, companyId))

  return db
    .select({ id: item_types.id, company_id: item_types.company_id, key: item_types.key, label: item_types.label })
    .from(item_types)
    .where(and(...conditions))
    .orderBy(item_types.label)
}

export async function findItemTypeById(id: number) {
  const [row] = await db.select().from(item_types).where(eq(item_types.id, id))
  return row ?? null
}

export async function findItemTypeByKey(companyId: number, key: string, excludeId?: number) {
  const rows = await db
    .select({ id: item_types.id })
    .from(item_types)
    .where(and(eq(item_types.company_id, companyId), eq(item_types.key, key)))
  return excludeId ? rows.filter((r) => r.id !== excludeId) : rows
}

export async function createItemType(data: { company_id: number; key: string; label: string }) {
  const [result] = await db.insert(item_types).values(data).returning()
  return result
}

export async function updateItemType(id: number, data: UpdateItemTypeDto) {
  const [result] = await db
    .update(item_types)
    .set({ ...data, updated_at: new Date() })
    .where(eq(item_types.id, id))
    .returning()
  return result
}

export async function deleteItemType(id: number) {
  await db.delete(item_types).where(eq(item_types.id, id))
}

/**
 * Cek apakah item_type (company_id + key) masih dipakai di product_categories
 * atau item_classification_rules (termasuk rule GLOBAL, company_id NULL, yang
 * kebetulan pakai key yang sama) - dipakai proteksi delete (§2c task011).
 */
export async function isItemTypeInUse(companyId: number, key: string): Promise<boolean> {
  const [catRow] = await db
    .select({ id: product_categories.id })
    .from(product_categories)
    .where(and(eq(product_categories.company_id, companyId), eq(product_categories.item_type, key)))
    .limit(1)
  if (catRow) return true

  const [ruleRow] = await db
    .select({ id: item_classification_rules.id })
    .from(item_classification_rules)
    .where(and(
      or(eq(item_classification_rules.company_id, companyId), isNull(item_classification_rules.company_id))!,
      eq(item_classification_rules.item_type, key),
    ))
    .limit(1)
  return !!ruleRow
}

const DEFAULT_ITEM_TYPES = [
  { key: 'unit', label: 'Unit' },
  { key: 'consumable', label: 'Consumable' },
  { key: 'sparepart', label: 'Sparepart' },
  { key: 'service', label: 'Jasa' },
] as const

/**
 * Seed 4 item type default untuk 1 company — idempotent (onConflictDoNothing,
 * aman dipanggil berkali-kali). Dipanggil dari hook createCompany (company baru)
 * dan script backfill (company existing) - satu sumber kebenaran, bukan
 * diduplikasi di 2 tempat.
 */
export async function seedDefaultItemTypes(companyId: number) {
  for (const d of DEFAULT_ITEM_TYPES) {
    await db
      .insert(item_types)
      .values({ company_id: companyId, key: d.key, label: d.label })
      .onConflictDoNothing()
  }
}
