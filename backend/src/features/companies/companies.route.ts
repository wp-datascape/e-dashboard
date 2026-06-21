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
  createCompanySchema,
  updateCompanySchema,
  companyIdParamSchema,
} from './companies.schema'

export const companiesRoutes = new Hono()

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