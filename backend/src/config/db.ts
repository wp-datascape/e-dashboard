/**
 * config/db.ts
 *
 * Single Drizzle ORM instance + PostgreSQL client.
 *
 * WAJIB: Semua repository harus import `db` dari sini.
 * DILARANG: Membuat koneksi postgres baru di luar file ini.
 *
 * Usage:
 *   import { db } from '@/config/db'
 *   const rows = await db.select().from(invoices).where(...)
 */

import postgres from 'postgres'
import { drizzle } from 'drizzle-orm/postgres-js'
import { env } from '@/config/env'
import * as schema from '@/db/schema'

// postgres-js client
// max: jumlah koneksi pool — sesuaikan dengan kebutuhan production
// onnotice: suppress noisy notices from Drizzle migrations / schema introspection
const client = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === 'production' ? 20 : 5,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
  // Paksa timezone WIB agar CURRENT_DATE konsisten dengan server (UTC+7)
  connection: { TimeZone: 'Asia/Jakarta' },
})

// Drizzle ORM instance dengan full schema
export const db = drizzle(client, { schema })

export type Database = typeof db