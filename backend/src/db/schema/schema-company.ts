/**
 * db/schema/schema-company.ts
 *
 * Tabel-tabel domain Company/Branch/Division: companies, company_branches,
 * business_configs, accurate_credentials, dan junction table kontrol akses
 * berjenjang (user_branches, user_divisions) — lihat docs-v2/task/task001.md.
 *
 * Hierarki: Company -> Branch -> Division.
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
  unique,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users } from './schema-auth'

// ─── companies ────────────────────────────────────────────────────────────────

/**
 * Entitas perusahaan dalam holding group. code = unique identifier singkat
 * (e.g. 'PT_ABC'). Semua data operasional harus punya FK ke companies (company_id).
 */
export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 50 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert

// ─── company_branches ─────────────────────────────────────────────────────────

/**
 * Cabang perusahaan yang punya Accurate DB terpisah. Setiap company punya
 * minimal 1 branch ("Lainnya" = bucket invoice tanpa info branch spesifik,
 * bukan NULL — lihat §4.6). UNIQUE(company_id, code).
 */
export const company_branches = pgTable(
  'company_branches',
  {
    id: serial('id').primaryKey(),
    company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    // e.g. 'Lainnya', 'Surabaya', 'Jakarta', 'Semarang'
    code: varchar('code', { length: 50 }).notNull(),
    // e.g. 'LAINNYA', 'SBY', 'JKT', 'SMG'
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unq_company_branch_code: unique('unq_company_branch_code').on(table.company_id, table.code),
  }),
)

export type CompanyBranch = typeof company_branches.$inferSelect
export type NewCompanyBranch = typeof company_branches.$inferInsert

// ─── branch_divisions (renamed from `divisions`, 2026-07-10) ───────────────────

/**
 * Katalog divisi per company, opsional per branch — baris DB asli (mirror pola
 * company_branches), BUKAN enum global. `code` adalah string identifier unik
 * dalam scope (company, branch). Relasi eksplisit via FK `division_id` di
 * tabel lain — lihat docs-v2/task/task004.md dan docs-v2/MEMORY.md.
 *
 * branch_id NULL = berlaku company-wide (semua branch); diisi = spesifik 1
 * branch (mis. "Sales Counter" KNT berbeda per cabang).
 */
export const branch_divisions = pgTable(
  'branch_divisions',
  {
    id: serial('id').primaryKey(),
    company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    branch_id: integer('branch_id').references(() => company_branches.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 100 }).notNull(),
    code: varchar('code', { length: 50 }).notNull(),
    // b2b_dc | b2b_project | b2c | manufacturing — lihat ThresholdConfig['dormant']
    // (features/config/threshold.ts)
    dormant_bucket: varchar('dormant_bucket', { length: 20 }).notNull().default('b2b_dc'),
    is_active: boolean('is_active').notNull().default(true),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    unq_division_company_branch_code: unique('unq_division_company_branch_code').on(table.company_id, table.branch_id, table.code),
    // Partial unique index — UNIQUE biasa tidak menangkap duplikat company-wide
    // karena NULL tidak collide dengan NULL lain di Postgres.
    unq_division_company_code_global: uniqueIndex('unq_division_company_code_global')
      .on(table.company_id, table.code)
      .where(sql`${table.branch_id} IS NULL`),
  }),
)

export type BranchDivision = typeof branch_divisions.$inferSelect
export type NewBranchDivision = typeof branch_divisions.$inferInsert

// ─── business_configs ─────────────────────────────────────────────────────────

export const businessConfigs = pgTable('business_configs', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: varchar('value', { length: 255 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})

// ─── accurate_credentials ─────────────────────────────────────────────────────

/**
 * Kredensial API Accurate Online per branch. API Token WAJIB di-encrypt di DB
 * (AES-256-GCM, lihat utils/crypto) — tidak boleh di-log atau dikirim ke frontend.
 */
export const accurate_credentials = pgTable('accurate_credentials', {
  id: serial('id').primaryKey(),
  branch_id: integer('branch_id').notNull().unique().references(() => company_branches.id, { onDelete: 'cascade' }),
  // 'api_token' (recommended, stabil) | 'oauth'
  auth_method: varchar('auth_method', { length: 20 }).notNull().default('api_token'),
  // text (bukan varchar) — token Accurate + AES-256-GCM encrypt jadi sangat panjang
  api_token: text('api_token'),
  signature_secret: text('signature_secret'),
  client_id: varchar('client_id', { length: 255 }),
  client_secret: text('client_secret'),
  callback_url: varchar('callback_url', { length: 500 }),
  // Accurate subdomain — e.g. 'mko' dari 'mko.accurate.id'
  subdomain: varchar('subdomain', { length: 100 }).notNull(),
  // Accurate Online internal DB ID — didapat dari /api/db-list
  company_db_id: varchar('company_db_id', { length: 100 }),
  access_token: text('access_token'),
  refresh_token: text('refresh_token'),
  token_expires_at: timestamp('token_expires_at', { withTimezone: true }),
  is_active: boolean('is_active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type AccurateCredential = typeof accurate_credentials.$inferSelect
export type NewAccurateCredential = typeof accurate_credentials.$inferInsert

// ─── user_branches (junction: users <-> company_branches, child dari Company) ─

/**
 * Kontrol akses level Branch. company_id teknisnya redundan (bisa didapat dari
 * company_branches.company_id) tapi disimpan eksplisit utk sanity-check saat
 * insert dan menghindari extra JOIN saat scope-check company sudah di-resolve.
 * Lihat docs-v2/task/task001.md §3.1.
 */
export const userBranches = pgTable(
  'user_branches',
  {
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    company_id: integer('company_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
    branch_id: integer('branch_id').notNull().references(() => company_branches.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.company_id, table.branch_id] }),
  }),
)

export type UserBranch = typeof userBranches.$inferSelect
export type NewUserBranch = typeof userBranches.$inferInsert

// ─── user_divisions (junction: users <-> branch_divisions per branch, child dari Branch) ─

/**
 * Kontrol akses level Division — child dari Branch, BUKAN child langsung dari
 * Company (Company -> Branch -> Division). company_id tidak diulang di sini
 * karena sudah pasti didapat lewat company_branches.company_id (branch cuma
 * dimiliki 1 company). Lihat docs-v2/task/task001.md §3.2.
 *
 * `division_id` adalah FK eksplisit ke branch_divisions.id (revisi 2026-07-10,
 * sebelumnya varchar `division` — lihat docs-v2/MEMORY.md untuk alasan).
 */
export const userDivisions = pgTable(
  'user_divisions',
  {
    user_id: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    branch_id: integer('branch_id').notNull().references(() => company_branches.id, { onDelete: 'cascade' }),
    // FK eksplisit ke branch_divisions.id — bukan varchar lagi
    division_id: integer('division_id').notNull().references(() => branch_divisions.id, { onDelete: 'cascade' }),
    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.branch_id, table.division_id] }),
  }),
)

export type UserDivision = typeof userDivisions.$inferSelect
export type NewUserDivision = typeof userDivisions.$inferInsert