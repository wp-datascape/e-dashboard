import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { findConfigByKey, updateConfigValue } from '@/features/config/config.repository'
import {
  setNetworkThrottleMode, getNetworkThrottleDelays, setNetworkThrottleDelay,
  type NetworkThrottleMode, type ConfigurableThrottleMode,
} from '@/middleware/network-throttle'

const MODE_CONFIG_KEY = 'network_throttle_mode'
const DELAY_CONFIG_KEY: Record<ConfigurableThrottleMode, string> = {
  '3g': 'network_throttle_delay_3g_ms',
  '4g': 'network_throttle_delay_4g_ms',
}

export async function getNetworkThrottleSetting() {
  const row = await findConfigByKey(MODE_CONFIG_KEY)
  if (!row) throw new AppError(ErrorCode.NOT_FOUND, `Config "${MODE_CONFIG_KEY}" not found`, 404)
  return { ...row, delays: getNetworkThrottleDelays() }
}

export async function updateNetworkThrottleSetting(mode: NetworkThrottleMode, c: Context) {
  const existing = await findConfigByKey(MODE_CONFIG_KEY)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Config "${MODE_CONFIG_KEY}" not found`, 404)

  const updated = await updateConfigValue(MODE_CONFIG_KEY, mode)
  // Update cache in-memory YANG SAMA dipakai networkThrottleMiddleware — efektif
  // langsung, tidak perlu restart server / tunggu request lain refresh cache.
  setNetworkThrottleMode(mode)

  await logAudit(c, {
    action: 'ab_testing.network_throttle.update',
    entity: 'business_configs',
    entityId: MODE_CONFIG_KEY,
    companyId: null,
    oldValue: { mode: existing.value },
    newValue: { mode },
  })

  logger.warn(`[ab-testing] Network throttle mode changed to "${mode}" — affects ALL users globally`)
  return { ...updated, delays: getNetworkThrottleDelays() }
}

export async function updateNetworkThrottleDelaySetting(mode: ConfigurableThrottleMode, delayMs: number, c: Context) {
  const key = DELAY_CONFIG_KEY[mode]
  const existing = await findConfigByKey(key)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Config "${key}" not found`, 404)

  const updated = await updateConfigValue(key, String(delayMs))
  // Validasi range sudah dilakukan zod (schema) — setNetworkThrottleDelay tetap
  // validasi ulang sebagai jaring pengaman (dipanggil juga dari initNetworkThrottleFromDb).
  setNetworkThrottleDelay(mode, delayMs)

  await logAudit(c, {
    action: 'ab_testing.network_throttle.update_delay',
    entity: 'business_configs',
    entityId: key,
    companyId: null,
    oldValue: { mode, delay_ms: existing.value },
    newValue: { mode, delay_ms: delayMs },
  })

  logger.warn(`[ab-testing] Network throttle delay for "${mode}" changed to ${delayMs}ms`)
  return { ...updated, delays: getNetworkThrottleDelays() }
}
