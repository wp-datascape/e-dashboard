/**
 * db/schema/roles.ts
 *
 * Tabel roles — daftar role RBAC yang bisa di-assign ke user.
 *
 * Migration order: 3rd (setelah companies + users)
 * Dependency: tidak ada FK langsung (relasi via user_roles)
 *
 * Konvensi:
 * - is_system: role bawaan sistem (superadmin, admin, dll) — tidak bisa dihapus/rename
 * - name: unique identifier role, e.g. 'superadmin', 'manager'
 * - Default system roles: superadmin, admin, manager, sales, executive
 */

import {
  pgTable,
  serial,
  varchar,
  boolean,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'

export const roles = pgTable('roles', {
  id: serial('id').primaryKey(),

  name: varchar('name', { length: 100 }).unique().notNull(),
  // Unique role identifier, e.g. 'superadmin', 'admin', 'manager', 'sales', 'executive'

  description: text('description'),
  // Optional description of what this role can do

  is_system: boolean('is_system').notNull().default(false),
  // System roles cannot be deleted or renamed

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type Role = typeof roles.$inferSelect
export type NewRole = typeof roles.$inferInsert