import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/utils/error'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import {
  createHighMargin,
  findHighMarginById,
  findHighMargins,
  updateHighMargin,
  closeHighMargin,
  deleteHighMargin,
} from './high-margin.repository'
import type { CreateHighMarginDto, UpdateHighMarginDto, ListHighMarginQuery } from './high-margin.schema'

export async function listHighMargins(query: ListHighMarginQuery, scopeIds?: number[]) {
  return findHighMargins({
    period: query.period,
    active_only: query.active_only ?? false,
  }, scopeIds)
}

export async function addHighMargin(dto: CreateHighMarginDto, userId: number, ctx: Context) {
  try {
    const mapping = await createHighMargin({
      company_id: dto.company_id,
      product_id: dto.product_id ?? null,
      product_category_id: dto.product_category_id ?? null,
      effective_from: dto.effective_from,
      effective_until: dto.effective_until ?? null,
      note: dto.note ?? null,
      created_by: userId,
    })

    await logAudit(ctx, {
      action: 'high_margin.create',
      entity: 'high_margin_products',
      entityId: mapping!.id,
      companyId: dto.company_id,
      newValue: { ...dto, created_by: userId },
    })

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

  const updated = await updateHighMargin(id, {
    effective_until: dto.effective_until ?? undefined,
    note: dto.note,
  })

  await logAudit(ctx, {
    action: 'high_margin.update',
    entity: 'high_margin_products',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { effective_until: existing.effective_until, note: existing.note },
    newValue: { effective_until: dto.effective_until, note: dto.note },
  })

  return updated
}

export async function deactivateHighMargin(id: number, ctx: Context) {
  const existing = await findHighMarginById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `High margin mapping #${id} tidak ditemukan`, 404)

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

  return result
}

export async function removeHighMargin(id: number, ctx: Context) {
  const existing = await findHighMarginById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `High margin mapping #${id} tidak ditemukan`, 404)

  await deleteHighMargin(id)

  await logAudit(ctx, {
    action: 'high_margin.delete',
    entity: 'high_margin_products',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { id: existing.id, company_id: existing.company_id },
  })
}
