/**
 * db/schema/permissions.ts
 *
 * Tabel permissions — daftar permission RBAC yang bisa di-assign ke role.
 *
 * Migration order: Setelah roles
 * Dependency: tidak ada FK langsung (relasi via role_permissions)
 *
 * Konvensi:
 * - name: unique identifier permission, e.g. 'user.create', 'user.read', 'invoice.import'
 * - category: grouping permissions, e.g. 'user', 'invoice', 'role', 'company'
 */

import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const permissions = pgTable('permissions', {
  id: serial('id').primaryKey(),

  name: varchar('name', { length: 100 }).unique().notNull(),
  // Unique permission identifier, e.g. 'user.create', 'user.read', 'invoice.import'

  description: text('description'),
  // Optional description of what this permission allows

  category: varchar('category', { length: 50 }),
  // Permission category for grouping, e.g. 'user', 'invoice', 'role', 'company'

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Permission = typeof permissions.$inferSelect
export type NewPermission = typeof permissions.$inferInsert