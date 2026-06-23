/**
 * db/schema/accurate_credentials.ts
 *
 * Tabel accurate_credentials — menyimpan kredensial API Accurate Online per branch.
 * API Token adalah metode yang direkomendasikan (lebih stabil dari OAuth).
 *
 * Migration order: after company_branches
 * Dependency: company_branches (FK)
 *
 * Security rules:
 * - API Token WAJIB di-encrypt di DB (AES-256-GCM) — lihat utils/crypto
 * - Tidak boleh di-log atau dikirim ke frontend
 * - Hanya digunakan di layer service
 *
 * Auth methods:
 * - api_token: Bearer token langsung (recommended, stabil)
 * - oauth: OAuth 2.0 client_credentials (butuh refresh token handling)
 */

import {
  pgTable,
  serial,
  integer,
  varchar,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core'
import { company_branches } from './company_branches'

export const accurate_credentials = pgTable('accurate_credentials', {
  id: serial('id').primaryKey(),

  branch_id: integer('branch_id')
    .notNull()
    .unique()
    .references(() => company_branches.id, { onDelete: 'cascade' }),

  auth_method: varchar('auth_method', { length: 20 })
    .notNull()
    .default('api_token'),
  // 'api_token' | 'oauth'

  // API Token method (recommended)
  // text (bukan varchar) — Accurate token sangat panjang (JWT multi-part)
  // setelah AES-256-GCM encrypt menjadi lebih panjang lagi, varchar(500) tidak cukup
  api_token: text('api_token'),
  // Bearer token — WAJIB encrypt di DB layer

  // Signature Secret for HMAC-SHA256 signing
  signature_secret: text('signature_secret'),

  // OAuth 2.0 method (alternate)
  client_id: varchar('client_id', { length: 255 }),
  client_secret: text('client_secret'),
  callback_url: varchar('callback_url', { length: 500 }),

  // Accurate subdomain — e.g. 'mko' from 'mko.accurate.id'
  subdomain: varchar('subdomain', { length: 100 }).notNull(),

  // Accurate Online internal DB ID — didapat dari /api/db-list
  company_db_id: varchar('company_db_id', { length: 100 }),

  // OAuth token management
  access_token: text('access_token'),
  refresh_token: text('refresh_token'),
  token_expires_at: timestamp('token_expires_at', { withTimezone: true }),

  is_active: boolean('is_active').notNull().default(true),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type AccurateCredential = typeof accurate_credentials.$inferSelect
export type NewAccurateCredential = typeof accurate_credentials.$inferInsert