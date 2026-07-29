/**
 * utils/scope.ts
 *
 * Query condition builder untuk isolasi data Branch/Division.
 * Mirror pola `scopeIds` + `inArray()` yang sudah dipakai untuk company scope,
 * tapi berjenjang (Company → Branch → Division) — lihat docs-v2/task/task001.md §4.3.
 *
 * "Lainnya" (branch atau division) diperlakukan seperti value lain — TIDAK ada
 * logic/pengecualian khusus di sini (lihat task001.md §4.5, §4.6, revisi 2026-07-06).
 *
 * Division sekarang FK integer (task012 v2, docs-v2/task/task012.md) — dulu string
 * varchar ('distribution' dst), sekarang division_id merujuk ke tabel `divisions`
 * (per company). Konsekuensi: fallback "'other'"/"'intercompany'" yang dulu literal
 * string tunggal SEKARANG jadi row BEDA per company (id beda-beda) — makanya butuh
 * `loadDivisionFallbackIds()` di bawah, dipanggil SEKALI per request (bukan subquery
 * runtime per row), hasilnya di-pass sebagai Map ke buildDivisionCondition/
 * buildExcludeIntercompanyCondition.
 */

import { or, and, eq, inArray, sql, type SQL } from 'drizzle-orm'
import type { AnyColumn } from 'drizzle-orm'
import { db } from '@/config/db'
import { divisions } from '@/db/schema'

/**
 * Resolve division_id "fallback" (company-wide, `key='other'` atau `key='intercompany'`)
 * per company — dipakai buildDivisionCondition (branch-keyed) & buildExcludeIntercompanyCondition
 * (company-keyed) untuk COALESCE. SATU query kecil TANPA filter company (tabel `divisions`
 * sangat kecil, puluhan baris total — scan penuh jauh lebih murah daripada threading
 * "company mana saja yang relevan" ke tiap call site, apalagi utk superadmin/company_id='all'
 * yang scope company-nya sendiri belum tentu diketahui di titik ini).
 */
export async function loadDivisionFallbackIds(key: 'other' | 'intercompany'): Promise<Map<number, number>> {
  const rows = await db
    .select({ company_id: divisions.company_id, id: divisions.id })
    .from(divisions)
    .where(eq(divisions.key, key))
  return new Map(rows.map((r) => [r.company_id, r.id]))
}

/**
 * branchScope: hasil resolveBranchScope() (Map<company_id, branch_id[]>) — dipakai
 * "meratakan" fallback per-company (loadDivisionFallbackIds) jadi per-branch, karena
 * buildDivisionCondition butuh Map<branch_id, id> (division scope-nya branch-keyed).
 */
export function flattenFallbackByBranch(
  branchScope: Map<number, number[]> | undefined,
  fallbackByCompany: Map<number, number>,
): Map<number, number> {
  const result = new Map<number, number>()
  if (!branchScope) return result
  for (const [companyId, branchIds] of branchScope.entries()) {
    const fallbackId = fallbackByCompany.get(companyId)
    if (fallbackId == null) continue
    for (const branchId of branchIds) result.set(branchId, fallbackId)
  }
  return result
}

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
 * otherIdByBranch: hasil flattenFallbackByBranch(branchScope, loadDivisionFallbackIds(..., 'other')).
 */
export function buildDivisionCondition(
  branchCol: AnyColumn,
  divisionCol: AnyColumn,
  scopeMap: Map<number, number[]> | undefined,
  otherIdByBranch: Map<number, number> | undefined,
): SQL | undefined {
  if (!scopeMap) return undefined
  if (scopeMap.size === 0) return sql`false`
  // COALESCE ke division_id "other" MILIK COMPANY BRANCH INI — division_id NULL
  // (channel_name tidak match rule apa pun di channel_divisions) dianggap "Lainnya"
  // utk keperluan scope check (§4.5 task001.md). Fallback di-resolve PER BRANCH
  // (bukan literal tunggal lagi — tiap company punya row 'other' sendiri, id beda),
  // makanya COALESCE-nya juga dibuat per klausa branch, bukan sekali di luar loop.
  const clauses = [...scopeMap.entries()].map(([branchId, divisionIds]) => {
    // otherId undefined (harusnya tidak terjadi, 'other' selalu di-seed) → COALESCE(col, NULL)
    // = col, sama efeknya dengan tidak ada fallback sama sekali (defensif, bukan crash).
    const otherId = otherIdByBranch?.get(branchId) ?? null
    const divisionExpr = sql`coalesce(${divisionCol}, ${otherId})`
    return and(eq(branchCol, branchId), inArray(divisionExpr, divisionIds))
  })
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
  scopeMap: Map<number, number[]> | undefined,
  otherIdByBranch: Map<number, number> | undefined,
): SQL {
  if (!scopeMap) return sql`true`
  if (scopeMap.size === 0) return sql`false`
  // COALESCE ke division_id "other" per-branch — lihat penjelasan di buildDivisionCondition().
  const clauses = [...scopeMap.entries()].map(([branchId, divisionIds]) => {
    const otherId = otherIdByBranch?.get(branchId)
    const coalesced = otherId != null ? `coalesce(${divisionExpr}, ${otherId})` : divisionExpr
    return sql`(${sql.raw(branchExpr)} = ${branchId} AND ${sql.raw(coalesced)} IN (${sql.join(
      divisionIds.map((id) => sql`${id}`),
      sql`, `,
    )}))`
  })
  // Wrap dalam parens — lihat penjelasan di buildBranchConditionRaw() di atas. Bug ini
  // lebih sering kena di sini karena divisionScope map hampir selalu >1 entry (per branch).
  return sql`(${sql.join(clauses, sql` OR `)})`
}

/**
 * Filter REPORT (pilihan user di UI, BUKAN RBAC scope seperti fungsi-fungsi di atas) —
 * exclude division 'intercompany' dari hasil metrik. Dipakai utk transaksi antar-company
 * dalam 1 holding (mis. PT Mesin Kasir Online menjual ke PT Kode Niaga Tama - customer
 * "KODE NIAGA TAMA, PT" di company 1 sendiri, channel_divisions.division_id = id division
 * 'intercompany' company 1) yang bisa mendistorsi metrik performa eksternal kalau ikut
 * terhitung.
 *
 * BEDA dari buildDivisionCondition (branch-keyed, RBAC scope) — ini COMPANY-keyed karena
 * toggle ini berlaku UNIVERSAL (termasuk superadmin, tidak ada bypass), jadi tidak bisa
 * numpang di branchScope (undefined saat superadmin). companyCol = kolom company_id BARIS
 * yang difilter (mis. invoices.company_id), intercompanyIdByCompany = hasil
 * loadDivisionFallbackIds(companyIds, 'intercompany').
 *
 * excludeIntercompany falsy → bypass, semua division lolos (default, tidak ada perubahan
 * perilaku existing). true → division_id HARUS bukan id 'intercompany' company baris itu
 * (NULL/division lain tetap lolos — NULL berarti channel_name tidak match rule apa pun,
 * itu bukan intercompany, jadi tidak boleh ikut ke-exclude).
 *
 * divisionCol boleh kolom mentah (channel_divisions.division_id) ATAU SQL expression
 * (mis. COALESCE(customers.division_override_id, channel_divisions.division_id) — task013,
 * override customer representasi sister company menang atas mapping channel).
 */
export function buildExcludeIntercompanyCondition(
  companyCol: AnyColumn,
  divisionCol: AnyColumn | SQL,
  intercompanyIdByCompany: Map<number, number> | undefined,
  excludeIntercompany: boolean | undefined,
): SQL | undefined {
  if (!excludeIntercompany) return undefined
  if (!intercompanyIdByCompany || intercompanyIdByCompany.size === 0) return undefined
  const clauses = [...intercompanyIdByCompany.entries()].map(([companyId, intercompanyId]) =>
    // IS DISTINCT FROM (bukan ne/<>) - divisionCol bisa NULL saat channel_name tidak
    // match rule mapping apa pun (LEFT JOIN channel_divisions kosong). `<>` dengan NULL
    // selalu bernilai NULL/false di WHERE, jadi row NULL itu diam-diam ikut ter-exclude
    // padahal jelas bukan intercompany - kontradiksi komentar function ini sendiri.
    and(eq(companyCol, companyId), sql`${divisionCol} IS DISTINCT FROM ${intercompanyId}`),
  )
  // Company yang TIDAK punya row 'intercompany' sama sekali (harusnya tidak terjadi,
  // 'other'/division default selalu di-seed, tapi defensif) — tidak ada apa pun yang
  // di-exclude untuk company itu, biar tidak keliru exclude semua data.
  return or(...clauses)
}

/**
 * Varian raw-SQL dari buildExcludeIntercompanyCondition() — lihat penjelasan di atas.
 * companyExpr/divisionExpr HARUS string literal trusted (nama kolom/alias tetap dari
 * kode, BUKAN dari input user), sama seperti *Raw lain di file ini.
 *
 * Selalu return SQL valid (`true` kalau toggle mati) supaya bisa langsung di-embed di
 * WHERE dengan `AND (${cond})` tanpa perlu cek undefined dulu — konsisten dgn pola *Raw
 * lain di file ini (buildBranchConditionRaw/buildDivisionConditionRaw/buildCompanyConditionRaw).
 */
export function buildExcludeIntercompanyRaw(
  companyExpr: string,
  divisionExpr: string,
  intercompanyIdByCompany: Map<number, number> | undefined,
  excludeIntercompany: boolean | undefined,
): SQL {
  if (!excludeIntercompany) return sql`true`
  if (!intercompanyIdByCompany || intercompanyIdByCompany.size === 0) return sql`true`
  const clauses = [...intercompanyIdByCompany.entries()].map(
    ([companyId, intercompanyId]) =>
      sql`(${sql.raw(companyExpr)} = ${companyId} AND ${sql.raw(divisionExpr)} IS DISTINCT FROM ${intercompanyId})`,
  )
  return sql`(${sql.join(clauses, sql` OR `)})`
}
