/**
 * db/schema/user_roles.ts
 *
 * Junction table untuk relasi many-to-many: users ↔ roles
 *
 * Migration order: Setelah roles dan users
 * Dependency: users.id (FK), roles.id (FK)
 */

import { pgTable, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { users } from './users'
import { roles } from './roles'

export const userRoles = pgTable(
  'user_roles',
  {
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  }),
)

export type UserRole = typeof userRoles.$inferSelect
export type NewUserRole = typeof userRoles.$inferInsert