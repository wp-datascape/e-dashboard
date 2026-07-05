/**
 * db/schema/user_branches.ts
 *
 * Junction table untuk kontrol akses level Branch: users ↔ company_branches.
 * Child dari Company — branch cuma bermakna dalam konteks company yang jadi induknya.
 *
 * Migration order: setelah users, companies, company_branches
 * Dependency: users.id (FK), companies.id (FK), company_branches.id (FK)
 *
 * company_id teknisnya redundan (bisa didapat dari company_branches.company_id),
 * tapi disimpan eksplisit untuk validasi sanity-check saat insert dan menghindari
 * extra JOIN saat scope-check company sudah lebih dulu di-resolve.
 *
 * Lihat docs-v2/task/task001.md §3.1
 */

import { pgTable, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'
import { companies } from './companies'
import { company_branches } from './company_branches'

export const userBranches = pgTable(
  'user_branches',
  {
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    company_id: integer('company_id')
      .notNull()
      .references(() => companies.id, { onDelete: 'cascade' }),

    branch_id: integer('branch_id')
      .notNull()
      .references(() => company_branches.id, { onDelete: 'cascade' }),

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.company_id, table.branch_id] }),
  }),
)

export type UserBranch = typeof userBranches.$inferSelect
export type NewUserBranch = typeof userBranches.$inferInsert
