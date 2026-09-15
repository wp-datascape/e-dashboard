/**
 * repository/customer-status-snapshot.repository.ts
 *
 * Precompute 6 Status Dasar resmi (Glosarium
 * `frontend/src/i18n/locales/id/help/glossary.md`) per customer, pada SATU
 * checkpoint periode tertutup (task040.md, EDASHBOARD-TBD). Dipanggil
 * scheduler saat periode berganti (bukan on-demand per request) - beri
 * waktu sebanyak yang dibutuhkan, tidak terikat `statement_timeout` 20
 * detik yang mengikat request HTTP (lihat bug asal: timeout
 * `fetchExpansionBreakdown`, m3m7.repository.ts).
 *
 * CTE inv/scoped_cust/cxm di bawah SENGAJA mirror persis pola
 * `fetchCustomerDormantStatusLog` (m8m10.repository.ts) - itu logika
 * status dormant/reaktivasi yang SUDAH matang, dikoreksi berkali-kali
 * (task029.md §36.28-§36.56). REUSE pola yang sama (bukan tulis ulang
 * aturan dari nol), cuma branch closed-period-nya saja (checkpoint di sini
 * SELALU periode tertutup penuh, tidak ada mode `applyDateCutoff` live).
 * Tambahan di sini: gerbang Acquisition (customer baru pertama transaksi
 * DI DALAM periode ini) yang TIDAK dicakup fetchCustomerDormantStatusLog
 * (fungsi itu scope-nya HANYA existing customer, `WHERE cxm.is_existing_at_me`).
 *
 * Pemetaan istilah kode -> Glosarium resmi:
 *   'active'   -> Active Customer   'inactive' -> Lapsed
 *   'dormant'  -> Dormant           'reactivated' -> Reactivated
 *   (baru)     -> Acquisition       newlyDormant -> Dormant + is_relapsed=true
 */
import { db } from '@/config/db'
import { sql } from 'drizzle-orm'
import type { SegmentParams } from '../segment.helper'
import { resolveInvoiceScopeConditions, cteCustDivision, dormantThresholdCaseSql, dormantCrossedSql } from '../segment.helper'
import { buildCompanyConditionRaw } from '@/utils/scope'

export type CustomerStatusValue = 'acquisition' | 'active' | 'reactivated' | 'lapsed' | 'dormant'

export interface CustomerStatusSnapshotRow {
  customer_id: number
  status: CustomerStatusValue
  is_relapsed: boolean
  // last_invoice_date (2026-09-15, susulan migrasi M8-M10) - lihat JSDoc
  // kolom di db/schema/customer_status_snapshot.ts.
  last_invoice_date: string | null
}

/**
 * bucket/prevBucket - periode TERTUTUP yang sedang di-snapshot (bukan live).
 * Caller (service/scheduler) menurunkan ini dari checkpoint_date via
 * `getCurrentPeriodKey`+`getPeriodRange`/`getPreviousPeriodKey`
 * (period.util.ts) - checkpoint_date SELALU persis `bucket.end`.
 */
export async function computeCustomerStatusSnapshot(
  p: SegmentParams,
  bucket: { start: string; end: string },
  prevBucket: { start: string; end: string },
): Promise<CustomerStatusSnapshotRow[]> {
  const { cid, division, companyScopeIds } = p
  const { branchCond, divisionScopeCond, companyCondI, excludeIntercompanyCond, onlyParetoCond } = resolveInvoiceScopeConditions(p, { customer: 'c_ov' })
  const companyCondC = buildCompanyConditionRaw('c.company_id', cid, companyScopeIds)
  const dormantThresholdSql = dormantThresholdCaseSql(p)

  const rows = await db.execute(sql`
    WITH
    ${cteCustDivision(p)},
    inv AS (
      SELECT i.customer_id, i.invoice_date
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND cd.company_id = i.company_id
      LEFT JOIN customers c_ov ON c_ov.id = i.customer_id
      WHERE i.deleted_at IS NULL
        AND ${companyCondI}
        AND (${division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = i.company_id AND key = 'other')) = ${division}::int)
        AND ${branchCond}
        AND ${divisionScopeCond}
        AND ${excludeIntercompanyCond}
        AND ${onlyParetoCond}
    ),
    scoped_cust AS (
      SELECT DISTINCT c.id AS cid, c.first_invoice_date AS first_date,
        ${dormantThresholdSql} AS dormant_threshold
      FROM customers c
      LEFT JOIN cust_division cdv ON cdv.cid = c.id
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        AND EXISTS (SELECT 1 FROM inv WHERE inv.customer_id = c.id)
    ),
    cxm AS (
      SELECT
        sc.cid,
        sc.dormant_threshold,
        -- Acquisition/established GLOBAL (task039: status new/existing
        -- properti global customer, TIDAK boleh berubah cuma krn filter
        -- divisi) - first_date sengaja TIDAK di-scope ulang per divisi.
        (sc.first_date < ${bucket.start}::date)                              AS is_existing_at_me,
        (sc.first_date >= ${bucket.start}::date AND sc.first_date <= ${bucket.end}::date) AS is_acquisition,
        MAX(inv.invoice_date) FILTER (WHERE inv.invoice_date <= ${bucket.end}::date)     AS last_at_me,
        MAX(inv.invoice_date) FILTER (WHERE inv.invoice_date <= ${prevBucket.end}::date) AS last_at_prev_me,
        MIN(inv.invoice_date) FILTER (
          WHERE inv.invoice_date > ${prevBucket.end}::date
            AND inv.invoice_date <= ${bucket.end}::date
        )                                                                    AS reactivation_date
      FROM scoped_cust sc
      LEFT JOIN inv ON inv.customer_id = sc.cid
      GROUP BY sc.cid, sc.dormant_threshold, sc.first_date
    ),
    classified AS (
      SELECT
        cxm.cid,
        cxm.is_acquisition,
        (cxm.last_at_prev_me IS NOT NULL
          AND ${dormantCrossedSql(sql`cxm.last_at_prev_me`, sql`${prevBucket.end}::date`, sql`cxm.dormant_threshold`)}
        )                                                                    AS was_dormant_at_prev,
        (cxm.last_at_me IS NOT NULL
          AND ${dormantCrossedSql(sql`cxm.last_at_me`, sql`${bucket.end}::date`, sql`cxm.dormant_threshold`)}
        )                                                                    AS is_dormant_at_me,
        cxm.reactivation_date,
        cxm.last_at_me,
        (cxm.last_at_me IS NOT NULL AND cxm.last_at_me >= ${bucket.start}::date) AS transacted_in_period
      FROM cxm
      WHERE cxm.is_existing_at_me OR cxm.is_acquisition
    )
    SELECT
      cid AS customer_id,
      CASE
        WHEN is_acquisition                                                         THEN 'acquisition'
        WHEN was_dormant_at_prev AND reactivation_date IS NOT NULL AND is_dormant_at_me THEN 'dormant'
        WHEN was_dormant_at_prev AND reactivation_date IS NOT NULL                   THEN 'reactivated'
        WHEN was_dormant_at_prev                                                     THEN 'dormant'
        WHEN transacted_in_period                                                    THEN 'active'
        ELSE 'lapsed'
      END                                                                            AS status,
      (was_dormant_at_prev AND reactivation_date IS NOT NULL AND is_dormant_at_me)   AS is_relapsed,
      last_at_me                                                                     AS last_invoice_date
    FROM classified
  `)

  return rows.map((row) => ({
    customer_id: Number(row.customer_id),
    status: row.status as CustomerStatusValue,
    is_relapsed: row.is_relapsed === true || row.is_relapsed === 't',
    last_invoice_date: row.last_invoice_date == null ? null : String(row.last_invoice_date),
  }))
}
