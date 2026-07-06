import { Hono } from 'hono'
import { handleGetPageSettings, handleUpdatePageSetting } from './page.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const pageRoutes = new Hono()

// BUG FIX (2026-07-06, ditemukan saat audit Task002 Task B): PUT/:pageKey sebelumnya
// TIDAK ADA requirePermission sama sekali — role apa pun (termasuk 'user' biasa tanpa
// permission config.features apa pun) bisa mematikan/menyalakan visibility halaman
// mana pun di seluruh aplikasi. Dikonfirmasi via curl langsung sebelum fix.
const pageMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

pageRoutes.get('/', handleGetPageSettings)
pageRoutes.put('/:pageKey', requirePermission('config.features:update'), pageMutationRateLimit, handleUpdatePageSetting)
