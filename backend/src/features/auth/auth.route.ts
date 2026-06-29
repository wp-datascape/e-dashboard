import { Hono } from 'hono'
import { authMiddleware } from '@/middleware/auth'
import { rateLimit } from '@/middleware/rate-limit'
import { handleLogin, handleRefresh, handleLogout, handleMe } from './auth.handler'

export const authRoutes = new Hono()

// 10 percobaan per 15 menit per IP — mencegah brute force
const loginRateLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 10 })

authRoutes.post('/login', loginRateLimit, handleLogin)
authRoutes.post('/refresh', handleRefresh)
authRoutes.post('/logout', authMiddleware(), handleLogout)
authRoutes.get('/me', authMiddleware(), handleMe)
