import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth'
import { rateLimit } from '@/middleware/rate-limit'
import { handleLogin, handleRefresh, handleLogout, handleMe } from './auth.handler'

export const authRoutes = new Hono()

// 10 percobaan per 15 menit per IP — mencegah brute force
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

// 30 percobaan per 15 menit per IP — /refresh tidak lewat authMiddleware() (belum
// tentu ada c.var.user), jadi key default IP. Lebih longgar dari login karena refresh
// otomatis terjadi berkala dari browser (multi-tab/sesi wajar dari 1 IP), tapi tetap
// dibatasi — endpoint ini sebelumnya TIDAK ada rate limit sama sekali (Task002 Task B).
const refreshRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 30 })

authRoutes.post('/login', loginRateLimit, handleLogin)
authRoutes.post('/refresh', refreshRateLimit, handleRefresh)
authRoutes.post('/logout', authMiddleware(), handleLogout)
authRoutes.get('/me', authMiddleware(), handleMe)
