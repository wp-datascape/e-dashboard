/**
 * db/schema/companies.ts
 *
 * Tabel companies — entitas perusahaan dalam holding group.
 *
 * Migration order: 1st (sebelum semua tabel lain yang punya FK ke companies)
 * Dependency: tidak ada FK
 *
 * Konvensi:
 * - code: unique identifier singkat, e.g. PT_ABC
 * - Semua data operasional harus punya FK ke companies (company_id)
 */

import {
  pgTable,
  serial,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core'

export const companies = pgTable('companies', {
  id: serial('id').primaryKey(),

  code: varchar('code', { length: 50 }).unique().notNull(),
  // e.g. 'PT_ABC', 'PT_XYZ', 'PT_DEF'

  name: varchar('name', { length: 255 }).notNull(),
  // e.g. 'PT ABC Sejahtera'

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Company = typeof companies.$inferSelect
export type NewCompany = typeof companies.$inferInsert
