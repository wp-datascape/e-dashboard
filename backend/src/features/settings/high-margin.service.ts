import { AppError, ErrorCode } from '@/utils/error'
import { isDuplicateError } from '@/utils/response'
import {
  createHighMargin,
  findHighMarginById,
  findHighMargins,
  updateHighMargin,
  closeHighMargin,
  deleteHighMargin,
} from './high-margin.repository'
import type { CreateHighMarginDto, UpdateHighMarginDto, ListHighMarginQuery } from './high-margin.schema'

export async function listHighMargins(query: ListHighMarginQuery) {
  return findHighMargins({
    company_id: query.company_id,
    period: query.period,
    active_only: query.active_only ?? false,
  })
}

export async function addHighMargin(dto: CreateHighMarginDto, userId: number) {
  try {
    return await createHighMargin({
      company_id: dto.company_id,
      product_id: dto.product_id ?? null,
      product_category_id: dto.product_category_id ?? null,
      effective_from: dto.effective_from,
      effective_until: dto.effective_until ?? null,
      note: dto.note ?? null,
      created_by: userId,
    })
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'High margin mapping sudah ada', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat high margin mapping', 500)
  }
}

export async function editHighMargin(id: number, dto: UpdateHighMarginDto) {
  const existing = await findHighMarginById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `High margin mapping #${id} tidak ditemukan`, 404)

  return updateHighMargin(id, {
    effective_until: dto.effective_until ?? undefined,
    note: dto.note,
  })
}

export async function deactivateHighMargin(id: number) {
  const existing = await findHighMarginById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `High margin mapping #${id} tidak ditemukan`, 404)

  const today = new Date().toISOString().split('T')[0]
  return closeHighMargin(id, today)
}

export async function removeHighMargin(id: number) {
  const existing = await findHighMarginById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `High margin mapping #${id} tidak ditemukan`, 404)

  await deleteHighMargin(id)
}
