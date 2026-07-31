import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { logAudit } from '@/utils/audit'
import { resolveCompanyScope } from '@/middleware/auth'
import { findParetoAlertSettings, upsertParetoAlertSetting } from './pareto-alert-settings.repository'
import type { UpsertParetoAlertSettingDto } from './pareto-alert-settings.schema'

export async function listParetoAlertSettings(scopeIds?: number[]) {
  return findParetoAlertSettings(scopeIds)
}

export async function upsertParetoAlertSettingService(dto: UpsertParetoAlertSettingDto, ctx: Context) {
  try {
    resolveCompanyScope(ctx, dto.company_id) // throw 403 kalau company di luar akses user

    const result = await upsertParetoAlertSetting(dto.company_id, dto.scheduler_enabled)

    await logAudit(ctx, {
      action: 'pareto_alert_setting.upsert',
      entity: 'pareto_alert_settings',
      entityId: result.id,
      companyId: dto.company_id,
      newValue: dto,
    })

    return result
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menyimpan pengaturan alert', 500)
  }
}
