import { db } from '@/config/db'
import { customers, invoices, invoice_items, product_categories, companies, channel_divisions, divisions, customer_status_snapshot } from '@/db/schema'
import { and, or, eq, inArray, notInArray, isNull, isNotNull, lte, sql, desc, asc, ilike } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import { loadThresholds, getDormantCategoryMap } from '@/features/config/threshold'
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
import { isScopeEffectivelyUnrestricted, type SegmentParams } from './helper/segment.helper'
import { resolveStatusCheckpointDate, resolveStatusCheckpointBuckets } from '@/features/analisis/period.util'
import { hasSnapshotForCheckpoint } from '@/features/metrics/repository/m3m7.repository'
import { computeCustomerStatusSnapshot, type CustomerStatusValue } from '@/features/metrics/repository/customer-status-snapshot.repository'
import type { CustomersQuery } from './customers.schema'

// todayDate (task039.md, 2026-09-11) — pola sama persis metrics.service.ts,
// dibutuhkan resolveStatusCheckpointDate (butuh string YYYY-MM-DD, bukan SQL
// `CURRENT_DATE`).
function todayDate(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

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
  // statusCheckpointDateStr (task039.md, 2026-09-11 — task040.md "Susulan:
  // adopsi PENUH 6 status resmi", 2026-09-16) — checkpoint periode TERTUTUP
  // (resolveStatusCheckpointDate, granularitas bulanan default), dipakai
  // gerbang fast-path snapshot + fallback `computeCustomerStatusSnapshot` di
  // bawah — TERPISAH dari refDate di atas (yang TETAP live/hari ini, dipakai
  // live_last/live_first/lifetime_value/avg_monthly_revenue, TIDAK berubah).
  const statusCheckpointDateStr = resolveStatusCheckpointDate('monthly', as_of_date ?? todayDate())

  const { activeMonths, dormant } = await loadThresholds()
  const cid = company_id === 'all' ? 0 : company_id
  // subqueryCompanyFilter (2026-09-15, perf) — liveDatesSq/invAggSq/latestSalespersonSq
  // di bawah TIDAK PERNAH memfilter company_id di level subquery (cuma di dalam CASE WHEN
  // scope guard, atau tidak sama sekali) — Postgres jadi tidak bisa pakai
  // idx_invoices_company_invoice_date (company_id, invoice_date), selalu scan seluruh
  // tabel invoices lintas company dulu baru filter. Ditemukan lewat audit
  // production-kpi-matrix.e2e.test.ts (500/statement_timeout `/customers?company_id=all`
  // & `company_id=2` untuk akun Holding real). Filter ini SUPERSET AMAN dari scope guard
  // yang sudah ada (branchScope/divisionScope, kalau ada, SUDAH menjamin company_id masuk
  // salah satu key Map-nya) — TIDAK mengubah baris mana pun yang lolos, cuma biar planner
  // bisa prune lebih awal via index. `undefined` (tanpa filter tambahan, perilaku lama)
  // kalau company_id='all' TANPA scopeIds (superadmin, benar-benar semua company).
  const subqueryCompanyFilter = company_id !== 'all'
    ? eq(invoices.company_id, company_id)
    : scopeIds && scopeIds.length > 0
      ? inArray(invoices.company_id, scopeIds)
      : undefined
  // dormantCategoryMap (task027, 2026-08-21) — dipakai `SegmentParams` di
  // bawah (gerbang fast-path + `computeCustomerStatusSnapshot` fallback,
  // task040.md "Susulan: adopsi PENUH 6 status resmi") - threshold dormant
  // PER-CUSTOMER sesuai kategori bisnis divisinya, bukan 1 angka dominan
  // company-wide.
  const dormantCategoryMap = await getDormantCategoryMap(cid !== 0 ? cid : undefined)

  // otherIdByBranch WAJIB dihitung SEBELUM liveDatesSq (dipakai di dalamnya) — beda
  // dari urutan lama yang baru dihitung dekat akhir function.
  const otherIdByCompanyEarly = await loadDivisionFallbackIds('other')
  const otherIdByBranchEarly = flattenFallbackByBranch(branchScope, otherIdByCompanyEarly)
  // intercompanyIdByCompany (2026-09-16, dipindah lebih awal dari lokasi lama dekat
  // latestSalespersonSq) — dibutuhkan segmentParams/gerbang fast-path snapshot di bawah,
  // yang harus siap SEBELUM statusCond/statusExpr didefinisikan.
  const intercompanyIdByCompany = await loadDivisionFallbackIds('intercompany')

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
      // lifetime_value MEMANG all-time (total sepanjang riwayat s/d as_of_date) BY
      // DESIGN (2026-08-31, instruksi user: "life time value ini diperlukan" — bukan
      // salah hitung, tapi labelnya keliru bilang "Revenue 12 Bulan Terakhir" padahal
      // ini akumulasi seumur hidup). Fix sebenarnya: pisahkan label ini dari label
      // 12-bulan di dialog detail (`customers.detail.lifetimeValue`, findCustomerDetail
      // baris ~608), lihat key i18n baru `customers.detail.lifetimeTotal` di
      // Customers/index.tsx + customers.handler.ts (export header) — BUKAN mengubah
      // query ini jadi windowed.
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
    .where(subqueryCompanyFilter)
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
    .where(subqueryCompanyFilter)
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

  // Fast-path snapshot (task040.md "Susulan: adopsi PENUH 6 status resmi",
  // 2026-09-16) — gerbang eligibility MIRROR M3-M10 (m3m7.repository.ts/
  // m8m10.repository.ts): company spesifik (bukan 'all'), tanpa filter
  // branch_id/exclude_intercompany, scope RBAC efektif tidak restriktif,
  // DAN checkpoint-nya sudah pernah di-precompute.
  const divisionIdForSnapshot = business_unit ?? null
  const segmentParams: SegmentParams = {
    cid,
    companyScopeIds: scopeIds,
    filterDate: as_of_date ?? todayDate(),
    activeMonths,
    dormantMonths: 0, // scalar legacy — TIDAK dipakai fungsi manapun di bawah, placeholder biar SegmentParams valid
    dormant,
    dormantCategoryMap,
    division: divisionIdForSnapshot,
    branchFilter: branch_id ?? null,
    excludeIntercompany: exclude_intercompany,
    branchScope,
    divisionScope,
    otherIdByBranch: otherIdByBranchEarly,
    intercompanyIdByCompany,
  }
  const snapshotEligible = cid !== 0
    && !branch_id
    && !exclude_intercompany
    && await isScopeEffectivelyUnrestricted(segmentParams)
    && await hasSnapshotForCheckpoint(cid, divisionIdForSnapshot, 'monthly', statusCheckpointDateStr)

  // Subquery status snapshot — SELALU didefinisikan (supaya caller findCustomers/
  // findCustomersForExport bisa LEFT JOIN tanpa cabang if/else), tapi cuma diisi
  // baris kalau snapshotEligible; kalau tidak, `WHERE false` → subquery kosong,
  // LEFT JOIN jadi no-op (fallbackStatusMap di bawah yang dipakai).
  const statusSnapshotSq = db
    .select({
      customer_id: customer_status_snapshot.customer_id,
      snapshot_status: customer_status_snapshot.status,
      snapshot_is_relapsed: customer_status_snapshot.is_relapsed,
    })
    .from(customer_status_snapshot)
    .where(snapshotEligible
      ? and(
          eq(customer_status_snapshot.company_id, cid),
          divisionIdForSnapshot == null ? isNull(customer_status_snapshot.division_id) : eq(customer_status_snapshot.division_id, divisionIdForSnapshot),
          eq(customer_status_snapshot.period_type, 'monthly'),
          eq(customer_status_snapshot.checkpoint_date, statusCheckpointDateStr),
        )
      : sql`false`)
    .as('status_snapshot')

  // Fallback (task040.md "Susulan...") — snapshotEligible FALSE (RBAC restriktif/
  // filter branch_id/exclude_intercompany aktif) → compute ON-DEMAND, 1x per
  // request, dgn `computeCustomerStatusSnapshot` yang SAMA dipakai scheduler
  // (SSOT tunggal, bukan lagi rumus terpisah sqlStatusExpr/sqlStatusWhere yang
  // TIDAK BISA membedakan Reactivated/Active atau Lapsed/Dormant). Discoped ke
  // `segmentParams` request ini sendiri (branch/RBAC/division/excludeIntercompany),
  // BUKAN company-wide kosong spt scheduler. Customer TIDAK ADA di hasil →
  // histori belum cukup panjang utk checkpoint resmi (first invoice SETELAH
  // bucket.end) → 'acquisition' (SATU-SATUNYA status valid, sama alasan gerbang
  // `is_existing_at_me OR is_acquisition` di computeCustomerStatusSnapshot).
  let fallbackStatusMap: Map<number, { status: CustomerStatusValue; is_relapsed: boolean }> | undefined
  if (!snapshotEligible) {
    const { bucket, prevBucket } = resolveStatusCheckpointBuckets('monthly', statusCheckpointDateStr)
    const rows = await computeCustomerStatusSnapshot(segmentParams, bucket, prevBucket)
    fallbackStatusMap = new Map(rows.map((r) => [r.customer_id, { status: r.status, is_relapsed: r.is_relapsed }]))
  }

  // status='acquisition' py 2 SUMBER (bug ditemukan 2026-09-16 lewat
  // verifikasi ad-hoc, total 5 filter status tidak pas sama dgn total
  // unfiltered): (a) baris snapshot literal `status='acquisition'`
  // (first invoice JATUH DI DALAM checkpoint tertutup ini), DAN (b) baris
  // snapshot TIDAK ADA sama sekali (first invoice SETELAH checkpoint,
  // periode berjalan - lihat komentar fallbackStatusMap di atas). Awalnya
  // cuma (b) yang dicek, kehilangan customer (a) - filter kurang eksklusif
  // drpd tampilan (`resolveDisplayStatus` sudah benar dari awal, cuma
  // filter WHERE ini yang salah).
  const statusCond = status
    ? (snapshotEligible
        ? (status === 'acquisition'
            ? or(eq(statusSnapshotSq.snapshot_status, 'acquisition'), isNull(statusSnapshotSq.snapshot_status))
            : eq(statusSnapshotSq.snapshot_status, status))
        : (status === 'acquisition'
            ? or(
                inArray(customers.id, [...fallbackStatusMap!.entries()].filter(([, v]) => v.status === 'acquisition').map(([id]) => id)),
                fallbackStatusMap!.size ? notInArray(customers.id, [...fallbackStatusMap!.keys()]) : sql`true`,
              )
            : inArray(customers.id, [...fallbackStatusMap!.entries()].filter(([, v]) => v.status === status).map(([id]) => id))))
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

  // Subquery: channel_name dari invoice terbaru per customer
  const latestSalespersonSq = db
    .selectDistinctOn([invoices.customer_id], {
      customer_id: invoices.customer_id,
      channel_name: invoices.channel_name,
      branch_id: invoices.branch_id,
    })
    .from(invoices)
    .where(subqueryCompanyFilter ? and(isNull(invoices.deleted_at), subqueryCompanyFilter) : isNull(invoices.deleted_at))
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
  // Fallback division_id 'other'/'intercompany' — SUDAH dihitung lebih awal
  // (otherIdByBranchEarly/intercompanyIdByCompany, lihat komentar di sana), reuse di sini.
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
    liveDatesSq, invAggSq, latestSalespersonSq, statusSnapshotSq, fallbackStatusMap,
    invCountExpr, catCountExpr, whereWithDivision,
  }
}

// resolveDisplayStatus (task040.md "Susulan...") — SATU tempat resolusi status
// tampilan, dipakai findCustomers/findCustomersForExport (kolom SQL
// statusSnapshotSq kalau eligible, ATAU fallbackStatusMap kalau tidak) SETELAH
// baris hasil query (paginated) didapat — bukan lagi SQL CASE runtime. Kolom
// snapshot IS NULL (LEFT JOIN kosong/tidak eligible) DAN tidak ada di
// fallbackStatusMap → 'acquisition' (lihat komentar fallbackStatusMap di atas).
function resolveDisplayStatus(
  customerId: number,
  snapshotStatus: CustomerStatusValue | null | undefined,
  snapshotIsRelapsed: boolean | null | undefined,
  fallbackStatusMap: Map<number, { status: CustomerStatusValue; is_relapsed: boolean }> | undefined,
): { status: CustomerStatusValue; is_relapsed: boolean } {
  if (snapshotStatus != null) return { status: snapshotStatus, is_relapsed: snapshotIsRelapsed ?? false }
  const fromFallback = fallbackStatusMap?.get(customerId)
  if (fromFallback) return fromFallback
  return { status: 'acquisition', is_relapsed: false }
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
  const { liveDatesSq, invAggSq, latestSalespersonSq, statusSnapshotSq, fallbackStatusMap, invCountExpr, catCountExpr, whereWithDivision } = ctx

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
      // statusSnapshotSq — SELALU di-join (no-op kalau fast path tidak eligible,
      // subquery-nya kosong via WHERE false, lihat buildCustomerQueryContext).
      .leftJoin(statusSnapshotSq, eq(statusSnapshotSq.customer_id, customers.id))
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
        snapshot_status: statusSnapshotSq.snapshot_status,
        snapshot_is_relapsed: statusSnapshotSq.snapshot_is_relapsed,
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
      .leftJoin(statusSnapshotSq, eq(statusSnapshotSq.customer_id, customers.id))
      .where(whereWithDivision)
      .groupBy(customers.id, companies.id, divisions.label, liveDatesSq.live_last, liveDatesSq.live_first, liveDatesSq.lifetime_value, liveDatesSq.avg_monthly_revenue, channel_divisions.division_id, customers.division_override_id, invAggSq.inv_count, invAggSq.cat_count, statusSnapshotSq.snapshot_status, statusSnapshotSq.snapshot_is_relapsed)
      .orderBy(orderByExpr)
      .limit(per_page)
      .offset(offset),
  ])

  return {
    data: rows.map((r) => {
      const { status, is_relapsed } = resolveDisplayStatus(r.id, r.snapshot_status as CustomerStatusValue | null, r.snapshot_is_relapsed, fallbackStatusMap)
      return {
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
      status,
      is_relapsed,
      }
    }),
    total: Number(total),
  }
}

export interface CustomerExportRow {
  customer_code: string
  name: string
  company_name: string
  division_label: string
  status: CustomerStatusValue
  is_relapsed: boolean
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
  const { liveDatesSq, invAggSq, latestSalespersonSq, statusSnapshotSq, fallbackStatusMap, invCountExpr, catCountExpr, whereWithDivision } = ctx

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
      .leftJoin(statusSnapshotSq, eq(statusSnapshotSq.customer_id, customers.id))
      .where(whereWithDivision)
      .then(([r]) => r),
    db
      .select({
        id: customers.id,
        customer_code: customers.customer_code,
        name: customers.customer_name,
        company_name: companies.name,
        division: divisions.label,
        last_invoice_date: liveDatesSq.live_last,
        total_invoices: invCountExpr,
        lifetime_value: liveDatesSq.lifetime_value,
        avg_monthly_revenue: liveDatesSq.avg_monthly_revenue,
        category_count: catCountExpr,
        snapshot_status: statusSnapshotSq.snapshot_status,
        snapshot_is_relapsed: statusSnapshotSq.snapshot_is_relapsed,
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
      .leftJoin(statusSnapshotSq, eq(statusSnapshotSq.customer_id, customers.id))
      .where(whereWithDivision)
      .groupBy(customers.id, companies.id, divisions.label, liveDatesSq.live_last, liveDatesSq.live_first, liveDatesSq.lifetime_value, liveDatesSq.avg_monthly_revenue, channel_divisions.division_id, customers.division_override_id, invAggSq.inv_count, invAggSq.cat_count, statusSnapshotSq.snapshot_status, statusSnapshotSq.snapshot_is_relapsed)
      .orderBy(desc(liveDatesSq.live_last))
      .limit(EXPORT_ROW_CAP),
  ])

  return {
    data: rows.map((r) => {
      const { status, is_relapsed } = resolveDisplayStatus(r.id, r.snapshot_status as CustomerStatusValue | null, r.snapshot_is_relapsed, fallbackStatusMap)
      return {
        customer_code: r.customer_code ?? '',
        name: r.name,
        company_name: r.company_name ?? '',
        division_label: r.division ?? '—',
        status,
        is_relapsed,
        category_count: Number(r.category_count),
        avg_monthly_revenue: Number(r.avg_monthly_revenue),
        lifetime_value: Number(r.lifetime_value),
        last_invoice_date: r.last_invoice_date ?? '',
        total_invoices: Number(r.total_invoices),
      }
    }),
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
  // statusCheckpointDateStr (task039.md, 2026-09-11) — sama persis
  // buildCustomerQueryContext di atas: badge status di dialog detail HARUS
  // konsisten dgn badge di list Customer Workbench (checkpoint bulan lalu, bukan
  // lagi live/hari ini) — dibutuhkan gerbang fast-path snapshot + fallback
  // (task040.md "Susulan: adopsi PENUH 6 status resmi") di bawah.
  const statusCheckpointDateStr = resolveStatusCheckpointDate('monthly', asOfDate ?? todayDate())

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

  // Fast-path snapshot / fallback on-demand (task040.md "Susulan: adopsi PENUH
  // 6 status resmi", 2026-09-16) — dialog detail TIDAK py filter
  // business_unit/branch_id/exclude_intercompany (selalu 1 customer, tanpa
  // filter laporan), jadi gerbangnya lebih sederhana dari
  // buildCustomerQueryContext: cuma RBAC scope efektif + checkpoint tersedia.
  // division_id SELALU NULL (company-wide) - dialog ini tidak py konsep
  // filter divisi, konsisten dgn tampilan list DEFAULT (tanpa business_unit
  // dipilih). Fallback (RBAC restriktif) REUSE `computeCustomerStatusSnapshot`
  // SAMA PERSIS buildCustomerQueryContext - SATU SSOT, bukan rumus terpisah.
  let displayStatus: CustomerStatusValue = 'acquisition'
  let displayIsRelapsed = false
  if (latestInv) {
    const dormantCategoryMap = await getDormantCategoryMap(latestInv.company_id)
    const intercompanyIdByCompany = await loadDivisionFallbackIds('intercompany')
    const segmentParams: SegmentParams = {
      cid: latestInv.company_id,
      filterDate: asOfDate ?? todayDate(),
      activeMonths,
      dormantMonths: 0, // scalar legacy, TIDAK dipakai fungsi manapun di bawah
      dormant,
      dormantCategoryMap,
      division: null,
      branchFilter: null,
      branchScope,
      divisionScope,
      otherIdByBranch,
      intercompanyIdByCompany,
    }
    const snapshotEligible = await isScopeEffectivelyUnrestricted(segmentParams)
      && await hasSnapshotForCheckpoint(latestInv.company_id, null, 'monthly', statusCheckpointDateStr)
    if (snapshotEligible) {
      const [snapshotRow] = await db
        .select({ status: customer_status_snapshot.status, is_relapsed: customer_status_snapshot.is_relapsed })
        .from(customer_status_snapshot)
        .where(and(
          eq(customer_status_snapshot.company_id, latestInv.company_id),
          isNull(customer_status_snapshot.division_id),
          eq(customer_status_snapshot.period_type, 'monthly'),
          eq(customer_status_snapshot.checkpoint_date, statusCheckpointDateStr),
          eq(customer_status_snapshot.customer_id, customerId),
        ))
        .limit(1)
      if (snapshotRow) {
        displayStatus = snapshotRow.status as CustomerStatusValue
        displayIsRelapsed = snapshotRow.is_relapsed
      }
    } else {
      const { bucket, prevBucket } = resolveStatusCheckpointBuckets('monthly', statusCheckpointDateStr)
      const rows = await computeCustomerStatusSnapshot(segmentParams, bucket, prevBucket)
      const match = rows.find((r) => r.customer_id === customerId)
      if (match) {
        displayStatus = match.status
        displayIsRelapsed = match.is_relapsed
      }
    }
  }

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
    status: displayStatus,
    is_relapsed: displayIsRelapsed,
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