/**
 * db/schema/user_companies.ts
 *
 * Junction table untuk relasi many-to-many: users ↔ companies
 *
 * Migration order: Setelah companies dan users
 * Dependency: users.id (FK), companies.id (FK)
 */

import { pgTable, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'
import { companies } from './companies'

export const userCompanies = pgTable(
  'user_companies',
  {
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    company_id: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.company_id] }),
  }),
)

export type UserCompany = typeof userCompanies.$inferSelect
export type NewUserCompany = typeof userCompanies.$inferInsert