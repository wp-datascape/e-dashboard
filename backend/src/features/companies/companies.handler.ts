import type { Context } from 'hono'
import { success, noContent } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateBody, validateParam, validateQuery } from '@/utils/validator'
import {
  getCompanies, getCompanyById,
  createCompanyService, updateCompanyService, deleteCompanyService,
} from './companies.service'
import {
  getBranchesByCompany, getBranchById,
  createBranchService, updateBranchService, deleteBranchService,
} from './branch.service'
import { createCompanySchema, updateCompanySchema, companyIdParamSchema } from './companies.schema'
import { createBranchSchema, updateBranchSchema, branchIdParamSchema } from './branch.schema'
import { z } from 'zod'

const companyIdQuerySchema = z.object({ company_id: z.coerce.number().int().positive() })

// ─── Companies ────────────────────────────────────────────────────────────────

export async function handleGetCompanies(c: Context) {
  try {
    const rows = await getCompanies()
    return success(c, rows)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch companies', 500)
  }
}

export async function handleGetCompanyById(c: Context) {
  try {
    const { id } = validateParam(c, companyIdParamSchema)
    const company = await getCompanyById(id)
    return success(c, company)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch company', 500)
  }
}

export async function handleCreateCompany(c: Context) {
  try {
    const body = await validateBody(c, createCompanySchema)
    const company = await createCompanyService(body, c)
    return success(c, company, 'Company created', 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create company', 500)
  }
}

export async function handleUpdateCompany(c: Context) {
  try {
    const { id } = validateParam(c, companyIdParamSchema)
    const body = await validateBody(c, updateCompanySchema)
    const company = await updateCompanyService(id, body, c)
    return success(c, company)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update company', 500)
  }
}

export async function handleDeleteCompany(c: Context) {
  try {
    const { id } = validateParam(c, companyIdParamSchema)
    await deleteCompanyService(id, c)
    return noContent(c)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete company', 500)
  }
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export async function handleGetBranches(c: Context) {
  try {
    const { id } = validateParam(c, companyIdParamSchema)
    const rows = await getBranchesByCompany(id)
    return success(c, rows)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch branches', 500)
  }
}

export async function handleCreateBranch(c: Context) {
  try {
    const { id } = validateParam(c, companyIdParamSchema)
    const body = await validateBody(c, createBranchSchema)
    const branch = await createBranchService(id, body, c)
    return success(c, branch, 'Branch created', 201)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to create branch', 500)
  }
}

export async function handleUpdateBranch(c: Context) {
  try {
    const { branchId } = validateParam(c, branchIdParamSchema)
    const body = await validateBody(c, updateBranchSchema)
    const { company_id: companyId } = validateQuery(c, companyIdQuerySchema)
    const branch = await updateBranchService(companyId, branchId, body, c)
    return success(c, branch)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update branch', 500)
  }
}

export async function handleDeleteBranch(c: Context) {
  try {
    const { branchId } = validateParam(c, branchIdParamSchema)
    const { company_id: companyId } = validateQuery(c, companyIdQuerySchema)
    await deleteBranchService(companyId, branchId, c)
    return noContent(c)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to delete branch', 500)
  }
}
