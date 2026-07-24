import { z } from 'zod'
import { MIN_THROTTLE_DELAY_MS, MAX_THROTTLE_DELAY_MS } from '@/middleware/network-throttle'

export const updateNetworkThrottleSchema = z.object({
  mode: z.enum(['off', '3g', '4g', 'offline']),
})
export type UpdateNetworkThrottleBody = z.infer<typeof updateNetworkThrottleSchema>

export const updateNetworkThrottleDelaySchema = z.object({
  mode: z.enum(['3g', '4g']),
  delay_ms: z.coerce.number().int().min(MIN_THROTTLE_DELAY_MS).max(MAX_THROTTLE_DELAY_MS),
})
export type UpdateNetworkThrottleDelayBody = z.infer<typeof updateNetworkThrottleDelaySchema>
