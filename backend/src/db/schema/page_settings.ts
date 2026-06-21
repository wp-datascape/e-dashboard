/**
 * db/schema/page_settings.ts
 *
 * Tabel page_settings — menyimpan status kesiapan setiap halaman aplikasi.
 *
 * Gunaan:
 * - Frontend cek apakah halaman sudah siap (ready=true) sebelum render
 * - Jika ready=false, halaman tampilkan "Under Maintenance" atau kosong
 * - Ketika fitur baru selesai, update ready=true via API
 *
 * Migration order: Setelah users, sebelum audit_logs
 * Dependency: tidak ada FK
 *
 * Konvensi:
 * - pageKey: unique identifier, format lowercase-with-dashes
 * - ready: default false (safer — hidden until explicitly ready)
 * - created_at, updated_at: untuk audit trail
 */

import {
  pgTable,
  serial,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'

export const pageSettings = pgTable('page_settings', {
  id: serial('id').primaryKey(),

  pageKey: varchar('page_key', { length: 100 }).unique().notNull(),
  // Unique identifier for each page
  // Examples: 'dashboard', 'users', 'products', 'transactions', 'import', 'rbac', 'config', 'audit-log'

  ready: boolean('ready').notNull().default(false),
  // Is this page fully implemented, tested, and ready for production?

  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type PageSetting = typeof pageSettings.$inferSelect
export type NewPageSetting = typeof pageSettings.$inferInsert