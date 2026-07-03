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

// ssl: kebanyakan managed Postgres (Render Postgres, Neon, Supabase, dll) wajib
// SSL untuk koneksi eksternal — 'require' cukup untuk itu (tidak perlu bundle CA
// cert). Dev lokal (docker postgres) biasanya tidak listen SSL, jadi off.
//
// Dulu ini di-tie ke NODE_ENV === 'production', tapi itu salah: `make db-migrate`
// / `make db-seed` sengaja dijalankan dari lokal (NODE_ENV=development) TARGET ke
// DATABASE_URL production (lihat docs-v2/shared/deployment.md §3) — ssl:false
// maksa koneksi plaintext ke Neon walau connection string-nya sendiri sudah minta
// sslmode=require, dan Neon nolak dengan "connection is insecure". Deteksi dari
// host DATABASE_URL-nya sendiri, bukan dari NODE_ENV.
const isLocalDb = ['localhost', '127.0.0.1'].includes(new URL(env.DATABASE_URL).hostname)

// postgres-js client
// max: jumlah koneksi pool — sesuaikan dengan kebutuhan production
// onnotice: suppress noisy notices from Drizzle migrations / schema introspection
const client = postgres(env.DATABASE_URL, {
  max: env.NODE_ENV === 'production' ? 20 : 5,
  idle_timeout: 30,
  connect_timeout: 10,
  onnotice: () => {},
  ssl: isLocalDb ? false : 'require',
  // Paksa timezone WIB agar CURRENT_DATE konsisten dengan server (UTC+7)
  connection: { TimeZone: 'Asia/Jakarta' },
})

// Drizzle ORM instance dengan full schema
export const db = drizzle(client, { schema })

export type Database = typeof db