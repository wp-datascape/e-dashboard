/**
 * utils/scope.ts
 *
 * Query condition builder untuk isolasi data Branch/Division.
 * Mirror pola `scopeIds` + `inArray()` yang sudah dipakai untuk company scope,
 * tapi berjenjang (Company → Branch → Division) — lihat docs-v2/task/task001.md §4.3.
 *
 * "Lainnya" (branch atau division) diperlakukan seperti value lain — TIDAK ada
 * logic/pengecualian khusus di sini (lihat task001.md §4.5, §4.6, revisi 2026-07-06).
 */

import { or, and, eq, inArray, sql, type SQL } from 'drizzle-orm'
import type { AnyColumn } from 'drizzle-orm'

/**
 * Filter branch — di-scope per company_id (level 1 dari hierarki).
 *
 * scopeMap: hasil resolveBranchScope() — undefined = bypass (superadmin),
 * Map kosong / company tidak ada di key = default deny total untuk company itu.
 */
export function buildBranchCondition(
  companyCol: AnyColumn,
  branchCol: AnyColumn,
  scopeMap: Map<number, number[]> | undefined,
): SQL | undefined {
  if (!scopeMap) return undefined
  if (scopeMap.size === 0) return sql`false`
  const clauses = [...scopeMap.entries()].map(([companyId, branchIds]) =>
    and(eq(companyCol, companyId), inArray(branchCol, branchIds)),
  )
  return or(...clauses)
}

/**
 * Filter division — di-scope per branch_id (level 2 dari hierarki), dipakai
 * SETELAH JOIN ke channel_divisions (division di-derive dari channel_name, bukan
 * kolom langsung di invoices — lihat task001.md §3.4, §3.5).
 *
 * scopeMap: hasil resolveDivisionScope() — undefined = bypass (superadmin),
 * Map kosong / branch tidak ada di key = default deny total untuk branch itu.
 */
export function buildDivisionCondition(
  branchCol: AnyColumn,
  divisionCol: AnyColumn,
  scopeMap: Map<number, string[]> | undefined,
): SQL | undefined {
  if (!scopeMap) return undefined
  if (scopeMap.size === 0) return sql`false`
  const clauses = [...scopeMap.entries()].map(([branchId, divisions]) =>
    and(eq(branchCol, branchId), inArray(divisionCol, divisions)),
  )
  return or(...clauses)
}
