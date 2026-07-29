import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/utils/error'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  findItemTypes,
  findActiveItemTypes,
  findItemTypeById,
  findItemTypeByKey,
  createItemType,
  updateItemType,
  deleteItemType,
  isItemTypeInUse,
} from './item-types.repository'
import type { CreateItemTypeDto, UpdateItemTypeDto } from './item-types.schema'

function slugify(label: string): string {
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30)
  return slug || 'item'
}

export async function listItemTypesService(scopeIds?: number[]) {
  try {
    return await findItemTypes(scopeIds)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar item type', 500)
  }
}

export async function listActiveItemTypesService(companyId: number | 'all') {
  try {
    return await findActiveItemTypes(companyId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar item type', 500)
  }
}

export async function createItemTypeService(body: CreateItemTypeDto, ctx: Context) {
  try {
    const key = slugify(body.label)
    const existing = await findItemTypeByKey(body.company_id, key)
    if (existing.length > 0) {
      throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Item type "${body.label}" sudah ada untuk company ini`, 409)
    }
    const result = await createItemType({ company_id: body.company_id, key, label: body.label })

    await logAudit(ctx, {
      action: 'item_type.create',
      entity: 'item_types',
      entityId: result!.id,
      companyId: body.company_id,
      newValue: { key, label: body.label },
    })

    return result
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Item type "${body.label}" sudah ada untuk company ini`, 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat item type', 500)
  }
}

export async function updateItemTypeService(id: number, body: UpdateItemTypeDto, ctx: Context) {
  try {
    const existing = await findItemTypeById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Item type dengan id ${id} tidak ditemukan`, 404)
    resolveCompanyScope(ctx, existing.company_id) // task015 §2d — defense-in-depth (config.classification:* saat ini superadmin-only)

    const result = await updateItemType(id, body)

    await logAudit(ctx, {
      action: 'item_type.update',
      entity: 'item_types',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { label: existing.label, is_active: existing.is_active },
      newValue: body,
    })

    return result
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate item type', 500)
  }
}

export async function deleteItemTypeService(id: number, ctx: Context) {
  try {
    const existing = await findItemTypeById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Item type dengan id ${id} tidak ditemukan`, 404)
    resolveCompanyScope(ctx, existing.company_id) // task015 §2d — defense-in-depth (config.classification:* saat ini superadmin-only)

    const inUse = await isItemTypeInUse(existing.company_id, existing.key)
    if (inUse) {
      throw new AppError(
        ErrorCode.RESOURCE_IN_USE,
        `Item type "${existing.label}" masih dipakai kategori produk atau aturan klasifikasi — nonaktifkan saja, jangan dihapus`,
        409,
      )
    }

    await deleteItemType(id)

    await logAudit(ctx, {
      action: 'item_type.delete',
      entity: 'item_types',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { key: existing.key, label: existing.label },
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus item type', 500)
  }
}
