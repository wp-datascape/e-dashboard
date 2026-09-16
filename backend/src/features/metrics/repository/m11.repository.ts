import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import type { SegmentParams } from '../segment.helper'
import { resolveInvoiceScopeConditions, isScopeEffectivelyUnrestricted } from '../segment.helper'
import type { RetentionTrendRow, RetainedCustomerRow, RetentionBreakdownRow } from '../metrics.types'
import { buildCompanyConditionRaw } from '@/utils/scope'
import type { TrailingPeriodBucket, PeriodType } from '@/features/analisis/period.util'
import { resolveStatusCheckpointBuckets } from '@/features/analisis/period.util'
import { hasSnapshotForAllCheckpoints } from './m3m7.repository'
import { computeCustomerStatusSnapshot } from './customer-status-snapshot.repository'

/**
 * m11.repository.ts (task044.md Bagian 2, HOLDINGIT-698, 2026-09-16) — M11
 * Retention Rate. KPI baru, DIBANGUN LANGSUNG di atas customer_status_snapshot
 * sejak awal (BUKAN migrasi dari versi live lama seperti M3-M10 - tidak ada
 * versi lama) - jalur cepat baca snapshot langsung, fallback (RBAC
 * restriktif/filter branch/exclude_intercompany aktif) compute ON-DEMAND
 * via `computeCustomerStatusSnapshot` (SSOT sama dipakai scheduler DAN
 * fallback Customer Workbench, task040.md "Susulan..." - BUKAN rumus
 * terpisah lagi, pola SUDAH established sesi ini).
 *
 * Formula: Retention Rate(checkpoint B) = COUNT(customer Active/Reactivated
 * DI checkpoint A [SATU checkpoint sebelum B] YANG JUGA Active/Reactivated
 * di checkpoint B) / COUNT(customer Active/Reactivated di checkpoint A) x
 * 100. `buckets[i]` = checkpoint B, `prevBuckets[i]` = checkpoint A - SAMA
 * PERSIS pasangan yang sudah dipakai M8-M10 (prev_dormant_count).
 */
export async function fetchRetentionTrend(
  p: SegmentParams,
  buckets: TrailingPeriodBucket[],
  prevBuckets: TrailingPeriodBucket[],
  periodType: PeriodType = 'monthly',
): Promise<RetentionTrendRow[]> {
  const { cid, division, companyScopeIds } = p

  const snapshotConditionsMet = cid !== 0
    && p.branchFilter == null
    && !p.excludeIntercompany
    && !p.onlyPareto
    && await isScopeEffectivelyUnrestricted(p)
  const neededCheckpoints = [...new Set([...buckets.map((b) => b.end), ...prevBuckets.map((b) => b.end)])]
  const snapshotEligible = snapshotConditionsMet
    && await hasSnapshotForAllCheckpoints(cid, division, periodType, neededCheckpoints)

  if (snapshotEligible) {
    const divCond = division == null ? sql`css.division_id IS NULL` : sql`css.division_id = ${division}::int`
    const divCond2 = division == null ? sql`css2.division_id IS NULL` : sql`css2.division_id = ${division}::int`
    const prevDivCond = division == null ? sql`pcss.division_id IS NULL` : sql`pcss.division_id = ${division}::int`
    const curBucketValues = sql.join(buckets.map((b) => sql`(${b.label}::text, ${b.end}::date)`), sql.raw(', '))
    const prevBucketValues = sql.join(prevBuckets.map((b) => sql`(${b.label}::text, ${b.end}::date)`), sql.raw(', '))

    const rows = await db.execute(sql`
      WITH
      buckets(label, pe) AS (VALUES ${curBucketValues}),
      prev_buckets(label, pe) AS (VALUES ${prevBucketValues}),
      -- cohort — populasi Active+Reactivated di checkpoint A (denominator).
      cohort AS (
        SELECT pb.label, pcss.customer_id
        FROM prev_buckets pb
        JOIN customer_status_snapshot pcss
          ON pcss.company_id = ${cid}
          AND ${prevDivCond}
          AND pcss.period_type = ${periodType}
          AND pcss.checkpoint_date = pb.pe
          AND pcss.status IN ('active', 'reactivated')
      ),
      -- retained — dari cohort, yang MASIH Active+Reactivated di checkpoint
      -- B (numerator) - JOIN by label (SAMA titik trend), customer_id SAMA.
      retained AS (
        SELECT c.label, c.customer_id
        FROM cohort c
        JOIN buckets b ON b.label = c.label
        JOIN customer_status_snapshot css
          ON css.company_id = ${cid}
          AND ${divCond}
          AND css.period_type = ${periodType}
          AND css.checkpoint_date = b.pe
          AND css.customer_id = c.customer_id
          AND css.status IN ('active', 'reactivated')
      ),
      -- current_active — populasi Active+Reactivated PERSIS di checkpoint B
      -- MILIK TITIK ITU SENDIRI (2026-09-16, susulan tooltip M11 - user
      -- tegaskan "total customer yang transaksi DI PERIODE TERSEBUT", bukan
      -- cohort dari periode sebelumnya). TIDAK direstriksi ke cohort manapun
      -- (beda dari CTE retained di atas yang cuma hitung irisan dgn cohort)
      -- - query MANDIRI per titik, jadi titik TERAKHIR pun dapat angka benar
      -- (sebelumnya sempat coba akal-akalan "pinjam" dari titik sesudahnya,
      -- gagal total utk titik terakhir krn tidak ada titik sesudahnya -
      -- solusi yang benar memang query langsung spt ini, bukan pinjam).
      current_active AS (
        SELECT b.label, css2.customer_id
        FROM buckets b
        JOIN customer_status_snapshot css2
          ON css2.company_id = ${cid}
          AND ${divCond2}
          AND css2.period_type = ${periodType}
          AND css2.checkpoint_date = b.pe
          AND css2.status IN ('active', 'reactivated')
      )
      SELECT
        b.label AS month,
        COUNT(DISTINCT c.customer_id)::int AS cohort_count,
        COUNT(DISTINCT r.customer_id)::int AS retained_count,
        (COUNT(DISTINCT c.customer_id) - COUNT(DISTINCT r.customer_id))::int AS lost_count,
        COUNT(DISTINCT ca.customer_id)::int AS total_active_count,
        ROUND(COUNT(DISTINCT r.customer_id)::numeric / NULLIF(COUNT(DISTINCT c.customer_id), 0) * 100, 1) AS retention_rate
      FROM buckets b
      LEFT JOIN cohort c ON c.label = b.label
      LEFT JOIN retained r ON r.label = b.label AND r.customer_id = c.customer_id
      LEFT JOIN current_active ca ON ca.label = b.label
      GROUP BY b.label
      -- ORDER BY label, BUKAN pe (pelajaran HOLDINGIT-697 - titik
      -- kedua-dari-belakang & titik terakhir BISA share checkpoint yang
      -- sama persis [carry-forward], ORDER BY pe jadi ambigu di situ).
      ORDER BY b.label
    `)
    return (rows as unknown[]).map((r) => mapRetentionRow(r as Record<string, unknown>))
  }

  // Fallback (2026-09-16) — compute ON-DEMAND per checkpoint unik yang
  // dibutuhkan, reuse computeCustomerStatusSnapshot (SAMA fungsi dipakai
  // scheduler + fallback Customer Workbench) - BUKAN rumus live terpisah.
  const checkpointActiveSets = new Map<string, Set<number>>()
  for (const checkpointDate of neededCheckpoints) {
    const { bucket, prevBucket } = resolveStatusCheckpointBuckets(periodType, checkpointDate)
    const statusRows = await computeCustomerStatusSnapshot(p, bucket, prevBucket)
    const activeSet = new Set(
      statusRows.filter((r) => r.status === 'active' || r.status === 'reactivated').map((r) => r.customer_id),
    )
    checkpointActiveSets.set(checkpointDate, activeSet)
  }

  return buckets.map((b, i) => {
    const cohortSet = checkpointActiveSets.get(prevBuckets[i]!.end) ?? new Set<number>()
    const currentSet = checkpointActiveSets.get(b.end) ?? new Set<number>()
    const cohort_count = cohortSet.size
    let retained_count = 0
    for (const id of cohortSet) if (currentSet.has(id)) retained_count++
    const lost_count = cohort_count - retained_count
    const retention_rate = cohort_count > 0 ? Math.round((retained_count / cohort_count) * 1000) / 10 : 0
    return { month: b.label, cohort_count, retained_count, lost_count, total_active_count: currentSet.size, retention_rate }
  })
}

function mapRetentionRow(row: Record<string, unknown>): RetentionTrendRow {
  return {
    month: String(row.month),
    cohort_count: Number(row.cohort_count ?? 0),
    retained_count: Number(row.retained_count ?? 0),
    lost_count: Number(row.lost_count ?? 0),
    total_active_count: Number(row.total_active_count ?? 0),
    retention_rate: Number(row.retention_rate ?? 0),
  }
}

/**
 * resolveCohortRetention (2026-09-16) — SATU tempat tentukan cohort
 * (checkpoint A, Active+Reactivated) + siapa di antaranya yang retained
 * (JUGA Active+Reactivated di checkpoint B) - dipakai BERSAMA
 * `fetchTopRetainedCustomers` (top N by value) DAN `fetchRetentionBreakdown`
 * (SELURUH cohort + status utk tabel Report), supaya definisi "siapa masuk
 * cohort/siapa retained" SATU SUMBER, tidak ditulis 2x.
 */
async function resolveCohortRetention(
  p: SegmentParams,
  currentBucket: TrailingPeriodBucket,
  prevBucket: TrailingPeriodBucket,
  periodType: PeriodType,
): Promise<{ cohortIds: number[]; retainedIds: Set<number> }> {
  const { cid, division } = p

  const snapshotConditionsMet = cid !== 0
    && p.branchFilter == null
    && !p.excludeIntercompany
    && !p.onlyPareto
    && await isScopeEffectivelyUnrestricted(p)
  const snapshotEligible = snapshotConditionsMet
    && await hasSnapshotForAllCheckpoints(cid, division, periodType, [currentBucket.end, prevBucket.end])

  if (snapshotEligible) {
    const divCond = division == null ? sql`css.division_id IS NULL` : sql`css.division_id = ${division}::int`
    const prevDivCond = division == null ? sql`pcss.division_id IS NULL` : sql`pcss.division_id = ${division}::int`
    // LEFT JOIN (bukan INNER) - butuh SELURUH cohort (pcss), css cuma
    // dipakai nentuin retained/lost (customer_id_retained NULL = lost).
    const rows = await db.execute(sql`
      SELECT pcss.customer_id, css.customer_id AS retained_customer_id
      FROM customer_status_snapshot pcss
      LEFT JOIN customer_status_snapshot css
        ON css.company_id = pcss.company_id
        AND css.customer_id = pcss.customer_id
        AND css.period_type = pcss.period_type
        AND ${divCond}
        AND css.checkpoint_date = ${currentBucket.end}::date
        AND css.status IN ('active', 'reactivated')
      WHERE pcss.company_id = ${cid}
        AND ${prevDivCond}
        AND pcss.period_type = ${periodType}
        AND pcss.checkpoint_date = ${prevBucket.end}::date
        AND pcss.status IN ('active', 'reactivated')
    `)
    const cohortIds: number[] = []
    const retainedIds = new Set<number>()
    for (const r of rows as unknown[]) {
      const row = r as Record<string, unknown>
      const customerId = Number(row.customer_id)
      cohortIds.push(customerId)
      if (row.retained_customer_id != null) retainedIds.add(customerId)
    }
    return { cohortIds, retainedIds }
  }

  const [prevRows, curRows] = await Promise.all([
    computeCustomerStatusSnapshot(p, prevBucket, await prevOfPrev(periodType, prevBucket)),
    computeCustomerStatusSnapshot(p, currentBucket, prevBucket),
  ])
  const cohortIds = prevRows.filter((r) => r.status === 'active' || r.status === 'reactivated').map((r) => r.customer_id)
  const curActive = new Set(curRows.filter((r) => r.status === 'active' || r.status === 'reactivated').map((r) => r.customer_id))
  const retainedIds = new Set(cohortIds.filter((id) => curActive.has(id)))
  return { cohortIds, retainedIds }
}

// computeAvgMonthlyRevenue — SUM total_revenue 12 bulan trailing s.d.
// currentBucket.end / 12, definisi SAMA PERSIS fetchDormantValueRanking
// (M9/M10), dipakai kedua fungsi di bawah (SATU query revenue, bukan 2x).
async function fetchAvgMonthlyRevenueByCustomer(
  p: SegmentParams,
  customerIds: number[],
  currentBucket: TrailingPeriodBucket,
): Promise<Map<number, { customer_name: string; customer_code: string | null; company_name: string; avg_monthly_revenue: number }>> {
  const { cid, division, companyScopeIds } = p
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const idsSql = sql.join(customerIds.map((id) => sql`${id}`), sql.raw(', '))

  const rows = await db.execute(sql`
    WITH inv AS (
      SELECT i.customer_id, i.invoice_date, i.total_revenue::numeric AS rev
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND i.customer_id IN (${idsSql})
        AND i.invoice_date <= ${currentBucket.end}::date
        AND i.invoice_date >= (DATE_TRUNC('month', ${currentBucket.end}::date) - INTERVAL '11 months')
        AND ${companyCondI}
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND (${p.branchFilter}::int IS NULL OR i.branch_id = ${p.branchFilter}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
    )
    SELECT
      c.id AS customer_id,
      c.customer_name,
      c.customer_code,
      co.name AS company_name,
      COALESCE(SUM(inv.rev), 0) / 12.0 AS avg_monthly_revenue
    FROM customers c
    JOIN companies co ON co.id = c.company_id
    LEFT JOIN inv ON inv.customer_id = c.id
    WHERE c.id IN (${idsSql}) AND ${companyCondC}
    GROUP BY c.id, c.customer_name, c.customer_code, co.name
  `)

  const map = new Map<number, { customer_name: string; customer_code: string | null; company_name: string; avg_monthly_revenue: number }>()
  for (const r of rows as unknown[]) {
    const row = r as Record<string, unknown>
    map.set(Number(row.customer_id), {
      customer_name: String(row.customer_name),
      customer_code: row.customer_code == null ? null : String(row.customer_code),
      company_name: String(row.company_name),
      avg_monthly_revenue: Number(row.avg_monthly_revenue ?? 0),
    })
  }
  return map
}

/**
 * Top N customer TERTAHAN (retained) bernilai tertinggi pada checkpoint
 * TERAKHIR (titik trend paling akhir) - avg_monthly_revenue 12 bulan
 * trailing s.d. checkpoint B, definisi SAMA PERSIS fetchDormantValueRanking
 * (M9/M10).
 */
export async function fetchTopRetainedCustomers(
  p: SegmentParams,
  currentBucket: TrailingPeriodBucket,
  prevBucket: TrailingPeriodBucket,
  limit: number,
  periodType: PeriodType = 'monthly',
): Promise<RetainedCustomerRow[]> {
  const { retainedIds } = await resolveCohortRetention(p, currentBucket, prevBucket, periodType)
  if (retainedIds.size === 0) return []

  const revenueMap = await fetchAvgMonthlyRevenueByCustomer(p, [...retainedIds], currentBucket)
  return [...retainedIds]
    .map((customerId) => {
      const info = revenueMap.get(customerId)
      if (!info) return null
      return { customer_id: customerId, ...info }
    })
    .filter((r): r is RetainedCustomerRow => r !== null)
    .sort((a, b) => b.avg_monthly_revenue - a.avg_monthly_revenue)
    .slice(0, limit)
}

/**
 * Report > Retention tabel breakdown (task044.md Bagian 2) - SELURUH
 * cohort (checkpoint A, Active+Reactivated), masing-masing ditandai
 * retained/lost di checkpoint B. Pola SAMA `fetchDormantValueRanking`
 * (limit=null, SEMUA baris, bukan top-N).
 */
export async function fetchRetentionBreakdown(
  p: SegmentParams,
  currentBucket: TrailingPeriodBucket,
  prevBucket: TrailingPeriodBucket,
  periodType: PeriodType = 'monthly',
): Promise<RetentionBreakdownRow[]> {
  const { cohortIds, retainedIds } = await resolveCohortRetention(p, currentBucket, prevBucket, periodType)
  if (cohortIds.length === 0) return []

  const revenueMap = await fetchAvgMonthlyRevenueByCustomer(p, cohortIds, currentBucket)
  return cohortIds
    .map((customerId) => {
      const info = revenueMap.get(customerId)
      if (!info) return null
      return {
        customer_id: customerId,
        ...info,
        status: (retainedIds.has(customerId) ? 'retained' : 'lost') as 'retained' | 'lost',
      }
    })
    .filter((r): r is RetentionBreakdownRow => r !== null)
}

// prevOfPrev — checkpoint SATU periode sebelum prevBucket, dibutuhkan
// computeCustomerStatusSnapshot(p, bucket, prevBucket) utk MENGHITUNG
// status di prevBucket itu sendiri (fungsi ini butuh bucket DAN prevBucket
// dari checkpoint yang sedang dihitung, bukan cuma 1 tanggal) - fallback
// only, jalur cepat tidak butuh ini sama sekali.
async function prevOfPrev(periodType: PeriodType, bucket: TrailingPeriodBucket): Promise<TrailingPeriodBucket> {
  const { prevBucket } = resolveStatusCheckpointBuckets(periodType, bucket.end)
  return { label: bucket.label, start: prevBucket.start, end: prevBucket.end }
}
