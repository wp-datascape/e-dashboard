import type { Context } from 'hono'
import { z } from 'zod'
import { success, noContent } from '@/utils/response'
import { validateBody, validateParam, validateQuery } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  getCompanies, getCompanyById,
  createCompanyService, updateCompanyService, deleteCompanyService,
} from './companies.service'
import {
  getBranchesByCompany,
  createBranchService, updateBranchService, deleteBranchService,
} from './branch.service'
import { createCompanySchema, updateCompanySchema, companyIdParamSchema } from './companies.schema'
import { createBranchSchema, updateBranchSchema, branchIdParamSchema } from './branch.schema'

const companyIdQuerySchema = z.object({ company_id: z.coerce.number().int().positive() })

// ─── Companies ────────────────────────────────────────────────────────────────

export async function handleGetCompanies(c: Context) {
  const { companyIds, isSuperAdmin } = c.var.user
  const rows = await getCompanies(isSuperAdmin ? undefined : companyIds)
  return success(c, rows)
}

export async function handleGetCompanyById(c: Context) {
  const { id } = validateParam(c, companyIdParamSchema)
  const company = await getCompanyById(id)
  return success(c, company)
}

export async function handleCreateCompany(c: Context) {
  const body = await validateBody(c, createCompanySchema)
  const company = await createCompanyService(body, c)
  return success(c, company, 'Company created', 201)
}

export async function handleUpdateCompany(c: Context) {
  const { id } = validateParam(c, companyIdParamSchema)
  const body = await validateBody(c, updateCompanySchema)
  const company = await updateCompanyService(id, body, c)
  return success(c, company)
}

export async function handleDeleteCompany(c: Context) {
  const { id } = validateParam(c, companyIdParamSchema)
  await deleteCompanyService(id, c)
  return noContent(c)
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export async function handleGetBranches(c: Context) {
  const { id } = validateParam(c, companyIdParamSchema)
  // resolveCompanyScope (2026-08-31) — endpoint ini sekarang TANPA
  // requirePermission (lihat companies.route.ts), jadi guard company-scope
  // WAJIB dipindah ke sini sendiri — throw 403 kalau `id` di luar
  // companyIds user (celah RBAC company-scope, beda dari izin CRUD Settings
  // yang sebelumnya jadi satu-satunya penjaga di sini).
  resolveCompanyScope(c, id)
  const rows = await getBranchesByCompany(id)
  return success(c, rows)
}

export async function handleCreateBranch(c: Context) {
  const { id } = validateParam(c, companyIdParamSchema)
  const body = await validateBody(c, createBranchSchema)
  const branch = await createBranchService(id, body, c)
  return success(c, branch, 'Branch created', 201)
}

export async function handleUpdateBranch(c: Context) {
  const { branchId } = validateParam(c, branchIdParamSchema)
  const { company_id: companyId } = validateQuery(c, companyIdQuerySchema)
  const body = await validateBody(c, updateBranchSchema)
  const branch = await updateBranchService(companyId, branchId, body, c)
  return success(c, branch)
}

export async function handleDeleteBranch(c: Context) {
  const { branchId } = validateParam(c, branchIdParamSchema)
  const { company_id: companyId } = validateQuery(c, companyIdQuerySchema)
  await deleteBranchService(companyId, branchId, c)
  return noContent(c)
}
