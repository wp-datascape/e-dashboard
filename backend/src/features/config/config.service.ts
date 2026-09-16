import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { findAllConfigs, findConfigByKey, updateConfigValue } from './config.repository'
import { invalidateAllMetricCache } from '@/features/metrics/metric-cache.helper'
import { invalidateAllCustomerStatusSnapshot } from '@/features/metrics/customer-status-scheduler'

// customer_status_snapshot (task040.md, 2026-09-13) — HANYA key yang benar-benar
// jadi input computeCustomerStatusSnapshot (activeMonths/dormantThresholdCaseSql)
// yang perlu memicu recompute SEMUA company. Key config LAIN (mis. feature flag
// branch_division_enforcement_enabled) tidak mempengaruhi status pelanggan sama
// sekali - memicu recompute penuh di situ cuma buang beban DB tanpa manfaat
// (pelajaran dari regresi performa invalidateMetricCache, lihat metric-cache.helper.ts).
const CUSTOMER_STATUS_RELEVANT_CONFIG_KEYS = (key: string): boolean =>
  key === 'active_window_months' || key.startsWith('dormant_threshold_months.')

export async function getConfigs() {
  return findAllConfigs()
}

export async function updateConfig(key: string, body: { value: string }, c: Context) {
  const existing = await findConfigByKey(key)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Config "${key}" not found`, 404)

  const updated = await updateConfigValue(key, body.value)

  await logAudit(c, {
    action: 'config.update',
    entity: 'business_configs',
    entityId: key,
    companyId: null,
    oldValue: { key, value: existing.value },
    newValue: { key, value: body.value },
  })

  logger.info(`Config updated: ${key} = ${body.value}`)
  // EDASHBOARD-591, task038.md — business_configs GLOBAL (company_id null di
  // audit log di atas), invalidasi cache SEMUA company sekaligus, bukan cuma
  // 1 (tidak tahu company_id spesifik yang kena dari config generik ini).
  await invalidateAllMetricCache()
  if (CUSTOMER_STATUS_RELEVANT_CONFIG_KEYS(key)) invalidateAllCustomerStatusSnapshot()
  return updated
}