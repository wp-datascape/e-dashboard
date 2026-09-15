/**
 * db/schema/customer_status_snapshot.ts
 *
 * Precompute status pelanggan (EDASHBOARD-TBD, task040.md) — 6 Status Dasar
 * resmi (Glosarium `frontend/src/i18n/locales/id/help/glossary.md`):
 * Acquisition, Active Customer, Reactivated, Lapsed, Dormant (+ Relapsed,
 * penanda tambahan pada subset Dormant, kolom terpisah bukan status ke-6).
 *
 * Dihitung SEKALI oleh scheduler saat checkpoint periode berganti (bukan
 * on-demand per request) — checkpoint selalu periode TERTUTUP penuh
 * (resolveStatusCheckpointDate, period.util.ts), jadi statis sepanjang
 * periode berjalan sampai periode berikutnya mulai. Dipakai gantikan
 * hitung-ulang LATERAL per-customer yang mahal di 4 tempat (M3-M7, M8-M10,
 * Customer Workbench, M7 drilldown) — lihat task040.md untuk detail bug
 * yang melatarbelakangi (timeout `fetchExpansionBreakdown`).
 *
 * division_id NULLABLE (NULL = "semua divisi") — status dormant/reaktivasi
 * DIVISION-SCOPED saat filter divisi aktif (established_not_dormant,
 * m3m7.repository.ts), disengaja bukan bug, lihat task040.md.
 */
import { pgTable, serial, integer, varchar, date, boolean, numeric, timestamp, unique, index } from 'drizzle-orm/pg-core'
import { companies, divisions } from './schema-company'
import { customers } from './schema-transaction'

export const customer_status_snapshot = pgTable('customer_status_snapshot', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  // NULL = agregat semua divisi (tanpa filter) — lihat catatan atas.
  division_id: integer('division_id').references(() => divisions.id, { onDelete: 'cascade' }),
  period_type: varchar('period_type', { length: 10 }).notNull(), // 'monthly'|'quarter'|'semester'|'annual'
  checkpoint_date: date('checkpoint_date').notNull(), // hasil resolveStatusCheckpointDate
  customer_id: integer('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
  // salah satu 5 status mutually-exclusive: acquisition|active|reactivated|lapsed|dormant
  status: varchar('status', { length: 20 }).notNull(),
  // penanda tambahan, cuma relevan kalau status='dormant' (sempat reactivated, dormant lagi)
  is_relapsed: boolean('is_relapsed').notNull().default(false),
  // last_invoice_date (2026-09-15, susulan migrasi M8-M10) — invoice
  // TERAKHIR customer ini sampai/pada checkpoint_date (sama persis
  // `cxm.last_at_me` di computeCustomerStatusSnapshot, sekadar dipersist).
  // Dibutuhkan M8 (severity split Dormant Ringan/Kronis - berapa kelipatan
  // dormant_threshold sudah lewat sejak last_invoice_date) yang TIDAK bisa
  // dijawab dari `status` mutually-exclusive saja. NULL mustahil terjadi
  // (status manapun di tabel ini SELALU py minimal 1 invoice - itu syarat
  // established/acquisition) - nullable murni krn kolom date lain di skema
  // app ini (mis. customers.last_invoice_date) juga nullable by convention.
  last_invoice_date: date('last_invoice_date'),
  // revenue/gross_profit/transaction_count (task041.md, HOLDINGIT-699,
  // 2026-09-16) — SUM/COUNT invoice customer ini s/d checkpoint_date, basis
  // SAMA PERSIS `cxm.last_at_me` di atas (invoice_date <= checkpoint_date,
  // TANPA batas bawah - kumulatif seumur hidup s/d checkpoint, bukan cuma
  // 1 periode). Precision numeric SAMA `invoices.total_revenue/total_gp`
  // (schema-transaction.ts) - kolom turunan dari agregasi yang sama, bukan
  // definisi baru. HANYA valid utk mode apply_date_cutoff OFF (checkpoint
  // tertutup penuh) - mode cutoff AKTIF (live, prorata hari berjalan) TETAP
  // hitung on-demand, di luar cakupan precompute ini (lihat task041.md).
  revenue: numeric('revenue', { precision: 15, scale: 2 }).notNull().default('0'),
  gross_profit: numeric('gross_profit', { precision: 15, scale: 2 }).notNull().default('0'),
  transaction_count: integer('transaction_count').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  // nullsNotDistinct() WAJIB — division_id NULL ("semua divisi") tanpa ini
  // Postgres anggap tiap NULL beda (unique constraint standar TIDAK
  // mencegah duplikat antar-baris NULL), snapshot company_id=X+division
  // NULL bisa dobel tiap scheduler run ulang.
  uniqueCustomerPerCheckpoint: unique('uq_customer_status_snapshot').on(
    table.company_id, table.division_id, table.period_type, table.checkpoint_date, table.customer_id,
  ).nullsNotDistinct(),
  // Dipakai 4 KPI buat JOIN gate is_dormant + agregasi per-status (COUNT GROUP BY status)
  idxLookup: index('idx_customer_status_snapshot_lookup').on(
    table.company_id, table.division_id, table.period_type, table.checkpoint_date,
  ),
}))

export type CustomerStatusSnapshot = typeof customer_status_snapshot.$inferSelect
export type NewCustomerStatusSnapshot = typeof customer_status_snapshot.$inferInsert
