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
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, userCompanies, userBranches, userDivisions, company_branches, businessConfigs } from '@/db/schema'
import { hashPassword } from '@/utils/hash'
import { createRouter } from '@/router'

const ENFORCEMENT_KEY = 'branch_division_enforcement_enabled'

const COMPANY_ID = 1
const USER_ROLE_ID = 3
const TEST_PASSWORD = 'password123'

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
): Promise<{ id: number; email: string }> {
  const email = `${emailPrefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@test.local`
  const hashed = await hashPassword(TEST_PASSWORD)
  const [user] = await db.insert(users).values({ name: emailPrefix, email, password: hashed, is_active: true }).returning()

  await db.insert(userRoles).values({ user_id: user!.id, role_id: USER_ROLE_ID })
  await db.insert(userCompanies).values({ user_id: user!.id, company_id: assignment.companyId })

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

  return { id: user!.id, email }
}

async function deleteTestUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id)) // cascade: userRoles/userCompanies/userBranches/userDivisions
}

let fullAccessUser: { id: number; email: string }
let distributionOnlyUser: { id: number; email: string }
let noBranchUser: { id: number; email: string }
let allBranchIds: number[]
let previousEnforcementValue: string | null

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
  allBranchIds = branches.map((b) => b.id)

  const ALL_DIVISIONS = ['distribution', 'project', 'e_commerce', 'intercompany', 'freelancer', 'support', 'other']

  // G4: full-coverage user - semua branch + semua division (mirror seeder Task F1)
  fullAccessUser = await createTestUser('e2e-full', {
    companyId: COMPANY_ID,
    branchIds: allBranchIds,
    divisionsByBranch: Object.fromEntries(allBranchIds.map((id) => [id, ALL_DIVISIONS])),
  })

  // G2: cuma branch Jakarta (6), cuma division 'distribution'
  distributionOnlyUser = await createTestUser('e2e-dist', {
    companyId: COMPANY_ID,
    branchIds: [6],
    divisionsByBranch: { 6: ['distribution'] },
  })

  // G3: company di-assign tapi ZERO branch — default deny total
  noBranchUser = await createTestUser('e2e-nobranch', {
    companyId: COMPANY_ID,
    branchIds: [],
    divisionsByBranch: {},
  })
})

afterAll(async () => {
  await Promise.all([
    deleteTestUser(fullAccessUser.id),
    deleteTestUser(distributionOnlyUser.id),
    deleteTestUser(noBranchUser.id),
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
    const cookie = await loginAndGetCookie(distributionOnlyUser.email)
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
    const cookie = await loginAndGetCookie(noBranchUser.email)
    const res = await app.request('/api/v1/customers?company_id=all&per_page=100', {
      headers: { Cookie: cookie },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[]; meta: { total: number } }
    expect(body.data).toEqual([])
    expect(body.meta.total).toBe(0)
  })

  test('endpoint metrics juga return kosong (bukan 403/500) untuk user tanpa branch', async () => {
    const cookie = await loginAndGetCookie(noBranchUser.email)
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
    const [fullCookie, superadminCookie] = await Promise.all([
      loginAndGetCookie(fullAccessUser.email),
      // superadmin seed user (admin@mail.com) - full bypass, jadi baseline "tanpa scoping"
      loginAndGetCookie('admin@mail.com', '123456'),
    ])

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
