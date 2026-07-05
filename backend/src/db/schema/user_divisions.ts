/**
 * db/schema/user_divisions.ts
 *
 * Junction table untuk kontrol akses level Division: users ↔ division (per branch).
 * Child dari Branch, BUKAN child langsung dari Company — division cuma bermakna
 * dalam konteks satu branch tertentu (Company → Branch → Division).
 *
 * Migration order: setelah users, company_branches
 * Dependency: users.id (FK), company_branches.id (FK)
 *
 * Divisi: distribution | project | e_commerce | intercompany | freelancer | support
 * (value sama seperti channel_divisions.division — lihat docs-v2/task/task001.md §3.2)
 *
 * company_id tidak diulang di sini karena sudah pasti didapat lewat
 * company_branches.company_id (branch cuma bisa dimiliki 1 company).
 *
 * Lihat docs-v2/task/task001.md §3.2
 */

import { pgTable, integer, varchar, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'
import { company_branches } from './company_branches'

export const userDivisions = pgTable(
  'user_divisions',
  {
    user_id: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    branch_id: integer('branch_id')
      .notNull()
      .references(() => company_branches.id, { onDelete: 'cascade' }),

    division: varchar('division', { length: 50 }).notNull(),
    // distribution | project | e_commerce | intercompany | freelancer | support

    created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.user_id, table.branch_id, table.division] }),
  }),
)

export type UserDivision = typeof userDivisions.$inferSelect
export type NewUserDivision = typeof userDivisions.$inferInsert
