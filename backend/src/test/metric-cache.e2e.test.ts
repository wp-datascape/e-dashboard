/**
 * test/metric-cache.e2e.test.ts
 *
 * E2E test cache metrics (EDASHBOARD-591, task038.md) — TTL + invalidasi
 * berbasis event. Skenario KETAT, terutama soal isolasi cache antar scope
 * RBAC — kalau cache_key tidak benar-benar membedakan scope (companyScopeIds/
 * branchScope/divisionScope), user dgn scope sempit bisa kebagian cache
 * milik user dgn scope lebih luas: BUG KEBOCORAN DATA, bukan cuma soal
 * freshness (lihat komentar buildCacheKey di metric-cache.helper.ts).
 *
 * Pola SAMA PERSIS scope-isolation.e2e.test.ts: Hono in-process request
 * (app.request()), DB nyata, fixture user dibuat & dihapus sendiri.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test'
import { Hono } from 'hono'
import { eq, and } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, userRoles, userCompanies, userBranches, userDivisions, company_branches, divisions, metric_cache, channel_divisions, businessConfigs, pareto_customers, customers, product_categories } from '@/db/schema'
import { hashPassword } from '@/utils/hash'
import { createRouter } from '@/router'

const COMPANY_ID = 1
// Company kedua nyata (PT Kode Niaga Tama) — dipakai KHUSUS test non-interference
// lintas company (invalidasi company 1 TIDAK BOLEH ikut menghapus cache company 2).
const SECOND_COMPANY_ID = 2
const USER_ROLE_ID = 3
const ADMIN_ROLE_ID = 2 // sama seperti scope-isolation.e2e.test.ts
// company_id=all IKUT di-cache (2026-09-02, koreksi user: "user holding dan
// superadmin lu kira gabutuh caching?" — sebelumnya sengaja di-skip dgn
// alasan "jarang dipakai", SALAH krn Superadmin/Holding justru pakai 'all'
// sbg tampilan default mereka, dan itu query PALING BERAT). Disimpan di
// baris company_id=0 (ALL_COMPANIES_SENTINEL, metric-cache.repository.ts).
const ALL_COMPANIES_SENTINEL = 0
const TEST_PASSWORD = 'password123'

const E2E_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL
const E2E_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD
if (!E2E_ADMIN_EMAIL || !E2E_ADMIN_PASSWORD) {
  throw new Error('E2E_ADMIN_EMAIL dan E2E_ADMIN_PASSWORD wajib diset di .env untuk menjalankan test ini (lihat .env.example)')
}

// Seluruh 20 endpoint yang di-cache (task038.md, cakupan diperluas 2026-09-02
// — instruksi user: "Mulai dari 10 KPI, semua endpoin") — dipakai Group "smoke
// test semua endpoint" di bawah, data-driven (1 loop, bukan 20 blok tulis
// tangan). metric_key HARUS PERSIS sama dengan yang dipakai withMetricCache()
// di metrics.service.ts.
// extraParams: fungsi opsional yang mengembalikan query string tambahan —
// dibutuhkan HANYA utk 3 endpoint yang punya param WAJIB (bukan cuma
// company_id/branch_id spt endpoint lain), diisi lazy pakai fixture yang
// diresolve di beforeAll (existingCustomerId/anyCategoryId).
const ALL_CACHED_ENDPOINTS: { path: string; metricKey: string; extraParams?: () => string }[] = [
  { path: 'cross-selling', metricKey: 'cross_selling' },
  { path: 'cross-selling/summary', metricKey: 'cross_selling_summary' },
  { path: 'customer-metrics', metricKey: 'customer_metrics' },
  { path: 'revenue-breakdown', metricKey: 'revenue_breakdown' },
  { path: 'expansion-breakdown', metricKey: 'expansion_breakdown' },
  { path: 'gp-breakdown', metricKey: 'gp_breakdown' },
  { path: 'hm-breakdown', metricKey: 'hm_breakdown' },
  { path: 'ror-breakdown', metricKey: 'ror_breakdown' },
  { path: 'dormant-customer', metricKey: 'dormant_customer' },
  { path: 'dormant-breakdown', metricKey: 'dormant_breakdown' },
  { path: 'dormant-status-breakdown', metricKey: 'dormant_status_breakdown' },
  { path: 'dormant-value-history', metricKey: 'dormant_value_history', extraParams: () => `customer_id=${existingCustomerId}&ref_date=${todayIso()}` },
  { path: 'category-performance', metricKey: 'category_performance' },
  { path: 'product-performance', metricKey: 'product_performance' },
  { path: 'high-margin-penetration/detail', metricKey: 'hm_penetration_detail' },
  { path: 'high-margin-penetration/products', metricKey: 'hm_product_penetration_detail' },
  { path: 'high-margin-penetration/customers', metricKey: 'upsell_targets' },
  { path: 'high-margin-penetration/buyers', metricKey: 'hm_customers', extraParams: () => `target_type=category&target_id=${anyCategoryId}` },
  { path: 'customer-products', metricKey: 'customer_products', extraParams: () => `customer_id=${existingCustomerId}` },
  { path: 'avg-category', metricKey: 'avg_category_trend' },
]

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Sort array `data` (kalau ada) sebelum dibandingkan `toEqual` — beberapa
 * endpoint list (mis. category-performance) sort_by=total_revenue TIDAK
 * punya tie-breaker sekunder di ORDER BY, jadi 2 baris dgn total_revenue
 * PERSIS sama urutannya tidak dijamin stabil antar eksekusi query (bug
 * ordering pre-existing, di luar scope EDASHBOARD-591) — bukan berarti
 * datanya beda, cuma urutannya. Perbandingan di test "per role" harus
 * order-insensitive supaya tidak salah tangkap sebagai bug cache/scope.
 */
function normalizeForComparison(body: unknown): unknown {
  if (body && typeof body === 'object' && 'data' in (body as Record<string, unknown>) && Array.isArray((body as Record<string, unknown>).data)) {
    const clone = { ...(body as Record<string, unknown>) }
    clone.data = [...(clone.data as unknown[])].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
    return clone
  }
  return body
}

const app = new Hono()
createRouter(app)

async function loginAndGetCookie(email: string, password: string = TEST_PASSWORD): Promise<{ cookie: string; csrfToken: string }> {
  const res = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/access_token=([^;,]+)/)
  if (!match) throw new Error(`Login gagal untuk ${email}: ${await res.text()}`)
  const body = await res.json() as { data: { csrf_token: string } }
  return { cookie: `access_token=${match[1]}`, csrfToken: body.data.csrf_token }
}

async function createTestUser(
  emailPrefix: string,
  assignment: { branchIds: number[]; divisionsByBranch: Record<number, number[]> },
): Promise<{ id: number; email: string }> {
  const email = `${emailPrefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@test.local`
  const hashed = await hashPassword(TEST_PASSWORD)
  const [user] = await db.insert(users).values({ name: emailPrefix, email, password: hashed, is_active: true }).returning()

  await db.insert(userRoles).values({ user_id: user!.id, role_id: USER_ROLE_ID })
  await db.insert(userCompanies).values({ user_id: user!.id, company_id: COMPANY_ID })
  if (assignment.branchIds.length > 0) {
    await db.insert(userBranches).values(assignment.branchIds.map((branchId) => ({ user_id: user!.id, company_id: COMPANY_ID, branch_id: branchId })))
  }
  for (const [branchId, divisionIds] of Object.entries(assignment.divisionsByBranch)) {
    if (divisionIds.length === 0) continue
    await db.insert(userDivisions).values(divisionIds.map((divisionId) => ({ user_id: user!.id, branch_id: Number(branchId), division_id: divisionId })))
  }
  return { id: user!.id, email }
}

/**
 * Varian role+multi-company — dipakai fixture "per role" (holding/entitas
 * eksekutif/user, mirror struktur akun production di
 * production-kpi-matrix.e2e.test.ts: FAT Holding/Marketing Holding = admin
 * lintas SEMUA company, MD MKO/MD KNT = admin 1 company saja, FAT MKO = role
 * user tapi tetap full branch/division access) — TAPI pakai fixture sintetis
 * (dibuat & dihapus sendiri) supaya jalan konsisten di CI, BUKAN akun
 * production sungguhan yang cuma ada di hasil restore backup.
 */
async function createRoleTestUser(
  emailPrefix: string,
  roleId: number,
  assignments: { companyId: number; branchIds: number[]; divisionsByBranch: Record<number, number[]> }[],
): Promise<{ id: number; email: string }> {
  const email = `${emailPrefix}.${Date.now()}.${Math.random().toString(36).slice(2)}@test.local`
  const hashed = await hashPassword(TEST_PASSWORD)
  const [user] = await db.insert(users).values({ name: emailPrefix, email, password: hashed, is_active: true }).returning()

  await db.insert(userRoles).values({ user_id: user!.id, role_id: roleId })
  await db.insert(userCompanies).values(assignments.map((a) => ({ user_id: user!.id, company_id: a.companyId })))
  for (const a of assignments) {
    if (a.branchIds.length > 0) {
      await db.insert(userBranches).values(a.branchIds.map((branchId) => ({ user_id: user!.id, company_id: a.companyId, branch_id: branchId })))
    }
    for (const [branchId, divisionIds] of Object.entries(a.divisionsByBranch)) {
      if (divisionIds.length === 0) continue
      await db.insert(userDivisions).values(divisionIds.map((divisionId) => ({ user_id: user!.id, branch_id: Number(branchId), division_id: divisionId })))
    }
  }
  return { id: user!.id, email }
}

async function deleteTestUser(id: number): Promise<void> {
  await db.delete(users).where(eq(users.id, id)) // cascade: userRoles/userCompanies/userBranches/userDivisions
}

async function clearMetricCache(companyId: number = COMPANY_ID): Promise<void> {
  await db.delete(metric_cache).where(eq(metric_cache.company_id, companyId))
}

async function findMetricCacheRows(companyId: number, metricKey: string) {
  return db.select().from(metric_cache).where(and(eq(metric_cache.company_id, companyId), eq(metric_cache.metric_key, metricKey)))
}

let narrowUser: { id: number; email: string }
let wideUser: { id: number; email: string }
// holdingUser: admin, akses SEMUA branch/division di COMPANY_ID *dan*
// SECOND_COMPANY_ID (mirror "FAT Holding"/"Marketing Holding" di
// production-kpi-matrix.e2e.test.ts). entityAdminUser: admin, 1 company saja
// (mirror "MD MKO"). entityUserUser: role='user', TAPI full branch/division
// access spt admin di company itu (mirror "FAT MKO") — dipakai membuktikan
// hasil metrics konsisten antar tingkat role selama SCOPE akses-nya sama.
let holdingUser: { id: number; email: string }
let entityAdminUser: { id: number; email: string }
let entityUserUser: { id: number; email: string }
let targetBranchId: number
let createdChannelDivisionId: number | null = null
let createdDivisionId: number | null = null
let createdParetoCustomerId: number | null = null
let existingCustomerId: number
let anyCategoryId: number
let createdCustomerId: number
let createdCategoryId: number

let cookies: { narrow: string; wide: string; superadmin: string; holding: string; entityAdmin: string; entityUser: string }
let superadminCsrfToken: string

beforeAll(async () => {
  const branches = await db.select({ id: company_branches.id }).from(company_branches).where(eq(company_branches.company_id, COMPANY_ID)).orderBy(company_branches.id)
  if (branches.length === 0) throw new Error(`Company ${COMPANY_ID} butuh minimal 1 branch untuk test ini`)
  targetBranchId = branches[0]!.id

  const companyDivisions = await db.select({ id: divisions.id, key: divisions.key }).from(divisions).where(eq(divisions.company_id, COMPANY_ID))
  const divisionIdByKey = new Map(companyDivisions.map((d) => [d.key, d.id]))
  const allDivisionIds = companyDivisions.map((d) => d.id)
  const distributionId = divisionIdByKey.get('distribution')
  if (!distributionId) throw new Error(`Company ${COMPANY_ID} butuh division 'distribution' untuk test ini`)

  // narrowUser: 1 branch, CUMA division 'distribution' — dipakai membuktikan
  // cache key benar2 membedakan divisionScope, bukan cuma query param mentah
  // (kedua user di bawah query dgn PARAMS PERSIS SAMA, tanpa filter division
  // eksplisit — beda hasilnya HARUS murni dari scope, bukan dari query).
  narrowUser = await createTestUser('e2e-cache-narrow', {
    branchIds: [targetBranchId],
    divisionsByBranch: { [targetBranchId]: [distributionId] },
  })
  // wideUser: branch SAMA, SEMUA division
  wideUser = await createTestUser('e2e-cache-wide', {
    branchIds: [targetBranchId],
    divisionsByBranch: { [targetBranchId]: allDivisionIds },
  })

  // Full-access map company 1 — SEMUA branch, tiap branch dapat SEMUA
  // division (divisions bukan entitas per-branch, cukup 1 daftar dipakai
  // ulang utk tiap branch). Dipakai holdingUser/entityAdminUser/entityUserUser.
  const company1FullAccess = Object.fromEntries(branches.map((b) => [b.id, allDivisionIds]))
  const company1BranchIds = branches.map((b) => b.id)

  // Resolve branch+division company 2 (PT Kode Niaga Tama) — dibutuhkan
  // KHUSUS holdingUser (akses lintas company, mirror akun "Holding" di
  // production-kpi-matrix.e2e.test.ts).
  const secondCompanyBranches = await db.select({ id: company_branches.id }).from(company_branches).where(eq(company_branches.company_id, SECOND_COMPANY_ID)).orderBy(company_branches.id)
  if (secondCompanyBranches.length === 0) throw new Error(`Company ${SECOND_COMPANY_ID} butuh minimal 1 branch untuk test role holding`)
  const secondCompanyDivisionIds = (await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.company_id, SECOND_COMPANY_ID))).map((d) => d.id)
  const company2FullAccess = Object.fromEntries(secondCompanyBranches.map((b) => [b.id, secondCompanyDivisionIds]))
  const company2BranchIds = secondCompanyBranches.map((b) => b.id)

  holdingUser = await createRoleTestUser('e2e-cache-holding', ADMIN_ROLE_ID, [
    { companyId: COMPANY_ID, branchIds: company1BranchIds, divisionsByBranch: company1FullAccess },
    { companyId: SECOND_COMPANY_ID, branchIds: company2BranchIds, divisionsByBranch: company2FullAccess },
  ])
  entityAdminUser = await createRoleTestUser('e2e-cache-entity-admin', ADMIN_ROLE_ID, [
    { companyId: COMPANY_ID, branchIds: company1BranchIds, divisionsByBranch: company1FullAccess },
  ])
  entityUserUser = await createRoleTestUser('e2e-cache-entity-user', USER_ROLE_ID, [
    { companyId: COMPANY_ID, branchIds: company1BranchIds, divisionsByBranch: company1FullAccess },
  ])

  const [narrow, wide, superadmin, holding, entityAdmin, entityUser] = await Promise.all([
    loginAndGetCookie(narrowUser.email),
    loginAndGetCookie(wideUser.email),
    loginAndGetCookie(E2E_ADMIN_EMAIL, E2E_ADMIN_PASSWORD),
    loginAndGetCookie(holdingUser.email),
    loginAndGetCookie(entityAdminUser.email),
    loginAndGetCookie(entityUserUser.email),
  ])
  cookies = {
    narrow: narrow.cookie, wide: wide.cookie, superadmin: superadmin.cookie,
    holding: holding.cookie, entityAdmin: entityAdmin.cookie, entityUser: entityUser.cookie,
  }
  superadminCsrfToken = superadmin.csrfToken

  // Customer + product category company 1 — dibuat & dihapus sendiri
  // (2026-09-02, koreksi CI: "reuse data yang sudah ada" cuma valid di DB
  // lokal yang sudah direstore data production, tapi seed CI standar
  // (db/seed.ts) SAMA SEKALI TIDAK membuat baris customers/product_categories
  // apa pun — cuma transaksional, muncul lewat import data, bukan seed dasar.
  // Query "cari 1 baris yang sudah ada" jadi 0 baris di CI dan bikin
  // beforeAll throw, men-fail-kan SELURUH file). Pola sama persis fixture
  // user lain di file ini — dibuat di sini, dibersihkan di afterAll.
  const [createdCustomer] = await db.insert(customers).values({ company_id: COMPANY_ID, customer_name: 'E2E Cache Test Customer', is_placeholder: false }).returning()
  createdCustomerId = createdCustomer!.id
  existingCustomerId = createdCustomerId

  const [createdCategory] = await db.insert(product_categories).values({ company_id: COMPANY_ID, name: 'E2E Cache Test Category' }).returning()
  createdCategoryId = createdCategory!.id
  anyCategoryId = createdCategoryId
})

afterAll(async () => {
  await deleteTestUser(narrowUser.id)
  await deleteTestUser(wideUser.id)
  await deleteTestUser(holdingUser.id)
  await deleteTestUser(entityAdminUser.id)
  await deleteTestUser(entityUserUser.id)
  if (createdChannelDivisionId) {
    await db.delete(channel_divisions).where(eq(channel_divisions.id, createdChannelDivisionId))
  }
  if (createdDivisionId) {
    await db.delete(divisions).where(eq(divisions.id, createdDivisionId))
  }
  if (createdParetoCustomerId) {
    await db.delete(pareto_customers).where(eq(pareto_customers.id, createdParetoCustomerId))
  }
  // Urutan SETELAH pareto_customers (FK customer_id) — hapus customer dulu
  // bisa gagal/RESTRICT kalau pareto_customers-nya belum dibersihkan duluan.
  await db.delete(customers).where(eq(customers.id, createdCustomerId))
  await db.delete(product_categories).where(eq(product_categories.id, createdCategoryId))
  await clearMetricCache(COMPANY_ID)
  await clearMetricCache(SECOND_COMPANY_ID)
  await clearMetricCache(ALL_COMPANIES_SENTINEL) // baris company_id=all (2026-09-02)
})

describe('EDASHBOARD-591 — Cache HIT/MISS dasar', () => {
  test('call kedua HIT dari cache — response identik, TIDAK ada baris cache baru (bukan re-insert)', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    const res1 = await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.narrow } })
    expect(res1.status).toBe(200)
    const body1 = await res1.json()

    const rowsAfterFirst = await findMetricCacheRows(COMPANY_ID, 'customer_metrics')
    expect(rowsAfterFirst.length).toBe(1)

    const res2 = await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.narrow } })
    expect(res2.status).toBe(200)
    const body2 = await res2.json()

    expect(body2).toEqual(body1)

    const rowsAfterSecond = await findMetricCacheRows(COMPANY_ID, 'customer_metrics')
    expect(rowsAfterSecond.length).toBe(1) // TIDAK bertambah — call ke-2 HIT, bukan insert baru
    expect(rowsAfterSecond[0]!.cache_key).toBe(rowsAfterFirst[0]!.cache_key)
  })
})

describe('EDASHBOARD-591 — Isolasi cache antar scope RBAC (KRITIS, potensi kebocoran data)', () => {
  test('2 user beda divisionScope, query params PERSIS SAMA → hasil BEDA dan cache TIDAK numpuk jadi 1 baris', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}` // TIDAK ada filter division eksplisit

    const [narrowRes, wideRes] = await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.narrow } }),
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.wide } }),
    ])
    expect(narrowRes.status).toBe(200)
    expect(wideRes.status).toBe(200)
    const narrowBody = await narrowRes.json()
    const wideBody = await wideRes.json()

    // Scope beda HARUS menghasilkan data beda (wide >= narrow) — kalau ini
    // gagal, berarti scope RBAC-nya sendiri yang tidak jalan (bukan soal cache).
    expect(narrowBody).not.toEqual(wideBody)

    // Inti pengujian: 2 baris cache TERPISAH (cache_key beda), BUKAN 1 baris
    // yang salah satu user "menang" duluan lalu di-serve ke user lainnya.
    const rows = await findMetricCacheRows(COMPANY_ID, 'customer_metrics')
    expect(rows.length).toBe(2)
    const cacheKeys = new Set(rows.map((r) => r.cache_key))
    expect(cacheKeys.size).toBe(2)
  })

  test('narrowUser dipanggil ulang → dapat cache MILIKNYA SENDIRI, bukan cache wideUser', async () => {
    // Lanjutan test di atas — cache utk kedua user sudah ada di DB dari situ.
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    const firstRes = await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.narrow } })
    const firstBody = await firstRes.json()

    const secondRes = await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.narrow } })
    const secondBody = await secondRes.json()

    const wideRes = await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.wide } })
    const wideBody = await wideRes.json()

    expect(secondBody).toEqual(firstBody)
    expect(secondBody).not.toEqual(wideBody)
  })
})

describe('EDASHBOARD-591 — Cache key membedakan filter param berbeda', () => {
  test('company+scope sama, period_end BEDA → 2 baris cache terpisah, bukan numpuk', async () => {
    await clearMetricCache()
    const base = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    await app.request(`/api/v1/metrics/customer-metrics?${base}&period_end=2026-06-30`, { headers: { Cookie: cookies.wide } })
    await app.request(`/api/v1/metrics/customer-metrics?${base}&period_end=2026-07-31`, { headers: { Cookie: cookies.wide } })

    const rows = await findMetricCacheRows(COMPANY_ID, 'customer_metrics')
    expect(rows.length).toBe(2)
    expect(rows[0]!.cache_key).not.toBe(rows[1]!.cache_key)
  })
})

describe('EDASHBOARD-591 — TTL kedaluwarsa otomatis', () => {
  test('cache yang expires_at-nya sudah lewat TIDAK dipakai — recompute & baris di-refresh', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.wide } })
    const rowsBefore = await findMetricCacheRows(COMPANY_ID, 'customer_metrics')
    expect(rowsBefore.length).toBe(1)
    const originalExpiresAt = rowsBefore[0]!.expires_at.getTime()

    // Paksa kedaluwarsa — mundurkan expires_at ke masa lalu langsung di DB
    // (tidak realistis menunggu TTL 30 menit sungguhan di test).
    await db.update(metric_cache).set({ expires_at: new Date(Date.now() - 60_000) }).where(eq(metric_cache.id, rowsBefore[0]!.id))

    const res = await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.wide } })
    expect(res.status).toBe(200)

    const rowsAfter = await findMetricCacheRows(COMPANY_ID, 'customer_metrics')
    expect(rowsAfter.length).toBe(1) // upsert, bukan baris baru
    expect(rowsAfter[0]!.expires_at.getTime()).toBeGreaterThan(originalExpiresAt) // di-refresh ke masa depan baru
    expect(rowsAfter[0]!.expires_at.getTime()).toBeGreaterThan(Date.now())
  })
})

describe('EDASHBOARD-591 — company_id="all" IKUT di-cache (sentinel company_id=0)', () => {
  test('call ke-2 company_id=all HIT dari cache — 1 baris di company_id=0, bukan 0 baris', async () => {
    await db.delete(metric_cache)
    const res1 = await app.request('/api/v1/metrics/cross-selling?company_id=all', { headers: { Cookie: cookies.superadmin } })
    expect(res1.status).toBe(200)
    const body1 = await res1.json()

    const rowsAfterFirst = await db.select().from(metric_cache).where(eq(metric_cache.metric_key, 'cross_selling'))
    expect(rowsAfterFirst.length).toBe(1)
    expect(rowsAfterFirst[0]!.company_id).toBe(ALL_COMPANIES_SENTINEL)

    const res2 = await app.request('/api/v1/metrics/cross-selling?company_id=all', { headers: { Cookie: cookies.superadmin } })
    expect(res2.status).toBe(200)
    const body2 = await res2.json()
    expect(body2).toEqual(body1)

    const rowsAfterSecond = await db.select().from(metric_cache).where(eq(metric_cache.metric_key, 'cross_selling'))
    expect(rowsAfterSecond.length).toBe(1) // tetap 1, call ke-2 HIT bukan insert baru
  // company_id=all cold MISS (agregat lintas company) bisa beberapa detik —
  // timeout dinaikkan dari default 5000ms spy tidak flaky.
  }, 15_000)

  test('cache company_id=all TERPISAH dari cache company spesifik (cache_key beda meski metric_key sama)', async () => {
    await db.delete(metric_cache)
    await app.request(`/api/v1/metrics/cross-selling?company_id=${COMPANY_ID}&branch_id=${targetBranchId}`, { headers: { Cookie: cookies.wide } })
    await app.request('/api/v1/metrics/cross-selling?company_id=all', { headers: { Cookie: cookies.superadmin } })

    const rows = await db.select().from(metric_cache).where(eq(metric_cache.metric_key, 'cross_selling'))
    expect(rows.length).toBe(2)
    const companyIds = new Set(rows.map((r) => r.company_id))
    expect(companyIds).toEqual(new Set([COMPANY_ID, ALL_COMPANIES_SENTINEL]))
  }, 15_000)

  test('mutasi di 1 company spesifik IKUT menghapus cache company_id=all (agregatnya kena dampak juga)', async () => {
    await db.delete(metric_cache)
    // Isi cache company_id=all DAN company 1 spesifik sekaligus.
    await app.request('/api/v1/metrics/customer-metrics?company_id=all', { headers: { Cookie: cookies.superadmin } })
    await app.request(`/api/v1/metrics/customer-metrics?company_id=${COMPANY_ID}&branch_id=${targetBranchId}`, { headers: { Cookie: cookies.wide } })
    expect((await findMetricCacheRows(ALL_COMPANIES_SENTINEL, 'customer_metrics')).length).toBe(1)
    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(1)

    // Trigger event invalidasi NYATA khusus company 1 (Channel Division baru) —
    // company_id=all HARUS ikut kehapus, bukan cuma company 1 (lihat
    // deleteMetricCacheByCompany, metric-cache.repository.ts).
    const companyDivisions = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.company_id, COMPANY_ID)).limit(1)
    const createRes = await app.request('/api/v1/settings/channel-divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.superadmin, 'X-CSRF-Token': superadminCsrfToken },
      body: JSON.stringify({ channel_name: `E2E-CACHE-ALLSENTINEL-${Date.now()}`, division_id: companyDivisions[0]!.id, company_id: COMPANY_ID }),
    })
    expect(createRes.status).toBe(201)
    const createBody = await createRes.json() as { data: { id: number } }
    await db.delete(channel_divisions).where(eq(channel_divisions.id, createBody.data.id))

    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(0)
    expect((await findMetricCacheRows(ALL_COMPANIES_SENTINEL, 'customer_metrics')).length).toBe(0)
  // company_id=all cold MISS bisa ~4-5 detik sendirian (agregat lintas
  // company) — 2x fetch cold + 1 mutasi gampang lewat 5000ms default bun
  // test, timeout dinaikkan (bukan default) sama seperti pola di file lain
  // (production-kpi-matrix.e2e.test.ts).
  }, 20_000)

  test('invalidasi company_id=all TIDAK menyentuh cache company lain yang tidak berhubungan (company 2 tetap ada)', async () => {
    await clearMetricCache(COMPANY_ID)
    await clearMetricCache(SECOND_COMPANY_ID)
    await db.delete(metric_cache).where(eq(metric_cache.company_id, ALL_COMPANIES_SENTINEL))

    await app.request(`/api/v1/metrics/customer-metrics?company_id=${SECOND_COMPANY_ID}`, { headers: { Cookie: cookies.superadmin } })
    expect((await findMetricCacheRows(SECOND_COMPANY_ID, 'customer_metrics')).length).toBe(1)

    const companyDivisions = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.company_id, COMPANY_ID)).limit(1)
    const createRes = await app.request('/api/v1/settings/divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.superadmin, 'X-CSRF-Token': superadminCsrfToken },
      body: JSON.stringify({ company_id: COMPANY_ID, label: `E2E Cache All-Sentinel Division ${Date.now()}`, dormant_category: 'b2c' }),
    })
    expect(createRes.status).toBe(201)
    const createBody = await createRes.json() as { data: { id: number } }
    await db.delete(divisions).where(eq(divisions.id, createBody.data.id))

    // Invalidasi company 1 (+ sentinel 'all' ikut, sudah dites di atas) TIDAK
    // BOLEH ikut menghapus cache company 2 — company 2 tidak berhubungan sama
    // sekali dgn mutasi company 1 di test ini.
    expect((await findMetricCacheRows(SECOND_COMPANY_ID, 'customer_metrics')).length).toBe(1)
    await clearMetricCache(SECOND_COMPANY_ID)
  })
})

describe('EDASHBOARD-591 — Invalidasi berbasis event (mutasi nyata lewat endpoint sungguhan)', () => {
  test('create Channel Division baru utk company ini → cache company itu langsung hilang', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.wide } })
    const rowsBefore = await findMetricCacheRows(COMPANY_ID, 'customer_metrics')
    expect(rowsBefore.length).toBe(1)

    const companyDivisions = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.company_id, COMPANY_ID)).limit(1)
    const anyDivisionId = companyDivisions[0]!.id
    const uniqueChannelName = `E2E-CACHE-TEST-${Date.now()}`

    const createRes = await app.request('/api/v1/settings/channel-divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.superadmin, 'X-CSRF-Token': superadminCsrfToken },
      body: JSON.stringify({ channel_name: uniqueChannelName, division_id: anyDivisionId, company_id: COMPANY_ID }),
    })
    expect(createRes.status).toBe(201)
    const createBody = await createRes.json() as { data: { id: number } }
    createdChannelDivisionId = createBody.data.id

    const rowsAfter = await findMetricCacheRows(COMPANY_ID, 'customer_metrics')
    expect(rowsAfter.length).toBe(0) // terhapus oleh invalidateMetricCache di createChannelDivisionService
  })

  test('create Division baru utk company ini → cache company itu langsung hilang (titik trigger BERBEDA dari test di atas)', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.wide } })
    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(1)

    const uniqueLabel = `E2E Cache Test Division ${Date.now()}`
    const createRes = await app.request('/api/v1/settings/divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.superadmin, 'X-CSRF-Token': superadminCsrfToken },
      body: JSON.stringify({ company_id: COMPANY_ID, label: uniqueLabel, dormant_category: 'b2c' }),
    })
    expect(createRes.status).toBe(201)
    const createBody = await createRes.json() as { data: { id: number } }
    createdDivisionId = createBody.data.id

    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(0)
  })

  test('tandai customer sebagai Pareto utk company ini → cache company itu langsung hilang (titik trigger ke-3, beda fitur lagi)', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    await app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.wide } })
    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(1)

    const createRes = await app.request('/api/v1/settings/pareto-customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.superadmin, 'X-CSRF-Token': superadminCsrfToken },
      body: JSON.stringify({ company_id: COMPANY_ID, customer_id: existingCustomerId, effective_from: '2026-01-01' }),
    })
    expect(createRes.status).toBe(201)
    const createBody = await createRes.json() as { data: { id: number } }
    createdParetoCustomerId = createBody.data.id

    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(0)
  })
})

describe('EDASHBOARD-591 — Invalidasi menutup SEMUA metric_key sekaligus (bukan cuma yang kebetulan dites)', () => {
  test('cache customer_metrics + cross_selling + expansion_breakdown company sama → 1 event invalidasi menghapus KETIGANYA', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?${qs}`, { headers: { Cookie: cookies.wide } }),
      app.request(`/api/v1/metrics/cross-selling?${qs}`, { headers: { Cookie: cookies.wide } }),
      app.request(`/api/v1/metrics/expansion-breakdown?${qs}`, { headers: { Cookie: cookies.wide } }),
    ])
    const rowsBefore = await db.select().from(metric_cache).where(eq(metric_cache.company_id, COMPANY_ID))
    expect(rowsBefore.length).toBe(3)
    expect(new Set(rowsBefore.map((r) => r.metric_key))).toEqual(new Set(['customer_metrics', 'cross_selling', 'expansion_breakdown']))

    const uniqueChannelName = `E2E-CACHE-ALLKEYS-${Date.now()}`
    const companyDivisions = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.company_id, COMPANY_ID)).limit(1)
    const createRes = await app.request('/api/v1/settings/channel-divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.superadmin, 'X-CSRF-Token': superadminCsrfToken },
      body: JSON.stringify({ channel_name: uniqueChannelName, division_id: companyDivisions[0]!.id, company_id: COMPANY_ID }),
    })
    expect(createRes.status).toBe(201)
    const createBody = await createRes.json() as { data: { id: number } }
    await db.delete(channel_divisions).where(eq(channel_divisions.id, createBody.data.id)) // langsung bersihkan, tidak perlu ditrack afterAll

    const rowsAfter = await db.select().from(metric_cache).where(eq(metric_cache.company_id, COMPANY_ID))
    expect(rowsAfter.length).toBe(0) // ketiga metric_key ikut terhapus, bukan cuma satu
  })
})

describe('EDASHBOARD-591 — Invalidasi per-company TIDAK bocor ke company lain', () => {
  test('invalidasi company 1 TIDAK ikut menghapus cache company 2', async () => {
    await clearMetricCache(COMPANY_ID)
    await clearMetricCache(SECOND_COMPANY_ID)

    await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?company_id=${COMPANY_ID}&branch_id=${targetBranchId}`, { headers: { Cookie: cookies.wide } }),
      app.request(`/api/v1/metrics/customer-metrics?company_id=${SECOND_COMPANY_ID}`, { headers: { Cookie: cookies.superadmin } }),
    ])
    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(1)
    expect((await findMetricCacheRows(SECOND_COMPANY_ID, 'customer_metrics')).length).toBe(1)

    const uniqueChannelName = `E2E-CACHE-CROSSCO-${Date.now()}`
    const companyDivisions = await db.select({ id: divisions.id }).from(divisions).where(eq(divisions.company_id, COMPANY_ID)).limit(1)
    const createRes = await app.request('/api/v1/settings/channel-divisions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.superadmin, 'X-CSRF-Token': superadminCsrfToken },
      body: JSON.stringify({ channel_name: uniqueChannelName, division_id: companyDivisions[0]!.id, company_id: COMPANY_ID }),
    })
    const createBody = await createRes.json() as { data: { id: number } }
    await db.delete(channel_divisions).where(eq(channel_divisions.id, createBody.data.id))

    // Company 1: cache-nya hilang (dampak invalidasi). Company 2: TIDAK
    // tersentuh sama sekali — kalau ini gagal (0 baris), berarti invalidasi
    // ikut menyapu company yang tidak seharusnya (WHERE company_id salah).
    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(0)
    expect((await findMetricCacheRows(SECOND_COMPANY_ID, 'customer_metrics')).length).toBe(1)

    await clearMetricCache(SECOND_COMPANY_ID)
  })
})

describe('EDASHBOARD-591 — Invalidasi GLOBAL (business_configs) membersihkan SEMUA company sekaligus', () => {
  test('update config global → cache company 1 DAN company 2 sama-sama hilang (bukan cuma 1 company)', async () => {
    await clearMetricCache(COMPANY_ID)
    await clearMetricCache(SECOND_COMPANY_ID)

    await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?company_id=${COMPANY_ID}&branch_id=${targetBranchId}`, { headers: { Cookie: cookies.wide } }),
      app.request(`/api/v1/metrics/customer-metrics?company_id=${SECOND_COMPANY_ID}`, { headers: { Cookie: cookies.superadmin } }),
    ])
    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(1)
    expect((await findMetricCacheRows(SECOND_COMPANY_ID, 'customer_metrics')).length).toBe(1)

    // PUT nilai yang SAMA PERSIS dgn yang sudah ada (baca dulu, tulis balik) —
    // tetap memicu updateConfig()+invalidateAllMetricCache() apa adanya, TANPA
    // benar2 mengubah perilaku bisnis config ini (tidak perlu revert di afterAll).
    const key = 'repeat_order_target_pct'
    const existingConfig = await db.select({ value: businessConfigs.value }).from(businessConfigs).where(eq(businessConfigs.key, key)).limit(1)
    if (existingConfig.length === 0) throw new Error(`Config "${key}" tidak ditemukan — dibutuhkan utk test ini`)

    const updateRes = await app.request(`/api/v1/config/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Cookie: cookies.superadmin, 'X-CSRF-Token': superadminCsrfToken },
      body: JSON.stringify({ value: existingConfig[0]!.value }),
    })
    expect(updateRes.status).toBe(200)

    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(0)
    expect((await findMetricCacheRows(SECOND_COMPANY_ID, 'customer_metrics')).length).toBe(0)
  })
})

describe('EDASHBOARD-591 — Cakupan endpoint lain (bukan cuma customer-metrics)', () => {
  test('cross-selling: siklus HIT/MISS penuh sama seperti customer-metrics', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    const res1 = await app.request(`/api/v1/metrics/cross-selling?${qs}`, { headers: { Cookie: cookies.wide } })
    expect(res1.status).toBe(200)
    const body1 = await res1.json()
    expect((await findMetricCacheRows(COMPANY_ID, 'cross_selling')).length).toBe(1)

    const res2 = await app.request(`/api/v1/metrics/cross-selling?${qs}`, { headers: { Cookie: cookies.wide } })
    const body2 = await res2.json()
    expect(body2).toEqual(body1)
    expect((await findMetricCacheRows(COMPANY_ID, 'cross_selling')).length).toBe(1) // tidak numpuk
  })

  test('expansion-breakdown: siklus HIT/MISS penuh sama seperti customer-metrics', async () => {
    await clearMetricCache()
    const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

    const res1 = await app.request(`/api/v1/metrics/expansion-breakdown?${qs}`, { headers: { Cookie: cookies.wide } })
    expect(res1.status).toBe(200)
    const body1 = await res1.json()
    expect((await findMetricCacheRows(COMPANY_ID, 'expansion_breakdown')).length).toBe(1)

    const res2 = await app.request(`/api/v1/metrics/expansion-breakdown?${qs}`, { headers: { Cookie: cookies.wide } })
    const body2 = await res2.json()
    expect(body2).toEqual(body1)
    expect((await findMetricCacheRows(COMPANY_ID, 'expansion_breakdown')).length).toBe(1)
  })
})

describe('EDASHBOARD-591 — Smoke test SEMUA 20 endpoint yang di-cache (data-driven, bukan tulis tangan)', () => {
  // Superadmin dipakai (bukan role lain) supaya tidak ada ambiguitas permission
  // per-endpoint (hm-breakdown/revenue-breakdown/ror-breakdown dst masing-masing
  // permission berbeda, lihat metrics.route.ts) — fokus test ini MURNI
  // membuktikan mekanisme cache jalan di semua 20 titik, bukan menguji RBAC lagi
  // (itu sudah dites terpisah di Group "Isolasi cache antar scope RBAC" & "per
  // role" di bawah).
  for (const { path, metricKey, extraParams } of ALL_CACHED_ENDPOINTS) {
    test(`${path} (${metricKey}): call ke-2 HIT dari cache, 1 baris cache saja`, async () => {
      await clearMetricCache()
      const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}${extraParams ? `&${extraParams()}` : ''}`

      const res1 = await app.request(`/api/v1/metrics/${path}?${qs}`, { headers: { Cookie: cookies.superadmin } })
      expect(res1.status).toBe(200)
      const body1 = await res1.json()

      const rowsAfterFirst = await findMetricCacheRows(COMPANY_ID, metricKey)
      expect(rowsAfterFirst.length).toBe(1)

      const res2 = await app.request(`/api/v1/metrics/${path}?${qs}`, { headers: { Cookie: cookies.superadmin } })
      expect(res2.status).toBe(200)
      const body2 = await res2.json()

      expect(body2).toEqual(body1)
      const rowsAfterSecond = await findMetricCacheRows(COMPANY_ID, metricKey)
      expect(rowsAfterSecond.length).toBe(1) // tidak numpuk jadi baris kedua
      expect(rowsAfterSecond[0]!.cache_key).toBe(rowsAfterFirst[0]!.cache_key)
    })
  }
})

describe('EDASHBOARD-591 — Skenario per role (superadmin, holding, entitas eksekutif/admin, user)', () => {
  // Ke-3 fixture di bawah (holding/entityAdmin/entityUser) SEMUA punya akses
  // PENUH ke company 1 (semua branch, semua division) — bedanya cuma role_id
  // (admin vs user) dan (utk holding) cakupan lintas company. Kalau scope
  // akses SAMA, hasil metrics HARUS identik terlepas dari role — mirror pola
  // assertion "MD MKO identik Super Admin", "FAT MKO (role user, full access)
  // identik Super Admin" di production-kpi-matrix.e2e.test.ts, tapi pakai
  // fixture sintetis supaya jalan konsisten di CI.
  const REPRESENTATIVE_ENDPOINTS = [
    { path: 'customer-metrics', metricKey: 'customer_metrics' },
    { path: 'expansion-breakdown', metricKey: 'expansion_breakdown' },
    { path: 'category-performance', metricKey: 'category_performance' },
    // revenue-breakdown/ror-breakdown SENGAJA tidak diikutkan di sini — status
    // grant customer.revenue:view/repeat.order:view utk role='user' via
    // migrateRenamedPermissions() belum terkonfirmasi solid (lihat catatan
    // production-kpi-matrix.e2e.test.ts), jadi hasil beda antara entityUser
    // (role user) vs superadmin di 2 endpoint itu bisa murni soal permission,
    // bukan bug cache.
  ]

  for (const { path, metricKey } of REPRESENTATIVE_ENDPOINTS) {
    test(`${path}: holding, entitas eksekutif (admin), dan user — full access company 1 — hasil identik superadmin`, async () => {
      await clearMetricCache()
      const qs = `company_id=${COMPANY_ID}&branch_id=${targetBranchId}`

      // Sekuensial (bukan Promise.all) supaya baris cache bisa diatribusikan
      // dgn pasti ke tiap panggilan — superadmin di-bypass RBAC (branchScope/
      // divisionScope undefined, middleware/auth.ts resolveBranchScope/
      // resolveDivisionScope), sedangkan holding/entityAdmin/entityUser (semua
      // role NON-super) tetap punya scope eksplisit meski isinya "akses
      // penuh" — representasi cache key-nya BEDA dari superadmin walau
      // datanya sama, ITU BUKAN bug (lihat komentar buildCacheKey).
      const superadminRes = await app.request(`/api/v1/metrics/${path}?${qs}`, { headers: { Cookie: cookies.superadmin } })
      expect(superadminRes.status).toBe(200)
      const superadminBody = await superadminRes.json()
      expect((await findMetricCacheRows(COMPANY_ID, metricKey)).length).toBe(1) // baris ke-1: superadmin (scope bypass)

      const holdingRes = await app.request(`/api/v1/metrics/${path}?${qs}`, { headers: { Cookie: cookies.holding } })
      expect(holdingRes.status).toBe(200)
      const holdingBody = await holdingRes.json()
      expect((await findMetricCacheRows(COMPANY_ID, metricKey)).length).toBe(2) // baris ke-2: scope eksplisit (holding)

      const entityAdminRes = await app.request(`/api/v1/metrics/${path}?${qs}`, { headers: { Cookie: cookies.entityAdmin } })
      expect(entityAdminRes.status).toBe(200)
      const entityAdminBody = await entityAdminRes.json()
      // entityAdmin scope eksplisit SAMA PERSIS dgn holding (company 1 full
      // access) → reuse baris ke-2, TIDAK bertambah jadi 3.
      expect((await findMetricCacheRows(COMPANY_ID, metricKey)).length).toBe(2)

      const entityUserRes = await app.request(`/api/v1/metrics/${path}?${qs}`, { headers: { Cookie: cookies.entityUser } })
      expect(entityUserRes.status).toBe(200)
      const entityUserBody = await entityUserRes.json()
      // role_id BUKAN bagian cache key (cuma companyScopeIds/branchScope/
      // divisionScope) → entityUser (role user, scope sama) juga reuse baris
      // ke-2 yang sama, tetap 2 total, bukan 3.
      expect((await findMetricCacheRows(COMPANY_ID, metricKey)).length).toBe(2)

      // DATA-nya (payload hasil query) tetap harus identik di semua role —
      // scope akses yang menentukan hasil, bukan cache key mentahnya. Order-
      // insensitive (normalizeForComparison) — lihat komentar di atas.
      expect(normalizeForComparison(holdingBody)).toEqual(normalizeForComparison(superadminBody))
      expect(normalizeForComparison(entityAdminBody)).toEqual(normalizeForComparison(superadminBody))
      expect(normalizeForComparison(entityUserBody)).toEqual(normalizeForComparison(superadminBody))

      const rows = await findMetricCacheRows(COMPANY_ID, metricKey)
      const cacheKeys = new Set(rows.map((r) => r.cache_key))
      expect(cacheKeys.size).toBe(2)
    })
  }

  test('holdingUser: query company_id berbeda (company 1 vs company 2) menghasilkan data BEDA dan cache TERPISAH', async () => {
    await clearMetricCache(COMPANY_ID)
    await clearMetricCache(SECOND_COMPANY_ID)

    const [company1Res, company2Res] = await Promise.all([
      app.request(`/api/v1/metrics/customer-metrics?company_id=${COMPANY_ID}&branch_id=${targetBranchId}`, { headers: { Cookie: cookies.holding } }),
      app.request(`/api/v1/metrics/customer-metrics?company_id=${SECOND_COMPANY_ID}`, { headers: { Cookie: cookies.holding } }),
    ])
    expect(company1Res.status).toBe(200)
    expect(company2Res.status).toBe(200)
    const company1Body = await company1Res.json()
    const company2Body = await company2Res.json()

    // 1 user, 2 company berbeda di query — HARUS dapat 2 baris cache terpisah
    // (per company_id), bukan 1 user = 1 cache key terlepas dari company mana
    // yang lagi dia lihat.
    expect((await findMetricCacheRows(COMPANY_ID, 'customer_metrics')).length).toBe(1)
    expect((await findMetricCacheRows(SECOND_COMPANY_ID, 'customer_metrics')).length).toBe(1)
    expect(company1Body).not.toEqual(company2Body)

    await clearMetricCache(SECOND_COMPANY_ID)
  })
})

describe('EDASHBOARD-591 — /dashboard: data cold vs warm harus IDENTIK (bukan cuma lebih cepat)', () => {
  // Verifikasi KETAT (2026-09-02, koreksi user: "apakah data sudah valid dari
  // before after tuning?") — /dashboard agregat 6 fungsi getX() (cross/
  // customer/dormant x2 tanggal) + fetchDormantValueTrend x2 (BARU di-cache
  // hari ini, dashboard.service.ts, di luar metrics.service.ts). Cold = jalur
  // compute() ASLI (logika bisnis tidak diubah sama sekali oleh caching),
  // Warm = baca ulang dari metric_cache — HARUS byte-identik, kalau beda
  // berarti ada corruption di serialisasi JSONB atau bug di cara params/scope
  // di-thread ke compute().
  for (const companyId of [String(COMPANY_ID), String(SECOND_COMPANY_ID), 'all']) {
    test(`company_id=${companyId}: response cold (MISS) sama persis dgn warm (HIT)`, async () => {
      await db.delete(metric_cache)
      const coldRes = await app.request(`/api/v1/dashboard?company_id=${companyId}&period_end=2026-08-25`, { headers: { Cookie: cookies.superadmin } })
      expect(coldRes.status).toBe(200)
      const coldBody = await coldRes.json()

      const warmRes = await app.request(`/api/v1/dashboard?company_id=${companyId}&period_end=2026-08-25`, { headers: { Cookie: cookies.superadmin } })
      expect(warmRes.status).toBe(200)
      const warmBody = await warmRes.json()

      expect(warmBody).toEqual(coldBody)
    }, 30_000) // cold company_id=all/company besar bisa >10 detik
  }
})
