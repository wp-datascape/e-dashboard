/**
 * db/schema/company_branches.ts
 *
 * Tabel company_branches — cabang perusahaan yang punya Accurate DB terpisah.
 * Digunakan untuk mapping multi-branch PT KNT yang punya 3 Accurate DB.
 *
 * Migration order: after companies
 * Dependency: companies (FK)
 *
 * Konvensi:
 * - Setiap company punya minimal 1 branch (Pusat)
 * - PT KNT punya 3 branch: Surabaya, Jakarta, Semarang
 * - code: kode singkat cabang, e.g. 'PUSAT', 'SBY', 'JKT', 'SMG'
 * - UNIQUE(company_id, code) — tidak boleh ada duplikat kode dalam satu company
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  boolean,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const company_branches = pgTable(
  'company_branches',
  {
    id: serial('id').primaryKey(),

    company_id: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    name: varchar('name', { length: 100 }).notNull(),
    // e.g. 'Pusat', 'Surabaya', 'Jakarta', 'Semarang'

    code: varchar('code', { length: 50 }).notNull(),
    // e.g. 'PUSAT', 'SBY', 'JKT', 'SMG'

    is_active: boolean('is_active').notNull().default(true),

    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),

    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    unq_company_branch_code: unique('unq_company_branch_code').on(
      table.company_id,
      table.code,
    ),
  }),
)

export type CompanyBranch = typeof company_branches.$inferSelect
export type NewCompanyBranch = typeof company_branches.$inferInsert