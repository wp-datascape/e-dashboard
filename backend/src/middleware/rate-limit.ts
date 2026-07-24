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
import type { Server } from 'bun'
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

export function getIp(c: Context): string {
  const fromHeader =
    c.req.header('cf-connecting-ip') ??
    c.req.header('x-forwarded-for')?.split(',')[0].trim() ??
    c.req.header('x-real-ip')
  if (fromHeader) return fromHeader

  // Fallback ke koneksi socket langsung — penting untuk dev lokal (tanpa reverse
  // proxy di depan, jadi header di atas semua tidak ada). Bun.serve({ fetch: app.fetch })
  // meneruskan instance Server sebagai argumen ke-2 ke fetch, yang oleh Hono
  // diekspos sebagai c.env — bukan header, jadi hasilnya socket asli, tidak bisa
  // dipalsukan client. Di production (Railway dkk, ada reverse proxy), baris ini
  // praktis tidak pernah kepakai karena x-forwarded-for di atas sudah match duluan.
  const server = c.env as Server<unknown> | undefined
  const socketIp = server?.requestIP?.(c.req.raw)?.address
  return socketIp ?? 'unknown'
}

/**
 * Key by authenticated user (bukan IP) — dipakai utk endpoint mutasi sensitif
 * (RBAC/user) yang WAJIB lewat authMiddleware() duluan di chain (Layer 3
 * `protectedApi.use('*', authMiddleware())` di router.ts), jadi c.var.user
 * sudah pasti terisi. Rate-limit per-user (bukan per-IP) supaya kantor dengan
 * banyak admin di 1 IP tidak saling memblokir, tapi 1 akun yang di-abuse/
 * kompromis tetap dibatasi. Fallback ke IP kalau somehow user belum ada.
 */
export function keyByUser(c: Context): string {
  const userId = c.var.user?.userId
  return userId ? `user:${userId}` : getIp(c)
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
