import { sql } from 'drizzle-orm'
import { divisionToDormantKey } from '@/features/config/threshold'

/**
 * Parameter tunggal untuk semua segmentasi customer.
 *
 * activeDays  = active_window_months × 30 (dari business_config)
 * dormantDays = dormant_threshold_months.{type} × 30 (ditentukan dari channel_divisions company)
 * filterDate  = hari ini (default) atau tanggal yang dipilih user
 *
 * Active   = ada invoice dalam (filterDate - activeDays, filterDate]
 * Existing = ada invoice dalam (filterDate - dormantDays, filterDate]
 * Dormant  = tidak ada invoice dalam window dormant tersebut
 *
 * Active ⊆ Existing, Existing ∩ Dormant = ∅
 */
export interface SegmentParams {
  cid: number         // 0 = semua perusahaan
  filterDate: string  // YYYY-MM-DD
  activeDays: number  // active_window_months × 30
  dormantDays: number // dormant_threshold_months.{type} × 30
  division: string | null  // null = semua divisi
}

export function buildSegmentParams(
  companyId: number | 'all',
  filterDate: string,
  activeDays: number,
  dormantDays: number,
  division?: string,
): SegmentParams {
  return {
    cid: companyId === 'all' ? 0 : companyId,
    filterDate,
    activeDays,
    dormantDays,
    division: division ?? null,
  }
}

// ─── CTE builders ────────────────────────────────────────────────────────────

/** CTE: existing_customers — ada invoice dalam dormantDays sebelum filterDate */
export function sqlExistingCustomers(p: SegmentParams) {
  return sql`
    existing_customers AS (
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
            AND ix.invoice_date >  ${p.filterDate}::date - ${p.dormantDays}::int * INTERVAL '1 day'
            AND ix.invoice_date <= ${p.filterDate}::date
            AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        )
    )
  `
}

/** CTE: dormant_customers — tidak ada invoice dalam dormantDays sebelum filterDate */
export function sqlDormantCustomers(p: SegmentParams) {
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
            AND ix.invoice_date > ${p.filterDate}::date - ${p.dormantDays}::int * INTERVAL '1 day'
            AND (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
        )
    )
  `
}

/** Konversi 'YYYY-MM' ke hari terakhir bulan tersebut 'YYYY-MM-DD' */
export function monthEndDate(month: string): string {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m, 0).getDate()
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

// Re-export untuk backward compatibility — sumber kebenaran ada di threshold.ts
export { divisionToDormantKey }