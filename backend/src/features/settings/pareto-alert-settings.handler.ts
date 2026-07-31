import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  upsertParetoAlertSettingSchema,
  listParetoAlertSettingsQuerySchema,
} from './pareto-alert-settings.schema'
import { listParetoAlertSettings, upsertParetoAlertSettingService } from './pareto-alert-settings.service'

export async function handleListParetoAlertSettings(c: Context) {
  const query = validateQuery(c, listParetoAlertSettingsQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listParetoAlertSettings(scopeIds)
  return success(c, result)
}

export async function handleUpsertParetoAlertSetting(c: Context) {
  const body = await validateBody(c, upsertParetoAlertSettingSchema)
  const result = await upsertParetoAlertSettingService(body, c)
  return success(c, result)
}
