import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { isDuplicateError } from '@/utils/response'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import {
  findAllCompanies,
  findCompanyById,
  findCompanyByCode,
  createCompany,
  updateCompany,
  deleteCompany,
} from './companies.repository'
import { seedDefaultItemTypes } from '@/features/settings/item-types.repository'
import { seedDefaultDivisions } from '@/features/settings/divisions.repository'
import type { CreateCompanyDto, UpdateCompanyDto } from './companies.schema'

export async function getCompanies(companyIds?: number[]) {
  return findAllCompanies(companyIds)
}

export async function getCompanyById(id: number) {
  const company = await findCompanyById(id)
  if (!company) throw new AppError(ErrorCode.NOT_FOUND, 'Company not found', 404)
  return company
}

export async function createCompanyService(dto: CreateCompanyDto, ctx: Context) {
  try {
    const existing = await findCompanyByCode(dto.code)
    if (existing) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Company code already in use', 409)

    const company = await createCompany(dto)
    logger.info('[company] Company created', { id: company!.id, code: dto.code })

    // Item Type per company (task011) - company baru langsung punya 4 default
    // (unit/consumable/sparepart/service), tidak kosong pas pertama kali dipakai.
    await seedDefaultItemTypes(company!.id)

    // Division per company (task012 v2) - company baru langsung punya 7 default
    // (distribution/project/e_commerce/intercompany/freelancer/support/other),
    // company-wide (branch_id NULL).
    await seedDefaultDivisions(company!.id)

    await logAudit(ctx, {
      action: 'company.create',
      entity: 'companies',
      entityId: company!.id,
      companyId: null,
      newValue: { id: company!.id, code: dto.code, name: dto.name },
    })

    return company
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Company code already in use', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create company', 500)
  }
}

export async function updateCompanyService(id: number, dto: UpdateCompanyDto, ctx: Context) {
  try {
    const existing = await getCompanyById(id)

    if (dto.code && dto.code !== existing.code) {
      const codeExists = await findCompanyByCode(dto.code)
      if (codeExists) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Company code already in use', 409)
    }

    const company = await updateCompany(id, dto)
    logger.info('[company] Company updated', { id })

    await logAudit(ctx, {
      action: 'company.update',
      entity: 'companies',
      entityId: id,
      companyId: null,
      oldValue: { code: existing.code, name: existing.name },
      newValue: { code: dto.code ?? existing.code, name: dto.name ?? existing.name },
    })

    return company
  } catch (err) {
    if (isDuplicateError(err)) throw new AppError(ErrorCode.DUPLICATE_ENTRY, 'Company code already in use', 409)
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update company', 500)
  }
}

export async function deleteCompanyService(id: number, ctx: Context) {
  const existing = await getCompanyById(id)

  await deleteCompany(id)
  logger.info('[company] Company deleted', { id })

  await logAudit(ctx, {
    action: 'company.delete',
    entity: 'companies',
    entityId: id,
    companyId: null,
    oldValue: { id: existing.id, code: existing.code, name: existing.name },
  })
}