import { AppError, ErrorCode } from '@/utils/error'
import { findInvoices, findInvoiceDetail } from './transactions.repository'
import type { InvoicesQuery } from './transactions.schema'

export async function getInvoices(
  params: InvoicesQuery,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  try {
    return await findInvoices(params, scopeIds, branchScope, divisionScope)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data transaksi', 500)
  }
}

export async function getInvoiceDetail(
  id: number,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  try {
    const detail = await findInvoiceDetail(id, scopeIds, branchScope, divisionScope)
    if (!detail) throw new AppError(ErrorCode.NOT_FOUND, `Invoice dengan id ${id} tidak ditemukan`, 404)
    return detail
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil detail transaksi', 500)
  }
}
