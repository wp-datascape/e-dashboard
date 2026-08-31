import { Hono } from 'hono'
import {
  handleGetCompanies, handleGetCompanyById, handleCreateCompany,
  handleUpdateCompany, handleDeleteCompany,
  handleGetBranches, handleCreateBranch, handleUpdateBranch, handleDeleteBranch,
} from './companies.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const companiesRoutes = new Hono()

// 15 mutasi per 5 menit per user (Task002 Task B, audit 2026-07-06) — paling ketat
// dari semua mutation rate limit di app ini: company/branch adalah FONDASI hierarki
// Company->Branch->Division (task001) - branch/company palsu atau salah hapus bisa
// merusak isolasi data di seluruh sistem, bukan cuma 1 fitur.
const companyMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 15, keyFn: keyByUser })

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
companiesRoutes.post('/', requirePermission('settings.company:create'), companyMutationRateLimit, handleCreateCompany)
companiesRoutes.patch('/:id', requirePermission('settings.company:update'), companyMutationRateLimit, handleUpdateCompany)
companiesRoutes.delete('/:id', requirePermission('settings.company:delete'), companyMutationRateLimit, handleDeleteCompany)

// ─── Branch Routes ────────────────────────────────────────────────────────────
// GET /:id/branches sengaja TIDAK di-requirePermission (2026-08-31, bug: toast
// "Akses ditolak" muncul di HAMPIR SEMUA halaman untuk user branch-restricted
// mis. "MKO Sales") — endpoint ini dipakai luas sbg dropdown filter Branch
// (useBranchesByCompany() -> useScopedCompanyFilter.ts) di 8+ halaman, BUKAN
// cuma halaman Settings/Companies. Pola SAMA PERSIS `GET /` companies di atas
// (comment 2026-07-06) — Mewajibkan settings.branch:view (permission "kelola
// branch", bukan "lihat dropdown") bikin HAMPIR SEMUA role non-superadmin 403
// begitu company spesifik terpilih. resolveCompanyScope() di handler tetap
// menjaga user tidak bisa lihat branch company di luar aksesnya (celah RBAC
// company-scope, BEDA dari izin CRUD Settings) — konsisten dgn pola
// divisions.route.ts (`GET /values` juga tanpa requirePermission).
companiesRoutes.get('/:id/branches', handleGetBranches)
companiesRoutes.post('/:id/branches', requirePermission('settings.branch:create'), companyMutationRateLimit, handleCreateBranch)
companiesRoutes.patch('/branches/:branchId', requirePermission('settings.branch:update'), companyMutationRateLimit, handleUpdateBranch)
companiesRoutes.delete('/branches/:branchId', requirePermission('settings.branch:delete'), companyMutationRateLimit, handleDeleteBranch)
