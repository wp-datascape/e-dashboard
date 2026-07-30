import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { logAudit } from '@/utils/audit'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  findParetoThresholdById,
  findParetoThresholds,
  upsertParetoThreshold,
  deleteParetoThreshold,
} from './pareto-thresholds.repository'
import type { UpsertParetoThresholdDto } from './pareto-thresholds.schema'

// Dipakai laporan Analisis on-demand kalau company belum set threshold
// custom untuk kombinasi period_type+metric tertentu — bukan hardcode permanen,
// admin tetap bisa override lewat UI (task016 §9).
export const DEFAULT_PARETO_DROP_PERCENT = 15

export async function listParetoThresholds(scopeIds?: number[]) {
  return findParetoThresholds(scopeIds)
}

export async function upsertParetoThresholdService(dto: UpsertParetoThresholdDto, ctx: Context) {
  try {
    resolveCompanyScope(ctx, dto.company_id) // throw 403 kalau company di luar akses user

    const result = await upsertParetoThreshold({
      company_id: dto.company_id,
      period_type: dto.period_type,
      metric: dto.metric,
      drop_percent: dto.drop_percent,
      is_active: dto.is_active ?? true,
    })

    await logAudit(ctx, {
      action: 'pareto_threshold.upsert',
      entity: 'pareto_alert_thresholds',
      entityId: result.id,
      companyId: dto.company_id,
      newValue: dto,
    })

    return result
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menyimpan threshold Pareto', 500)
  }
}

export async function removeParetoThresholdService(id: number, ctx: Context) {
  const existing = await findParetoThresholdById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Threshold #${id} tidak ditemukan`, 404)
  resolveCompanyScope(ctx, existing.company_id)

  await deleteParetoThreshold(id)

  await logAudit(ctx, {
    action: 'pareto_threshold.delete',
    entity: 'pareto_alert_thresholds',
    entityId: id,
    companyId: existing.company_id,
    oldValue: existing,
  })
}
