/**
 * SSOT segmentasi customer.
 *
 * 4 kategori atomik:
 *   new_customer      = first_invoice dalam active window (customer baru)
 *   active_customer   = first_invoice SEBELUM active window
 *                       DAN last_invoice dalam active window
 *   existing_customer = first_invoice SEBELUM active window
 *                       DAN last_invoice dalam dormant window tapi SEBELUM active window
 *   dormant_customer  = last_invoice SEBELUM dormant window
 *
 * Grup gabungan:
 *   active     = new_customer + active_customer   (semua yang beli di active window)
 *   existing   = active_customer + existing_customer (semua non-baru, non-dormant)
 *   established= active_customer + existing_customer (KPI universe M3–M7)
 */

import { db } from '@/config/db'
import { sql, and, or } from 'drizzle-orm'
import { divisionToDormantKey } from '@/features/config/threshold'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentParams {
  cid: number            // 0 = semua perusahaan
  filterDate: string     // YYYY-MM-DD
  activeMonths: number   // active_window_months dari business_config
  dormantMonths: number  // dormant_threshold_months.{type} dari business_config
  division: string | null
}

export function buildSegmentParams(
  companyId: number | 'all',
  filterDate: string,
  activeMonths: number,
  dormantMonths: number,
  division?: string,
): SegmentParams {
  return {
    cid: companyId === 'all' ? 0 : companyId,
    filterDate,
    activeMonths,
    dormantMonths,
    division: division ?? null,
  }
}

export interface CustomerSegmentCount {
  new_customer: number
  active_customer: number
  existing_customer: number
  dormant_customer: number
}

// ─── Standalone query ─────────────────────────────────────────────────────────

/**
 * Hitung 4 kategori customer dalam satu query.
 * Gunakan untuk menampilkan ringkasan jumlah per segmen.
 */
export async function getCustomerSegments(
  p: SegmentParams,
): Promise<CustomerSegmentCount> {
  const { cid, filterDate, activeMonths, dormantMonths, division } = p

  const rows = await db.execute(sql`
    WITH
    cust_dates AS (
      SELECT
        c.id AS customer_id,
        MIN(i.invoice_date) AS first_invoice_date,
        MAX(i.invoice_date) AS last_invoice_date
      FROM customers c
      JOIN invoices i ON i.customer_id = c.id
      WHERE i.deleted_at IS NULL
        AND c.is_placeholder = false
        AND (${cid}::int = 0 OR c.company_id = ${cid}::int)
        AND i.invoice_date <= ${filterDate}::date
      GROUP BY c.id
    ),
    latest_channel AS (
      SELECT DISTINCT ON (i.customer_id)
        i.customer_id,
        cd.division
      FROM invoices i
      LEFT JOIN channel_divisions cd
        ON cd.channel_name = i.channel_name
        AND (cd.company_id = i.company_id OR cd.company_id IS NULL)
      WHERE i.deleted_at IS NULL
        AND (${cid}::int = 0 OR i.company_id = ${cid}::int)
      ORDER BY i.customer_id, i.invoice_date DESC
    )
    SELECT
      COUNT(*) FILTER (
        WHERE cd.first_invoice_date > ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
      )::int AS new_customer,

      COUNT(*) FILTER (
        WHERE cd.first_invoice_date <= ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
          AND cd.last_invoice_date  >  ${filterDate}::date - ${activeMonths}::int * INTERVAL '1 month'
      )::int AS active_customer,

      COUNT(*) FILTER (
        WHERE cd.first_invoice_date <= ${filterDate}::date - ${activeMonths}::int  * INTERVAL '1 month'
          AND cd.last_invoice_date  >  ${filterDate}::date - ${dormantMonths}::int * INTERVAL '1 month'
          AND cd.last_invoice_date  <= ${filterDate}::date - ${activeMonths}::int  * INTERVAL '1 month'
      )::int AS existing_customer,

      COUNT(*) FILTER (
        WHERE cd.last_invoice_date <= ${filterDate}::date - ${dormantMonths}::int * INTERVAL '1 month'
      )::int AS dormant_customer

    FROM cust_dates cd
    LEFT JOIN latest_channel lc ON lc.customer_id = cd.customer_id
    WHERE (${division}::text IS NULL OR lc.division = ${division}::text)
  `)

  const row = (rows as unknown[])[0] as Record<string, unknown> | undefined
  return {
    new_customer:      Number(row?.new_customer      ?? 0),
    active_customer:   Number(row?.active_customer   ?? 0),
    existing_customer: Number(row?.existing_customer ?? 0),
    dormant_customer:  Number(row?.dormant_customer  ?? 0),
  }
}

// Convenience — jumlah segmen gabungan
export async function getActiveCount(p: SegmentParams): Promise<number> {
  const seg = await getCustomerSegments(p)
  return seg.new_customer + seg.active_customer
}

export async function getExistingCount(p: SegmentParams): Promise<number> {
  const seg = await getCustomerSegments(p)
  return seg.active_customer + seg.existing_customer
}

// ─── SQL expression (CASE WHEN) — SSOT per baris ─────────────────────────────

/**
 * CASE WHEN expression untuk kolom status per customer.
 * Dipakai di SELECT agar setiap baris punya label status-nya.
 */
export function sqlStatusExpr(
  refDate: ReturnType<typeof sql>,
  activeMonths: number,
  dormantMonths: number,
  lastInv: unknown,
  firstInv: unknown,
) {
  const activeCutoff  = sql`${refDate} - ${activeMonths}::int  * INTERVAL '1 month'`
  const dormantCutoff = sql`${refDate} - ${dormantMonths}::int * INTERVAL '1 month'`

  return sql<string>`
    CASE
      WHEN ${lastInv} IS NULL                     THEN 'new'
      WHEN ${firstInv}::date >= ${activeCutoff}   THEN 'new'
      WHEN ${lastInv}::date  <= ${dormantCutoff}  THEN 'dormant'
      WHEN ${lastInv}::date  >= ${activeCutoff}   THEN 'active'
      ELSE 'existing'
    END
  `
}

/**
 * WHERE condition untuk filter status di halaman Customer.
 * 'existing' menggunakan definisi KPI (non-new, non-dormant = 323) — BUKAN sub-status chip.
 * Dengan begitu filter "existing" konsisten dengan denominator M4/M5/M6/M7.
 */
export function sqlStatusWhere(
  status: string,
  refDate: ReturnType<typeof sql>,
  activeMonths: number,
  dormantMonths: number,
  lastInv: unknown,
  firstInv: unknown,
) {
  const activeCutoff  = sql`${refDate} - ${activeMonths}::int  * INTERVAL '1 month'`
  const dormantCutoff = sql`${refDate} - ${dormantMonths}::int * INTERVAL '1 month'`

  const isNew  = or(sql`${lastInv} IS NULL`, sql`${firstInv}::date >= ${activeCutoff}`)
  const notNew = and(
    sql`${lastInv} IS NOT NULL`,
    sql`(${firstInv} IS NULL OR ${firstInv}::date < ${activeCutoff})`,
  )

  switch (status) {
    case 'new':     return isNew
    case 'dormant': return and(notNew, sql`${lastInv}::date <= ${dormantCutoff}`)
    case 'active':  return and(notNew, sql`${lastInv}::date >= ${activeCutoff}`)
    case 'existing':
      // KPI definition: non-new + non-dormant (termasuk yang "active" sub-status)
      return and(
        notNew,
        sql`${lastInv}::date > ${dormantCutoff}`,
      )
    default: return undefined
  }
}

// ─── CTE builders — dipakai dalam WITH clause query yang lebih besar ──────────

/**
 * CTE: established_customers
 * Universe KPI M3–M7 = active_customer ∪ existing_customer (non-dormant, non-new).
 * - division filter: (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
 *   → saat division=null, filter jadi TRUE (global); saat division diisi, filter spesifik.
 * Dipakai sebagai denominator dan base join di metrics query.
 */
export function cteEstablishedCustomers(p: SegmentParams) {
  return sql`
    established_customers AS (
      SELECT DISTINCT c.id, c.customer_name, c.customer_code
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${p.cid}::int = 0 OR c.company_id = ${p.cid}::int)
        AND EXISTS (
          SELECT 1 FROM invoices ix0
          WHERE ix0.customer_id = c.id
            AND ix0.deleted_at IS NULL
            AND ix0.invoice_date < ${p.filterDate}::date - ${p.activeMonths}::int * INTERVAL '1 month'
        )
        AND EXISTS (
          SELECT 1 FROM invoices ix
          LEFT JOIN channel_divisions cd
            ON cd.channel_name = ix.channel_name
            AND (cd.company_id = ix.company_id OR cd.company_id IS NULL)
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND (${p.cid}::int = 0 OR ix.company_id = ${p.cid}::int)
            AND ix.invoice_date >  ${p.filterDate}::date - ${p.dormantMonths}::int * INTERVAL '1 month'
            AND ix.invoice_date <= ${p.filterDate}::date
            AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        )
    )
  `
}

/**
 * CTE: new_customers
 * = new_customer: first_invoice dalam active window (customer baru).
 */
export function cteNewCustomers(p: SegmentParams) {
  return sql`
    new_customers AS (
      SELECT DISTINCT c.id, c.customer_name, c.customer_code
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${p.cid}::int = 0 OR c.company_id = ${p.cid}::int)
        AND EXISTS (
          SELECT 1 FROM invoices ix
          LEFT JOIN channel_divisions cd
            ON cd.channel_name = ix.channel_name
            AND (cd.company_id = ix.company_id OR cd.company_id IS NULL)
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND (${p.cid}::int = 0 OR ix.company_id = ${p.cid}::int)
            AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        )
        AND NOT EXISTS (
          SELECT 1 FROM invoices ix0
          WHERE ix0.customer_id = c.id
            AND ix0.deleted_at IS NULL
            AND ix0.invoice_date < ${p.filterDate}::date - ${p.activeMonths}::int * INTERVAL '1 month'
        )
    )
  `
}

/**
 * CTE: active_customers
 * = active_customer: first_invoice SEBELUM active window, last_invoice dalam active window.
 */
export function cteActiveCustomers(p: SegmentParams) {
  return sql`
    active_customers AS (
      SELECT DISTINCT c.id, c.customer_name, c.customer_code
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${p.cid}::int = 0 OR c.company_id = ${p.cid}::int)
        AND EXISTS (
          SELECT 1 FROM invoices ix0
          WHERE ix0.customer_id = c.id
            AND ix0.deleted_at IS NULL
            AND ix0.invoice_date < ${p.filterDate}::date - ${p.activeMonths}::int * INTERVAL '1 month'
        )
        AND EXISTS (
          SELECT 1 FROM invoices ix
          LEFT JOIN channel_divisions cd
            ON cd.channel_name = ix.channel_name
            AND (cd.company_id = ix.company_id OR cd.company_id IS NULL)
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND (${p.cid}::int = 0 OR ix.company_id = ${p.cid}::int)
            AND ix.invoice_date >  ${p.filterDate}::date - ${p.activeMonths}::int * INTERVAL '1 month'
            AND ix.invoice_date <= ${p.filterDate}::date
            AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        )
    )
  `
}

/**
 * CTE: existing_customers
 * = existing_customer: non-dormant, non-active, non-new (middle segment).
 * Satu query melayani global (division=null) dan filter divisi (division=isi).
 */
export function cteExistingCustomers(p: SegmentParams) {
  return sql`
    existing_customers AS (
      SELECT DISTINCT c.id, c.customer_name, c.customer_code
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${p.cid}::int = 0 OR c.company_id = ${p.cid}::int)
        AND EXISTS (
          SELECT 1 FROM invoices ix0
          WHERE ix0.customer_id = c.id
            AND ix0.deleted_at IS NULL
            AND ix0.invoice_date < ${p.filterDate}::date - ${p.activeMonths}::int * INTERVAL '1 month'
        )
        AND EXISTS (
          SELECT 1 FROM invoices ix
          LEFT JOIN channel_divisions cd
            ON cd.channel_name = ix.channel_name
            AND (cd.company_id = ix.company_id OR cd.company_id IS NULL)
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND (${p.cid}::int = 0 OR ix.company_id = ${p.cid}::int)
            AND ix.invoice_date >  ${p.filterDate}::date - ${p.dormantMonths}::int * INTERVAL '1 month'
            AND ix.invoice_date <= ${p.filterDate}::date
            AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        )
        AND NOT EXISTS (
          SELECT 1 FROM invoices ix2
          LEFT JOIN channel_divisions cd2
            ON cd2.channel_name = ix2.channel_name
            AND (cd2.company_id = ix2.company_id OR cd2.company_id IS NULL)
          WHERE ix2.customer_id = c.id
            AND ix2.deleted_at IS NULL
            AND (${p.cid}::int = 0 OR ix2.company_id = ${p.cid}::int)
            AND ix2.invoice_date >  ${p.filterDate}::date - ${p.activeMonths}::int * INTERVAL '1 month'
            AND ix2.invoice_date <= ${p.filterDate}::date
            AND (${p.division}::text IS NULL OR cd2.division = ${p.division}::text)
        )
    )
  `
}

/**
 * CTE: dormant_customers
 * = dormant_customer: tidak ada invoice dalam dormant window.
 */
export function cteDormantCustomers(p: SegmentParams) {
  return sql`
    dormant_customers AS (
      SELECT c.id, c.customer_name, c.customer_code
      FROM customers c
      WHERE c.is_placeholder = false
        AND (${p.cid}::int = 0 OR c.company_id = ${p.cid}::int)
        AND c.first_invoice_date IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM invoices ix
          LEFT JOIN channel_divisions cd
            ON cd.channel_name = ix.channel_name
            AND (cd.company_id = ix.company_id OR cd.company_id IS NULL)
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND (${p.cid}::int = 0 OR ix.company_id = ${p.cid}::int)
            AND ix.invoice_date > ${p.filterDate}::date - ${p.dormantMonths}::int * INTERVAL '1 month'
            AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        )
    )
  `
}

// ─── Utilities ────────────────────────────────────────────────────────────────

export function monthEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

export { divisionToDormantKey }
