import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/utils/error'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import { resolveCompanyScope } from '@/middleware/auth'
import { loadDivisionFallbackIds } from '@/utils/scope'
import { invalidateMetricCache } from '@/features/metrics/metric-cache.helper'
import {
  createHighMargin,
  findHighMarginById,
  findHighMargins,
  updateHighMargin,
  setHighMarginDivisions,
  closeHighMargin,
  deleteHighMargin,
} from './high-margin.repository'
import type { CreateHighMarginDto, UpdateHighMarginDto, ListHighMarginQuery } from './high-margin.schema'

// task017 — divisi 'intercompany' TIDAK BOLEH jadi target produk fokus KPI (bukan
// divisi penjualan, biasanya malah di-exclude dari laporan revenue lewat toggle
// terpisah). Dicek di service layer (butuh lookup DB), bukan schema Zod murni.
async function assertNoIntercompanyDivision(companyId: number, divisionIds: number[]) {
  const intercompanyIdByCompany = await loadDivisionFallbackIds('intercompany')
  const intercompanyId = intercompanyIdByCompany.get(companyId)
  if (intercompanyId != null && divisionIds.includes(intercompanyId)) {
    throw new AppError(ErrorCode.VALIDATION_ERROR, 'Divisi Intercompany tidak bisa dijadikan target produk fokus', 400)
  }
}

export async function listHighMargins(query: ListHighMarginQuery, scopeIds?: number[]) {
  return findHighMargins({
    period: query.period,
    active_only: query.active_only ?? false,
  }, scopeIds)
}

export async function addHighMargin(dto: CreateHighMarginDto, userId: number, ctx: Context) {
  await assertNoIntercompanyDivision(dto.company_id, dto.division_ids)
  try {
    const mapping = await createHighMargin({
      company_id: dto.company_id,
      product_id: dto.product_id ?? null,
      product_category_id: dto.product_category_id ?? null,
      effective_from: dto.effective_from,
      effective_until: dto.effective_until ?? null,
      note: dto.note ?? null,
      created_by: userId,
    }, dto.division_ids)

    await logAudit(ctx, {
      action: 'high_margin.create',
      entity: 'high_margin_products',
      entityId: mapping!.id,
      companyId: dto.company_id,
      newValue: { ...dto, created_by: userId },
    })
    await invalidateMetricCache(dto.company_id) // EDASHBOARD-591, task038.md

    return mapping
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'High margin mapping sudah ada', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat high margin mapping', 500)
  }
}

export async function editHighMargin(id: number, dto: UpdateHighMarginDto, ctx: Context) {
  const existing = await findHighMarginById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `High margin mapping #${id} tidak ditemukan`, 404)
  resolveCompanyScope(ctx, existing.company_id) // task015 §2c — throw 403 kalau mapping ini di luar akses company user
  await assertNoIntercompanyDivision(existing.company_id, dto.division_ids)

  const updated = await updateHighMargin(id, {
    effective_until: dto.effective_until ?? undefined,
    note: dto.note,
  })
  await setHighMarginDivisions(id, dto.division_ids)

  await logAudit(ctx, {
    action: 'high_margin.update',
    entity: 'high_margin_products',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { effective_until: existing.effective_until, note: existing.note },
    newValue: { effective_until: dto.effective_until, note: dto.note },
  })
  await invalidateMetricCache(existing.company_id) // EDASHBOARD-591, task038.md

  return updated
}

export async function deactivateHighMargin(id: number, ctx: Context) {
  const existing = await findHighMarginById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `High margin mapping #${id} tidak ditemukan`, 404)
  resolveCompanyScope(ctx, existing.company_id) // task015 §2c — throw 403 kalau mapping ini di luar akses company user

  const today = new Date().toISOString().split('T')[0]
  const result = await closeHighMargin(id, today)

  await logAudit(ctx, {
    action: 'high_margin.deactivate',
    entity: 'high_margin_products',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { effective_until: existing.effective_until, is_active: 'active' },
    newValue: { effective_until: today, is_active: 'deactivated' },
  })
  await invalidateMetricCache(existing.company_id) // EDASHBOARD-591, task038.md

  return result
}

export async function removeHighMargin(id: number, ctx: Context) {
  const existing = await findHighMarginById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `High margin mapping #${id} tidak ditemukan`, 404)
  resolveCompanyScope(ctx, existing.company_id) // task015 §2d — defense-in-depth (settings.product:delete saat ini superadmin-only)

  await deleteHighMargin(id)

  await logAudit(ctx, {
    action: 'high_margin.delete',
    entity: 'high_margin_products',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { id: existing.id, company_id: existing.company_id },
  })
  await invalidateMetricCache(existing.company_id) // EDASHBOARD-591, task038.md
}
