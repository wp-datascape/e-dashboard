/**
 * db/schema/channel_divisions.ts
 *
 * Tabel channel_divisions — mapping channel_name → divisi channel penjualan.
 *
 * Migration order: setelah companies
 * Dependency: companies
 *
 * Divisi: distribution | project | e_commerce | intercompany | freelancer | support
 * company_id nullable = rule global (berlaku semua company)
 */
import {
  pgTable,
  serial,
  varchar,
  integer,
  timestamp,
} from 'drizzle-orm/pg-core'
import { companies } from './companies'

export const channel_divisions = pgTable('channel_divisions', {
  id: serial('id').primaryKey(),

  company_id: integer('company_id')
    .references(() => companies.id, { onDelete: 'cascade' }),
  // null = global rule (berlaku untuk semua company)

  channel_name: varchar('channel_name', { length: 255 }).notNull(),
  // Cocok dengan invoices.channel_name (UPPERCASE)

  division: varchar('division', { length: 50 }).notNull(),
  // distribution | project | e_commerce | intercompany | freelancer | support

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type ChannelDivision = typeof channel_divisions.$inferSelect
export type NewChannelDivision = typeof channel_divisions.$inferInsert
