import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/utils/error'
import { isNotFoundError } from '@/utils/response'
import { resolveCompanyScope } from '@/middleware/auth'
import { findCustomers, findCustomerDetail } from './customers.repository'
import type { CustomersQuery } from './customers.schema'

export async function getCustomers(
  params: CustomersQuery,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  try {
    const result = await findCustomers(params, scopeIds, branchScope, divisionScope)
    return { data: result?.data ?? [], total: result?.total ?? 0 }
  } catch (err) {
    if (isNotFoundError(err)) return { data: [], total: 0 }
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data customer', 500)
  }
}

// task015 §2a — sebelum fix ini, endpoint detail customer TIDAK ADA validasi
// company_id sama sekali (celah RBAC, siapa pun yang login bisa lihat detail
// customer company mana pun). scopeIds diminta dengan requested='all' supaya
// TIDAK PERNAH throw 403 di sini (403 akan bocorin "row ini ada tapi bukan
// milikmu") — kalau di luar scope, dikembalikan NOT_FOUND, konsisten dengan pola
// findInvoiceDetail (row di luar scope = seolah tidak ada).
export async function getCustomerDetail(id: number, asOfDate: string | undefined, ctx: Context) {
  try {
    const detail = await findCustomerDetail(id, asOfDate)
    if (!detail) throw new AppError(ErrorCode.NOT_FOUND, `Customer dengan id ${id} tidak ditemukan`, 404)
    const scopeIds = resolveCompanyScope(ctx, 'all')
    if (scopeIds && !scopeIds.includes(detail.company.id)) {
      throw new AppError(ErrorCode.NOT_FOUND, `Customer dengan id ${id} tidak ditemukan`, 404)
    }
    return detail
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil detail customer', 500)
  }
}