/**
 * test/production-scope-consistency.e2e.test.ts
 *
 * Audit isolasi data (Company/Branch/Division scope) untuk user REAL yang ada di
 * data production (bukan fixture sintetis seperti scope-isolation.e2e.test.ts) —
 * dipakai setelah restore backup production ke lokal (docs-v2/shared/deployment.md
 * §Backup database) untuk memastikan angka KPI konsisten dan isolasi antar role
 * benar-benar berlaku di data sungguhan, bukan cuma di data seed sintetis.
 *
 * SKIP OTOMATIS di CI (`bun test` jalan di DB seed kosong, cuma `admin@mail.com`
 * yang ada — lihat backend/src/db/seed.ts) — akun `finance@semanggi.id` dkk di
 * bawah ini HANYA ada kalau DB lokal sudah di-restore dari backup production.
 * Untuk jalankan: restore backup production dulu (lihat docs-v2/shared/deployment.md
 * §Backup database), baru `bun test src/test/production-scope-consistency.e2e.test.ts`.
 *
 * Beda dari scope-isolation.e2e.test.ts (fixture user dibuat/dihapus tiap run,
 * menguji BUG SPESIFIK precedence AND/OR di scope.ts) — file ini menguji KONSISTENSI
 * ANGKA lintas role production riil: superadmin vs holding (Finance/Marketing) vs
 * managing director per-company, dipanggil langsung ke service layer (bukan HTTP
 * login) karena password akun production tidak diketahui di lingkungan dev/CI.
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, roles, userCompanies, userBranches, userDivisions } from '@/db/schema'
import { getCrossSellingMetrics, getCustomerMetrics, getDormantCustomerMetrics } from '@/features/metrics/metrics.service'
import type { MetricsScope } from '@/features/metrics/metrics.service'

const PERIOD_END = '2026-08-25'

interface TestUserDef {
  label: string
  email: string
  companies: (number | 'all')[]
}

// company_id 1 = PT Mesin Kasir Online (MKO), 2 = PT Kode Niaga Tama (KNT),
// 3 = PT Solusi Kartu Indonesia (Ucard) — 3 entitas holding, lihat CLAUDE.md.
const TEST_USER_DEFS: TestUserDef[] = [
  { label: 'Super Admin', email: 'admin@mail.com', companies: ['all', 1, 2, 3] },
  { label: 'FAT Holding', email: 'finance@semanggi.id', companies: ['all', 1, 2, 3] },
  { label: 'Marketing Holding', email: 'marketing@semanggi.id', companies: ['all', 1, 2, 3] },
  { label: 'MD MKO', email: 'mko.executive@semanggi.id', companies: [1] },
  { label: 'FAT MKO', email: 'mko.finance@semanggi.id', companies: [1] },
  { label: 'MD KNT', email: 'knt.executive@semanggi.id', companies: [2] },
]

interface MetricsSnapshot {
  M1_active: number
  M1_rate: number
  M3_existing: number
  M3_totalRevenue: number
  M7_active: number
  M8_dormant: number
  M8_total: number
  M9_lostValue: number
}

// Replikasi PERSIS logic resolveCompanyScope/resolveBranchScope/resolveDivisionScope
// di src/middleware/auth.ts, sebagai fungsi murni (tanpa Hono Context) — dipanggil
// langsung dari sini karena test ini butuh scope utk user REAL tanpa login HTTP.
function resolveCompanyScope(requested: number | 'all', companyIds: number[], isSuperAdmin: boolean): number[] | undefined {
  if (isSuperAdmin) return requested === 'all' ? undefined : [requested]
  if (requested === 'all') return companyIds
  if (!companyIds.includes(requested)) throw new Error(`Akses ke company ${requested} tidak diizinkan`)
  return [requested]
}

function resolveBranchScope(
  companyScopeIds: number[] | undefined,
  branchScopes: { company_id: number; branch_id: number }[],
  isSuperAdmin: boolean,
): Map<number, number[]> | undefined {
  if (isSuperAdmin) return undefined
  const map = new Map<number, number[]>()
  for (const { company_id, branch_id } of branchScopes) {
    if (companyScopeIds && !companyScopeIds.includes(company_id)) continue
    if (!map.has(company_id)) map.set(company_id, [])
    map.get(company_id)!.push(branch_id)
  }
  return map
}

function resolveDivisionScope(
  branchScope: Map<number, number[]> | undefined,
  divisionScopes: { branch_id: number; division_id: number }[],
  isSuperAdmin: boolean,
): Map<number, number[]> | undefined {
  if (isSuperAdmin) return undefined
  const allowedBranchIds = new Set(branchScope ? [...branchScope.values()].flat() : [])
  const map = new Map<number, number[]>()
  for (const { branch_id, division_id } of divisionScopes) {
    if (!allowedBranchIds.has(branch_id)) continue
    if (!map.has(branch_id)) map.set(branch_id, [])
    map.get(branch_id)!.push(division_id)
  }
  return map
}

async function fetchSnapshot(userId: number, isSuperAdmin: boolean, companyReq: number | 'all'): Promise<MetricsSnapshot> {
  const companyRows = await db.select({ company_id: userCompanies.company_id }).from(userCompanies).where(eq(userCompanies.user_id, userId))
  const companyIds = companyRows.map((r) => r.company_id)
  const branchScopes = await db
    .select({ company_id: userBranches.company_id, branch_id: userBranches.branch_id })
    .from(userBranches)
    .where(eq(userBranches.user_id, userId))
  const divisionScopes = await db
    .select({ branch_id: userDivisions.branch_id, division_id: userDivisions.division_id })
    .from(userDivisions)
    .where(eq(userDivisions.user_id, userId))

  const companyScopeIds = resolveCompanyScope(companyReq, companyIds, isSuperAdmin)
  const branchScope = resolveBranchScope(companyScopeIds, branchScopes, isSuperAdmin)
  const divisionScope = resolveDivisionScope(branchScope, divisionScopes, isSuperAdmin)
  const scope: MetricsScope = { companyScopeIds, branchScope, divisionScope }

  const [cross, cust, dorm] = await Promise.all([
    getCrossSellingMetrics({ company_id: companyReq, period_end: PERIOD_END } as never, scope),
    getCustomerMetrics({ company_id: companyReq, period_end: PERIOD_END } as never, scope),
    getDormantCustomerMetrics({ company_id: companyReq, period_end: PERIOD_END } as never, scope),
  ])
  const lastTrend = cust.trend[cust.trend.length - 1]

  return {
    M1_active: cross.kpi1.active_count,
    M1_rate: cross.kpi1.rate,
    M3_existing: lastTrend?.existing_customers ?? 0,
    M3_totalRevenue: lastTrend?.total_revenue_existing ?? 0,
    M7_active: lastTrend?.existing_not_dormant_count ?? 0,
    M8_dormant: dorm.dormant_rate_current.dormant_count,
    M8_total: dorm.dormant_rate_current.total_customers,
    M9_lostValue: dorm.value_ranking_total_current,
  }
}

// Top-level await (ESM) — cek dulu apakah akun production ini ADA sebelum register
// describe block, supaya bisa skip seluruh suite dgn describe.skipIf() (bukan gagal
// satu-satu) kalau dijalankan di DB seed kosong (CI).
const emails = TEST_USER_DEFS.map((u) => u.email)
const existingUsers = await db
  .select({ id: users.id, email: users.email, role: roles.name })
  .from(users)
  .innerJoin(userRoles, eq(userRoles.user_id, users.id))
  .innerJoin(roles, eq(roles.id, userRoles.role_id))
  .where(inArray(users.email, emails))
const userByEmail = new Map(existingUsers.map((u) => [u.email, u]))
const allUsersExist = emails.every((e) => userByEmail.has(e))

describe.skipIf(!allUsersExist)('Konsistensi scope RBAC — user production riil', () => {
  const snapshots = new Map<string, MetricsSnapshot>()
  const key = (label: string, companyId: number | 'all') => `${label}|${companyId}`

  // Ambil semua snapshot SEKALI (query berat, 15 kombo × 3 endpoint) — dipakai
  // ulang di semua test() di bawah, bukan re-fetch per assertion.
  beforeAll(async () => {
    for (const def of TEST_USER_DEFS) {
      const u = userByEmail.get(def.email)!
      const isSuperAdmin = u.role === 'superadmin'
      for (const companyReq of def.companies) {
        const snap = await fetchSnapshot(u.id, isSuperAdmin, companyReq)
        snapshots.set(key(def.label, companyReq), snap)
      }
    }
    // 15 kombo x 3 endpoint metrics berat (M1-M10) — default timeout bun:test (5s)
    // jauh tidak cukup, terutama di data production sungguhan (ratusan ribu invoice).
  }, 300_000)

  test('MD MKO (full access company 1) identik dengan Super Admin di company 1', () => {
    expect(snapshots.get(key('MD MKO', 1))).toEqual(snapshots.get(key('Super Admin', 1)))
  })

  test('FAT MKO (full access company 1) identik dengan Super Admin di company 1', () => {
    expect(snapshots.get(key('FAT MKO', 1))).toEqual(snapshots.get(key('Super Admin', 1)))
  })

  test('FAT Holding dan Marketing Holding identik di semua company (grant scope sama persis)', () => {
    for (const companyReq of ['all', 1, 2, 3] as const) {
      expect(snapshots.get(key('FAT Holding', companyReq))).toEqual(snapshots.get(key('Marketing Holding', companyReq)))
    }
  })

  test('Super Admin: jumlah per-company (1+2+3) = hasil company_id=all (tidak ada double count / kebocoran)', () => {
    const all = snapshots.get(key('Super Admin', 'all'))!
    const c1 = snapshots.get(key('Super Admin', 1))!
    const c2 = snapshots.get(key('Super Admin', 2))!
    const c3 = snapshots.get(key('Super Admin', 3))!
    expect(c1.M1_active + c2.M1_active + c3.M1_active).toBe(all.M1_active)
    expect(c1.M3_existing + c2.M3_existing + c3.M3_existing).toBe(all.M3_existing)
  })

  test('FAT Holding: jumlah per-company (1+2+3) = hasil company_id=all', () => {
    const all = snapshots.get(key('FAT Holding', 'all'))!
    const c1 = snapshots.get(key('FAT Holding', 1))!
    const c2 = snapshots.get(key('FAT Holding', 2))!
    const c3 = snapshots.get(key('FAT Holding', 3))!
    expect(c1.M1_active + c2.M1_active + c3.M1_active).toBe(all.M1_active)
    expect(c1.M3_existing + c2.M3_existing + c3.M3_existing).toBe(all.M3_existing)
  })

  test('Holding (scope lebih sempit) tidak pernah melihat LEBIH BANYAK customer daripada Super Admin di company yang sama', () => {
    for (const companyReq of [1, 2, 3] as const) {
      const holding = snapshots.get(key('FAT Holding', companyReq))!
      const superadmin = snapshots.get(key('Super Admin', companyReq))!
      expect(holding.M1_active).toBeLessThanOrEqual(superadmin.M1_active)
      expect(holding.M3_existing).toBeLessThanOrEqual(superadmin.M3_existing)
      expect(holding.M7_active).toBeLessThanOrEqual(superadmin.M7_active)
      expect(holding.M8_total).toBeLessThanOrEqual(superadmin.M8_total)
      expect(holding.M8_dormant).toBeLessThanOrEqual(superadmin.M8_dormant)
    }
  })

  // KNOWN ISSUE (belum ditemukan root cause-nya, lihat docs-v2/task/task029.md) —
  // M9 (estimasi nilai hilang) BUKAN sekadar SUM per customer dormant biasa,
  // melainkan avg_monthly_revenue x months_dormant per customer (value_ranking_total_current,
  // metrics.service.ts) — untuk scope yang JAUH lebih sempit (subset customer dormant),
  // harusnya totalnya juga <= scope yang lebih luas. Test ini SENGAJA dibiarkan
  // sebagai assertion asli (bukan di-skip) supaya kalau regresi ini suatu saat
  // diperbaiki, test langsung hijau tanpa perlu diedit ulang — kalau MASIH merah,
  // itu means bug lama ini belum diperbaiki, bukan hal baru yang perlu dipanik-i.
  test('Holding tidak pernah punya estimasi nilai hilang (M9) LEBIH BESAR daripada Super Admin di company yang sama', () => {
    for (const companyReq of [1, 2, 3] as const) {
      const holding = snapshots.get(key('FAT Holding', companyReq))!
      const superadmin = snapshots.get(key('Super Admin', companyReq))!
      expect(holding.M9_lostValue).toBeLessThanOrEqual(superadmin.M9_lostValue)
    }
  })

  test('company_id=3 (PT Solusi Kartu Indonesia) belum ada transaksi sama sekali — semua role melihat 0, bukan error', () => {
    for (const label of ['Super Admin', 'FAT Holding', 'Marketing Holding']) {
      const snap = snapshots.get(key(label, 3))!
      expect(snap.M1_active).toBe(0)
      expect(snap.M3_existing).toBe(0)
      expect(snap.M8_total).toBe(0)
    }
  })
})
