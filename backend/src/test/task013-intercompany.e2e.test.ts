/**
 * test/task013-intercompany.e2e.test.ts
 *
 * E2E test task013 — Sister Company Names & fix celah RBAC company-scope
 * (docs-v2/task/task013.md). Dua hal diuji:
 *
 * 1. RBAC regresi: non-superadmin dengan scope company 1 saja, tapi punya
 *    permission create, TETAP ditolak 403 kalau kirim company_id company lain
 *    (buktikan resolveCompanyScope beneran jalan di divisions & intercompany-names
 *    handler — celah yang ditemukan saat riset task013).
 * 2. Sync logic: tambah alias -> customers.division_override_id ke-set ke division
 *    'intercompany' company itu. Hapus alias -> ke-clear lagi.
 *
 * Pola sama dengan scope-isolation.e2e.test.ts — in-process Hono request, DB nyata.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, userCompanies, roles, permissions, rolePermissions, customers, divisions, intercompany_customer_names } from '@/db/schema'
import { hashPassword } from '@/utils/hash'
import { createRouter } from '@/router'

const COMPANY_ID = 1
const OTHER_COMPANY_ID = 2
const TEST_PASSWORD = 'password123'

const app = new Hono()
createRouter(app)

async function loginAndGetCookie(email: string): Promise<{ cookie: string; csrfToken: string }> {
  const res = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: TEST_PASSWORD }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/access_token=([^;,]+)/)
  if (!match) throw new Error(`Login gagal untuk ${email}: ${await res.text()}`)
  const body = await res.json() as { data: { csrf_token: string } }
  return { cookie: `access_token=${match[1]}`, csrfToken: body.data.csrf_token }
}

let testRoleId: number
let testUserId: number
let cookie: string
let csrfToken: string
let intercompanyDivisionId: number
let createdCustomerId: number
let createdAliasIds: number[] = []

beforeAll(async () => {
  // Role custom scoped-create-only — cuma punya permission create utk 3 fitur yang
  // diperbaiki, supaya request lolos requirePermission dan beneran menguji
  // resolveCompanyScope (bukan ketolong duluan gara-gara permission-nya sendiri
  // tidak ada).
  const [role] = await db.insert(roles).values({
    name: `e2e-task013-${Date.now()}`,
    description: 'E2E test task013 - scoped create only',
    is_system: false,
  }).returning()
  testRoleId = role!.id

  const permNames = ['settings.division:create', 'settings.intercompany:create', 'settings.intercompany:view', 'settings.intercompany:delete']
  const allPerms = await db.select({ id: permissions.id, name: permissions.name }).from(permissions)
  const permIds = allPerms.filter((p) => permNames.includes(p.name)).map((p) => p.id)
  if (permIds.length !== permNames.length) {
    throw new Error(`Permission tidak lengkap ditemukan: butuh ${permNames.join(', ')}, ketemu ${allPerms.filter((p) => permNames.includes(p.name)).map((p) => p.name).join(', ')}`)
  }
  await db.insert(rolePermissions).values(permIds.map((permissionId) => ({ role_id: testRoleId, permission_id: permissionId })))

  const email = `e2e-task013.${Date.now()}@test.local`
  const hashed = await hashPassword(TEST_PASSWORD)
  const [user] = await db.insert(users).values({ name: 'e2e-task013', email, password: hashed, is_active: true }).returning()
  testUserId = user!.id
  await db.insert(userRoles).values({ user_id: testUserId, role_id: testRoleId })
  await db.insert(userCompanies).values({ user_id: testUserId, company_id: COMPANY_ID })

  ;({ cookie, csrfToken } = await loginAndGetCookie(email))

  const allCompanyDivisions = await db.select({ id: divisions.id, key: divisions.key }).from(divisions).where(eq(divisions.company_id, COMPANY_ID))
  const found = allCompanyDivisions.find((d) => d.key === 'intercompany')
  if (!found) throw new Error(`Company ${COMPANY_ID} tidak punya division 'intercompany'`)
  intercompanyDivisionId = found.id

  const [customer] = await db.insert(customers).values({
    company_id: COMPANY_ID,
    customer_name: `E2E TASK013 TEST CUSTOMER ${Date.now()}`,
    is_placeholder: false,
  }).returning()
  createdCustomerId = customer!.id
})

afterAll(async () => {
  if (createdAliasIds.length > 0) {
    await db.delete(intercompany_customer_names).where(eq(intercompany_customer_names.id, createdAliasIds[createdAliasIds.length - 1]!))
  }
  if (createdCustomerId) await db.delete(customers).where(eq(customers.id, createdCustomerId))
  if (testUserId) await db.delete(users).where(eq(users.id, testUserId)) // cascade userRoles/userCompanies
  if (testRoleId) await db.delete(roles).where(eq(roles.id, testRoleId)) // cascade rolePermissions
})

describe('task013 — RBAC company-scope regresi', () => {
  test('POST /settings/divisions dengan company_id di luar scope user -> 403', async () => {
    const res = await app.request('/api/v1/settings/divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ company_id: OTHER_COMPANY_ID, label: 'E2E Should Fail', dormant_category: 'b2b_dc' }),
    })
    expect(res.status).toBe(403)
  })

  test('POST /settings/divisions dengan company_id MILIK scope user -> lolos scope check (bukan 403)', async () => {
    const res = await app.request('/api/v1/settings/divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ company_id: COMPANY_ID, label: `E2E Should Pass ${Date.now()}`, dormant_category: 'b2b_dc' }),
    })
    expect(res.status).not.toBe(403)
    if (res.status === 201) {
      const body = await res.json() as { data: { id: number } }
      await db.delete(divisions).where(eq(divisions.id, body.data.id))
    }
  })

  test('POST /settings/intercompany-names dengan company_id di luar scope user -> 403', async () => {
    const res = await app.request('/api/v1/settings/intercompany-names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ company_id: OTHER_COMPANY_ID, customer_name: 'E2E SHOULD FAIL' }),
    })
    expect(res.status).toBe(403)
  })
})

describe('task013 — sync division_override_id dari alias', () => {
  test('tambah alias -> customer yang cocok nama langsung ke-set division_override_id = intercompany', async () => {
    const customerName = (await db.select({ name: customers.customer_name }).from(customers).where(eq(customers.id, createdCustomerId)))[0]!.name

    const res = await app.request('/api/v1/settings/intercompany-names', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookie, 'X-CSRF-Token': csrfToken },
      body: JSON.stringify({ company_id: COMPANY_ID, customer_name: customerName }),
    })
    expect(res.status).toBe(201)
    const body = await res.json() as { data: { id: number } }
    createdAliasIds.push(body.data.id)

    const [updatedCustomer] = await db.select({ divisionOverrideId: customers.division_override_id }).from(customers).where(eq(customers.id, createdCustomerId))
    expect(updatedCustomer?.divisionOverrideId).toBe(intercompanyDivisionId)
  })

  test('hapus alias -> division_override_id customer ke-clear lagi', async () => {
    const aliasId = createdAliasIds[createdAliasIds.length - 1]!
    const res = await app.request(`/api/v1/settings/intercompany-names/${aliasId}`, {
      method: 'DELETE',
      headers: { Cookie: cookie, 'X-CSRF-Token': csrfToken },
    })
    expect(res.status).toBe(200)
    createdAliasIds = createdAliasIds.filter((id) => id !== aliasId)

    const [updatedCustomer] = await db.select({ divisionOverrideId: customers.division_override_id }).from(customers).where(eq(customers.id, createdCustomerId))
    expect(updatedCustomer?.divisionOverrideId).toBeNull()
  })
})
