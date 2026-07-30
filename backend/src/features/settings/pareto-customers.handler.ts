import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  createParetoCustomerSchema,
  updateParetoCustomerSchema,
  listParetoCustomersQuerySchema,
  paretoCustomerIdParamSchema,
  paretoCustomerOptionsQuerySchema,
} from './pareto-customers.schema'
import {
  listParetoCustomers,
  addParetoCustomer,
  editParetoCustomer,
  deactivateParetoCustomer,
  removeParetoCustomer,
  listCustomerOptionsForParetoService,
} from './pareto-customers.service'

export async function handleListParetoCustomers(c: Context) {
  const query = validateQuery(c, listParetoCustomersQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listParetoCustomers({ ...query, active_only: query.active_only ?? false }, scopeIds)
  return success(c, result)
}

export async function handleCreateParetoCustomer(c: Context) {
  const body = await validateBody(c, createParetoCustomerSchema)
  resolveCompanyScope(c, body.company_id) // throw 403 kalau company di luar akses user
  const userId = Number(c.req.header('x-user-id') ?? 1)
  const result = await addParetoCustomer(body, userId, c)
  return success(c, result, 'Created', 201)
}

export async function handleUpdateParetoCustomer(c: Context) {
  const { id } = validateParam(c, paretoCustomerIdParamSchema)
  const body = await validateBody(c, updateParetoCustomerSchema)
  const result = await editParetoCustomer(id, body, c)
  return success(c, result)
}

export async function handleDeactivateParetoCustomer(c: Context) {
  const { id } = validateParam(c, paretoCustomerIdParamSchema)
  const result = await deactivateParetoCustomer(id, c)
  return success(c, result)
}

export async function handleDeleteParetoCustomer(c: Context) {
  const { id } = validateParam(c, paretoCustomerIdParamSchema)
  await removeParetoCustomer(id, c)
  return success(c, { id })
}

export async function handleListParetoCustomerOptions(c: Context) {
  const query = validateQuery(c, paretoCustomerOptionsQuerySchema)
  resolveCompanyScope(c, query.company_id) // throw 403 kalau company di luar akses user
  const result = await listCustomerOptionsForParetoService(query.company_id)
  return success(c, result)
}
