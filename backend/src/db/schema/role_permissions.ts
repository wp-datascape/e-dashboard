/**
 * db/schema/role_permissions.ts
 *
 * Junction table untuk relasi many-to-many: roles ↔ permissions
 *
 * Migration order: Setelah roles dan permissions
 * Dependency: roles.id (FK), permissions.id (FK)
 */

import { pgTable, integer, timestamp, primaryKey } from 'drizzle-orm/pg-core'
import { roles } from './roles'
import { permissions } from './permissions'

export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: integer('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),

    permissionId: integer('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  }),
)

export type RolePermission = typeof rolePermissions.$inferSelect
export type NewRolePermission = typeof rolePermissions.$inferInsert