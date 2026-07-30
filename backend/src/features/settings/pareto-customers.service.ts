import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { isDuplicateError } from '@/utils/response'
import { logAudit } from '@/utils/audit'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  createParetoCustomer,
  findParetoCustomerById,
  findParetoCustomers,
  updateParetoCustomer,
  closeParetoCustomer,
  deleteParetoCustomer,
  findCustomerOptionsForPareto,
} from './pareto-customers.repository'
import type { CreateParetoCustomerDto, UpdateParetoCustomerDto, ListParetoCustomersQuery } from './pareto-customers.schema'

export async function listParetoCustomers(query: ListParetoCustomersQuery, scopeIds?: number[]) {
  return findParetoCustomers({
    active_only: query.active_only ?? false,
  }, scopeIds)
}

export async function listCustomerOptionsForParetoService(companyId: number) {
  try {
    return await findCustomerOptionsForPareto(companyId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar customer', 500)
  }
}

export async function addParetoCustomer(dto: CreateParetoCustomerDto, userId: number, ctx: Context) {
  try {
    const mapping = await createParetoCustomer({
      company_id: dto.company_id,
      customer_id: dto.customer_id,
      effective_from: dto.effective_from,
      effective_until: dto.effective_until ?? null,
      note: dto.note ?? null,
      created_by: userId,
    })

    await logAudit(ctx, {
      action: 'pareto_customer.create',
      entity: 'pareto_customers',
      entityId: mapping!.id,
      companyId: dto.company_id,
      newValue: { ...dto, created_by: userId },
    })

    return mapping
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Customer ini sudah ditandai sebagai Pareto', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menandai customer sebagai Pareto', 500)
  }
}

export async function editParetoCustomer(id: number, dto: UpdateParetoCustomerDto, ctx: Context) {
  const existing = await findParetoCustomerById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Pareto customer #${id} tidak ditemukan`, 404)
  resolveCompanyScope(ctx, existing.company_id)

  const updated = await updateParetoCustomer(id, {
    effective_until: dto.effective_until ?? undefined,
    note: dto.note,
  })

  await logAudit(ctx, {
    action: 'pareto_customer.update',
    entity: 'pareto_customers',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { effective_until: existing.effective_until, note: existing.note },
    newValue: { effective_until: dto.effective_until, note: dto.note },
  })

  return updated
}

export async function deactivateParetoCustomer(id: number, ctx: Context) {
  const existing = await findParetoCustomerById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Pareto customer #${id} tidak ditemukan`, 404)
  resolveCompanyScope(ctx, existing.company_id)

  const today = new Date().toISOString().split('T')[0]
  const result = await closeParetoCustomer(id, today)

  await logAudit(ctx, {
    action: 'pareto_customer.deactivate',
    entity: 'pareto_customers',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { effective_until: existing.effective_until, is_active: 'active' },
    newValue: { effective_until: today, is_active: 'deactivated' },
  })

  return result
}

export async function removeParetoCustomer(id: number, ctx: Context) {
  const existing = await findParetoCustomerById(id)
  if (!existing) throw new AppError(ErrorCode.NOT_FOUND, `Pareto customer #${id} tidak ditemukan`, 404)
  resolveCompanyScope(ctx, existing.company_id)

  await deleteParetoCustomer(id)

  await logAudit(ctx, {
    action: 'pareto_customer.delete',
    entity: 'pareto_customers',
    entityId: id,
    companyId: existing.company_id,
    oldValue: { id: existing.id, company_id: existing.company_id },
  })
}
