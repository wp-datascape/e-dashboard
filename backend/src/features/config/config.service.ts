import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { findAllConfigs, findConfigByKey, updateConfigValue } from './config.repository'

export async function getConfigs() {
  return findAllConfigs()
}

export async function updateConfig(key: string, body: { value: string }, c: Context) {
  const existing = await findConfigByKey(key)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Config "${key}" not found`)

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
  return updated
}