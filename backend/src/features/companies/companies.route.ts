import { Hono } from 'hono'
import {
  handleGetCompanies, handleGetCompanyById, handleCreateCompany,
  handleUpdateCompany, handleDeleteCompany,
  handleGetBranches, handleCreateBranch, handleUpdateBranch, handleDeleteBranch,
} from './companies.handler'
import { requirePermission } from '@/middleware/permission'

export const companiesRoutes = new Hono()

// ─── Company Routes ───────────────────────────────────────────────────────────
// GET / sengaja TIDAK di-requirePermission (cuma authMiddleware, lihat router.ts) —
// endpoint ini dipakai luas sebagai dropdown filter perusahaan di 12+ halaman
// (useCompanies()), dan handleGetCompanies sudah difilter ke companyIds user dari
// JWT (baris getCompanies(isSuperAdmin ? undefined : companyIds) di handler), jadi
// tidak ada company di luar akses user yang pernah bocor. Mewajibkan
// settings.company:view (permission "kelola company", bukan "lihat dropdown")
// di sini bikin HAMPIR SEMUA role non-superadmin 403 di halaman manapun yang
// punya filter perusahaan, walau permission halaman itu sendiri sudah benar.
companiesRoutes.get('/', handleGetCompanies)
companiesRoutes.get('/:id', requirePermission('settings.company:view'), handleGetCompanyById)
companiesRoutes.post('/', requirePermission('settings.company:create'), handleCreateCompany)
companiesRoutes.patch('/:id', requirePermission('settings.company:update'), handleUpdateCompany)
companiesRoutes.delete('/:id', requirePermission('settings.company:delete'), handleDeleteCompany)

// ─── Branch Routes ────────────────────────────────────────────────────────────
companiesRoutes.get('/:id/branches', requirePermission('settings.branch:view'), handleGetBranches)
companiesRoutes.post('/:id/branches', requirePermission('settings.branch:create'), handleCreateBranch)
companiesRoutes.patch('/branches/:branchId', requirePermission('settings.branch:update'), handleUpdateBranch)
companiesRoutes.delete('/branches/:branchId', requirePermission('settings.branch:delete'), handleDeleteBranch)
