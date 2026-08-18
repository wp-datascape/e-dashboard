/**
 * SSOT segmentasi customer.
 *
 * Definisi final (task028, 2026-08-18 — supersede model lama di task027 §4):
 *   New      = first_invoice dalam active window (customer baru)
 *   Existing = SEMUA customer KECUALI New (first_invoice SEBELUM active
 *              window) — TERMASUK yang sudah dormant. Ini universe KPI
 *              M3–M10 (dulu bernama "established", EXCLUDE dormant — sudah
 *              tidak berlaku).
 *   Active   = sub-status DI DALAM Existing: punya transaksi di periode yang
 *              sedang dilihat.
 *   Dormant  = sub-status DI DALAM Existing: tidak ada invoice dalam
 *              dormant_threshold_months sesuai kategori bisnis customer
 *              (tetap per-kategori, lihat task027 §1-3 — bug itu terpisah).
 *
 * New "graduasi" otomatis jadi Existing begitu first_invoice-nya lewat
 * active window dari titik evaluasi berikutnya (mis. New Agustus → Existing
 * September) — tidak perlu logic tambahan, karena tiap titik waktu
 * dievaluasi independen dari nol (lihat CTE `months` di
 * m3m7.repository.ts/m8m10.repository.ts).
 *
 * `cteEstablishedCustomers` di bawah tetap nama lama (hindari rename massal
 * di 4 file pemanggil), tapi body-nya sekarang = "Existing" sesuai definisi
 * final ini, BUKAN "established" (active+existing, exclude dormant) lagi.
 */

import { sql, and, or } from 'drizzle-orm'
import { divisionToDormantKey } from '@/features/config/threshold'
import { buildBranchConditionRaw, buildDivisionConditionRaw, buildCompanyConditionRaw, buildExcludeIntercompanyRaw } from '@/utils/scope'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SegmentParams {
  cid: number            // 0 = semua perusahaan (perhatian: bukan berarti bypass, lihat companyScopeIds)
  companyScopeIds?: number[] // hasil resolveCompanyScope() — undefined=bypass, []=default deny, selainnya=IN-list
  filterDate: string     // YYYY-MM-DD
  activeMonths: number   // active_window_months dari business_config
  dormantMonths: number  // dormant_threshold_months.{type} dari business_config
  division: number | null // filter laporan (business_unit param, division_id — task012 v2) - beda dari divisionScope (RBAC)
  branchFilter: number | null // filter laporan (branch_id param) - beda dari branchScope (RBAC)
  excludeIntercompany?: boolean // toggle laporan - exclude division 'intercompany', lihat utils/scope.ts
  branchScope?: Map<number, number[]>   // RBAC — lihat docs-v2/task/task001.md §4
  divisionScope?: Map<number, number[]> // RBAC — lihat docs-v2/task/task001.md §4
  // Fallback division_id 'other'/'intercompany' per branch/company (task012 v2, resolusi
  // sekali per request — lihat utils/scope.ts loadDivisionFallbackIds/flattenFallbackByBranch)
  otherIdByBranch: Map<number, number>
  intercompanyIdByCompany: Map<number, number>
}

export function buildSegmentParams(
  companyId: number | 'all',
  filterDate: string,
  activeMonths: number,
  dormantMonths: number,
  otherIdByBranch: Map<number, number>,
  intercompanyIdByCompany: Map<number, number>,
  division?: number,
  branchScope?: Map<number, number[]>,
  divisionScope?: Map<number, number[]>,
  companyScopeIds?: number[],
  branchFilter?: number,
  excludeIntercompany?: boolean,
): SegmentParams {
  return {
    cid: companyId === 'all' ? 0 : companyId,
    companyScopeIds,
    filterDate,
    activeMonths,
    dormantMonths,
    division: division ?? null,
    branchFilter: branchFilter ?? null,
    excludeIntercompany,
    branchScope,
    divisionScope,
    otherIdByBranch,
    intercompanyIdByCompany,
  }
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
 * 'active' = new + active chip = semua yang last_invoice >= activeCutoff.
 * 'existing' = non-new, non-dormant (antara active_window dan dormant_threshold).
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
    // BUG (ditemukan 2026-08-10 lewat audit silang DormantRate vs Customer
    // Workbench — user: "aktif customer bulan Juni 357? di menu lain 329,
    // mana yang benar?"): case ini SATU-SATUNYA yang tidak exclude customer
    // baru (notNew), beda dari 'dormant'/'existing' di sekelilingnya —
    // akibatnya customer yang baru transaksi pertama kali (harusnya masuk
    // 'new') ikut ke-double-count sbg 'active' juga saat difilter
    // `?status=active`. Kolom status per-baris (sqlStatusExpr di atas) TIDAK
    // kena bug ini (CASE-nya cek 'new' duluan), cuma filter dropdown ini.
    case 'active':  return and(notNew, sql`${lastInv}::date >= ${activeCutoff}`)
    case 'existing':
      return and(
        notNew,
        sql`${lastInv}::date > ${dormantCutoff}`,
        sql`${lastInv}::date < ${activeCutoff}`,
      )
    default: return undefined
  }
}

// ─── CTE builders — dipakai dalam WITH clause query yang lebih besar ──────────

/**
 * CTE: established_customers
 * Universe KPI M3–M10 = Existing (task028: semua customer KECUALI New,
 * TERMASUK yang sudah dormant — bukan "active+existing exclude dormant"
 * lagi, lihat docstring SSOT di atas).
 * - division filter: (${p.division}::text IS NULL OR cd.division = ${p.division}::text)
 *   → saat division=null, filter jadi TRUE (global); saat division diisi, filter spesifik.
 * Dipakai sebagai denominator dan base join di metrics query.
 */
export function cteEstablishedCustomers(p: SegmentParams) {
  const branchCond = buildBranchConditionRaw('ix.company_id', 'ix.branch_id', p.branchScope)
  const branchCond0 = buildBranchConditionRaw('ix0.company_id', 'ix0.branch_id', p.branchScope)
  const divisionScopeCond = buildDivisionConditionRaw('ix.branch_id', 'cd.division_id', p.divisionScope, p.otherIdByBranch)
  const companyCondC = buildCompanyConditionRaw('c.company_id', p.cid, p.companyScopeIds)
  const companyCondIx0 = buildCompanyConditionRaw('ix0.company_id', p.cid, p.companyScopeIds)
  const companyCondIx = buildCompanyConditionRaw('ix.company_id', p.cid, p.companyScopeIds)
  const excludeIntercompanyCond = buildExcludeIntercompanyRaw('ix.company_id', 'COALESCE(c.division_override_id, cd.division_id)', p.intercompanyIdByCompany, p.excludeIntercompany)
  return sql`
    established_customers AS (
      SELECT DISTINCT c.id, c.customer_name, c.customer_code
      FROM customers c
      WHERE c.is_placeholder = false
        AND ${companyCondC}
        AND EXISTS (
          SELECT 1 FROM invoices ix0
          WHERE ix0.customer_id = c.id
            AND ix0.deleted_at IS NULL
            AND ix0.invoice_date < ${p.filterDate}::date - ${p.activeMonths}::int * INTERVAL '1 month'
            AND ${branchCond0}
            AND ${companyCondIx0}
        )
        -- task028: lower-bound dormantMonths DILEPAS (dulu ada syarat
        -- ix.invoice_date > filterDate minus dormantMonths, exclude customer
        -- dormant dari universe). Existing sekarang TERMASUK dormant —
        -- syarat tinggal "punya invoice apa pun s/d filterDate", scope sama.
        AND EXISTS (
          SELECT 1 FROM invoices ix
          LEFT JOIN channel_divisions cd
            ON cd.channel_name = ix.channel_name
            AND cd.company_id = ix.company_id
          WHERE ix.customer_id = c.id
            AND ix.deleted_at IS NULL
            AND ${companyCondIx}
            AND ix.invoice_date <= ${p.filterDate}::date
            AND (${p.division}::int IS NULL OR COALESCE(cd.division_id, (SELECT id FROM divisions WHERE company_id = ix.company_id AND key = 'other')) = ${p.division}::int)
            AND (${p.branchFilter}::int IS NULL OR ix.branch_id = ${p.branchFilter}::int)
            AND ${branchCond}
            AND ${divisionScopeCond}
            AND ${excludeIntercompanyCond}
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
