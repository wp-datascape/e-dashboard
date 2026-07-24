import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody } from '@/utils/validator'
import { updateNetworkThrottleSchema, updateNetworkThrottleDelaySchema } from './ab-testing.schema'
import { getNetworkThrottleSetting, updateNetworkThrottleSetting, updateNetworkThrottleDelaySetting } from './ab-testing.service'

export async function handleGetNetworkThrottle(c: Context) {
  const row = await getNetworkThrottleSetting()
  return success(c, row)
}

export async function handleUpdateNetworkThrottle(c: Context) {
  const body = await validateBody(c, updateNetworkThrottleSchema)
  const updated = await updateNetworkThrottleSetting(body.mode, c)
  return success(c, updated)
}

export async function handleUpdateNetworkThrottleDelay(c: Context) {
  const body = await validateBody(c, updateNetworkThrottleDelaySchema)
  const updated = await updateNetworkThrottleDelaySetting(body.mode, body.delay_ms, c)
  return success(c, updated)
}
