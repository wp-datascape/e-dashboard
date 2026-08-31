import { db } from '@/config/db'
import { customers, invoices, invoice_items, product_categories, companies, channel_divisions, divisions } from '@/db/schema'
import { and, or, eq, inArray, isNull, isNotNull, lte, sql, desc, asc, ilike } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { loadThresholds, resolveDormantCategory, getDormantCategoryMap, buildDormantCaseSql } from '@/features/config/threshold'
import {
  buildBranchCondition,
  buildDivisionCondition,
  buildBranchConditionRaw,
  buildDivisionConditionRaw,
  buildExcludeIntercompanyCondition,
  loadDivisionFallbackIds,
  flattenFallbackByBranch,
} from '@/utils/scope'
import { EXPORT_ROW_CAP } from '@/utils/excel'
import { sqlStatusExpr, sqlStatusWhere } from './helper/segment.helper'
import type { CustomersQuery } from './customers.schema'

// buildCustomerQueryContext (2026-08-31, refactor persiapan export Excel) —
// SEMUA logic where-clause/scope/subquery yang SEBELUMNYA cuma ada di dalam
// findCustomers, DIPAKAI BERSAMA findCustomers (list) DAN findCustomersForExport
// (export, di bawah) supaya TIDAK ADA 2 definisi filter/scope RBAC yang bisa
// menyimpang (celah RBAC task015/018 lahir justru dari filter yang ditulis
// dobel di tempat berbeda) — cuma bagian ORDER BY/LIMIT/OFFSET dan proyeksi
// kolom akhir yang beda antara list vs export, itu TETAP ditulis terpisah di
// masing-masing fungsi.
type CustomerFilterParams = Omit<CustomersQuery, 'sort_by' | 'sort_dir' | 'page' | 'per_page'>

async function buildCustomerQueryContext(
  params: CustomerFilterParams,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  const { company_id, branch_id, search, business_unit, status, as_of_date, exclude_intercompany } = params
  const refDate = as_of_date ? sql`${as_of_date}::date` : sql`CURRENT_DATE`

  const { activeMonths, dormant } = await loadThresholds()
  const cid = company_id === 'all' ? 0 : company_id
  // Threshold dormant PER-CUSTOMER (task027 fix, 2026-08-21) — dulu 1 angka
  // dominan company-wide (resolveDormantMonths) dipakai ke SEMUA baris,
  // sekarang per baris sesuai kategori bisnis divisi customer itu sendiri
  // (pola sama m8m10.repository.ts). channel_divisions.division_id yang
  // dipakai di sini SUDAH di-JOIN di query total/rows di bawah lewat
  // latestSalespersonSq (divisi dari invoice TERBARU customer) — reuse,
  // bukan JOIN baru.
  const dormantCategoryMap = await getDormantCategoryMap(cid !== 0 ? cid : undefined)
  const dormantThresholdExpr = buildDormantCaseSql(
    sql`COALESCE(${customers.division_override_id}, ${channel_divisions.division_id})`,
    dormant,
    dormantCategoryMap,
  )

  // otherIdByBranch WAJIB dihitung SEBELUM liveDatesSq (dipakai di dalamnya) — beda
  // dari urutan lama yang baru dihitung dekat akhir function.
  const otherIdByCompanyEarly = await loadDivisionFallbackIds('other')
  const otherIdByBranchEarly = flattenFallbackByBranch(branchScope, otherIdByCompanyEarly)

  // Subquery: live first/last invoice date + revenue aggregates per customer, semua
  // dari tabel invoices LANGSUNG (tanpa join invoice_items). Revenue HARUS dihitung di
  // sini, bukan inline di query utama — query utama join ke invoice_items (buat
  // category_count), dan invoice dengan >1 item jadi >1 baris di situ, jadi SUM
  // total_revenue inline kena duplikasi (laporan user: dialog detail customer tampil
  // 352jt padahal revenue asli cuma 259jt, root cause sama persis di list ini).
  // Alias beda dari customers.first/last_invoice_date agar tidak ambigu di GROUP BY.
  //
  // JOIN channel_divisions + scope guard (branchScopeCond/divisionScopeCond) DITAMBAH
  // di dalam tiap CASE WHEN — sebelumnya subquery ini agregasi SEMUA invoice customer
  // tanpa peduli branch/division, jadi lifetime_value/avg_monthly_revenue/tanggal live
  // bisa kebawa dari branch/divisi di luar scope viewer (celah RBAC, ditemukan
  // 2026-08-02 — gate visibility list sudah benar via latestSalespersonSq, tapi ANGKA
  // yang ditampilkan begitu customer lolos gate ternyata tetap unscoped, lihat task018).
  const liveDatesSqBranchCond = buildBranchCondition(invoices.company_id, invoices.branch_id, branchScope)
  const liveDatesSqDivisionCond = buildDivisionCondition(invoices.branch_id, channel_divisions.division_id, divisionScope, otherIdByBranchEarly)
  const liveDatesScopeGuard = sql`(${liveDatesSqBranchCond ?? sql`true`}) AND (${liveDatesSqDivisionCond ?? sql`true`})`

  const liveDatesSq = db
    .select({
      customer_id: invoices.customer_id,
      live_last:  sql<string | null>`MAX(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} AND ${liveDatesScopeGuard} THEN ${invoices.invoice_date} END)`.as('live_last'),
      live_first: sql<string | null>`MIN(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} AND ${liveDatesScopeGuard} THEN ${invoices.invoice_date} END)`.as('live_first'),
      // WAJIB dibatasi invoice_date <= refDate — sebelumnya cuma filter deleted_at,
      // jadi lifetime_value/avg_monthly_revenue SELALU all-time (mengabaikan as_of_date).
      lifetime_value: sql<string>`COALESCE(SUM(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} AND ${liveDatesScopeGuard} THEN ${invoices.total_revenue}::numeric END), 0)`.as('lifetime_value'),
      // Dibatasi 12 bulan kalender terakhir (sama persis window monthly_revenue_trend
      // di findCustomerDetail) — pembagi FIXED 12 (bukan COUNT bulan aktif) supaya
      // nilainya persis rata-rata dari 12 bar grafik tren, termasuk bulan kosong = 0.
      avg_monthly_revenue: sql<string>`
        COALESCE(
          SUM(CASE WHEN ${invoices.deleted_at} IS NULL
                AND ${invoices.invoice_date} <= ${refDate}
                AND ${invoices.invoice_date} >= DATE_TRUNC('month', ${refDate}::date - INTERVAL '11 months')
                AND ${liveDatesScopeGuard}
              THEN ${invoices.total_revenue}::numeric END) / 12.0,
          0
        )
      `.as('avg_monthly_revenue'),
    })
    .from(invoices)
    .leftJoin(
      channel_divisions,
      and(eq(channel_divisions.channel_name, invoices.channel_name), eq(channel_divisions.company_id, invoices.company_id)),
    )
    .groupBy(invoices.customer_id)
    .as('live_dates')

  // cdInv (alias) — channel_divisions kedua, di-JOIN via invoices.channel_name (channel
  // INVOICE yang sedang dihitung), BEDA dari channel_divisions biasa di bawah yang
  // di-JOIN via latestSalespersonSq.channel_name (channel invoice TERBARU customer,
  // dipakai kolom "division" utk display) — 2 hal berbeda, tidak bisa reuse 1 join yang
  // sama, makanya perlu alias supaya bisa JOIN channel_divisions 2x independen.
  const cdInv = alias(channel_divisions, 'cd_inv')
  const outerBranchCond = buildBranchCondition(invoices.company_id, invoices.branch_id, branchScope)
  const outerDivisionCond = buildDivisionCondition(invoices.branch_id, cdInv.division_id, divisionScope, otherIdByBranchEarly)
  const outerScopeGuard = sql`(${outerBranchCond ?? sql`true`}) AND (${outerDivisionCond ?? sql`true`})`

  // Subquery: total_invoices/category_count per customer, agregasi SEKALI (GROUP BY)
  // — BUKAN lagi JOIN invoices+invoice_items mentah langsung ke query customer di
  // bawah. Fix bug performa (2026-08-27, ditemukan lewat audit production): JOIN
  // invoices mentah bareng latestSalespersonSq (subquery DISTINCT ON) di query yang
  // SAMA bikin planner Postgres pilih Nested Loop nyaris cross-product begitu ada
  // kondisi scope branch/division (user non-superadmin) — /customers timeout 20
  // detik (statement_timeout) utk SEMUA company, termasuk yang datanya kecil.
  // Superadmin (bypass, tanpa kondisi scope) tidak kena krn planner kebetulan pilih
  // strategi lain, tapi struktur query-nya tetap rapuh. Pola subquery ini SAMA
  // PERSIS liveDatesSq di atas (agregasi per customer dulu, baru LEFT JOIN 1x hasil
  // yang sudah 1-baris-per-customer) — sudah terbukti aman di kedua kasus scope.
  const invAggSq = db
    .select({
      customer_id: invoices.customer_id,
      inv_count: sql<number>`COUNT(DISTINCT CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} AND ${outerScopeGuard} THEN ${invoices.id} END)`.as('inv_count'),
      cat_count: sql<number>`COUNT(DISTINCT CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} AND ${outerScopeGuard} THEN ${invoice_items.product_category_id} END)`.as('cat_count'),
    })
    .from(invoices)
    .leftJoin(invoice_items, and(eq(invoice_items.invoice_id, invoices.id), isNull(invoices.deleted_at)))
    .leftJoin(cdInv, and(eq(cdInv.channel_name, invoices.channel_name), eq(cdInv.company_id, invoices.company_id)))
    .groupBy(invoices.customer_id)
    .as('inv_agg')

  const invCountExpr = invAggSq.inv_count
  const catCountExpr = invAggSq.cat_count

  // WHERE conditions (tanpa division — division difilter via JOIN channel_divisions)
  const conditions = []
  conditions.push(eq(customers.is_placeholder, false))
  // Sembunyikan customer yang belum punya invoice pada/sebelum refDate — live_first
  // NULL berarti tidak ada invoice yang lolos filter tanggal di liveDatesSq (baik karena
  // customer belum pernah transaksi sama sekali, atau transaksi pertamanya masih SETELAH
  // refDate). Tanpa ini, customer tsb tetap muncul dengan metrik nol/null (laporan user:
  // filter tahun 2022 tetap menampilkan seluruh 952 customer, padahal invoice tertua 2025).
  conditions.push(isNotNull(liveDatesSq.live_first))
  if (company_id !== 'all') conditions.push(eq(customers.company_id, company_id))
  else if (scopeIds) {
    if (scopeIds.length === 0) return { isEmptyScope: true as const }
    conditions.push(inArray(customers.company_id, scopeIds))
  }
  if (search) conditions.push(ilike(customers.customer_name, `%${search}%`))
  const statusCond = status
    ? sqlStatusWhere(status, refDate, activeMonths, dormantThresholdExpr, liveDatesSq.live_last, liveDatesSq.live_first)
    : undefined
  if (statusCond) conditions.push(statusCond)

  const whereClause = conditions.length ? and(...conditions) : undefined

  // Division filter (business_unit param, sekarang numeric division_id — task012 v2):
  // diapply setelah JOIN channel_divisions (channel_divisions di-JOIN via
  // customers.company_id — lihat divisionJoin di bawah). COALESCE ke division_id
  // "other" milik company customer ini — tanpa ini, customer yang latest channel
  // name-nya tidak match rule apa pun (division_id NULL) tidak akan pernah muncul
  // waktu filter divisi "Lainnya" dipilih (bug ditemukan lewat audit KNT).
  const divisionCond = business_unit
    ? eq(sql`COALESCE(${channel_divisions.division_id}, (SELECT id FROM divisions WHERE company_id = ${customers.company_id} AND key = 'other'))`, business_unit)
    : undefined

  const statusExpr = sqlStatusExpr(refDate, activeMonths, dormantThresholdExpr, liveDatesSq.live_last, liveDatesSq.live_first)

  // Subquery: channel_name dari invoice terbaru per customer
  const latestSalespersonSq = db
    .selectDistinctOn([invoices.customer_id], {
      customer_id: invoices.customer_id,
      channel_name: invoices.channel_name,
      branch_id: invoices.branch_id,
    })
    .from(invoices)
    .where(isNull(invoices.deleted_at))
    // Tie-break invoice.id DESC — tanpa ini, customer dengan 2+ invoice di
    // TANGGAL SAMA PERSIS lewat channel berbeda dapat hasil tidak deterministik
    // (DISTINCT ON pilih baris arbitrer). Ditemukan lewat audit data KNT
    // (customer 13516/13533, 2 invoice tanggal sama, channel beda).
    .orderBy(invoices.customer_id, desc(invoices.invoice_date), desc(invoices.id))
    .as('latest_sp')

  // Branch/division scope (docs-v2/task/task001.md) — di-derive dari invoice TERBARU
  // customer (latestSalespersonSq), konsisten dengan cara business_unit/division di atas
  // sudah di-derive (satu division per customer dari invoice terakhir, bukan EXISTS
  // lintas semua invoice miliknya)
  // Fallback division_id 'other' sudah dihitung di atas (otherIdByBranchEarly, dipakai
  // liveDatesSq/invCountExpr/catCountExpr) — reuse di sini, tinggal load 'intercompany'.
  const intercompanyIdByCompany = await loadDivisionFallbackIds('intercompany')

  const branchScopeCond = buildBranchCondition(customers.company_id, latestSalespersonSq.branch_id, branchScope)
  const divisionScopeCond = buildDivisionCondition(latestSalespersonSq.branch_id, channel_divisions.division_id, divisionScope, otherIdByBranchEarly)
  // Filter laporan branch_id (opsional) — mirror business_unit di atas, beda dari
  // branchScopeCond (enforcement akses) meski keduanya nyasar ke kolom yang sama
  const branchFilterCond = branch_id ? eq(latestSalespersonSq.branch_id, branch_id) : undefined
  // COALESCE override customer (task013, representasi sister company) menang atas
  // mapping channel biasa - lihat docs-v2/task/task013.md
  const excludeIntercompanyCond = buildExcludeIntercompanyCondition(
    customers.company_id,
    sql`COALESCE(${customers.division_override_id}, ${channel_divisions.division_id})`,
    intercompanyIdByCompany,
    exclude_intercompany,
  )

  const scopeConditions = [divisionCond, branchFilterCond, branchScopeCond, divisionScopeCond, excludeIntercompanyCond].filter(
    (c): c is NonNullable<typeof c> => c !== undefined,
  )
  const whereWithDivision = scopeConditions.length
    ? whereClause ? and(whereClause, ...scopeConditions) : and(...scopeConditions)
    : whereClause

  return {
    isEmptyScope: false as const,
    liveDatesSq, invAggSq, latestSalespersonSq,
    invCountExpr, catCountExpr, statusExpr, whereWithDivision,
  }
}

export async function findCustomers(
  params: CustomersQuery,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  const { sort_by, sort_dir, page, per_page } = params
  const offset = (page - 1) * per_page

  const ctx = await buildCustomerQueryContext(params, scopeIds, branchScope, divisionScope)
  if (ctx.isEmptyScope) return { data: [], total: 0 }
  const { liveDatesSq, invAggSq, latestSalespersonSq, invCountExpr, catCountExpr, statusExpr, whereWithDivision } = ctx

  // Sort
  const isAsc = sort_dir === 'asc'
  const orderByExpr = (() => {
    switch (sort_by) {
      case 'lifetime_value':      return isAsc ? asc(liveDatesSq.lifetime_value) : desc(liveDatesSq.lifetime_value)
      case 'avg_monthly_revenue': return isAsc ? asc(liveDatesSq.avg_monthly_revenue) : desc(liveDatesSq.avg_monthly_revenue)
      case 'category_count':      return isAsc ? asc(catCountExpr) : desc(catCountExpr)
      default:                    return isAsc ? asc(liveDatesSq.live_last) : desc(liveDatesSq.live_last)
    }
  })()

  const [{ total }, rows] = await Promise.all([
    db
      .select({ total: sql<number>`COUNT(DISTINCT ${customers.id})` })
      .from(customers)
      .leftJoin(liveDatesSq, eq(liveDatesSq.customer_id, customers.id))
      .leftJoin(latestSalespersonSq, eq(latestSalespersonSq.customer_id, customers.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, latestSalespersonSq.channel_name),
          eq(channel_divisions.company_id, customers.company_id),
        ),
      )
      .where(whereWithDivision)
      .then(([r]) => r),
    db
      .select({
        id: customers.id,
        customer_code: customers.customer_code,
        name: customers.customer_name,
        company_id: companies.id,
        company_name: companies.name,
        business_unit: customers.business_unit,
        division: divisions.label,
        first_invoice_date: liveDatesSq.live_first,
        last_invoice_date: liveDatesSq.live_last,
        total_invoices: invCountExpr,
        lifetime_value: liveDatesSq.lifetime_value,
        avg_monthly_revenue: liveDatesSq.avg_monthly_revenue,
        category_count: catCountExpr,
        status: statusExpr,
      })
      .from(customers)
      .leftJoin(liveDatesSq, eq(liveDatesSq.customer_id, customers.id))
      .leftJoin(companies, eq(customers.company_id, companies.id))
      .leftJoin(latestSalespersonSq, eq(latestSalespersonSq.customer_id, customers.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, latestSalespersonSq.channel_name),
          eq(channel_divisions.company_id, customers.company_id),
        ),
      )
      .leftJoin(divisions, eq(divisions.id, channel_divisions.division_id))
      // invAggSq — sudah 1 baris per customer (agregasi COUNT DISTINCT di dalam
      // subquery-nya sendiri, lihat komentar di definisinya di atas), BUKAN lagi
      // JOIN invoices/invoice_items/cdInv mentah di sini.
      .leftJoin(invAggSq, eq(invAggSq.customer_id, customers.id))
      .where(whereWithDivision)
      .groupBy(customers.id, companies.id, divisions.label, liveDatesSq.live_last, liveDatesSq.live_first, liveDatesSq.lifetime_value, liveDatesSq.avg_monthly_revenue, channel_divisions.division_id, customers.division_override_id, invAggSq.inv_count, invAggSq.cat_count)
      .orderBy(orderByExpr)
      .limit(per_page)
      .offset(offset),
  ])

  return {
    data: rows.map((r) => ({
      id: r.id,
      customer_code: r.customer_code,
      name: r.name,
      company: { id: r.company_id ?? 0, name: r.company_name ?? '' },
      business_unit: r.business_unit,
      division: r.division ?? null,
      first_invoice_date: r.first_invoice_date,
      last_invoice_date: r.last_invoice_date,
      total_invoices: Number(r.total_invoices),
      lifetime_value: Number(r.lifetime_value),
      avg_monthly_revenue: Number(r.avg_monthly_revenue),
      category_count: Number(r.category_count),
      status: r.status as 'new' | 'active' | 'dormant' | 'existing',
    })),
    total: Number(total),
  }
}

export interface CustomerExportRow {
  customer_code: string
  name: string
  company_name: string
  division_label: string
  status: 'new' | 'active' | 'dormant' | 'existing'
  category_count: number
  avg_monthly_revenue: number
  lifetime_value: number
  last_invoice_date: string
  total_invoices: number
}

// Export Excel (2026-08-31, instruksi user: "tambahkan fungsi export excel
// juga di ke 2 menu" — susulan export Transactions) — filter SAMA PERSIS
// findCustomers (lewat buildCustomerQueryContext), TANPA LIMIT/OFFSET,
// diurutkan tetap transaksi terakhir DESC (default tampilan tabel) — bukan
// sort pilihan user, export selalu representasi PENUH dari filter aktif.
// EXPORT_ROW_CAP — lihat JSDoc di utils/excel.ts, pola sama persis
// findInvoicesForExport (transactions.repository.ts).
export async function findCustomersForExport(
  params: CustomerFilterParams,
  scopeIds?: number[],
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
): Promise<{ data: CustomerExportRow[]; total: number; truncated: boolean }> {
  const ctx = await buildCustomerQueryContext(params, scopeIds, branchScope, divisionScope)
  if (ctx.isEmptyScope) return { data: [], total: 0, truncated: false }
  const { liveDatesSq, invAggSq, latestSalespersonSq, invCountExpr, catCountExpr, statusExpr, whereWithDivision } = ctx

  const [{ total }, rows] = await Promise.all([
    db
      .select({ total: sql<number>`COUNT(DISTINCT ${customers.id})` })
      .from(customers)
      .leftJoin(liveDatesSq, eq(liveDatesSq.customer_id, customers.id))
      .leftJoin(latestSalespersonSq, eq(latestSalespersonSq.customer_id, customers.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, latestSalespersonSq.channel_name),
          eq(channel_divisions.company_id, customers.company_id),
        ),
      )
      .where(whereWithDivision)
      .then(([r]) => r),
    db
      .select({
        customer_code: customers.customer_code,
        name: customers.customer_name,
        company_name: companies.name,
        division: divisions.label,
        last_invoice_date: liveDatesSq.live_last,
        total_invoices: invCountExpr,
        lifetime_value: liveDatesSq.lifetime_value,
        avg_monthly_revenue: liveDatesSq.avg_monthly_revenue,
        category_count: catCountExpr,
        status: statusExpr,
      })
      .from(customers)
      .leftJoin(liveDatesSq, eq(liveDatesSq.customer_id, customers.id))
      .leftJoin(companies, eq(customers.company_id, companies.id))
      .leftJoin(latestSalespersonSq, eq(latestSalespersonSq.customer_id, customers.id))
      .leftJoin(
        channel_divisions,
        and(
          eq(channel_divisions.channel_name, latestSalespersonSq.channel_name),
          eq(channel_divisions.company_id, customers.company_id),
        ),
      )
      .leftJoin(divisions, eq(divisions.id, channel_divisions.division_id))
      .leftJoin(invAggSq, eq(invAggSq.customer_id, customers.id))
      .where(whereWithDivision)
      .groupBy(customers.id, companies.id, divisions.label, liveDatesSq.live_last, liveDatesSq.live_first, liveDatesSq.lifetime_value, liveDatesSq.avg_monthly_revenue, channel_divisions.division_id, customers.division_override_id, invAggSq.inv_count, invAggSq.cat_count)
      .orderBy(desc(liveDatesSq.live_last))
      .limit(EXPORT_ROW_CAP),
  ])

  return {
    data: rows.map((r) => ({
      customer_code: r.customer_code ?? '',
      name: r.name,
      company_name: r.company_name ?? '',
      division_label: r.division ?? '—',
      status: r.status as 'new' | 'active' | 'dormant' | 'existing',
      category_count: Number(r.category_count),
      avg_monthly_revenue: Number(r.avg_monthly_revenue),
      lifetime_value: Number(r.lifetime_value),
      last_invoice_date: r.last_invoice_date ?? '',
      total_invoices: Number(r.total_invoices),
    })),
    total: Number(total),
    truncated: Number(total) > EXPORT_ROW_CAP,
  }
}

export async function findCustomerDetail(
  customerId: number,
  asOfDate?: string,
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
) {
  const { activeMonths, dormant } = await loadThresholds()
  const refDate = asOfDate ? sql`${asOfDate}::date` : sql`CURRENT_DATE`

  // task018 — endpoint ini SEBELUMNYA tidak pernah cek branch/division sama sekali
  // (cuma company-scope, task015), jadi SEMUA query di bawah agregasi invoice
  // customer TANPA peduli branch/division-nya viewer. scopeGuard dipasang di setiap
  // CASE WHEN/WHERE yang menyentuh invoices, mirror pola findInvoices/findInvoiceDetail.
  const otherIdByCompany = await loadDivisionFallbackIds('other')
  const otherIdByBranch = flattenFallbackByBranch(branchScope, otherIdByCompany)
  const branchScopeCond = buildBranchCondition(invoices.company_id, invoices.branch_id, branchScope)
  const divisionScopeCond = buildDivisionCondition(invoices.branch_id, channel_divisions.division_id, divisionScope, otherIdByBranch)
  const scopeGuard = sql`(${branchScopeCond ?? sql`true`}) AND (${divisionScopeCond ?? sql`true`})`

  // Cek dulu APAKAH customer ini punya invoice sama sekali (unscoped) — membedakan
  // "customer memang belum pernah transaksi" (tetap tampil kosong, perilaku lama)
  // VS "customer punya invoice tapi semuanya di luar scope viewer" (di-treat sebagai
  // tidak ditemukan di bawah, lihat cek anyInv/latestInv).
  const [anyInv] = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(eq(invoices.customer_id, customerId), isNull(invoices.deleted_at), lte(invoices.invoice_date, refDate)))
    .limit(1)

  // Ambil channel_name + company_id dari invoice terbaru YANG TERLIHAT viewer
  // (scope-guarded) — dipakai sekaligus sumber label divisi/channel yang ditampilkan
  // (konsisten dgn window scope viewer, bukan true-latest yang bisa dari branch di
  // luar aksesnya) DAN gate akses (cek di bawah).
  const [latestInv] = await db
    .select({ channel_name: invoices.channel_name, company_id: invoices.company_id })
    .from(invoices)
    .leftJoin(
      channel_divisions,
      and(eq(channel_divisions.channel_name, invoices.channel_name), eq(channel_divisions.company_id, invoices.company_id)),
    )
    .where(and(
      eq(invoices.customer_id, customerId),
      isNull(invoices.deleted_at),
      lte(invoices.invoice_date, refDate),
      scopeGuard,
    ))
    // Tie-break invoice.id DESC — sama seperti latestSalespersonSq di atas.
    .orderBy(desc(invoices.invoice_date), desc(invoices.id))
    .limit(1)

  // Customer punya invoice (anyInv truthy), tapi TIDAK SATU PUN dalam scope viewer
  // (latestInv kosong) → treat sebagai tidak ditemukan (404 di service layer), BUKAN
  // tampil kosong — celah RBAC (task018): sebelumnya endpoint ini tidak pernah cek
  // branch/division sama sekali, user scope 1 cabang bisa buka detail customer yang
  // transaksinya di cabang lain.
  if (anyInv && !latestInv) return null

  const [divRow] = latestInv?.channel_name
    ? await db
        .select({ division_id: channel_divisions.division_id, division: divisions.label })
        .from(channel_divisions)
        .leftJoin(divisions, eq(divisions.id, channel_divisions.division_id))
        .where(and(
          eq(channel_divisions.channel_name, latestInv.channel_name),
          eq(channel_divisions.company_id, latestInv.company_id),
        ))
        .limit(1)
    : []

  const divisionKey = await resolveDormantCategory(divRow?.division_id ?? null)
  const dormantMonths = dormant[divisionKey]

  const liveLastInv  = sql`MAX(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} AND ${scopeGuard} THEN ${invoices.invoice_date} END)`
  const liveFirstInv = sql`MIN(CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} AND ${scopeGuard} THEN ${invoices.invoice_date} END)`

  const [row] = await db
    .select({
      id: customers.id,
      customer_code: customers.customer_code,
      name: customers.customer_name,
      company_id: companies.id,
      company_name: companies.name,
      business_unit: customers.business_unit,
      first_invoice_date: liveFirstInv.mapWith(String),
      last_invoice_date: liveLastInv.mapWith(String),
      status: sqlStatusExpr(refDate, activeMonths, dormantMonths, liveLastInv, liveFirstInv),
      category_count: sql<number>`COUNT(DISTINCT CASE WHEN ${invoices.deleted_at} IS NULL AND ${invoices.invoice_date} <= ${refDate} AND ${scopeGuard} THEN ${invoice_items.product_category_id} END)`,
    })
    .from(customers)
    .leftJoin(companies, eq(customers.company_id, companies.id))
    .leftJoin(invoices, eq(invoices.customer_id, customers.id))
    .leftJoin(
      channel_divisions,
      and(eq(channel_divisions.channel_name, invoices.channel_name), eq(channel_divisions.company_id, invoices.company_id)),
    )
    .leftJoin(
      invoice_items,
      and(eq(invoice_items.invoice_id, invoices.id), isNull(invoices.deleted_at)),
    )
    .where(eq(customers.id, customerId))
    .groupBy(customers.id, companies.id)

  if (!row) return null

  const catRows = await db
    .selectDistinct({ name: product_categories.name })
    .from(invoice_items)
    .innerJoin(invoices, and(eq(invoice_items.invoice_id, invoices.id), isNull(invoices.deleted_at)))
    .leftJoin(
      channel_divisions,
      and(eq(channel_divisions.channel_name, invoices.channel_name), eq(channel_divisions.company_id, invoices.company_id)),
    )
    .innerJoin(product_categories, eq(invoice_items.product_category_id, product_categories.id))
    .where(and(eq(invoices.customer_id, customerId), lte(invoices.invoice_date, refDate), scopeGuard))

  const trendBranchCondRaw = buildBranchConditionRaw('i.company_id', 'i.branch_id', branchScope)
  const trendDivisionCondRaw = buildDivisionConditionRaw('i.branch_id', 'cd.division_id', divisionScope, otherIdByBranch)

  const trendRows = await db.execute<{ month: string; revenue: string; gp: string }>(sql`
    WITH months AS (
      SELECT TO_CHAR(m, 'YYYY-MM') AS month
      FROM generate_series(
        DATE_TRUNC('month', ${refDate}::date - INTERVAL '11 months'),
        DATE_TRUNC('month', ${refDate}::date),
        INTERVAL '1 month'
      ) AS m
    ),
    actuals AS (
      SELECT
        TO_CHAR(i.invoice_date::date, 'YYYY-MM') AS month,
        COALESCE(SUM(i.total_revenue::numeric), 0) AS revenue,
        COALESCE(SUM(i.total_gp::numeric), 0) AS gp
      FROM invoices i
      LEFT JOIN channel_divisions cd ON cd.channel_name = i.channel_name AND cd.company_id = i.company_id
      WHERE i.customer_id = ${customerId}
        AND i.deleted_at IS NULL
        AND i.invoice_date::date >= DATE_TRUNC('month', ${refDate}::date - INTERVAL '11 months')
        AND i.invoice_date::date <= ${refDate}::date
        AND ${trendBranchCondRaw}
        AND ${trendDivisionCondRaw}
      GROUP BY 1
    )
    SELECT m.month, COALESCE(a.revenue, 0)::text AS revenue, COALESCE(a.gp, 0)::text AS gp
    FROM months m
    LEFT JOIN actuals a ON a.month = m.month
    ORDER BY m.month
  `)

  const recentRows = await db
    .select({
      invoice_number: invoices.invoice_number,
      invoice_date: invoices.invoice_date,
      total_revenue: invoices.total_revenue,
      total_gp: invoices.total_gp,
    })
    .from(invoices)
    .leftJoin(
      channel_divisions,
      and(eq(channel_divisions.channel_name, invoices.channel_name), eq(channel_divisions.company_id, invoices.company_id)),
    )
    .where(and(eq(invoices.customer_id, customerId), isNull(invoices.deleted_at), lte(invoices.invoice_date, refDate), scopeGuard))
    .orderBy(desc(invoices.invoice_date))
    .limit(5)

  // lifetime_value & avg_monthly_revenue SENGAJA diambil dari SUM trendRows (12 bulan
  // sama persis dengan grafik tren), BUKAN dihitung terpisah di query utama di atas.
  // Dulu ada expr SUM sendiri di query utama, tapi query itu JOIN ke invoice_items
  // (untuk category_count) — invoice dengan >1 item ke-duplikasi jadi >1 baris, SUM
  // total_revenue pun ikut kegandaan (laporan user: dialog tampilkan 352jt padahal
  // revenue asli cuma 259jt). trendRows agregat langsung dari invoices tanpa join
  // invoice_items jadi aman dari duplikasi, dan sekalian bikin angka total di kartu
  // metrik selalu sinkron dengan apa yang digambar di grafik tren.
  const revenue12mo = trendRows.reduce((sum, t) => sum + Number(t.revenue), 0)

  return {
    id: row.id,
    customer_code: row.customer_code,
    name: row.name,
    company: { id: row.company_id ?? 0, name: row.company_name ?? '' },
    business_unit: row.business_unit,
    division: divRow?.division ?? null,
    channel: latestInv?.channel_name ?? null,
    status: row.status as 'new' | 'active' | 'dormant' | 'existing',
    first_invoice_date: row.first_invoice_date,
    last_invoice_date: row.last_invoice_date,
    lifetime_value: revenue12mo,
    avg_monthly_revenue: revenue12mo / 12,
    category_count: Number(row.category_count),
    categories_bought: catRows.map((c) => c.name).filter(Boolean) as string[],
    monthly_revenue_trend: trendRows.map((t) => ({
      month: t.month,
      revenue: Number(t.revenue),
      gp: Number(t.gp),
    })),
    recent_invoices: recentRows.map((i) => ({
      invoice_number: i.invoice_number,
      invoice_date: i.invoice_date,
      total_revenue: Number(i.total_revenue),
      total_gp: Number(i.total_gp),
    })),
  }
}