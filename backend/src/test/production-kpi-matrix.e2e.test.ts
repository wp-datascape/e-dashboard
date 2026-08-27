/**
 * test/production-kpi-matrix.e2e.test.ts
 *
 * Audit MENYELURUH KPI M1-M10 (summary card Dashboard Overview + trend M1/M2/M3-M7,
 * filter periode/branch, permission role) untuk 7 akun REAL production, login
 * sungguhan via HTTP (bukan simulasi scope seperti production-scope-consistency.e2e.test.ts
 * — sekarang password akun production sudah diketahui, jadi diuji end-to-end lewat
 * app.request(), termasuk permission middleware yang sebelumnya ter-bypass).
 *
 * SKIP OTOMATIS di CI — akun berikut cuma ada di DB hasil restore backup production
 * (lihat docs-v2/shared/deployment.md §Backup database), bukan seed CI standar
 * (backend/src/db/seed.ts cuma bikin admin@mail.com).
 *
 * company_id: 1 = PT Mesin Kasir Online (MKO), 2 = PT Kode Niaga Tama (KNT, omset
 * & data JAUH lebih besar dari MKO — prioritas utama audit ini), 3 = PT Solusi
 * Kartu Indonesia/SKI, belum ada transaksi sama sekali per 2026-08 — TIDAK ADA
 * hubungan dgn "Ucard" yang muncul di test ini, itu nama DIVISI di dalam KNT).
 *
 * Untuk jalankan: restore backup production ke lokal dulu, baru
 * `bun test src/test/production-kpi-matrix.e2e.test.ts` (butuh beberapa menit,
 * puluhan kombinasi user x company x periode x endpoint terhadap data production
 * sungguhan — dashboard summary card sendirian sudah fetch 10 KPI + YoY 2x).
 */
import { describe, test, expect, beforeAll } from 'bun:test'
import { Hono } from 'hono'
import { eq, inArray } from 'drizzle-orm'
import { db } from '@/config/db'
import { users, company_branches } from '@/db/schema'
import { createRouter } from '@/router'

const app = new Hono()
createRouter(app)

const COMPANY = { MKO: 1, KNT: 2, SKI: 3 } as const // SKI = PT Solusi Kartu Indonesia. "Ucard" itu nama DIVISI di dalam KNT, tidak ada hubungan dgn company ini
const PERIOD_END = '2026-08-25'
const PERIOD_TYPES = ['monthly', 'quarter', 'semester', 'annual'] as const

interface UserDef {
  label: string
  email: string
  password: string
  companies: (number | 'all')[]
  role: 'admin-like' | 'user-like'
}

// Kredensial REAL diberikan user (2026-08-27) — BUKAN fixture sintetis. Password
// akun production sungguhan, sengaja literal di sini (bukan file rahasia) karena
// ini test lokal-only (skip otomatis di CI) terhadap clone DB, bukan production asli.
const USER_DEFS: UserDef[] = [
  { label: 'Super Admin', email: 'admin@mail.com', password: '123456', companies: ['all', COMPANY.MKO, COMPANY.KNT, COMPANY.SKI], role: 'admin-like' },
  { label: 'FAT Holding', email: 'finance@semanggi.id', password: '@Finance1234', companies: ['all', COMPANY.MKO, COMPANY.KNT, COMPANY.SKI], role: 'admin-like' },
  { label: 'Marketing Holding', email: 'marketing@semanggi.id', password: '@Marketing1234', companies: ['all', COMPANY.MKO, COMPANY.KNT, COMPANY.SKI], role: 'admin-like' },
  // 'Executive Holding' (executive@semanggi.id) SENGAJA di-skip (2026-08-27) —
  // password yang diberikan salah (401), user minta lewati dulu sampai password
  // benar dikonfirmasi ulang. Tinggal tambah balik ke array ini kalau sudah ada.
  { label: 'MD MKO', email: 'mko.executive@semanggi.id', password: '12345678', companies: [COMPANY.MKO], role: 'admin-like' },
  { label: 'FAT MKO', email: 'mko.finance@semanggi.id', password: '12345678', companies: [COMPANY.MKO], role: 'user-like' },
  { label: 'MD KNT', email: 'knt.executive@semanggi.id', password: '12345678', companies: [COMPANY.KNT], role: 'admin-like' },
]

async function loginAndGetCookie(email: string, password: string): Promise<string> {
  const res = await app.request('/api/v1/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  const setCookie = res.headers.get('set-cookie') ?? ''
  const match = setCookie.match(/access_token=([^;,]+)/)
  if (!match) throw new Error(`Login gagal untuk ${email} (${res.status}): ${await res.text()}`)
  return `access_token=${match[1]}`
}

interface DashboardSnapshot {
  // status per endpoint (bukan throw on error) — beberapa kombinasi (KNOWN ISSUE
  // di bawah) genuinely gagal/timeout di data production riil, dan itu SENDIRI
  // adalah temuan yang mau didokumentasikan, bukan dianggap bug test yang harus
  // bikin seluruh beforeAll berhenti total (dulu throw — 1 kombinasi lambat
  // menyembunyikan hasil SEMUA kombinasi lain sesudahnya).
  status: { dashboard: number; customers: number; invoices: number }
  cards: Record<string, number> // metric_key (M1-M10) -> current_value
  customerCount: number // -1 kalau request customers gagal
  invoiceCount: number // -1 kalau request invoices gagal
}

async function fetchDashboardSnapshot(cookie: string, companyId: number | 'all'): Promise<DashboardSnapshot> {
  const [dashRes, custRes, invRes] = await Promise.all([
    app.request(`/api/v1/dashboard?company_id=${companyId}&period_end=${PERIOD_END}`, { headers: { Cookie: cookie } }),
    app.request(`/api/v1/customers?company_id=${companyId}&per_page=1`, { headers: { Cookie: cookie } }),
    app.request(`/api/v1/invoices?company_id=${companyId}&per_page=1`, { headers: { Cookie: cookie } }),
  ])
  const status = { dashboard: dashRes.status, customers: custRes.status, invoices: invRes.status }

  const cards: Record<string, number> = {}
  if (dashRes.status === 200) {
    const dashBody = (await dashRes.json()) as { data: { metrics: { metric_key: string; summary: { current_value: number } }[] } }
    for (const c of dashBody.data.metrics) cards[c.metric_key] = c.summary.current_value
  }
  const customerCount = custRes.status === 200 ? ((await custRes.json()) as { meta: { total: number } }).meta.total : -1
  const invoiceCount = invRes.status === 200 ? ((await invRes.json()) as { meta: { total: number } }).meta.total : -1

  return { status, cards, customerCount, invoiceCount }
}

interface TrendSnapshot {
  existingCustomers: number
  totalRevenue: number
  trendLength: number
}

async function fetchCustomerMetricsTrend(
  cookie: string,
  companyId: number | 'all',
  extra: { periodType?: (typeof PERIOD_TYPES)[number]; branchId?: number } = {},
): Promise<{ status: number; snapshot?: TrendSnapshot }> {
  const params = new URLSearchParams({ company_id: String(companyId), period_end: PERIOD_END })
  if (extra.periodType) params.set('period_type', extra.periodType)
  if (extra.branchId) params.set('branch_id', String(extra.branchId))
  const res = await app.request(`/api/v1/metrics/customer-metrics?${params}`, { headers: { Cookie: cookie } })
  if (res.status !== 200) return { status: res.status }
  const body = (await res.json()) as { data: { trend: { existing_customers: number; total_revenue_existing: number }[] } }
  const last = body.data.trend[body.data.trend.length - 1]
  return {
    status: 200,
    snapshot: {
      existingCustomers: last?.existing_customers ?? 0,
      totalRevenue: last?.total_revenue_existing ?? 0,
      trendLength: body.data.trend.length,
    },
  }
}

interface DormantSnapshot {
  dormantCount: number
  totalCustomers: number
  lostValue: number
}

async function fetchDormantSnapshot(
  cookie: string,
  companyId: number | 'all',
  periodType: (typeof PERIOD_TYPES)[number],
): Promise<{ status: number; snapshot?: DormantSnapshot }> {
  const params = new URLSearchParams({ company_id: String(companyId), period_end: PERIOD_END, period_type: periodType })
  const res = await app.request(`/api/v1/metrics/dormant-customer?${params}`, { headers: { Cookie: cookie } })
  if (res.status !== 200) return { status: res.status }
  const body = (await res.json()) as {
    data: { dormant_rate_current: { dormant_count: number; total_customers: number }; value_ranking_total_current: number }
  }
  return {
    status: 200,
    snapshot: {
      dormantCount: body.data.dormant_rate_current.dormant_count,
      totalCustomers: body.data.dormant_rate_current.total_customers,
      lostValue: body.data.value_ranking_total_current,
    },
  }
}

// Top-level await (ESM) — cek akun production ini ADA sebelum register describe,
// supaya bisa skip 1x lewat describe.skipIf() (bukan gagal satu-satu per test) di
// CI (DB seed kosong).
const emails = USER_DEFS.map((u) => u.email)
const existingEmails = new Set((await db.select({ email: users.email }).from(users).where(inArray(users.email, emails))).map((r) => r.email))
const allUsersExist = emails.every((e) => existingEmails.has(e))

describe.skipIf(!allUsersExist)('KPI M1-M10 — matrix production riil (login sungguhan)', () => {
  const cookies = new Map<string, string>()

  beforeAll(async () => {
    for (const u of USER_DEFS) {
      cookies.set(u.label, await loginAndGetCookie(u.email, u.password))
    }
  }, 30_000)

  describe('Group 1 — Summary card M1-M10 + data dasar, matrix company scope', () => {
    const snapshots = new Map<string, DashboardSnapshot>()
    const key = (label: string, companyId: number | 'all') => `${label}|${companyId}`

    beforeAll(async () => {
      for (const u of USER_DEFS) {
        for (const companyId of u.companies) {
          snapshots.set(key(u.label, companyId), await fetchDashboardSnapshot(cookies.get(u.label)!, companyId))
        }
      }
      // Laporan tabel (2026-08-27, diminta user) — dicetak SETIAP kali test ini jalan,
      // bukan cuma sekali. `console.table` di beforeAll biar selalu tampil di stdout
      // `bun test`, tanpa perlu skrip pelaporan terpisah.
      console.table(
        [...snapshots.entries()].map(([k, v]) => {
          const [label, companyId] = k.split('|')
          return {
            user: label,
            company: companyId,
            customer: v.customerCount,
            invoice: v.invoiceCount,
            M1_crossSelling: v.cards['cross_selling_ratio'],
            M2_avgCategory: v.cards['avg_category'],
            M3_avgRevenue: v.cards['avg_revenue'],
            M4_avgGP: v.cards['avg_gross_profit'],
            M5_hmPenetration: v.cards['high_margin_penetration'],
            M6_repeatOrder: v.cards['repeat_order_rate'],
            M7_expansion: v.cards['expansion_rate'],
            M8_dormantRate: v.cards['dormant_rate'],
            M9_dormantValue: v.cards['dormant_value'],
            M10_reactivation: v.cards['reactivation_rate'],
            httpStatus: `${v.status.dashboard}/${v.status.customers}/${v.status.invoices}`,
          }
        }),
      )
    }, 600_000)

    // TEMUAN PERFORMA (2026-08-27, DIPERBAIKI) — GET /customers dgn company_id=all
    // untuk user NON-superadmin sempat KONSISTEN melewati statement_timeout 20s
    // (config/db.ts) → 500 INTERNAL_ERROR, di company MANA PUN termasuk yang kecil.
    // Root cause: findCustomers() (customers.repository.ts) JOIN invoices mentah
    // langsung ke query customer bareng subquery latestSalespersonSq — begitu ada
    // kondisi scope branch/division, planner Postgres pilih Nested Loop nyaris
    // cross-product. SUDAH DIPERBAIKI — agregasi invCountExpr/catCountExpr dipindah
    // ke subquery terpisah (pola sama liveDatesSq), diverifikasi EXPLAIN ANALYZE
    // (20s+ timeout -> ~1-2 detik) + hasil byte-identik vs sebelum fix utk skenario
    // superadmin (lihat docs-v2/task/task029.md). Test ini sekarang assert 200 utk
    // SEMUA role, bukan cuma toleransi 500 kayak sebelumnya.
    test('company_id=all untuk customers list: SEMUA role (superadmin maupun scoped) berhasil 200, tidak timeout', () => {
      for (const label of ['Super Admin', 'FAT Holding', 'Marketing Holding']) {
        const snap = snapshots.get(key(label, 'all'))!
        expect(snap.status.customers, `${label} @ all seharusnya 200`).toBe(200)
      }
    })

    test('MD MKO (full access) identik Super Admin @ MKO', () => {
      expect(snapshots.get(key('MD MKO', COMPANY.MKO))).toEqual(snapshots.get(key('Super Admin', COMPANY.MKO)))
    })

    test('FAT MKO (role user, tapi full branch/division access) identik Super Admin @ MKO', () => {
      expect(snapshots.get(key('FAT MKO', COMPANY.MKO))).toEqual(snapshots.get(key('Super Admin', COMPANY.MKO)))
    })

    test('FAT Holding dan Marketing Holding identik satu sama lain di semua company', () => {
      for (const companyId of ['all', COMPANY.MKO, COMPANY.KNT, COMPANY.SKI] as const) {
        expect(snapshots.get(key('Marketing Holding', companyId))).toEqual(snapshots.get(key('FAT Holding', companyId)))
      }
    })

    test('Super Admin: jumlah customer/invoice per-company (MKO+KNT+SKI) = company_id=all', () => {
      const all = snapshots.get(key('Super Admin', 'all'))!
      const mko = snapshots.get(key('Super Admin', COMPANY.MKO))!
      const knt = snapshots.get(key('Super Admin', COMPANY.KNT))!
      const ski = snapshots.get(key('Super Admin', COMPANY.SKI))!
      expect(mko.customerCount + knt.customerCount + ski.customerCount).toBe(all.customerCount)
      expect(mko.invoiceCount + knt.invoiceCount + ski.invoiceCount).toBe(all.invoiceCount)
    })

    test('Holding: jumlah customer/invoice per-company = company_id=all (konsisten internal, walau lebih sempit dari Super Admin)', () => {
      const all = snapshots.get(key('FAT Holding', 'all'))!
      const mko = snapshots.get(key('FAT Holding', COMPANY.MKO))!
      const knt = snapshots.get(key('FAT Holding', COMPANY.KNT))!
      const ski = snapshots.get(key('FAT Holding', COMPANY.SKI))!
      expect(mko.customerCount + knt.customerCount + ski.customerCount).toBe(all.customerCount)
      expect(mko.invoiceCount + knt.invoiceCount + ski.invoiceCount).toBe(all.invoiceCount)
    })

    test('Holding tidak pernah melihat customer/invoice LEBIH BANYAK dari Super Admin, di company yang sama', () => {
      for (const companyId of [COMPANY.MKO, COMPANY.KNT, COMPANY.SKI] as const) {
        const holding = snapshots.get(key('FAT Holding', companyId))!
        const superadmin = snapshots.get(key('Super Admin', companyId))!
        expect(holding.customerCount).toBeLessThanOrEqual(superadmin.customerCount)
        expect(holding.invoiceCount).toBeLessThanOrEqual(superadmin.invoiceCount)
      }
    })

    // DIPERBAIKI (2026-08-27) — sebelumnya MD KNT (grant branch+division PENUH)
    // TIDAK identik Super Admin @ KNT (selisih puluhan customer/invoice) walau
    // grant-nya sudah lengkap. Root cause: 64 invoice KNT ber-branch_name "PUSAT"
    // (teks mentah dari import) tidak match branch mana pun milik KNT — KNT belum
    // punya branch "Pusat" di master data, cuma company SKI yang punya. Fix: bikin
    // branch "Pusat" baru untuk KNT, backfill branch_id 64 invoice itu
    // (scripts/backfill-invoice-branch-id.ts --apply), grant akses branch+division-nya
    // ke semua user KNT. Diverifikasi identik persis di SEMUA granularitas periode +
    // SEMUA 8 cabang + M8-M10 dormant (lihat Group 2/3/5 di bawah), bukan cuma
    // snapshot default ini.
    test('MD KNT (grant branch+division penuh) identik Super Admin @ KNT', () => {
      expect(snapshots.get(key('MD KNT', COMPANY.KNT))).toEqual(snapshots.get(key('Super Admin', COMPANY.KNT)))
    })

    test('Company SKI (3): nol customer/invoice di semua role (belum ada transaksi)', () => {
      for (const label of ['Super Admin', 'FAT Holding', 'Marketing Holding']) {
        const snap = snapshots.get(key(label, COMPANY.SKI))!
        expect(snap.customerCount).toBe(0)
        expect(snap.invoiceCount).toBe(0)
      }
    })
  })

  describe('Group 2 — Filter periode (monthly/quarter/semester/annual), prioritas KNT', () => {
    const snapshots = new Map<string, { status: number; snapshot?: TrendSnapshot }>()
    const key = (label: string, companyId: number | 'all', periodType: string) => `${label}|${companyId}|${periodType}`

    beforeAll(async () => {
      const combos: { label: string; companyId: number | 'all' }[] = [
        { label: 'Super Admin', companyId: 'all' },
        { label: 'Super Admin', companyId: COMPANY.KNT },
        { label: 'MD KNT', companyId: COMPANY.KNT },
        { label: 'FAT Holding', companyId: COMPANY.KNT },
        { label: 'Marketing Holding', companyId: COMPANY.KNT },
        { label: 'Super Admin', companyId: COMPANY.MKO },
        { label: 'MD MKO', companyId: COMPANY.MKO },
      ]
      for (const { label, companyId } of combos) {
        for (const periodType of PERIOD_TYPES) {
          snapshots.set(key(label, companyId, periodType), await fetchCustomerMetricsTrend(cookies.get(label)!, companyId, { periodType }))
        }
      }
    }, 600_000)

    test('Semua granularitas periode berhasil (200, trend 12 titik) untuk semua kombinasi', () => {
      for (const [comboKey, result] of snapshots) {
        expect(result.status, `combo ${comboKey} gagal status ${result.status}`).toBe(200)
        expect(result.snapshot!.trendLength, `combo ${comboKey} trend bukan 12 titik`).toBe(12)
      }
    })

    test('MD MKO identik Super Admin @ MKO di SEMUA granularitas periode', () => {
      for (const periodType of PERIOD_TYPES) {
        expect(snapshots.get(key('MD MKO', COMPANY.MKO, periodType))!.snapshot).toEqual(
          snapshots.get(key('Super Admin', COMPANY.MKO, periodType))!.snapshot,
        )
      }
    })

    test('FAT Holding tidak pernah melihat existing_customers LEBIH BANYAK dari Super Admin @ KNT, di granularitas apa pun', () => {
      for (const periodType of PERIOD_TYPES) {
        const holding = snapshots.get(key('FAT Holding', COMPANY.KNT, periodType))!.snapshot!
        const superadmin = snapshots.get(key('Super Admin', COMPANY.KNT, periodType))!.snapshot!
        expect(holding.existingCustomers).toBeLessThanOrEqual(superadmin.existingCustomers)
      }
    })

    // Uji KETAT (2026-08-27, diminta user setelah fix Pusat branch — "datanya tidak
    // ada selisih untuk semua user pada setiap periode?") — bukan cuma "tidak lebih
    // banyak" (toBeLessThanOrEqual di atas), tapi IDENTIK PERSIS (toEqual) di SEMUA
    // 4 granularitas, utk SEMUA user scoped KNT sekaligus (bukan cuma FAT Holding).
    test('MD KNT, FAT Holding, Marketing Holding identik PERSIS Super Admin @ KNT di SEMUA granularitas periode', () => {
      for (const label of ['MD KNT', 'FAT Holding', 'Marketing Holding']) {
        for (const periodType of PERIOD_TYPES) {
          expect(
            snapshots.get(key(label, COMPANY.KNT, periodType))!.snapshot,
            `${label} @ KNT periode ${periodType} harus identik persis Super Admin`,
          ).toEqual(snapshots.get(key('Super Admin', COMPANY.KNT, periodType))!.snapshot)
        }
      }
    })

    test('Granularitas berbeda menghasilkan angka berbeda (bukan hardcode bulanan) — quarter != monthly untuk Super Admin @ KNT', () => {
      const monthly = snapshots.get(key('Super Admin', COMPANY.KNT, 'monthly'))!.snapshot!
      const quarter = snapshots.get(key('Super Admin', COMPANY.KNT, 'quarter'))!.snapshot!
      // Window quarter (3 bulan) mengagregasi lebih banyak transaksi daripada monthly —
      // revenue quarter harus >= revenue monthly (bukan sekadar "beda", tapi terarah).
      expect(quarter.totalRevenue).toBeGreaterThanOrEqual(monthly.totalRevenue)
    })
  })

  describe('Group 3 — Filter branch, SEMUA cabang KNT (8 cabang termasuk "Pusat", omset jauh lebih besar dari MKO)', () => {
    let kntBranches: { id: number; name: string }[]
    const snapshots = new Map<string, { status: number; snapshot?: TrendSnapshot }>()
    const key = (label: string, branchId: number) => `${label}|${branchId}`

    beforeAll(async () => {
      kntBranches = await db
        .select({ id: company_branches.id, name: company_branches.name })
        .from(company_branches)
        .where(eq(company_branches.company_id, COMPANY.KNT))

      for (const branch of kntBranches) {
        for (const label of ['Super Admin', 'FAT Holding', 'MD KNT']) {
          snapshots.set(key(label, branch.id), await fetchCustomerMetricsTrend(cookies.get(label)!, COMPANY.KNT, { branchId: branch.id }))
        }
      }
    }, 300_000)

    // Uji KETAT SEMUA cabang (2026-08-27, diminta user) — dulu cuma 2 cabang sample
    // (Semarang sengaja dipilih krn ADA gap grant divisi Ucard, Kaltim Nusantara krn
    // TIDAK ada gap) sekarang dilebarkan ke SEMUA 8 cabang KNT, termasuk "Pusat" yang
    // baru dibuat (fix backfill invoice branch_id, lihat komentar Group 1). Gap Ucard
    // di Semarang sendiri SUDAH diperbaiki user langsung lewat dashboard — jadi
    // sekarang HARUS identik persis di cabang mana pun, bukan cuma sebagian.
    test('FAT Holding identik PERSIS Super Admin di SEMUA cabang KNT (termasuk Pusat)', () => {
      for (const branch of kntBranches) {
        expect(
          snapshots.get(key('FAT Holding', branch.id))!.snapshot,
          `Cabang ${branch.name} — FAT Holding harus identik persis Super Admin`,
        ).toEqual(snapshots.get(key('Super Admin', branch.id))!.snapshot)
      }
    })

    test('MD KNT identik PERSIS Super Admin di SEMUA cabang KNT (termasuk Pusat)', () => {
      for (const branch of kntBranches) {
        expect(
          snapshots.get(key('MD KNT', branch.id))!.snapshot,
          `Cabang ${branch.name} — MD KNT harus identik persis Super Admin`,
        ).toEqual(snapshots.get(key('Super Admin', branch.id))!.snapshot)
      }
    })
  })

  describe('Group 4 — Permission role admin vs user biasa (endpoint drill-down)', () => {
    // TEMUAN AWAL (2026-08-27) — permission 'customer.expansion:view' dkk (penjaga
    // drill-down M3-M7) awalnya TIDAK di-assign ke role 'admin' MAUPUN 'user' sama
    // sekali (0 baris di role_permissions) — SUDAH DIPERBAIKI via `bun run db:seed`
    // (menambahkan 21 permission baru + grant ke admin/user, lihat docs-v2/task/
    // task029.md). Test di bawah sekarang memverifikasi state SETELAH perbaikan:
    // customer.expansion:view dikasih ke KEDUA role (admin+user), sedangkan
    // customer.revenue:view SENGAJA cuma admin (by design, lihat USER_PERMISSION_NAMES
    // di seed.ts — role user dari awal tidak pernah punya analisis:*/analisis.retention:*).
    test('MD MKO (admin) dan FAT MKO (user) SAMA-SAMA bisa akses expansion-breakdown — customer.expansion:view dikasih ke kedua role', async () => {
      const [adminRes, userRes] = await Promise.all([
        app.request(`/api/v1/metrics/expansion-breakdown?company_id=${COMPANY.MKO}&period_end=${PERIOD_END}`, { headers: { Cookie: cookies.get('MD MKO')! } }),
        app.request(`/api/v1/metrics/expansion-breakdown?company_id=${COMPANY.MKO}&period_end=${PERIOD_END}`, { headers: { Cookie: cookies.get('FAT MKO')! } }),
      ])
      expect(adminRes.status).toBe(200)
      expect(userRes.status).toBe(200)
    })

    // TEMUAN (2026-08-27) — seed.ts sendiri PUNYA 2 sumber kebenaran yang saling
    // bertentangan soal customer.revenue:view/repeat.order:view utk role 'user':
    // USER_PERMISSION_NAMES SENGAJA tidak memasukkannya (komentar eksplisit "role
    // user memang dari awal TIDAK punya analisis:*"), TAPI migrateRenamedPermissions()
    // (PERMISSION_RENAME_MAP['expansion:view']) backfill KE-5 permission baru
    // (termasuk customer.revenue:view & repeat.order:view) ke SEMUA role yang punya
    // 'expansion:view' lama — dan role 'user' MEMANG punya 'expansion:view' (ada di
    // USER_PERMISSION_NAMES). Hasil akhirnya: user TETAP dapat customer.revenue:view
    // lewat jalur migrasi, membatalkan pengecualian yang dimaksud di jalur langsung.
    // Test ini mendokumentasikan hasil SEBENARNYA (200 utk keduanya) — exclude di
    // USER_PERMISSION_NAMES saat ini TIDAK efektif, bukan bug test.
    test('MD MKO (admin) dan FAT MKO (user) SAMA-SAMA bisa akses revenue-breakdown — pengecualian USER_PERMISSION_NAMES kalah oleh migrateRenamedPermissions()', async () => {
      const [adminRes, userRes] = await Promise.all([
        app.request(`/api/v1/metrics/revenue-breakdown?company_id=${COMPANY.MKO}&period_end=${PERIOD_END}`, { headers: { Cookie: cookies.get('MD MKO')! } }),
        app.request(`/api/v1/metrics/revenue-breakdown?company_id=${COMPANY.MKO}&period_end=${PERIOD_END}`, { headers: { Cookie: cookies.get('FAT MKO')! } }),
      ])
      expect(adminRes.status).toBe(200)
      expect(userRes.status).toBe(200)
    })

    test('Super Admin BERHASIL (200) akses expansion-breakdown maupun revenue-breakdown (bypass total)', async () => {
      const [expRes, revRes] = await Promise.all([
        app.request(`/api/v1/metrics/expansion-breakdown?company_id=${COMPANY.MKO}&period_end=${PERIOD_END}`, { headers: { Cookie: cookies.get('Super Admin')! } }),
        app.request(`/api/v1/metrics/revenue-breakdown?company_id=${COMPANY.MKO}&period_end=${PERIOD_END}`, { headers: { Cookie: cookies.get('Super Admin')! } }),
      ])
      expect(expRes.status).toBe(200)
      expect(revRes.status).toBe(200)
    })

    test('FAT MKO (role user) TETAP BISA akses KPI utama (customer-metrics, dashboard) — beda dari drill-down di atas', async () => {
      const cookie = cookies.get('FAT MKO')!
      const [custMetrics, dashboard] = await Promise.all([
        app.request(`/api/v1/metrics/customer-metrics?company_id=${COMPANY.MKO}&period_end=${PERIOD_END}`, { headers: { Cookie: cookie } }),
        app.request(`/api/v1/dashboard?company_id=${COMPANY.MKO}&period_end=${PERIOD_END}`, { headers: { Cookie: cookie } }),
      ])
      expect(custMetrics.status).toBe(200)
      expect(dashboard.status).toBe(200)
    }, 15_000)
  })

  // Uji KETAT M8-M10 (2026-08-27, diminta user) — dormant/nilai hilang/reaktivasi
  // sebelumnya cuma teruji lewat summary card default di Group 1 (1 titik waktu,
  // periode bulanan). Ini temuan paling mencurigakan di awal audit (M9 MD KNT vs
  // Super Admin beda) — sekarang diuji identik persis di SEMUA 4 granularitas,
  // bukan cuma titik default.
  describe('Group 5 — M8-M10 (dormant/nilai hilang) konsistensi lintas periode, prioritas KNT', () => {
    const snapshots = new Map<string, { status: number; snapshot?: DormantSnapshot }>()
    const key = (label: string, periodType: string) => `${label}|${periodType}`

    beforeAll(async () => {
      for (const label of ['Super Admin', 'MD KNT', 'FAT Holding', 'Marketing Holding']) {
        for (const periodType of PERIOD_TYPES) {
          snapshots.set(key(label, periodType), await fetchDormantSnapshot(cookies.get(label)!, COMPANY.KNT, periodType))
        }
      }
    }, 300_000)

    test('Semua granularitas periode berhasil (200) untuk semua kombinasi dormant', () => {
      for (const [comboKey, result] of snapshots) {
        expect(result.status, `combo ${comboKey} gagal status ${result.status}`).toBe(200)
      }
    })

    test('MD KNT, FAT Holding, Marketing Holding identik PERSIS Super Admin @ KNT (dormant + nilai hilang) di SEMUA granularitas periode', () => {
      for (const label of ['MD KNT', 'FAT Holding', 'Marketing Holding']) {
        for (const periodType of PERIOD_TYPES) {
          expect(
            snapshots.get(key(label, periodType))!.snapshot,
            `${label} @ KNT periode ${periodType} (dormant) harus identik persis Super Admin`,
          ).toEqual(snapshots.get(key('Super Admin', periodType))!.snapshot)
        }
      }
    })
  })
})
