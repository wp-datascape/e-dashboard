import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { product_categories } from './product_categories'

export const products = pgTable('products', {
  id: serial('id').primaryKey(),

  company_id: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  product_name: varchar('product_name', { length: 255 }).notNull(),

  product_category_id: integer('product_category_id')
    .references(() => product_categories.id, { onDelete: 'set null' }),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}, (table) => ({
  uniqueProductPerCompany: uniqueIndex('uq_products_name_company').on(table.company_id, table.product_name),
}))

export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
