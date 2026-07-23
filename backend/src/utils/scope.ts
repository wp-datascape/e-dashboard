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

import { or, and, eq, ne, isNull, inArray, sql, type SQL } from 'drizzle-orm'
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
  // COALESCE ke 'other' — division NULL (channel_name tidak match rule apa pun di
  // channel_divisions) dianggap "Lainnya" utk keperluan scope check (§4.5). Tanpa ini,
  // `inArray(divisionCol, [...])` gagal diam-diam utk baris NULL walau 'other' ada di
  // daftar scope — semantik SQL: NULL IN (...) selalu UNKNOWN, bukan match ke 'other'.
  const divisionExpr = sql`coalesce(${divisionCol}, 'other')`
  const clauses = [...scopeMap.entries()].map(([branchId, divisions]) =>
    and(eq(branchCol, branchId), inArray(divisionExpr, divisions)),
  )
  return or(...clauses)
}

/**
 * Varian raw-SQL dari buildBranchCondition/buildDivisionCondition — dipakai di
 * repository metrics yang query-nya raw `db.execute(sql\`...\`)` dengan table alias
 * (mis. `i` untuk invoices, `cd` untuk channel_divisions), bukan Drizzle query builder.
 * Logic sama persis, cuma beda cara referensi kolom (string alias, bukan objek Column).
 *
 * companyExpr/branchExpr/divisionExpr HARUS string literal trusted (nama kolom/alias
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
  // Wrap dalam parens: hasil ini di-embed via `AND ${cond}` di WHERE clause raw SQL
  // repository. Tanpa parens, `A OR B OR C` (>1 clause) memecah precedence AND/OR —
  // kondisi AND sebelum/sesudahnya cuma nempel ke clause pertama/terakhir, clause
  // tengah jadi lolos TANPA filter company/branch/date lain sama sekali (data leak,
  // ditemukan 2026-07-23 lewat laporan user: hasil M3 beda antara superadmin vs user
  // scoped multi-branch untuk filter yang identik).
  return sql`(${sql.join(clauses, sql` OR `)})`
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

export function buildDivisionConditionRaw(
  branchExpr: string,
  divisionExpr: string,
  scopeMap: Map<number, string[]> | undefined,
): SQL {
  if (!scopeMap) return sql`true`
  if (scopeMap.size === 0) return sql`false`
  // COALESCE ke 'other' — lihat penjelasan di buildDivisionCondition() di atas.
  const clauses = [...scopeMap.entries()].map(
    ([branchId, divisions]) =>
      sql`(${sql.raw(branchExpr)} = ${branchId} AND coalesce(${sql.raw(divisionExpr)}, 'other') IN (${sql.join(
        divisions.map((d) => sql`${d}`),
        sql`, `,
      )}))`,
  )
  // Wrap dalam parens — lihat penjelasan di buildBranchConditionRaw() di atas. Bug ini
  // lebih sering kena di sini karena divisionScope map hampir selalu >1 entry (per branch).
  return sql`(${sql.join(clauses, sql` OR `)})`
}

/**
 * Filter REPORT (pilihan user di UI, BUKAN RBAC scope seperti fungsi-fungsi di atas) —
 * exclude division 'intercompany' dari hasil metrik. Dipakai utk transaksi antar-company
 * dalam 1 holding (mis. PT Mesin Kasir Online menjual ke PT Kode Niaga Tama - customer
 * "KODE NIAGA TAMA, PT" di company 1 sendiri, channel_divisions.division = 'intercompany')
 * yang bisa mendistorsi metrik performa eksternal kalau ikut terhitung.
 *
 * excludeIntercompany falsy → bypass, semua division lolos (default, tidak ada perubahan
 * perilaku existing). true → division HARUS bukan 'intercompany' (NULL/division lain tetap
 * lolos — mirror pola COALESCE ke 'other' di buildDivisionCondition/-Raw: NULL berarti
 * channel_name tidak match rule apa pun, itu bukan intercompany, jadi tidak boleh ikut
 * ke-exclude).
 *
 * Return SQL|undefined (bukan SQL|undefined vs selalu-SQL seperti *Raw) — dipakai lewat
 * Drizzle `and(...)` yang otomatis skip argumen undefined, konsisten dgn buildBranchCondition/
 * buildDivisionCondition di atas.
 */
export function buildExcludeIntercompanyCondition(
  divisionCol: AnyColumn,
  excludeIntercompany: boolean | undefined,
): SQL | undefined {
  if (!excludeIntercompany) return undefined
  return or(isNull(divisionCol), ne(divisionCol, 'intercompany'))
}

/**
 * Varian raw-SQL dari buildExcludeIntercompanyCondition() — lihat penjelasan di atas.
 * divisionExpr HARUS string literal trusted (nama kolom/alias tetap dari kode, BUKAN
 * dari input user), sama seperti *Raw lain di file ini.
 *
 * Selalu return SQL valid (`true` kalau toggle mati) supaya bisa langsung di-embed di
 * WHERE dengan `AND (${cond})` tanpa perlu cek undefined dulu — konsisten dgn pola *Raw
 * lain di file ini (buildBranchConditionRaw/buildDivisionConditionRaw/buildCompanyConditionRaw).
 */
export function buildExcludeIntercompanyRaw(
  divisionExpr: string,
  excludeIntercompany: boolean | undefined,
): SQL {
  if (!excludeIntercompany) return sql`true`
  return sql`coalesce(${sql.raw(divisionExpr)}, 'other') != 'intercompany'`
}
