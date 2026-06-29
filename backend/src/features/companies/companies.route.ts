import { Hono } from 'hono'
import {
  handleGetCompanies, handleGetCompanyById, handleCreateCompany,
  handleUpdateCompany, handleDeleteCompany,
  handleGetBranches, handleCreateBranch, handleUpdateBranch, handleDeleteBranch,
} from './companies.handler'
import { requirePermission } from '@/middleware/permission'

export const companiesRoutes = new Hono()

// ─── Company Routes ───────────────────────────────────────────────────────────
companiesRoutes.get('/', requirePermission('settings.company:view'), handleGetCompanies)
companiesRoutes.get('/:id', requirePermission('settings.company:view'), handleGetCompanyById)
companiesRoutes.post('/', requirePermission('settings.company:create'), handleCreateCompany)
companiesRoutes.patch('/:id', requirePermission('settings.company:update'), handleUpdateCompany)
companiesRoutes.delete('/:id', requirePermission('settings.company:delete'), handleDeleteCompany)

// ─── Branch Routes ────────────────────────────────────────────────────────────
companiesRoutes.get('/:id/branches', requirePermission('settings.branch:view'), handleGetBranches)
companiesRoutes.post('/:id/branches', requirePermission('settings.branch:create'), handleCreateBranch)
companiesRoutes.patch('/branches/:branchId', requirePermission('settings.branch:update'), handleUpdateBranch)
companiesRoutes.delete('/branches/:branchId', requirePermission('settings.branch:delete'), handleDeleteBranch)
