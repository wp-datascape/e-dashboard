/**
 * config/env.ts
 *
 * Single source of truth untuk semua environment variables.
 * Bun otomatis load file .env — tidak perlu dotenv.
 *
 * WAJIB: Setiap file yang butuh env var harus import dari sini.
 * DILARANG: Mengakses process.env langsung di luar file ini.
 *
 * Usage:
 *   import { env } from '@/config/env'
 *   const db = postgres(env.DATABASE_URL)
 */

import { z } from 'zod'

const envSchema = z.object({
  // Server
  PORT: z
    .string()
    .default('3000')
    .transform((val) => Number(val)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  // JWT
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

  // CSRF
  CSRF_SECRET: z.string().min(32, 'CSRF_SECRET must be at least 32 characters'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Upload
  UPLOAD_MAX_SIZE_MB: z
    .string()
    .default('10')
    .transform((val) => Number(val)),

  // Encryption
  CREDENTIALS_ENCRYPTION_KEY: z.string().min(32, 'CREDENTIALS_ENCRYPTION_KEY must be at least 32 characters'),

  // Account Lockout (Task002 Task C — konfigurasi via ENV, bukan hardcode, supaya
  // threshold/durasi bisa diubah tanpa deploy kode baru)
  ACCOUNT_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(5),
  ACCOUNT_LOCKOUT_DURATION_MINUTES: z.coerce.number().int().positive().default(30),

  // Telegram Alert (Task002 Task E) — optional: kalau tidak diisi, sendTelegramAlert()
  // no-op (skip diam-diam, tidak crash) supaya env lain (test/CI) tidak wajib setup bot.
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),

  // Metric Cache (EDASHBOARD-591, task038.md) — TTL jaring pengaman utk cache
  // hasil endpoint metrics (customer-metrics/cross-selling/expansion-breakdown).
  // Default 30 menit — cukup pendek utk data tetap terasa segar, cukup panjang
  // utk benar-benar menghemat query berat (~5 detik) yg sama dipanggil ulang.
  METRIC_CACHE_TTL_MINUTES: z.coerce.number().int().positive().default(30),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('[env] Invalid or missing environment variables:')
  for (const [key, messages] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`  ${key}: ${messages?.join(', ')}`)
  }
  process.exit(1)
}

export const env = parsed.data

export type Env = typeof env