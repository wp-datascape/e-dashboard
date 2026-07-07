/**
 * middleware/security.ts
 *
 * Security headers + CORS — dipisah dari router.ts (Task002 §3 Task A) supaya
 * konfigurasinya gampang diaudit/diubah di satu tempat, bukan tercampur dengan
 * urutan mount route.
 *
 * Keduanya dipasang di Layer 1 (global, semua request) — lihat router.ts.
 */

import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { env } from '@/config/env'

/**
 * xFrameOptions eksplisit 'DENY' (default hono cuma SAMEORIGIN) — app ini tidak
 * pernah di-embed via iframe di mana pun, DENY lebih ketat dan tidak ada downside.
 *
 * strictTransportSecurity cuma aktif di production — dev jalan di http://localhost,
 * kirim HSTS di situ bisa "mengunci" browser paksa https utk localhost, merepotkan dev.
 *
 * Header lain pakai default hono yang sudah aman: X-Content-Type-Options nosniff,
 * Cross-Origin-Resource-Policy same-origin, Referrer-Policy no-referrer, dll.
 */
export const securityHeadersMiddleware = secureHeaders({
  xFrameOptions: 'DENY',
  strictTransportSecurity: env.NODE_ENV === 'production' ? 'max-age=15552000; includeSubDomains' : false,
})

/**
 * origin: whitelist eksplisit dari CORS_ORIGIN env (bukan '*') — WAJIB karena
 * credentials:true (browser menolak kombinasi origin '*' + credentials).
 *
 * allowHeaders: whitelist eksplisit 2 header yang benar-benar dipakai client
 * (Content-Type, X-CSRF-Token) — sebelumnya tidak di-set sama sekali, hono
 * fallback ke REFLECT apa pun yang diminta browser di preflight
 * (Access-Control-Request-Headers), bukan whitelist nyata.
 *
 * allowMethods: eksplisit (match default hono, didokumentasikan biar jelas apa
 * yang benar-benar dipakai — tidak ada TRACE/CONNECT yang tidak pernah dipakai API ini).
 *
 * maxAge: cache preflight OPTIONS 10 menit di browser — kurangi round-trip
 * OPTIONS berulang untuk request beruntun, aman karena config CORS statis.
 */
export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN.split(',').map((o) => o.trim()),
  credentials: true,
  allowHeaders: ['Content-Type', 'X-CSRF-Token'],
  allowMethods: ['GET', 'HEAD', 'PUT', 'POST', 'DELETE', 'PATCH'],
  maxAge: 600,
})
