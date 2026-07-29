import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  findDivisions,
  findActiveDivisions,
  findDivisionById,
  findDivisionByKey,
  createDivision,
  updateDivision,
  deleteDivision,
  isDivisionInUse,
  findBranchById,
} from './divisions.repository'
import type { CreateDivisionDto, UpdateDivisionDto } from './divisions.schema'

function slugify(label: string): string {
  const slug = label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30)
  return slug || 'division'
}

export async function listDivisionsService(scopeIds?: number[]) {
  try {
    return await findDivisions(scopeIds)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar division', 500)
  }
}

export async function listActiveDivisionsService(companyId: number | 'all') {
  try {
    return await findActiveDivisions(companyId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar division', 500)
  }
}

export async function createDivisionService(body: CreateDivisionDto, ctx: Context) {
  try {
    const key = slugify(body.label)
    if (key === 'other') {
      throw new AppError(ErrorCode.VALIDATION_ERROR, '"other" adalah key terproteksi, tidak bisa dibuat manual', 400)
    }
    const branchId = body.branch_id ?? null
    if (branchId != null) {
      const branch = await findBranchById(branchId)
      if (!branch || branch.company_id !== body.company_id) {
        throw new AppError(ErrorCode.VALIDATION_ERROR, 'Branch tidak ditemukan atau bukan milik company ini', 400)
      }
    }
    const existing = await findDivisionByKey(body.company_id, branchId, key)
    if (existing.length > 0) {
      throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Division "${body.label}" sudah ada untuk company/branch ini`, 409)
    }
    const result = await createDivision({
      company_id: body.company_id,
      branch_id: branchId,
      key,
      label: body.label,
      dormant_category: body.dormant_category,
    })

    await logAudit(ctx, {
      action: 'division.create',
      entity: 'divisions',
      entityId: result!.id,
      companyId: body.company_id,
      newValue: { key, label: body.label, dormant_category: body.dormant_category, branch_id: branchId },
    })

    return result
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Division "${body.label}" sudah ada untuk company/branch ini`, 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat division', 500)
  }
}

export async function updateDivisionService(id: number, body: UpdateDivisionDto, ctx: Context) {
  try {
    const existing = await findDivisionById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Division dengan id ${id} tidak ditemukan`, 404)
    resolveCompanyScope(ctx, existing.company_id) // throw 403 kalau division ini di luar akses company user

    if (existing.is_protected && body.is_active === false) {
      throw new AppError(ErrorCode.RESOURCE_IN_USE, `Division "${existing.label}" adalah fallback wajib, tidak bisa dinonaktifkan`, 409)
    }

    const result = await updateDivision(id, body)

    await logAudit(ctx, {
      action: 'division.update',
      entity: 'divisions',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { label: existing.label, dormant_category: existing.dormant_category, is_active: existing.is_active },
      newValue: body,
    })

    return result
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate division', 500)
  }
}

export async function deleteDivisionService(id: number, ctx: Context) {
  try {
    const existing = await findDivisionById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Division dengan id ${id} tidak ditemukan`, 404)
    resolveCompanyScope(ctx, existing.company_id) // throw 403 kalau division ini di luar akses company user

    if (existing.is_protected) {
      throw new AppError(ErrorCode.RESOURCE_IN_USE, `Division "${existing.label}" adalah fallback wajib, tidak bisa dihapus`, 409)
    }

    const inUse = await isDivisionInUse(id)
    if (inUse) {
      throw new AppError(
        ErrorCode.RESOURCE_IN_USE,
        `Division "${existing.label}" masih dipakai channel mapping atau assignment akses user — nonaktifkan saja, jangan dihapus`,
        409,
      )
    }

    await deleteDivision(id)

    await logAudit(ctx, {
      action: 'division.delete',
      entity: 'divisions',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { key: existing.key, label: existing.label },
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus division', 500)
  }
}
