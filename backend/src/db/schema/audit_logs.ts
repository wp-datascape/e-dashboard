/**
 * db/schema/audit_logs.ts
 *
 * Tabel audit_logs — immutable log setiap mutasi yang terjadi di sistem.
 *
 * Migration order: setelah companies dan users (FK ke keduanya).
 * Dependency: companies.id, users.id
 *
 * Konvensi:
 * - Tidak ada updated_at / deleted_at — log bersifat immutable.
 * - actor_id nullable: bisa NULL jika aksi dilakukan sistem (e.g. import otomatis).
 * - company_id nullable: beberapa aksi bersifat global (e.g. user.create super-admin).
 * - old_value / new_value / meta disimpan sebagai jsonb.
 * - entity_id disimpan sebagai varchar karena bisa berupa UUID atau integer.
 *
 * Field sesuai dengan utils/audit.ts INSERT statement:
 *   actor_id, action, entity, entity_id, company_id,
 *   old_value, new_value, meta, ip_address, request_id, created_at
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core'
import { users } from './users'
import { companies } from './companies'

export const auditLogs = pgTable('audit_logs', {
  id: serial('id').primaryKey(),

  /** User yang melakukan aksi — null jika sistem */
  actor_id: integer('actor_id').references(() => users.id, {
    onDelete: 'set null',
  }),

  /** Action yang terjadi, e.g. 'user.create', 'invoice.import' */
  action: varchar('action', { length: 100 }).notNull(),

  /** Nama tabel yang terpengaruh, e.g. 'users', 'roles', 'import_logs' */
  entity: varchar('entity', { length: 100 }).notNull(),

  /** ID row yang terpengaruh — disimpan sebagai string (mendukung int dan UUID) */
  entity_id: varchar('entity_id', { length: 255 }).notNull(),

  /** Perusahaan dalam konteks mutasi — null untuk aksi global */
  company_id: integer('company_id').references(() => companies.id, {
    onDelete: 'set null',
  }),

  /** State sebelum mutasi (untuk update/delete) */
  old_value: jsonb('old_value'),

  /** State setelah mutasi (untuk create/update) */
  new_value: jsonb('new_value'),

  /** Konteks tambahan, e.g. { filename, total_rows } untuk import */
  meta: jsonb('meta'),

  /** IP address actor */
  ip_address: varchar('ip_address', { length: 45 }),

  /** Request ID untuk tracing (dari header x-request-id) */
  request_id: varchar('request_id', { length: 100 }),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type AuditLog = typeof auditLogs.$inferSelect
export type NewAuditLog = typeof auditLogs.$inferInsert