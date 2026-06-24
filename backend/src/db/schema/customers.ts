/**
 * db/schema/customers.ts
 *
 * Tabel customers — master data pelanggan dari Accurate.
 * Di-upsert otomatis saat import invoice.
 *
 * Migration order: 6th (setelah product_categories)
 * Dependency: companies
 *
 * Konvensi:
 * - customer_code: nullable untuk CSV import (tidak punya kode), required untuk API
 * - Semua teks disimpan dalam UPPERCASE (normalisasi saat import)
 * - first_invoice_date / last_invoice_date diupdate otomatis dari transaksi
 * - business_unit: future filter field (B2B_DC|B2B_PROJECT|B2C|MANUFACTURING)
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  date,
  timestamp,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),

  company_id: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  customer_code: varchar('customer_code', { length: 50 }),
  // nullable untuk CSV import, required untuk API Accurate

  customer_name: varchar('customer_name', { length: 255 }).notNull(),

  business_unit: varchar('business_unit', { length: 50 }),
  // B2B_DC | B2B_PROJECT | B2C | MANUFACTURING

  first_invoice_date: date('first_invoice_date'),
  // MIN(invoice_date) dari transaksi customer ini

  last_invoice_date: date('last_invoice_date'),
  // MAX(invoice_date) dari transaksi customer ini

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert