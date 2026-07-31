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
  jsonb,
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
  // toggle non-destruktif (task014) — false berarti alias tidak aktif, sync
  // clear division_override_id tanpa menghapus record (bisa diaktifkan lagi)
  is_active: boolean('is_active').notNull().default(true),
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

// ─── pareto_customers ───────────────────────────────────────────────────────────

/**
 * Flag customer sebagai "Pareto" (customer prioritas, dipantau ketat) — mirror
 * pola high_margin_products (task016 Fase A). Manual oleh admin, bukan
 * auto-detect dari 80/20 rule. effective_until null = masih aktif.
 */
export const pareto_customers = pgTable('pareto_customers', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  customer_id: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  effective_from: date('effective_from').notNull(),
  effective_until: date('effective_until'),
  note: text('note'),
  created_by: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ParetoCustomer = typeof pareto_customers.$inferSelect
export type NewParetoCustomer = typeof pareto_customers.$inferInsert

// ─── pareto_alert_thresholds ─────────────────────────────────────────────────────

/**
 * Threshold penurunan revenue/margin yang dianggap alert-worthy untuk customer
 * Pareto, company-scoped (task016 §5/§9) — SETIAP company independen, bukan
 * global seperti business_configs. 1 baris per (company_id, period_type, metric).
 */
export const pareto_alert_thresholds = pgTable('pareto_alert_thresholds', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // monthly | quarter | semester | annual — 'monthly' ditambah task016 §18
  // (Aturan 2 "Report/Alert Monitoring" bulanan), dipakai Trigger A (minggu
  // ke-2, apple-to-apple tanggal 1-14) & Trigger B (awal bulan, bulan tertutup).
  period_type: varchar('period_type', { length: 20 }).notNull(),
  // revenue | margin
  metric: varchar('metric', { length: 20 }).notNull(),
  drop_percent: numeric('drop_percent', { precision: 5, scale: 2 }).notNull().default('15'),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueThresholdPerCompanyPeriodMetric: uniqueIndex('uq_pareto_threshold_company_period_metric').on(
    table.company_id,
    table.period_type,
    table.metric,
  ),
}))

export type ParetoAlertThreshold = typeof pareto_alert_thresholds.$inferSelect
export type NewParetoAlertThreshold = typeof pareto_alert_thresholds.$inferInsert

// ─── pareto_alert_settings ────────────────────────────────────────────────────────

/**
 * Toggle on/off SCHEDULER alert per company (task016 §19) — TERPISAH dari
 * threshold (`pareto_alert_thresholds`, angka persentase) dan TERPISAH dari
 * visibilitas halaman `/notifications` (`page_settings`, itu cuma nyembunyiin
 * riwayat, bukan matiin generate-nya). Kalau `scheduler_enabled=false`, company
 * itu di-skip TOTAL oleh `runAnalisisAlertEvaluation` — Aturan 1 (Report Akhir)
 * MAUPUN Aturan 2 (Monitoring bulanan) sama-sama tidak jalan untuk company ini.
 * TIDAK mempengaruhi laporan Analisis on-demand (itu tetap selalu bisa diakses).
 * Default `true` (opt-out, bukan opt-in) — company baru otomatis kena evaluasi,
 * konsisten dgn `is_active` default true di tabel lain.
 */
export const pareto_alert_settings = pgTable('pareto_alert_settings', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
  scheduler_enabled: boolean('scheduler_enabled').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type ParetoAlertSetting = typeof pareto_alert_settings.$inferSelect
export type NewParetoAlertSetting = typeof pareto_alert_settings.$inferInsert

// ─── pareto_period_snapshots ──────────────────────────────────────────────────────

/**
 * Hasil hitung revenue/margin per customer per periode/checkpoint (task016
 * Fase B + §17-18) — disimpan sekali saat periode/checkpoint itu dievaluasi,
 * dipakai scheduler sebagai penanda "sudah dievaluasi" (supaya tidak generate
 * notifikasi duplikat tiap hari) sekaligus basis histori yang stabil (invoice
 * lama yang di-edit belakangan tidak mengubah angka yang sudah pernah
 * dinotifikasi). BUKAN dipakai laporan Analisis on-demand (itu tetap hitung
 * real-time dari invoices, lihat task016 §12).
 *
 * `checkpoint` (§18, Aturan 2 "Report/Alert Monitoring" bulanan):
 *   'closed'    — periode TERTUTUP penuh (kuartal/semester/tahunan seperti
 *                 semula, DAN bulan tertutup untuk Trigger B "awal bulan baru").
 *   'mid_month' — Trigger A, checkpoint tanggal 14 (data 1-14 bulan berjalan,
 *                 periode BELUM tutup) — cuma relevan utk period_type='monthly'.
 * Kombinasi (customer_id, period_type, period_key, checkpoint) HARUS unik,
 * bukan cuma (customer_id, period_type, period_key) lagi — 1 bulan sekarang
 * bisa punya 2 snapshot (mid_month tgl 14 + closed awal bulan berikutnya).
 */
export const pareto_period_snapshots = pgTable('pareto_period_snapshots', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  customer_id: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  // monthly | quarter | semester | annual
  period_type: varchar('period_type', { length: 20 }).notNull(),
  // '2026-07' | '2026-Q3' | '2026-S2' | '2026'
  period_key: varchar('period_key', { length: 20 }).notNull(),
  // 'closed' | 'mid_month' — lihat komentar di atas
  checkpoint: varchar('checkpoint', { length: 20 }).notNull().default('closed'),
  revenue: numeric('revenue', { precision: 15, scale: 2 }).notNull().default('0'),
  margin: numeric('margin', { precision: 15, scale: 2 }).notNull().default('0'),
  computed_at: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueSnapshotPerCustomerPeriod: uniqueIndex('uq_pareto_snapshot_customer_period').on(
    table.customer_id,
    table.period_type,
    table.period_key,
    table.checkpoint,
  ),
}))

export type ParetoPeriodSnapshot = typeof pareto_period_snapshots.$inferSelect
export type NewParetoPeriodSnapshot = typeof pareto_period_snapshots.$inferInsert

// ─── notifications ────────────────────────────────────────────────────────────────

/**
 * Notifikasi in-app generik (task016 Fase B) — dipakai fitur alert Analisis
 * sekarang, didesain dipakai fitur lain nanti juga (bukan tabel khusus Pareto).
 * `entity_ref` jsonb bebas per `type` (mis. utk 'analisis_alert':
 * {customer_id, company_id, period_type, period_key, metric, pct}) — dipakai
 * deep-link dari notifikasi ke halaman Analisis yang relevan.
 */
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 50 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  entity_ref: jsonb('entity_ref').$type<Record<string, unknown>>(),
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  userUnreadIdx: index('idx_notifications_user_unread').on(table.user_id, table.is_read),
}))

export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert

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
