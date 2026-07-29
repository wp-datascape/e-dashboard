import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import { resolveCompanyScope } from '@/middleware/auth'
import { loadDivisionFallbackIds } from '@/utils/scope'
import {
  findIntercompanyNames,
  findIntercompanyNameById,
  createIntercompanyName,
  deleteIntercompanyName,
  syncCustomerDivisionOverride,
  findAmbiguousChannels,
  findCustomerNameOptions,
} from './intercompany-names.repository'
import type { CreateIntercompanyNameDto } from './intercompany-names.schema'

export async function listIntercompanyNamesService(scopeIds?: number[]) {
  try {
    return await findIntercompanyNames(scopeIds)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar nama sister company', 500)
  }
}

export async function listCustomerNameOptionsService(companyId: number) {
  try {
    return await findCustomerNameOptions(companyId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar nama customer', 500)
  }
}

export async function listAmbiguousChannelsService(scopeIds?: number[]) {
  try {
    return await findAmbiguousChannels(scopeIds)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar channel ambigu', 500)
  }
}

export async function createIntercompanyNameService(body: CreateIntercompanyNameDto, ctx: Context) {
  try {
    const intercompanyIdByCompany = await loadDivisionFallbackIds('intercompany')
    const divisionId = intercompanyIdByCompany.get(body.company_id)
    if (!divisionId) {
      throw new AppError(ErrorCode.VALIDATION_ERROR, 'Company ini belum punya division "Intercompany" - jalankan seed division default dulu', 400)
    }

    const result = await createIntercompanyName(body)
    await syncCustomerDivisionOverride(body.company_id, body.customer_name, divisionId)

    await logAudit(ctx, {
      action: 'intercompany_name.create',
      entity: 'intercompany_customer_names',
      entityId: result!.id,
      companyId: body.company_id,
      newValue: body,
    })

    return result
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, `Nama "${body.customer_name}" sudah ada di daftar company ini`, 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menambah nama sister company', 500)
  }
}

export async function deleteIntercompanyNameService(id: number, ctx: Context) {
  try {
    const existing = await findIntercompanyNameById(id)
    if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Nama sister company dengan id ${id} tidak ditemukan`, 404)
    resolveCompanyScope(ctx, existing.company_id) // throw 403 kalau row ini di luar akses company user

    await deleteIntercompanyName(id)
    await syncCustomerDivisionOverride(existing.company_id, existing.customer_name, null)

    await logAudit(ctx, {
      action: 'intercompany_name.delete',
      entity: 'intercompany_customer_names',
      entityId: id,
      companyId: existing.company_id,
      oldValue: { customer_name: existing.customer_name },
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus nama sister company', 500)
  }
}
