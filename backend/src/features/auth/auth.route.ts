import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'
import { env } from '@/config/env'
import { handleLogin, handleRefresh, handleLogout, handleMe, handleUpdatePreferences } from './auth.handler'

export const authRoutes = new Hono()

// 10 percobaan per 15 menit per IP — mencegah brute force. Di test/CI
// (NODE_ENV=test, otomatis di-set Bun saat `bun test`) SEMUA request
// in-process app.request() collapse ke key IP "unknown" yang SAMA (tidak
// ada koneksi socket asli) — budget 10 ini jadi dibagi rata ke SELURUH file
// e2e test yang kebetulan jalan dalam 1 proses `bun test` yang sama, bukan
// per-file. Ditemukan 2026-09-02: penambahan skenario per-role di
// metric-cache.e2e.test.ts (6 login sekaligus) menghabiskan budget gabungan
// itu, sampai men-fail-kan file lain yang SAMA SEKALI tidak disentuh
// (task013-intercompany, transactions-filter) — CI gagal, deploy dev/prod
// ikut ke-block. max dinaikkan jauh KHUSUS NODE_ENV=test, production tetap
// 10 (brute-force protection asli tidak berubah sama sekali).
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: env.NODE_ENV === 'test' ? 300 : 10 })

// 30 percobaan per 15 menit per IP — /refresh tidak lewat authMiddleware() (belum
// tentu ada c.var.user), jadi key default IP. Lebih longgar dari login karena refresh
// otomatis terjadi berkala dari browser (multi-tab/sesi wajar dari 1 IP), tapi tetap
// dibatasi — endpoint ini sebelumnya TIDAK ada rate limit sama sekali (Task002 Task B).
const refreshRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 })

// 20/5menit per user — self-service, sama seperti mutasi business_configs (Task002 Task B).
const preferencesRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

authRoutes.post('/login', loginRateLimit, handleLogin)
authRoutes.post('/refresh', refreshRateLimit, handleRefresh)
authRoutes.post('/logout', authMiddleware(), handleLogout)
authRoutes.get('/me', authMiddleware(), handleMe)
authRoutes.patch('/me/preferences', authMiddleware(), preferencesRateLimit, handleUpdatePreferences)
