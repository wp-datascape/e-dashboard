import {
  pgTable,
  serial,
  integer,
  date,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { products } from './products'
import { product_categories } from './product_categories'
import { users } from './users'

export const high_margin_products = pgTable('high_margin_products', {
  id: serial('id').primaryKey(),

  company_id: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  // Minimal satu harus diisi — CHECK constraint di migration SQL
  product_id: integer('product_id')
    .references(() => products.id, { onDelete: 'cascade' }),

  product_category_id: integer('product_category_id')
    .references(() => product_categories.id, { onDelete: 'cascade' }),

  effective_from: date('effective_from').notNull(),

  effective_until: date('effective_until'),
  // null = masih aktif

  note: text('note'),

  created_by: integer('created_by')
    .references(() => users.id, { onDelete: 'set null' }),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type HighMarginProduct = typeof high_margin_products.$inferSelect
export type NewHighMarginProduct = typeof high_margin_products.$inferInsert
