import { pgTable, serial, varchar, text, timestamp } from 'drizzle-orm/pg-core'

export const businessConfigs = pgTable('business_configs', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 100 }).notNull().unique(),
  value: varchar('value', { length: 255 }).notNull(),
  description: text('description'),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
})