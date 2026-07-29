/**
 * db/schema/schema-transaction.ts
 *
 * Tabel-tabel domain Customer & Transaksi (faktur): customers, invoices,
 * invoice_items, import_logs, import_log_errors.
 */

import {
  pgTable,
  serial,
  varchar,
  integer,
  numeric,
  date,
  boolean,
  text,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { companies, company_branches, divisions } from './schema-company'
import { users } from './schema-auth'
import { product_categories, products } from './schema-product'

// ─── customers ────────────────────────────────────────────────────────────────

/**
 * Master data pelanggan dari Accurate, di-upsert otomatis saat import invoice.
 * Semua teks disimpan UPPERCASE (normalisasi saat import).
 */
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // nullable utk CSV import, required utk API Accurate
  customer_code: varchar('customer_code', { length: 50 }),
  customer_name: varchar('customer_name', { length: 255 }).notNull(),
  // B2B_DC | B2B_PROJECT | B2C | MANUFACTURING
  business_unit: varchar('business_unit', { length: 50 }),
  // true utk customer dummy Accurate (PELANGGAN UMUM, dll) — dikecualikan dari semua metrik
  is_placeholder: boolean('is_placeholder').notNull().default(false),
  // MIN(invoice_date) dari transaksi customer ini
  first_invoice_date: date('first_invoice_date'),
  // MAX(invoice_date) dari transaksi customer ini
  last_invoice_date: date('last_invoice_date'),
  // NULL (default) = division ikut channel invoice terbaru seperti biasa. Diisi =
  // division customer ini SELALU ikut nilai ini di semua laporan/filter, terlepas
  // channel invoice apa pun (task013) — dipakai utk customer yang representasi
  // sister company (klasifikasi harus konstan, tidak boleh ikut tenaga penjual per
  // invoice). Diisi OTOMATIS lewat sync intercompany_customer_names, bukan form
  // manual (tidak ada UI create/edit customer di app ini, lifecycle-nya via import).
  division_override_id: integer('division_override_id').references(() => divisions.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Customer = typeof customers.$inferSelect
export type NewCustomer = typeof customers.$inferInsert

// ─── intercompany_customer_names ───────────────────────────────────────────────

/**
 * Daftar nama customer (per company) yang representasi sister company - dikelola
 * admin di Settings, dipakai sync otomatis ke customers.division_override_id
 * (task013). customer_name disimpan UPPERCASE, sama normalisasi dengan
 * customers.customer_name (upsertCustomer) supaya matching-nya konsisten.
 */
export const intercompany_customer_names = pgTable('intercompany_customer_names', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  customer_name: varchar('customer_name', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueNamePerCompany: uniqueIndex('uq_intercompany_names_company_name').on(
    table.company_id,
    table.customer_name,
  ),
}))

export type IntercompanyCustomerName = typeof intercompany_customer_names.$inferSelect
export type NewIntercompanyCustomerName = typeof intercompany_customer_names.$inferInsert

// ─── invoices ─────────────────────────────────────────────────────────────────

/**
 * Header faktur penjualan — 1 invoice = 1 baris di sini, N baris di invoice_items.
 * Dedup key: (invoice_number, company_id). Soft delete via deleted_at — never
 * hard-delete invoice data.
 */
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  customer_id: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'restrict' }),
  invoice_number: varchar('invoice_number', { length: 100 }).notNull(),
  invoice_date: date('invoice_date').notNull(),
  total_revenue: numeric('total_revenue', { precision: 15, scale: 2 }).notNull().default('0'),
  // Diisi dari SUM gross_profit invoice_items
  total_gp: numeric('total_gp', { precision: 15, scale: 2 }).notNull().default('0'),
  channel_name: varchar('channel_name', { length: 255 }),
  branch_name: varchar('branch_name', { length: 255 }),
  // FK ke company_branches — nullable, hasil resolve dari branch_name (teks bebas dari
  // Accurate/CSV, belum tentu match persis) — lihat docs-v2/task/task001.md §3.3, §4.6
  branch_id: integer('branch_id').references(() => company_branches.id),
  // B2B_DC | B2B_PROJECT | B2C | MANUFACTURING — copy dari customers
  business_unit: varchar('business_unit', { length: 50 }),
  // FK ke import_logs (nullable — akan ditambahkan nanti jika perlu)
  import_log_id: integer('import_log_id'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  // soft delete only
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  // Dedup key — sebelumnya format object literal lama (bukan IndexBuilder), jadi
  // diam-diam tidak pernah ke-generate drizzle-kit. Diganti ke uniqueIndex() yang valid.
  uniqueInvoicePerCompany: uniqueIndex('uq_invoices_number_company').on(
    table.invoice_number,
    table.company_id,
  ),
  // Menopang correlated EXISTS/JOIN per-customer di segment.helper.ts (cust_dates,
  // latest_channel, cteEstablishedCustomers, dst) — tanpa ini, query dashboard dgn
  // company_id=all (companyScopeIds=undefined → filter company hilang) full-scan
  // seluruh tabel invoices per customer dan menggantung tanpa timeout.
  idxCustomerInvoiceDate: index('idx_invoices_customer_invoice_date')
    .on(table.customer_id, table.invoice_date)
    .where(sql`deleted_at is null`),
  idxCompanyInvoiceDate: index('idx_invoices_company_invoice_date')
    .on(table.company_id, table.invoice_date)
    .where(sql`deleted_at is null`),
}))

export type Invoice = typeof invoices.$inferSelect
export type NewInvoice = typeof invoices.$inferInsert

// ─── invoice_items ────────────────────────────────────────────────────────────

/** Line items dari setiap faktur — N baris per invoice. */
export const invoice_items = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoice_id: integer('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  product_id: integer('product_id').notNull().references(() => products.id, { onDelete: 'restrict' }),
  product_category_id: integer('product_category_id').references(() => product_categories.id, { onDelete: 'set null' }),
  quantity: integer('quantity').notNull().default(1),
  unit_price: numeric('unit_price', { precision: 15, scale: 2 }).notNull().default('0'),
  revenue: numeric('revenue', { precision: 15, scale: 2 }).notNull().default('0'),
  gross_profit: numeric('gross_profit', { precision: 15, scale: 2 }).notNull().default('0'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type InvoiceItem = typeof invoice_items.$inferSelect
export type NewInvoiceItem = typeof invoice_items.$inferInsert

// ─── import_logs ──────────────────────────────────────────────────────────────

/** Riwayat setiap operasi import (file CSV/Excel atau API Accurate). */
export const import_logs = pgTable('import_logs', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // file | accurate_api
  source: varchar('source', { length: 20 }).notNull(),
  filename: varchar('filename', { length: 255 }),
  // YYYY-MM
  period_month: varchar('period_month', { length: 7 }).notNull(),
  // success | partial | failed
  status: varchar('status', { length: 20 }).notNull(),
  total_invoices: integer('total_invoices').notNull().default(0),
  total_items: integer('total_items').notNull().default(0),
  success_invoices: integer('success_invoices').notNull().default(0),
  error_rows: integer('error_rows').notNull().default(0),
  imported_by: integer('imported_by').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ImportLog = typeof import_logs.$inferSelect
export type NewImportLog = typeof import_logs.$inferInsert

// ─── import_log_errors ────────────────────────────────────────────────────────

/** Detail error per baris dari operasi import. */
export const import_log_errors = pgTable('import_log_errors', {
  id: serial('id').primaryKey(),
  import_log_id: integer('import_log_id').notNull().references(() => import_logs.id, { onDelete: 'cascade' }),
  row_number: integer('row_number'),
  raw_data: text('raw_data'),
  error_message: text('error_message').notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ImportLogError = typeof import_log_errors.$inferSelect
export type NewImportLogError = typeof import_log_errors.$inferInsert
