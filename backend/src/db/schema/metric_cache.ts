/**
 * db/schema/metric_cache.ts
 *
 * Cache hasil endpoint metrics (EDASHBOARD-591, task038.md) — 2 lapis
 * mitigasi staleness: TTL (expires_at, jaring pengaman utk perubahan data
 * yang belum terpikirkan) + invalidasi berbasis event (dihapus eksplisit
 * saat ada mutasi di fitur yang berdampak, lihat metric-cache.helper.ts).
 *
 * Selalu di-scope ke company_id TUNGGAL (bukan 'all') — lihat JSDoc
 * withMetricCache di metric-cache.helper.ts.
 */
import { pgTable, serial, integer, varchar, jsonb, timestamp, uniqueIndex, index } from 'drizzle-orm/pg-core'

export const metric_cache = pgTable('metric_cache', {
  id: serial('id').primaryKey(),
  company_id: integer('company_id').notNull(),
  metric_key: varchar('metric_key', { length: 60 }).notNull(),
  cache_key: varchar('cache_key', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  uniqueLookup: uniqueIndex('uq_metric_cache_lookup').on(table.company_id, table.metric_key, table.cache_key),
  // Dipakai job pembersihan baris kedaluwarsa (invalidateExpiredMetricCache)
  // — tanpa index ini, DELETE WHERE expires_at < now() full-scan tabel.
  idxExpiry: index('idx_metric_cache_expiry').on(table.expires_at),
}))

export type MetricCache = typeof metric_cache.$inferSelect
export type NewMetricCache = typeof metric_cache.$inferInsert
