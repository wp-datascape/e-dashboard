/**
 * db/schema/invoices.ts
 *
 * Tabel invoices — header faktur penjualan.
 * 1 invoice = 1 baris di tabel ini, N baris di invoice_items.
 *
 * Migration order: 7th (setelah customers)
 * Dependency: companies, customers, import_logs
 *
 * Dedup key: (invoice_number, company_id) — UNIQUE constraint
 * Soft delete via deleted_at — never hard-delete invoice data
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  date,
  timestamp,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { customers } from './customers'

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),

  company_id: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  customer_id: integer('customer_id')
    .notNull()
    .references(() => customers.id, { onDelete: 'restrict' }),

  invoice_number: varchar('invoice_number', { length: 100 }).notNull(),

  invoice_date: date('invoice_date').notNull(),

  total_revenue: numeric('total_revenue', { precision: 15, scale: 2 }).notNull().default('0'),

  total_gp: numeric('total_gp', { precision: 15, scale: 2 }).notNull().default('0'),
  // Diisi dari SUM gross_profit invoice_items

  salesperson_name: varchar('salesperson_name', { length: 255 }),
  // nullable — future filter

  business_unit: varchar('business_unit', { length: 50 }),
  // B2B_DC | B2B_PROJECT | B2C | MANUFACTURING — copy dari customers

  import_log_id: integer('import_log_id'),
  // FK ke import_logs (nullable — akan ditambahkan nanti jika perlu)

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  deleted_at: timestamp('deleted_at', { withTimezone: true }),
  // soft delete only
}, (table) => ({
  // Dedup key
  uniqueInvoicePerCompany: {
    name: 'uq_invoices_number_company',
    columns: [table.invoice_number, table.company_id],
    unique: true,
  },
}))

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert