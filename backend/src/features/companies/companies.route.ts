import { Hono } from 'hono'
import {
  handleGetCompanies, handleGetCompanyById, handleCreateCompany,
  handleUpdateCompany, handleDeleteCompany,
  handleGetBranches, handleCreateBranch, handleUpdateBranch, handleDeleteBranch,
} from './companies.handler'

export const companiesRoutes = new Hono()

// ─── Company Routes ───────────────────────────────────────────────────────────
companiesRoutes.get('/', handleGetCompanies)
companiesRoutes.get('/:id', handleGetCompanyById)
companiesRoutes.post('/', handleCreateCompany)
companiesRoutes.patch('/:id', handleUpdateCompany)
companiesRoutes.delete('/:id', handleDeleteCompany)

// ─── Branch Routes ────────────────────────────────────────────────────────────
companiesRoutes.get('/:id/branches', handleGetBranches)
companiesRoutes.post('/:id/branches', handleCreateBranch)
companiesRoutes.patch('/branches/:branchId', handleUpdateBranch)
companiesRoutes.delete('/branches/:branchId', handleDeleteBranch)
