import { Hono } from 'hono'
import { handleGetNetworkThrottle, handleUpdateNetworkThrottle, handleUpdateNetworkThrottleDelay } from './ab-testing.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const abTestingRoutes = new Hono()

// Mempengaruhi SEMUA user secara global — threshold rendah supaya tidak
// gampang di-toggle bolak-balik tanpa sengaja/abuse (mirror pola configMutationRateLimit).
const networkThrottleMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

abTestingRoutes.get('/network-throttle', requirePermission('access.ab_testing:view'), handleGetNetworkThrottle)
abTestingRoutes.put('/network-throttle', requirePermission('access.ab_testing:update'), networkThrottleMutationRateLimit, handleUpdateNetworkThrottle)
abTestingRoutes.put('/network-throttle/delay', requirePermission('access.ab_testing:update'), networkThrottleMutationRateLimit, handleUpdateNetworkThrottleDelay)
