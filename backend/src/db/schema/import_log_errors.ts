/**
 * db/schema/import_log_errors.ts
 *
 * Tabel import_log_errors — detail error per baris dari operasi import.
 *
 * Migration order: 10th (setelah import_logs)
 * Dependency: import_logs
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
} from 'drizzle-orm/pg-core'
import { import_logs } from './import_logs'

export const import_log_errors = pgTable('import_log_errors', {
  id: serial('id').primaryKey(),

  import_log_id: integer('import_log_id')
    .notNull()
    .references(() => import_logs.id, { onDelete: 'cascade' }),

  row_number: integer('row_number'),

  raw_data: text('raw_data'),

  error_message: text('error_message').notNull(),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type ImportLogError = typeof import_log_errors.$inferSelect
export type NewImportLogError = typeof import_log_errors.$inferInsert