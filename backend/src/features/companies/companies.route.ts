import { Hono } from 'hono'
import { success, noContent } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import {
  getCompanies,
  getCompanyById,
  createCompanyService,
  updateCompanyService,
  deleteCompanyService,
} from './companies.service'
import {
  getBranchesByCompany,
  getBranchById,
  createBranchService,
  updateBranchService,
  deleteBranchService,
} from './branch.service'
import {
  createCompanySchema,
  updateCompanySchema,
  companyIdParamSchema,
} from './companies.schema'
import {
  createBranchSchema,
  updateBranchSchema,
  branchIdParamSchema,
} from './branch.schema'

export const companiesRoutes = new Hono()

// ─── Company Routes ─────────────────────────────────────────────────────────────

// GET /companies
companiesRoutes.get('/', async (c) => {
  const rows = await getCompanies()
  return success(c, rows)
})

// GET /companies/:id
companiesRoutes.get('/:id', async (c) => {
  const { id } = validateParam(c, companyIdParamSchema)
  const company = await getCompanyById(id)
  return success(c, company)
})

// POST /companies
companiesRoutes.post('/', async (c) => {
  const body = await validateBody(c, createCompanySchema)
  const company = await createCompanyService(body, c)
  return success(c, company, 'Company created', 201)
})

// PATCH /companies/:id
companiesRoutes.patch('/:id', async (c) => {
  const { id } = validateParam(c, companyIdParamSchema)
  const body = await validateBody(c, updateCompanySchema)
  const company = await updateCompanyService(id, body, c)
  return success(c, company)
})

// DELETE /companies/:id
companiesRoutes.delete('/:id', async (c) => {
  const { id } = validateParam(c, companyIdParamSchema)
  await deleteCompanyService(id, c)
  return noContent(c)
})

// ─── Branch Routes ──────────────────────────────────────────────────────────────

// GET /companies/:id/branches — list branches of a company
companiesRoutes.get('/:id/branches', async (c) => {
  const { id } = validateParam(c, companyIdParamSchema)
  const rows = await getBranchesByCompany(id)
  return success(c, rows)
})

// POST /companies/:id/branches — create branch for company
companiesRoutes.post('/:id/branches', async (c) => {
  const { id } = validateParam(c, companyIdParamSchema)
  const body = await validateBody(c, createBranchSchema)
  const branch = await createBranchService(id, body, c)
  return success(c, branch, 'Branch created', 201)
})

// PATCH /companies/branches/:branchId — update branch (companyId from body or param)
companiesRoutes.patch('/branches/:branchId', async (c) => {
  const { branchId } = validateParam(c, branchIdParamSchema)
  const body = await validateBody(c, updateBranchSchema)
  // We need company_id in the request context. Assume we get it from query param.
  const companyId = Number(c.req.query('company_id'))
  if (!companyId || isNaN(companyId)) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'company_id query param is required' }, 400)
  }
  const branch = await updateBranchService(companyId, branchId, body, c)
  return success(c, branch)
})

// DELETE /companies/branches/:branchId — delete branch
companiesRoutes.delete('/branches/:branchId', async (c) => {
  const { branchId } = validateParam(c, branchIdParamSchema)
  const companyId = Number(c.req.query('company_id'))
  if (!companyId || isNaN(companyId)) {
    return c.json({ error: 'VALIDATION_ERROR', message: 'company_id query param is required' }, 400)
  }
  await deleteBranchService(companyId, branchId, c)
  return noContent(c)
})
