/**
 * middleware/rate-limit.ts
 *
 * In-memory sliding window rate limiter.
 * Cocok untuk single-server. Ganti store dengan Redis jika multi-instance.
 *
 * Usage:
 *   import { rateLimit } from '@/middleware/rate-limit'
 *
 *   route.post('/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 10 }), handler)
 */

import type { Context, Next } from 'hono'
import { AppError, ErrorCode } from '@/errors'

interface RateLimitOptions {
  windowMs: number  // ukuran window dalam milidetik
  max: number       // max request per window per key
  keyFn?: (c: Context) => string  // default: IP address
}

// store: key → sorted array of request timestamps (ms)
const store = new Map<string, number[]>()

// Bersihkan entry lama setiap menit agar tidak memory leak
setInterval(() => {
  const cutoff = Date.now() - 60 * 60 * 1000  // hapus data > 1 jam
  for (const [key, timestamps] of store.entries()) {
    const fresh = timestamps.filter((t) => t > cutoff)
    if (fresh.length === 0) store.delete(key)
    else store.set(key, fresh)
  }
}, 60_000).unref()  // .unref() agar tidak mencegah proses exit

function getIp(c: Context): string {
  return (
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    c.req.header('x-real-ip') ??
    'unknown'
  )
}

export function rateLimit(opts: RateLimitOptions) {
  const { windowMs, max, keyFn = getIp } = opts

  return async (c: Context, next: Next) => {
    const key = keyFn(c)
    const now = Date.now()
    const windowStart = now - windowMs

    const timestamps = (store.get(key) ?? []).filter((t) => t > windowStart)

    if (timestamps.length >= max) {
      const retryAfterSec = Math.ceil((timestamps[0] + windowMs - now) / 1000)
      c.header('Retry-After', String(retryAfterSec))
      throw new AppError(
        ErrorCode.RATE_LIMITED,
        `Terlalu banyak percobaan. Coba lagi dalam ${retryAfterSec} detik.`,
        429,
      )
    }

    timestamps.push(now)
    store.set(key, timestamps)

    await next()
  }
}
