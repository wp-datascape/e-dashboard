/**
 * db/schema/schema-product.ts
 *
 * Tabel-tabel domain Product: product_categories, products, high_margin_products,
 * item_classification_rules, channel_divisions.
 */

import {
  pgTable,
  serial,
  varchar,
  boolean,
  numeric,
  date,
  text,
  timestamp,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { companies } from './schema-company'
import { users } from './schema-auth'

// ─── product_categories ───────────────────────────────────────────────────────

/**
 * Kategori produk/jasa yang diklasifikasi dari Accurate. Setiap kategori punya
 * company_id (data isolation per entitas).
 */
export const product_categories = pgTable('product_categories', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  // unit | consumable | sparepart | service
  item_type: varchar('item_type', { length: 20 }).notNull().default('unit'),
  avg_margin_percent: numeric('avg_margin_percent', { precision: 5, scale: 2 }).notNull().default('0'),
  // Deprecated — pakai item_type
  is_service: boolean('is_service').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ProductCategory = typeof product_categories.$inferSelect
export type NewProductCategory = typeof product_categories.$inferInsert

// ─── products ─────────────────────────────────────────────────────────────────

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    product_name: varchar('product_name', { length: 255 }).notNull(),
    product_category_id: integer('product_category_id').references(() => product_categories.id, { onDelete: 'set null' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueProductPerCompany: uniqueIndex('uq_products_name_company').on(table.company_id, table.product_name),
  }),
)

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert

// ─── high_margin_products ─────────────────────────────────────────────────────

export const high_margin_products = pgTable('high_margin_products', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // Minimal satu (product_id/product_category_id) harus diisi — CHECK constraint di migration SQL
  product_id: integer('product_id').references(() => products.id, { onDelete: 'cascade' }),
  product_category_id: integer('product_category_id').references(() => product_categories.id, { onDelete: 'cascade' }),
  effective_from: date('effective_from').notNull(),
  // null = masih aktif
  effective_until: date('effective_until'),
  note: text('note'),
  created_by: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type HighMarginProduct = typeof high_margin_products.$inferSelect
export type NewHighMarginProduct = typeof high_margin_products.$inferInsert

// ─── item_classification_rules ────────────────────────────────────────────────

/**
 * Aturan klasifikasi item_type (unit|consumable|sparepart|service) dari data
 * Accurate — Layer 1: keyword matching, Layer 2: price range heuristic,
 * Layer 3: DB lookup override (tabel ini), Layer 4: fallback 'unit' + needs_review.
 * match_pattern selalu UPPERCASE (normalisasi saat input).
 */
export const item_classification_rules = pgTable('item_classification_rules', {
  id: serial('id').primaryKey(),
  // null = global rule (berlaku untuk semua company)
  company_id: integer('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  // keyword_item_name | keyword_category | price_range | exact_item_name | exact_category
  match_type: varchar('match_type', { length: 50 }).notNull(),
  // Keyword (UPPERCASE) atau JSON range utk price_range: {"min": 500000}
  match_pattern: varchar('match_pattern', { length: 255 }).notNull(),
  // unit | consumable | sparepart | service
  item_type: varchar('item_type', { length: 20 }).notNull(),
  // Higher = more priority
  priority: integer('priority').notNull().default(50),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ItemClassificationRule = typeof item_classification_rules.$inferSelect
export type NewItemClassificationRule = typeof item_classification_rules.$inferInsert

// ─── item_types ───────────────────────────────────────────────────────────────

/**
 * Daftar Item Type per company (task011) — DINAMIS, beda dari
 * item_classification_rules/channel_divisions yang company_id-nya nullable=global.
 * item_types SENGAJA company_id NOT NULL (bukan nullable) - tiap company kelola
 * daftar Item Type sendiri-sendiri, tidak ada opsi "global" (keputusan eksplisit
 * user, bukan mirror pola company_id nullable yang dipakai tabel lain di file ini).
 *
 * `key` dipakai di query/filter (product_categories.item_type,
 * item_classification_rules.item_type - keduanya varchar biasa, referensi lewat
 * KONVENSI bukan FK formal, sama seperti channel_divisions.division ke
 * divisionEnum). `label` teks tampilan, sumber kebenaran TUNGGAL buat UI (bukan
 * campur sama i18n).
 */
export const item_types = pgTable('item_types', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  key: varchar('key', { length: 30 }).notNull(),
  label: varchar('label', { length: 50 }).notNull(),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('item_types_company_key_idx').on(table.company_id, table.key),
])

export type ItemTypeRow = typeof item_types.$inferSelect
export type NewItemType = typeof item_types.$inferInsert

// ─── channel_divisions ────────────────────────────────────────────────────────

/**
 * Mapping channel_name -> divisi channel penjualan. company_id nullable = rule
 * global (berlaku semua company). Cocok dengan invoices.channel_name (UPPERCASE).
 */
export const channel_divisions = pgTable('channel_divisions', {
  id: serial('id').primaryKey(),
  // null = global rule (berlaku untuk semua company)
  company_id: integer('company_id').references(() => companies.id, { onDelete: 'cascade' }),
  channel_name: varchar('channel_name', { length: 255 }).notNull(),
  // distribution | project | e_commerce | intercompany | freelancer | support | other
  division: varchar('division', { length: 50 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ChannelDivision = typeof channel_divisions.$inferSelect
export type NewChannelDivision = typeof channel_divisions.$inferInsert
