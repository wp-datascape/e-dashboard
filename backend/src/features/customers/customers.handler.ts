import type { Context } from 'hono'
import { success, paginated } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateQuery, validateParam } from '@/utils/validator'
import { customersQuerySchema, customerIdParamSchema } from './customers.schema'
import { findCustomers, findCustomerDetail } from './customers.repository'

export async function handleGetCustomers(c: Context) {
  try {
    const query = validateQuery(c, customersQuerySchema)
    const result = await findCustomers(query)
    return paginated(c, result.data, {
      page: query.page,
      per_page: query.per_page,
      total: result.total,
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil data customer', 500)
  }
}

export async function handleGetCustomerDetail(c: Context) {
  try {
    const { id } = validateParam(c, customerIdParamSchema)
    const detail = await findCustomerDetail(id)
    if (!detail) throw new AppError(ErrorCode.NOT_FOUND, `Customer dengan id ${id} tidak ditemukan`)
    return success(c, detail)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil detail customer', 500)
  }
}
