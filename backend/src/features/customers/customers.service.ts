import { AppError, ErrorCode } from '@/utils/error'
import { isNotFoundError } from '@/utils/response'
import { findCustomers, findCustomerDetail } from './customers.repository'
import type { CustomersQuery } from './customers.schema'

export async function getCustomers(params: CustomersQuery) {
  try {
    const result = await findCustomers(params)
    return { data: result?.data ?? [], total: result?.total ?? 0 }
  } catch (err) {
    if (isNotFoundError(err)) return { data: [], total: 0 }
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data customer', 500)
  }
}

export async function getCustomerDetail(id: number) {
  try {
    const detail = await findCustomerDetail(id)
    if (!detail) throw new AppError(ErrorCode.NOT_FOUND, `Customer dengan id ${id} tidak ditemukan`, 404)
    return detail
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil detail customer', 500)
  }
}
