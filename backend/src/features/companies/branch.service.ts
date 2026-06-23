import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/errors'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import { getCompanyById } from './companies.service'
import {
  findBranchesByCompanyId,
  findBranchById,
  createBranch,
  updateBranch,
  deleteBranch,
} from './branch.repository'
import type { CreateBranchDto, UpdateBranchDto } from './branch.schema'

export async function getBranchesByCompany(companyId: number) {
  // Verify company exists
  await getCompanyById(companyId)
  return findBranchesByCompanyId(companyId)
}

export async function getBranchById(companyId: number, branchId: number) {
  const branch = await findBranchById(branchId)
  if (!branch) throw new AppError(ErrorCode.NOT_FOUND, 'Branch not found', 404)
  if (branch.company_id !== companyId) {
    throw new AppError(ErrorCode.FORBIDDEN, 'Branch does not belong to this company', 403)
  }
  return branch
}

export async function createBranchService(companyId: number, dto: CreateBranchDto, ctx: Context) {
  // Verify company exists
  await getCompanyById(companyId)

  const isActive: boolean = dto.is_active ?? true
  const branch = await createBranch({
    company_id: companyId,
    name: dto.name,
    code: dto.code,
    is_active: isActive,
  })

  logger.info('[branch] Branch created', { id: branch!.id, company_id: companyId, code: dto.code })

  await logAudit(ctx, {
    action: 'branch.create',
    entity: 'company_branches',
    entityId: branch!.id,
    companyId,
    newValue: { id: branch!.id, company_id: companyId, name: dto.name, code: dto.code, is_active: true },
  })

  return branch
}

export async function updateBranchService(companyId: number, branchId: number, dto: UpdateBranchDto, ctx: Context) {
  const existing = await getBranchById(companyId, branchId)

  const updated = await updateBranch(branchId, dto)
  logger.info('[branch] Branch updated', { id: branchId, company_id: companyId })

  await logAudit(ctx, {
    action: 'branch.update',
    entity: 'company_branches',
    entityId: branchId,
    companyId,
    oldValue: { name: existing.name, code: existing.code, is_active: existing.is_active },
    newValue: { name: updated?.name, code: updated?.code, is_active: updated?.is_active },
  })

  return updated
}

export async function deleteBranchService(companyId: number, branchId: number, ctx: Context) {
  const existing = await getBranchById(companyId, branchId)

  await deleteBranch(branchId)
  logger.info('[branch] Branch deleted', { id: branchId, company_id: companyId })

  await logAudit(ctx, {
    action: 'branch.delete',
    entity: 'company_branches',
    entityId: branchId,
    companyId,
    oldValue: { id: existing.id, company_id: companyId, name: existing.name, code: existing.code, is_active: existing.is_active },
  })
}