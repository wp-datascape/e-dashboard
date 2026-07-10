/**
 * utils/scope.ts
 *
 * Query condition builder untuk isolasi data Branch/Division.
 * Mirror pola `scopeIds` + `inArray()` yang sudah dipakai untuk company scope,
 * tapi berjenjang (Company → Branch → Division).
 *
 * "Lainnya" (branch atau division) diperlakukan seperti value lain — TIDAK ada
 * logic/pengecualian khusus di sini (lihat task001.md §4.5, §4.6, revisi 2026-07-06).
 *
 * 2026-07-10: Division scope berubah dari string comparison (varchar code) menjadi
 * integer comparison (FK division_id) — lihat docs-v2/MEMORY.md untuk alasan.
 * scopeMap sekarang Map<number, number[]> (branch_id → division_id[]).
 * Tidak perlu lagi COALESCE workaround untuk NULL division.
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
 * SETELAH JOIN ke division_channels (division_id di-derive dari channel_name,
 * bukan kolom langsung di invoices — lihat task001.md §3.4, §3.5).
 *
 * scopeMap: hasil resolveDivisionScope() — undefined = bypass (superadmin),
 * Map kosong / branch tidak ada di key = default deny total untuk branch itu.
 *
 * 2026-07-10: Sekarang pakai integer division_id (FK ke branch_divisions),
 * bukan varchar division code — tidak perlu COALESCE.
 */
export function buildDivisionCondition(
  branchCol: AnyColumn,
  divisionIdCol: AnyColumn,
  scopeMap: Map<number, number[]> | undefined,
): SQL | undefined {
  if (!scopeMap) return undefined
  if (scopeMap.size === 0) return sql`false`
  const clauses = [...scopeMap.entries()].map(([branchId, divisionIds]) =>
    and(eq(branchCol, branchId), inArray(divisionIdCol, divisionIds)),
  )
  return or(...clauses)
}

/**
 * Varian raw-SQL dari buildBranchCondition/buildDivisionCondition — dipakai di
 * repository metrics yang query-nya raw `db.execute(sql\`...\`)` dengan table alias
 * (mis. `i` untuk invoices, `dc` untuk division_channels), bukan Drizzle query builder.
 * Logic sama persis, cuma beda cara referensi kolom (string alias, bukan objek Column).
 *
 * companyExpr/branchExpr/divisionIdExpr HARUS string literal trusted (nama kolom/alias
 * tetap dari kode, BUKAN dari input user) — dipakai lewat sql.raw(), tidak di-escape.
 *
 * Selalu return SQL valid (bukan undefined) supaya bisa langsung di-embed di WHERE
 * dengan `AND (${cond})` tanpa perlu cek undefined dulu.
 */
export function buildBranchConditionRaw(
  companyExpr: string,
  branchExpr: string,
  scopeMap: Map<number, number[]> | undefined,
): SQL {
  if (!scopeMap) return sql`true`
  if (scopeMap.size === 0) return sql`false`
  const clauses = [...scopeMap.entries()].map(
    ([companyId, branchIds]) =>
      sql`(${sql.raw(companyExpr)} = ${companyId} AND ${sql.raw(branchExpr)} IN (${sql.join(
        branchIds.map((id) => sql`${id}`),
        sql`, `,
      )}))`,
  )
  return sql.join(clauses, sql` OR `)
}

/**
 * Fix bug company-scope bypass (2026-07-06): pola lama `(${cid}::int = 0 OR x.company_id
 * = ${cid}::int)` di semua repository metrics SELALU true saat cid=0 ('all' companies),
 * tanpa pernah cross-check ke company yang benar-benar jadi hak user (scopeIds hasil
 * resolveCompanyScope() dulu dihitung tapi dibuang di handler, tidak pernah diteruskan).
 * Helper ini menggantikan pola itu:
 *   cid tetap dipakai untuk kasus company spesifik (query.company_id != 'all' — sudah
 *   divalidasi oleh resolveCompanyScope, throw 403 kalau tidak berhak, jadi aman filter
 *   langsung by cid tanpa cek scopeIds lagi)
 *   scopeIds dipakai untuk kasus company_id = 'all': undefined = bypass (superadmin),
 *   [] = default deny, selainnya = filter IN-list ke company yang jadi hak user
 */
export function buildCompanyConditionRaw(
  companyExpr: string,
  cid: number,
  scopeIds: number[] | undefined,
): SQL {
  if (cid !== 0) return sql`${sql.raw(companyExpr)} = ${cid}`
  if (!scopeIds) return sql`true`
  if (scopeIds.length === 0) return sql`false`
  return sql`${sql.raw(companyExpr)} IN (${sql.join(
    scopeIds.map((id) => sql`${id}`),
    sql`, `,
  )})`
}

/**
 * Varian raw-SQL untuk division scope — pakai integer division_id (FK),
 * bukan varchar division code. Tidak perlu COALESCE workaround.
 */
export function buildDivisionConditionRaw(
  branchExpr: string,
  divisionIdExpr: string,
  scopeMap: Map<number, number[]> | undefined,
): SQL {
  if (!scopeMap) return sql`true`
  if (scopeMap.size === 0) return sql`false`
  const clauses = [...scopeMap.entries()].map(
    ([branchId, divisionIds]) =>
      sql`(${sql.raw(branchExpr)} = ${branchId} AND ${sql.raw(divisionIdExpr)} IN (${sql.join(
        divisionIds.map((d) => sql`${d}`),
        sql`, `,
      )}))`,
  )
  return sql.join(clauses, sql` OR `)
}