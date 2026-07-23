/**
 * test/scope-isolation.e2e.test.ts
 *
 * E2E test isolasi data Company/Branch/Division (docs-v2/task/task001.md Task G2-G4).
 * Pakai Hono in-process request (app.request()) - tanpa buka port HTTP sungguhan -
 * tapi tetap lewat DB nyata (DATABASE_URL dari .env), jadi ini integration test,
 * bukan unit test murni. Fixture user dibuat & dihapus otomatis (before/afterAll).
 *
 * Data company 1 (PT Mesin Kasir Online) dipakai sebagai basis - branch Jakarta(6)/
 * Surabaya(7)/Lainnya(1), sudah ter-backfill (Task A4). Assertion sengaja relatif
 * (bukan hardcode angka bisnis riil) supaya tidak rapuh kalau data berubah.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { eq, ne } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, userCompanies, userBranches, userDivisions, company_branches, businessConfigs } from '@/db/schema'
import { hashPassword } from '@/utils/hash'
import { createRouter } from '@/router'

const ENFORCEMENT_KEY = 'branch_division_enforcement_enabled'

const COMPANY_ID = 1
const USER_ROLE_ID = 3
// 'admin' (bukan superadmin) — role asli marketing@holding.com yang memicu bug G5
// (docs-v2/task, laporan 2026-07-23). Dipakai utuk buktikan fix tidak role-specific:
// isolasi scope berlaku ke SEMUA role non-superadmin, bukan cuma 'user'.
const ADMIN_ROLE_ID = 2
const TEST_PASSWORD = 'password123'
const ALL_DIVISIONS = ['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support', 'other']

const app = new Hono()
createRouter(app)

async function loginAndGetCookie(email: string, password: string = TEST_PASSWORD): Promise<string> {
  const res = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  // Hono/undici menggabungkan banyak Set-Cookie jadi 1 string dipisah koma di beberapa runtime;
  // ambil access_token=... secara eksplisit lewat regex, bukan split naif.
  const match = setCookie.match(/access_token=([^;,]+)/)
  if (!match) throw new Error(`Login gagal untuk ${email}: ${await res.text()}`)
  return `access_token=${match[1]}`
}

async function createTestUser(
  emailPrefix: string,
  assignment: { companyId: number; branchIds: number[]; divisionsByBranch: Record<number, string[]> },
  roleId: number = USER_ROLE_ID,
): Promise<{ id: number; email: string }> {
  return createTestUserMultiCompany(emailPrefix, [assignment], roleId)
}

/**
 * Varian multi-company dari createTestUser — dipakai G5.4 untuk memicu
 * buildBranchConditionRaw() scopeMap dengan >1 company key sekaligus (skenario
 * yang tidak bisa direproduksi lewat 1 company assignment saja).
 */
async function createTestUserMultiCompany(
  emailPrefix: string,
  assignments: { companyId: number; branchIds: number[]; divisionsByBranch: Record<number, string[]> }[],
  roleId: number = USER_ROLE_ID,
): Promise<{ id: number; email: string }> {
  const email = `${emailPrefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@test.local`
  const hashed = await hashPassword(TEST_PASSWORD)
  const [user] = await db.insert(users).values({ name: emailPrefix, email, password: hashed, is_active: true }).returning()

  await db.insert(userRoles).values({ user_id: user!.id, role_id: roleId })
  await db.insert(userCompanies).values(assignments.map((a) => ({ user_id: user!.id, company_id: a.companyId })))

  for (const assignment of assignments) {
    if (assignment.branchIds.length > 0) {
      await db.insert(userBranches).values(
        assignment.branchIds.map((branchId) => ({ user_id: user!.id, company_id: assignment.companyId, branch_id: branchId })),
      )
    }
    for (const [branchId, divisions] of Object.entries(assignment.divisionsByBranch)) {
      if (divisions.length === 0) continue
      await db.insert(userDivisions).values(
        divisions.map((division) => ({ user_id: user!.id, branch_id: Number(branchId), division })),
      )
    }
  }

  return { id: user!.id, email }
}

async function deleteTestUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id)) // cascade: userRoles/userCompanies/userBranches/userDivisions
}

let fullAccessUser: { id: number; email: string }
let distributionOnlyUser: { id: number; email: string }
let noBranchUser: { id: number; email: string }
let multiBranchAdminUser: { id: number; email: string }
let crossCompanyUser: { id: number; email: string }
let narrowDivisionUser: { id: number; email: string }
let allBranchIds: number[]
let secondCompanyId: number
let secondCompanyBranchId: number
let previousEnforcementValue: string | null

/**
 * Cookie di-login SEKALI per user lalu di-cache di sini, dipakai ulang di semua test.
 * WAJIB — login endpoint dibatasi rate-limit 10 percobaan/15 menit per key (default:
 * IP address; app.request() in-process tidak punya IP asli, jadi SEMUA request test
 * di proses ini jatuh ke key yang sama, "unknown" — lihat middleware/rate-limit.ts).
 * Login berulang per test (pola lama) gampang jebol kuota itu begitu jumlah skenario
 * bertambah (ditemukan 2026-07-23 saat nambah Task G5 — 429 RATE_LIMITED).
 */
let cookies: {
  distributionOnly: string
  noBranch: string
  fullAccess: string
  superadmin: string
  multiBranchAdmin: string
  crossCompany: string
  narrowDivision: string
}

beforeAll(async () => {
  // Feature flag rollout bertahap (Task F2/F3) default OFF - test G2/G3/G4 ini
  // KHUSUS menguji perilaku saat enforcement AKTIF, jadi dinyalakan sementara di sini
  // dan dikembalikan persis ke state semula (bukan diasumsikan 'false') di afterAll.
  const existing = await db.select().from(businessConfigs).where(eq(businessConfigs.key, ENFORCEMENT_KEY)).limit(1)
  previousEnforcementValue = existing[0]?.value ?? null
  if (existing.length > 0) {
    await db.update(businessConfigs).set({ value: 'true' }).where(eq(businessConfigs.key, ENFORCEMENT_KEY))
  } else {
    await db.insert(businessConfigs).values({
      key: ENFORCEMENT_KEY,
      value: 'true',
      description: 'Rollout bertahap isolasi Branch/Division (Task F2/F3) - diaktifkan sementara oleh E2E test',
    })
  }

  const branches = await db
    .select({ id: company_branches.id })
    .from(company_branches)
    .where(eq(company_branches.company_id, COMPANY_ID))
    .orderBy(company_branches.id)
  allBranchIds = branches.map((b) => b.id)
  if (allBranchIds.length < 2) {
    throw new Error(`Company ${COMPANY_ID} butuh minimal 2 branch untuk test G5 (multi-branch OR-precedence) — cuma ada ${allBranchIds.length}`)
  }

  // G4: full-coverage user - semua branch + semua division (mirror seeder Task F1)
  fullAccessUser = await createTestUser('e2e-full', {
    companyId: COMPANY_ID,
    branchIds: allBranchIds,
    divisionsByBranch: Object.fromEntries(allBranchIds.map((id) => [id, ALL_DIVISIONS])),
  })

  // G2: cuma branch pertama, cuma division 'distribution' (dulu hardcode branch_id=6,
  // ternyata bukan branch company 1 di DB manapun yang di-reset — diganti ke id dinamis
  // supaya assertion-nya benar-benar menguji sesuatu, bukan vacuously true dari 0 baris)
  distributionOnlyUser = await createTestUser('e2e-dist', {
    companyId: COMPANY_ID,
    branchIds: [allBranchIds[0]!],
    divisionsByBranch: { [allBranchIds[0]!]: ['distribution'] },
  })

  // G3: company di-assign tapi ZERO branch — default deny total
  noBranchUser = await createTestUser('e2e-nobranch', {
    companyId: COMPANY_ID,
    branchIds: [],
    divisionsByBranch: {},
  })

  // G5: company kedua (beda dari COMPANY_ID) yang punya branch — dipakai G5.4 untuk
  // memicu buildBranchConditionRaw() dengan scopeMap >1 company key (bug OR-precedence
  // yang ORIGINAL-nya cuma kena divisionScope, ini varian yang kena branchScope-nya
  // sendiri). Dicari dinamis, bukan hardcode company_id=2, supaya tahan reset seed.
  const otherCompanyBranch = await db
    .select({ companyId: company_branches.company_id, branchId: company_branches.id })
    .from(company_branches)
    .where(ne(company_branches.company_id, COMPANY_ID))
    .orderBy(company_branches.company_id, company_branches.id)
    .limit(1)
  if (otherCompanyBranch.length === 0) {
    throw new Error('Butuh minimal 2 company dengan branch untuk test G5.4 (cross-company scope)')
  }
  secondCompanyId = otherCompanyBranch[0]!.companyId
  secondCompanyBranchId = otherCompanyBranch[0]!.branchId

  // G5: role='admin' (bukan 'user', bukan superadmin) — sama persis assignment-nya
  // dengan fullAccessUser, cuma beda role, supaya kebuktikan fix berlaku ke semua role
  // non-superadmin, bukan cuma yang dipakai fullAccessUser.
  multiBranchAdminUser = await createTestUser(
    'e2e-g5-admin',
    {
      companyId: COMPANY_ID,
      branchIds: allBranchIds,
      divisionsByBranch: Object.fromEntries(allBranchIds.map((id) => [id, ALL_DIVISIONS])),
    },
    ADMIN_ROLE_ID,
  )

  // G5.4: scope lintas 2 company sekaligus
  crossCompanyUser = await createTestUserMultiCompany('e2e-g5-cross', [
    {
      companyId: COMPANY_ID,
      branchIds: allBranchIds,
      divisionsByBranch: Object.fromEntries(allBranchIds.map((id) => [id, ALL_DIVISIONS])),
    },
    {
      companyId: secondCompanyId,
      branchIds: [secondCompanyBranchId],
      divisionsByBranch: { [secondCompanyBranchId]: ALL_DIVISIONS },
    },
  ])

  // G5.5: 2 branch, division scope BEDA per branch (bukan full) — branch pertama cuma
  // 'distribution', branch kedua cuma 'e_commerce'. divisionScope map jadi >1 entry
  // (persis kondisi yang memicu bug), tapi isinya sengaja SEMPIT supaya bisa diuji
  // 2 arah: filter division yang di-assign (harus tembus) vs yang tidak (harus kosong).
  narrowDivisionUser = await createTestUser('e2e-g5-narrow', {
    companyId: COMPANY_ID,
    branchIds: [allBranchIds[0]!, allBranchIds[1]!],
    divisionsByBranch: {
      [allBranchIds[0]!]: ['distribution'],
      [allBranchIds[1]!]: ['e_commerce'],
    },
  })

  // Login SEKALI per fixture (lihat komentar di deklarasi `cookies` di atas) — semua
  // test di file ini reuse cookie dari sini, tidak login ulang.
  const [distributionOnly, noBranch, fullAccess, superadmin, multiBranchAdmin, crossCompany, narrowDivision] = await Promise.all([
    loginAndGetCookie(distributionOnlyUser.email),
    loginAndGetCookie(noBranchUser.email),
    loginAndGetCookie(fullAccessUser.email),
    loginAndGetCookie('admin@mail.com', '123456'),
    loginAndGetCookie(multiBranchAdminUser.email),
    loginAndGetCookie(crossCompanyUser.email),
    loginAndGetCookie(narrowDivisionUser.email),
  ])
  cookies = { distributionOnly, noBranch, fullAccess, superadmin, multiBranchAdmin, crossCompany, narrowDivision }
})

afterAll(async () => {
  await Promise.all([
    deleteTestUser(fullAccessUser.id),
    deleteTestUser(distributionOnlyUser.id),
    deleteTestUser(noBranchUser.id),
    deleteTestUser(multiBranchAdminUser.id),
    deleteTestUser(crossCompanyUser.id),
    deleteTestUser(narrowDivisionUser.id),
  ])
  // Kembalikan flag persis ke state semula
  if (previousEnforcementValue !== null) {
    await db.update(businessConfigs).set({ value: previousEnforcementValue }).where(eq(businessConfigs.key, ENFORCEMENT_KEY))
  } else {
    await db.delete(businessConfigs).where(eq(businessConfigs.key, ENFORCEMENT_KEY))
  }
})

describe('Task G2 — isolasi division', () => {
  test('user dengan division "distribution" saja tidak melihat division lain', async () => {
    const cookie = cookies.distributionOnly
    const res = await app.request('/api/v1/customers?company_id=all&per_page=100', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { division: string | null }[] }
    const divisions = new Set(body.data.map((c) => c.division).filter(Boolean))
    for (const d of divisions) {
      expect(d).toBe('distribution')
    }
  })
})

describe('Task G3 — default deny total tanpa branch assignment', () => {
  test('user dengan company assignment tapi ZERO branch → data kosong, bukan error', async () => {
    const cookie = cookies.noBranch
    const res = await app.request('/api/v1/customers?company_id=all&per_page=100', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[]; meta: { total: number } }
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
  })

  test('endpoint metrics juga return kosong (bukan 403/500) untuk user tanpa branch', async () => {
    const cookie = cookies.noBranch
    const res = await app.request('/api/v1/metrics/cross-selling?company_id=all&period_end=2026-07-05', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { kpi1: { active_count: number } } }
    expect(body.data.kpi1.active_count).toBe(0)
  })
})

describe('Task G4 — regression full-coverage user tidak kehilangan akses', () => {
  test('user full-coverage (semua branch+division) melihat data yang sama persis dengan superadmin di company yang sama', async () => {
    const fullCookie = cookies.fullAccess
    // superadmin seed user (admin@mail.com) - full bypass, jadi baseline "tanpa scoping"
    const superadminCookie = cookies.superadmin

    const [fullRes, superRes] = await Promise.all([
      app.request(`/api/v1/customers?company_id=${COMPANY_ID}&per_page=1`, { headers: { Cookie: fullCookie } }),
      app.request(`/api/v1/customers?company_id=${COMPANY_ID}&per_page=1`, { headers: { Cookie: superadminCookie } }),
    ])
    expect(fullRes.status).toBe(200)
    expect(superRes.status).toBe(200)

    const fullBody = await fullRes.json() as { meta: { total: number } }
    const superBody = await superRes.json() as { meta: { total: number } }
    expect(fullBody.meta.total).toBe(superBody.meta.total)
  })
})

/**
 * Task G5 — regresi precedence AND/OR di buildBranchConditionRaw/buildDivisionConditionRaw
 * (ditemukan 2026-07-23, lihat backend/src/utils/scope.ts).
 *
 * Bug asli: kedua fungsi itu menghasilkan `A OR B OR C` (satu clause per branch/division
 * yang di-assign) TANPA outer parens, lalu di-embed via `AND ${cond}` di WHERE clause
 * repository raw-SQL (dipakai di m1–m10, dashboard, category-performance, dst — lihat
 * grep di semua repository/*.repository.ts yang import dari '@/utils/scope'). AND
 * presedensinya lebih tinggi dari OR di SQL, jadi `... AND A OR B OR C AND ...`
 * diparse jadi `(... AND A) OR B OR C AND ...` — filter company/branch/tanggal di
 * sekitarnya cuma nempel ke clause pertama/terakhir, clause tengah lolos TANPA
 * terikat filter apa pun. Ketemu lewat laporan user: hasil matrix M3 beda antara
 * admin@mail.com (superadmin, bypass total) vs marketing@holding.com (role admin,
 * scope 3 branch dalam 1 company) untuk filter company+branch+tanggal yang identik —
 * marketing melihat data ~2x lebih besar dari yang seharusnya.
 *
 * Baseline pembanding di semua test G5 SELALU superadmin dengan query params yang
 * PERSIS SAMA — superadmin bypass scope sepenuhnya, jadi hasilnya = "ground truth"
 * murni dari filter itu sendiri (company/branch/division/tanggal), tanpa scope logic
 * ikut campur. Kalau user scoped hasilnya beda dari baseline ini padahal filter yang
 * dia pilih ada dalam haknya, berarti scope logic ikut mengubah hasil filter — itulah
 * gejala presis dari bug precedence ini.
 *
 * Endpoint yang diuji sengaja lintas repository (customer-metrics → m3m7.repository.ts,
 * gp-breakdown → m4.repository.ts) supaya fix di scope.ts (satu tempat, dipakai semua
 * repository) kebuktikan menutup semuanya, bukan cuma jalur yang awalnya dilaporkan.
 */
describe('Task G5 — regresi precedence AND/OR pada scope condition (multi-branch/company/division)', () => {
  test('[role=user, company spesifik] branch_id spesifik (subset dari scope multi-branch) → identik superadmin', async () => {
    const targetBranch = allBranchIds[0]!
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranch}&period_end=2026-06-30`
    const [scopedRes, superRes] = await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.fullAccess } }),
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.superadmin } }),
    ])
    expect(scopedRes.status).toBe(200)
    expect(superRes.status).toBe(200)
    const scopedBody = await scopedRes.json() as { data: { trend: unknown[] } }
    const superBody = await superRes.json() as { data: { trend: unknown[] } }
    expect(scopedBody.data.trend).toEqual(superBody.data.trend)
  })

  test('[role=admin] branch_id spesifik (subset dari scope multi-branch) → identik superadmin — bukti fix tidak role-specific', async () => {
    const targetBranch = allBranchIds[1]!
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranch}&period_end=2026-06-30`
    const [scopedRes, superRes] = await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.multiBranchAdmin } }),
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.superadmin } }),
    ])
    expect(scopedRes.status).toBe(200)
    expect(superRes.status).toBe(200)
    const scopedBody = await scopedRes.json() as { data: { trend: unknown[] } }
    const superBody = await superRes.json() as { data: { trend: unknown[] } }
    expect(scopedBody.data.trend).toEqual(superBody.data.trend)
  })

  test('[branch] branch_id + division dipilih bersamaan → identik superadmin', async () => {
    const targetBranch = allBranchIds[0]!
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranch}&division=distribution&period_end=2026-06-30`
    const [scopedRes, superRes] = await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.fullAccess } }),
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.superadmin } }),
    ])
    expect(scopedRes.status).toBe(200)
    expect(superRes.status).toBe(200)
    const scopedBody = await scopedRes.json() as { data: { trend: unknown[] } }
    const superBody = await superRes.json() as { data: { trend: unknown[] } }
    expect(scopedBody.data.trend).toEqual(superBody.data.trend)
  })

  test('[company=all, scope lintas 2 company] filter branch_id spesifik tidak bocor ke company lain → identik superadmin', async () => {
    const qs = `company_id=all&branch_id=${secondCompanyBranchId}&period_end=2026-06-30`
    const [scopedRes, superRes] = await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.crossCompany } }),
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.superadmin } }),
    ])
    expect(scopedRes.status).toBe(200)
    expect(superRes.status).toBe(200)
    const scopedBody = await scopedRes.json() as { data: { trend: unknown[] } }
    const superBody = await superRes.json() as { data: { trend: unknown[] } }
    expect(scopedBody.data.trend).toEqual(superBody.data.trend)
  })

  test('[division in-scope] branch dengan >1 division-scope entries, filter division yang di-assign → identik superadmin', async () => {
    const targetBranch = allBranchIds[0]! // narrowDivisionUser: division 'distribution' di branch ini
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranch}&division=distribution&period_end=2026-06-30`
    const [scopedRes, superRes] = await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.narrowDivision } }),
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.superadmin } }),
    ])
    expect(scopedRes.status).toBe(200)
    expect(superRes.status).toBe(200)
    const scopedBody = await scopedRes.json() as { data: { trend: unknown[] } }
    const superBody = await superRes.json() as { data: { trend: unknown[] } }
    expect(scopedBody.data.trend).toEqual(superBody.data.trend)
  })

  test('[division out-of-scope] branch dengan >1 division-scope entries, filter division yang TIDAK di-assign → data kosong (bukan bocor)', async () => {
    const targetBranch = allBranchIds[0]! // narrowDivisionUser cuma punya 'distribution' di branch ini, bukan 'e_commerce'
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranch}&division=e_commerce&period_end=2026-06-30`
    const res = await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.narrowDivision } })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { trend: { existing_customers: number; total_revenue_existing: number }[] } }
    const totalExisting = body.data.trend.reduce((sum, r) => sum + r.existing_customers, 0)
    const totalRevenue = body.data.trend.reduce((sum, r) => sum + r.total_revenue_existing, 0)
    expect(totalExisting).toBe(0)
    expect(totalRevenue).toBe(0)
  })

  test('[repository lain — M4 gp-breakdown] agregat identik superadmin untuk branch_id spesifik (bukti fix berlaku lintas repository)', async () => {
    const targetBranch = allBranchIds[0]!
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranch}&period_end=2026-06-30`
    const [scopedRes, superRes] = await Promise.all([
      app.request(`/api/v1/metrics/gp-breakdown?${qs}`, { headers: { Cookie: cookies.fullAccess } }),
      app.request(`/api/v1/metrics/gp-breakdown?${qs}`, { headers: { Cookie: cookies.superadmin } }),
    ])
    expect(scopedRes.status).toBe(200)
    expect(superRes.status).toBe(200)
    const scopedBody = await scopedRes.json() as { data: { total_gp: number; total_existing: number; median_threshold: number } }
    const superBody = await superRes.json() as { data: { total_gp: number; total_existing: number; median_threshold: number } }
    expect(scopedBody.data.total_gp).toBe(superBody.data.total_gp)
    expect(scopedBody.data.total_existing).toBe(superBody.data.total_existing)
    expect(scopedBody.data.median_threshold).toBe(superBody.data.median_threshold)
  })
})
