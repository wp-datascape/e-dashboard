/**
 * db/schema/product_categories.ts
 *
 * Tabel product_categories — kategori produk/jasa yang diklasifikasi dari Accurate.
 * Setiap kategori punya company_id (data isolation per entitas).
 *
 * Migration order: 5th (setelah companies)
 * Dependency: companies
 *
 * Perubahan dari data-model.md:
 * - is_service boolean → item_type varchar (unit|consumable|sparepart|service)
 * - Tambah avg_margin_percent untuk auto-calc high margin
 */
import {
  pgTable,
  serial,
  varchar,
  boolean,
  numeric,
  timestamp,
  integer,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const product_categories = pgTable('product_categories', {
  id: serial('id').primaryKey(),

  company_id: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  name: varchar('name', { length: 255 }).notNull(),

  item_type: varchar('item_type', { length: 20 }).notNull().default('unit'),
  // unit | consumable | sparepart | service

  is_high_margin: boolean('is_high_margin').notNull().default(false),

  avg_margin_percent: numeric('avg_margin_percent', { precision: 5, scale: 2 }).notNull().default('0'),

  // Deprecated — pakai item_type
  is_service: boolean('is_service').notNull().default(false),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type ProductCategory = typeof product_categories.$inferSelect
export type NewProductCategory = typeof product_categories.$inferInsert