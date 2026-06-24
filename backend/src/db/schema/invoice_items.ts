/**
 * db/schema/invoice_items.ts
 *
 * Tabel invoice_items — line items dari setiap faktur.
 * N baris per invoice.
 *
 * Migration order: 8th (setelah invoices)
 * Dependency: invoices, product_categories
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  timestamp,
} from 'drizzle-orm/pg-core'
import { invoices } from './invoices'
import { product_categories } from './product_categories'

export const invoice_items = pgTable('invoice_items', {
  id: serial('id').primaryKey(),

  invoice_id: integer('invoice_id')
    .notNull()
    .references(() => invoices.id, { onDelete: 'cascade' }),

  product_category_id: integer('product_category_id')
    .references(() => product_categories.id, { onDelete: 'set null' }),

  product_name: varchar('product_name', { length: 255 }).notNull(),

  quantity: integer('quantity').notNull().default(1),

  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull().default('0'),

  revenue: numeric('revenue', { precision: 15, scale: 2 }).notNull().default('0'),

  gross_profit: numeric('gross_profit', { precision: 15, scale: 2 }).notNull().default('0'),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type InvoiceItem = typeof invoice_items.$inferSelect
export type NewInvoiceItem = typeof invoice_items.$inferInsert