/**
 * db/schema/import_logs.ts
 *
 * Tabel import_logs — riwayat setiap operasi import (file CSV/Excel atau API Accurate).
 *
 * Migration order: 9th (setelah invoice_items)
 * Dependency: companies, users
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'
import { users } from './users'

export const import_logs = pgTable('import_logs', {
  id: serial('id').primaryKey(),

  company_id: integer('company_id')
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),

  source: varchar('source', { length: 20 }).notNull(),
  // file | accurate_api

  filename: varchar('filename', { length: 255 }),

  period_month: varchar('period_month', { length: 7 }).notNull(),
  // YYYY-MM

  status: varchar('status', { length: 20 }).notNull(),
  // success | partial | failed

  total_invoices: integer('total_invoices').notNull().default(0),

  total_items: integer('total_items').notNull().default(0),

  success_invoices: integer('success_invoices').notNull().default(0),

  error_rows: integer('error_rows').notNull().default(0),

  imported_by: integer('imported_by')
    .references(() => users.id, { onDelete: 'set null' }),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type ImportLog = typeof import_logs.$inferSelect
export type NewImportLog = typeof import_logs.$inferInsert