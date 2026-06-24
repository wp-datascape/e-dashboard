/**
 * db/schema/item_classification_rules.ts
 *
 * Tabel item_classification_rules — aturan untuk mengklasifikasi item type
 * (unit|consumable|sparepart|service) dari data Accurate.
 *
 * Migration order: 3rd (setelah companies)
 * Dependency: companies
 *
 * Fungsi:
 * - Layer 1: Keyword matching (nama item atau nama kategori)
 * - Layer 2: Price range heuristic
 * - Layer 3: DB lookup table override (tabel ini)
 * - Layer 4: Fallback ke 'unit' + needs_review
 *
 * Semua match_pattern disimpan dalam UPPERCASE (normalisasi saat input).
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const item_classification_rules = pgTable('item_classification_rules', {
  id: serial('id').primaryKey(),

  company_id: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' }),
  // null = global rule (berlaku untuk semua company)

  match_type: varchar('match_type', { length: 50 }).notNull(),
  // keyword_item_name | keyword_category | price_range | exact_item_name | exact_category

  match_pattern: varchar('match_pattern', { length: 255 }).notNull(),
  // Keyword (UPPERCASE) atau JSON range untuk price_range: {"min": 500000}

  item_type: varchar('item_type', { length: 20 }).notNull(),
  // unit | consumable | sparepart | service

  priority: integer('priority').notNull().default(50),
  // Higher = more priority

  is_active: boolean('is_active').notNull().default(true),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type ItemClassificationRule = typeof item_classification_rules.$inferSelect
export type NewItemClassificationRule = typeof item_classification_rules.$inferInsert