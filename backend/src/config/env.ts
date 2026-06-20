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