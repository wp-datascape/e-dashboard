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
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    companyId: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.companyId] }),
  }),
)

export type UserCompany = typeof userCompanies.$inferSelect
export type NewUserCompany = typeof userCompanies.$inferInsert