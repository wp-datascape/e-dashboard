/**
 * db/schema/users.ts
 *
 * Tabel users — menyimpan data user untuk autentikasi dan RBAC.
 *
 * Migration order: 2nd (setelah companies)
 * Dependency: tidak ada FK langsung ke tabel lain (relasi di user_roles, user_companies)
 *
 * Konvensi:
 * - Soft delete via deleted_at (nullable timestamp)
 * - Password di-hash dengan bcryptjs cost >= 12
 * - is_active = false berarti user tidak bisa login (tetapi data tetap ada)
 */

import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id: serial('id').primaryKey(),

  name: varchar('name', { length: 255 }).notNull(),

  email: varchar('email', { length: 255 }).notNull().unique(),

  password: varchar('password', { length: 255 }).notNull(),

  is_active: boolean('is_active').notNull().default(true),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  last_login_at: timestamp('last_login_at', { withTimezone: true }),

  deleted_at: timestamp('deleted_at', { withTimezone: true }),
})

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert