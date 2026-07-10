/**
 * test/scope-isolation.e2e.test.ts
 *
 * E2E test isolasi data Company/Branch/Division (docs-v2/task/task001.md Task G2-G4).
 *
 * 2026-07-10: Division assignment sekarang pakai division_id (integer FK ke
 * branch_divisions), bukan string code — lihat docs-v2/MEMORY.md.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { eq, and, inArray } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, userCompanies, userBranches, userDivisions, company_branches, businessConfigs, branch_divisions } from '@/db/schema'
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
  const match = setCookie.match(/access_token=([^;,]+)/)
  if (!match) throw new Error(`Login gagal untuk ${email}: ${await res.text()}`)
  return `access_token=${match[1]}`
}

async function createTestUser(
  emailPrefix: string,
  assignment: { companyId: number; branchIds: number[]; divisionIdsByBranch: Record<number, number[]> },
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
  for (const [branchId, divisionIds] of Object.entries(assignment.divisionIdsByBranch)) {
    if (divisionIds.length === 0) continue
    await db.insert(userDivisions).values(
      divisionIds.map((divisionId) => ({ user_id: user!.id, branch_id: Number(branchId), division_id: divisionId })),
    )
  }

  return { id: user!.id, email }
}

async function deleteTestUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id))
}

let fullAccessUser: { id: number; email: string }
let distributionOnlyUser: { id: number; email: string }
let noBranchUser: { id: number; email: string }
let allBranchIds: number[]
let previousEnforcementValue: string | null

beforeAll(async () => {
  const existing = await db.select().from(businessConfigs).where(eq(businessConfigs.key, ENFORCEMENT_KEY)).limit(1)
  previousEnforcementValue = existing[0]?.value ?? null
  if (existing.length > 0) {
    await db.update(businessConfigs).set({ value: 'true' }).where(eq(businessConfigs.key, ENFORCEMENT_KEY))
  } else {
    await db.insert(businessConfigs).values({
      key: ENFORCEMENT_KEY,
      value: 'true',
      description: 'Diaktifkan sementara oleh E2E test',
    })
  }

  const branches = await db
    .select({ id: company_branches.id })
    .from(company_branches)
    .where(eq(company_branches.company_id, COMPANY_ID))
  allBranchIds = branches.map((b) => b.id)

  // Division ID aktif dari katalog branch_divisions untuk COMPANY_ID
  const divisionRows = await db
    .select({ id: branch_divisions.id })
    .from(branch_divisions)
    .where(and(eq(branch_divisions.company_id, COMPANY_ID), eq(branch_divisions.is_active, true)))
  const ALL_DIVISION_IDS = divisionRows.map((d) => d.id)

  // G4: full-coverage user - semua branch + semua division
  fullAccessUser = await createTestUser('e2e-full', {
    companyId: COMPANY_ID,
    branchIds: allBranchIds,
    divisionIdsByBranch: Object.fromEntries(allBranchIds.map((id) => [id, ALL_DIVISION_IDS])),
  })

  // G2: cuma branch Jakarta (6), cuma division_id yang berkaitan dengan 'distribution'
  // Ambil division_id untuk kode 'distribution' di company ini
  const distRows = await db
    .select({ id: branch_divisions.id })
    .from(branch_divisions)
    .where(and(eq(branch_divisions.company_id, COMPANY_ID), eq(branch_divisions.code, 'distribution'), eq(branch_divisions.is_active, true)))
  const DIST_DIVISION_IDS = distRows.map((r) => r.id)

  distributionOnlyUser = await createTestUser('e2e-dist', {
    companyId: COMPANY_ID,
    branchIds: [6],
    divisionIdsByBranch: { 6: DIST_DIVISION_IDS },
  })

  // G3: user tanpa branch assignment
  noBranchUser = await createTestUser('e2e-nobranch', {
    companyId: COMPANY_ID,
    branchIds: [],
    divisionIdsByBranch: {},
  })
})

afterAll(async () => {
  await deleteTestUser(fullAccessUser.id)
  await deleteTestUser(distributionOnlyUser.id)
  await deleteTestUser(noBranchUser.id)

  if (previousEnforcementValue === null) {
    await db.delete(businessConfigs).where(eq(businessConfigs.key, ENFORCEMENT_KEY))
  } else {
    await db.update(businessConfigs).set({ value: previousEnforcementValue }).where(eq(businessConfigs.key, ENFORCEMENT_KEY))
  }
})

describe('Task G2 — isolasi division', () => {
  test('user dengan division "distribution" saja tidak melihat division lain', async () => {
    const cookie = await loginAndGetCookie(distributionOnlyUser.email)
    const res = await app.request('/api/v1/dashboard?company_id=1', {
      headers: { Cookie: cookie, 'X-CSRF-Token': 'na' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: { division: string | null }[] }
    const divisions = [...new Set(body.data.map((c) => c.division).filter(Boolean))]
    for (const d of divisions) {
      // Semua division yang terlihat harus 'distribution'
      expect(d).toBe('distribution')
    }
  })
})

describe('Task G3 — user tanpa branch assignment', () => {
  test('user tanpa branch assignment (hanya company scope) tidak melihat data apa pun', async () => {
    const cookie = await loginAndGetCookie(noBranchUser.email)
    const res = await app.request('/api/v1/dashboard?company_id=1', {
      headers: { Cookie: cookie, 'X-CSRF-Token': 'na' },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as { data: unknown[] }
    // Default-deny total karena enforcement aktif & user tidak punya branch
    expect(body.data).toHaveLength(0)
  })
})

describe('Task G4 — regression full-coverage user tidak kehilangan akses', () => {
  test('user full-coverage (semua branch+division) melihat data yang sama persis dengan superadmin di company yang sama', async () => {
    const [fullCookie, superadminCookie] = await Promise.all([
      loginAndGetCookie(fullAccessUser.email),
      loginAndGetCookie('admin@mail.com'),
    ])

    const [fullRes, superRes] = await Promise.all([
      app.request('/api/v1/dashboard?company_id=1', {
        headers: { Cookie: fullCookie, 'X-CSRF-Token': 'na' },
      }),
      app.request('/api/v1/dashboard?company_id=1', {
        headers: { Cookie: superadminCookie, 'X-CSRF-Token': 'na' },
      }),
    ])

    expect(fullRes.status).toBe(200)
    expect(superRes.status).toBe(200)

    const fullBody = await fullRes.json() as { data: { cross_selling: unknown } }
    const superBody = await superRes.json() as { data: { cross_selling: unknown } }

    expect(fullBody.data).not.toBeNull()
    expect(superBody.data).not.toBeNull()
    // Cross-selling matrix sama antara full-coverage user dan superadmin
    expect(fullBody.data.cross_selling).toEqual(superBody.data.cross_selling)
  })
})