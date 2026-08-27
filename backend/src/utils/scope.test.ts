import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import { invoices, channel_divisions } from '@/db/schema'
import {
  buildBranchCondition,
  buildDivisionCondition,
  buildBranchConditionRaw,
  buildDivisionConditionRaw,
  buildCompanyConditionRaw,
  buildExcludeIntercompanyCondition,
  buildExcludeIntercompanyRaw,
} from './scope'

const dialect = new PgDialect()
// SQL | undefined → { sql, params } | undefined, supaya gampang di-assert exact text-nya
function toQuery(condition: ReturnType<typeof buildBranchCondition>) {
  if (!condition) return undefined
  return dialect.sqlToQuery(condition)
}

describe('buildCompanyConditionRaw', () => {
  test('company spesifik (cid != 0) — filter langsung by cid, scopeIds diabaikan', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 5, undefined))
    expect(q.sql).toBe('i.company_id = $1')
    expect(q.params).toEqual([5])
  })

  test('cid=0 + scopeIds=undefined → bypass (superadmin), selalu true', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 0, undefined))
    expect(q.sql).toBe('true')
  })

  test('cid=0 + scopeIds=[] → default deny total, selalu false', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 0, []))
    expect(q.sql).toBe('false')
  })

  test('cid=0 + scopeIds=[1,3] → IN-list ke company yang jadi hak user', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 0, [1, 3]))
    expect(q.sql).toBe('i.company_id IN ($1, $2)')
    expect(q.params).toEqual([1, 3])
  })
})

describe('buildBranchConditionRaw', () => {
  test('scopeMap=undefined → bypass (superadmin), selalu true', () => {
    const q = dialect.sqlToQuery(buildBranchConditionRaw('i.company_id', 'i.branch_id', undefined))
    expect(q.sql).toBe('true')
  })

  test('scopeMap kosong → default deny total, selalu false', () => {
    const q = dialect.sqlToQuery(buildBranchConditionRaw('i.company_id', 'i.branch_id', new Map()))
    expect(q.sql).toBe('false')
  })

  test('1 company, multi branch', () => {
    const q = dialect.sqlToQuery(
      buildBranchConditionRaw('i.company_id', 'i.branch_id', new Map([[1, [10, 11]]])),
    )
    expect(q.sql).toBe('((i.company_id = $1 AND i.branch_id IN ($2, $3)))')
    expect(q.params).toEqual([1, 10, 11])
  })

  // Regresi (2026-07-23): tanpa outer parens, `AND ${cond}` yang di-embed di WHERE
  // clause repository raw-SQL memecah precedence AND/OR — clause OR di tengah lolos
  // tanpa filter company/branch/date lain sama sekali (data leak antar user scoped
  // multi-branch, ditemukan lewat laporan hasil M3 beda antara superadmin vs
  // marketing@holding.com untuk filter yang identik).
  test('multi-company beda scope — di-gabung OR dan DIBUNGKUS parens (precedence AND/OR di WHERE clause pemanggil)', () => {
    const q = dialect.sqlToQuery(
      buildBranchConditionRaw('i.company_id', 'i.branch_id', new Map([[1, [10, 11]], [2, [20]]])),
    )
    expect(q.sql).toBe('((i.company_id = $1 AND i.branch_id IN ($2, $3)) OR (i.company_id = $4 AND i.branch_id IN ($5)))')
    expect(q.params).toEqual([1, 10, 11, 2, 20])
  })
})

// Division sekarang FK integer per company (task012 v2) — division_id, bukan string
// key lagi. Fallback 'other'/'intercompany' di-resolve PER BRANCH/COMPANY (Map<id,
// fallbackId>), bukan literal string tunggal — lihat docs-v2/task/task012.md §2b.
describe('buildDivisionConditionRaw', () => {
  test('scopeMap=undefined → bypass', () => {
    const q = dialect.sqlToQuery(buildDivisionConditionRaw('i.branch_id', 'cd.division_id', undefined, undefined))
    expect(q.sql).toBe('true')
  })

  test('scopeMap kosong → default deny total', () => {
    const q = dialect.sqlToQuery(buildDivisionConditionRaw('i.branch_id', 'cd.division_id', new Map(), undefined))
    expect(q.sql).toBe('false')
  })

  test('1 branch, multi division — fallback other_id di-resolve dari otherIdByBranch', () => {
    const q = dialect.sqlToQuery(
      buildDivisionConditionRaw('i.branch_id', 'cd.division_id', new Map([[10, [1, 7]]]), new Map([[10, 7]])),
    )
    expect(q.sql).toBe('((i.branch_id = $1 AND coalesce(cd.division_id, 7) IN ($2, $3)))')
    expect(q.params).toEqual([10, 1, 7])
  })

  // Regresi (2026-07-06): channel_name yang tidak match rule apa pun di channel_divisions
  // menghasilkan division_id NULL - tanpa COALESCE, "NULL IN (...)" selalu UNKNOWN di SQL,
  // jadi baris itu TIDAK PERNAH lolos walau 'other' ada di daftar scope (ditemukan lewat
  // E2E test G4 - full-coverage user kehilangan 1 baris dibanding superadmin bypass).
  test('division_id NULL dianggap fallback "other" — COALESCE wajib ada di SQL yang dihasilkan', () => {
    const q = dialect.sqlToQuery(
      buildDivisionConditionRaw('i.branch_id', 'cd.division_id', new Map([[10, [7]]]), new Map([[10, 7]])),
    )
    expect(q.sql).toContain('coalesce(cd.division_id, 7)')
  })

  test('otherIdByBranch undefined utk branch tertentu → tanpa COALESCE sama sekali (defensif, bukan crash)', () => {
    const q = dialect.sqlToQuery(
      buildDivisionConditionRaw('i.branch_id', 'cd.division_id', new Map([[10, [1]]]), undefined),
    )
    expect(q.sql).toBe('((i.branch_id = $1 AND cd.division_id IN ($2)))')
    expect(q.params).toEqual([10, 1])
  })
})

describe('buildBranchCondition (Drizzle column-based)', () => {
  test('scopeMap=undefined → bypass, return undefined (tidak nambah WHERE clause)', () => {
    expect(buildBranchCondition(invoices.company_id, invoices.branch_id, undefined)).toBeUndefined()
  })

  test('scopeMap kosong → default deny total', () => {
    const q = toQuery(buildBranchCondition(invoices.company_id, invoices.branch_id, new Map()))
    expect(q?.sql).toBe('false')
  })

  test('multi-company beda scope', () => {
    const q = toQuery(
      buildBranchCondition(invoices.company_id, invoices.branch_id, new Map([[1, [10, 11]], [2, [20]]])),
    )
    expect(q?.sql).toBe(
      '(("invoices"."company_id" = $1 and "invoices"."branch_id" in ($2, $3)) or ("invoices"."company_id" = $4 and "invoices"."branch_id" in ($5)))',
    )
    expect(q?.params).toEqual([1, 10, 11, 2, 20])
  })
})

describe('buildDivisionCondition (Drizzle column-based)', () => {
  test('scopeMap=undefined → bypass, return undefined', () => {
    expect(buildDivisionCondition(invoices.branch_id, channel_divisions.division_id, undefined, undefined)).toBeUndefined()
  })

  test('scopeMap kosong → default deny total', () => {
    const q = toQuery(buildDivisionCondition(invoices.branch_id, channel_divisions.division_id, new Map(), undefined))
    expect(q?.sql).toBe('false')
  })

  test('otherIdByBranch undefined → COALESCE tetap dibangun dengan fallback NULL (no-op, sama efeknya tanpa fallback)', () => {
    const q = toQuery(buildDivisionCondition(invoices.branch_id, channel_divisions.division_id, new Map([[10, [1]]]), undefined))
    expect(q?.sql).toBe('("invoices"."branch_id" = $1 and coalesce("channel_divisions"."division_id", $2) in ($3))')
    expect(q?.params).toEqual([10, null, 1])
  })
})

describe('buildExcludeIntercompanyCondition (Drizzle column-based, company-keyed)', () => {
  test('toggle mati (undefined/false) → bypass, return undefined (tidak nambah WHERE clause)', () => {
    expect(buildExcludeIntercompanyCondition(invoices.company_id, channel_divisions.division_id, new Map([[1, 4]]), undefined)).toBeUndefined()
    expect(buildExcludeIntercompanyCondition(invoices.company_id, channel_divisions.division_id, new Map([[1, 4]]), false)).toBeUndefined()
  })

  test('intercompanyIdByCompany kosong/undefined → bypass, return undefined', () => {
    expect(buildExcludeIntercompanyCondition(invoices.company_id, channel_divisions.division_id, new Map(), true)).toBeUndefined()
    expect(buildExcludeIntercompanyCondition(invoices.company_id, channel_divisions.division_id, undefined, true)).toBeUndefined()
  })

  test('toggle nyala → division_id IS DISTINCT FROM intercompany id company itu, NULL tetap lolos (bukan intercompany)', () => {
    const q = toQuery(buildExcludeIntercompanyCondition(invoices.company_id, channel_divisions.division_id, new Map([[1, 4]]), true))
    expect(q?.sql).toBe('("invoices"."company_id" NOT IN ($1) or ("invoices"."company_id" = $2 and "channel_divisions"."division_id" IS DISTINCT FROM $3))')
    expect(q?.params).toEqual([1, 1, 4])
  })

  // Bug (2026-08-27, laporan user - toggle "Kecualikan Intercompany" bikin KNT nol
  // data total, bukan cuma nge-exclude baris intercompany) - company yang TIDAK
  // punya division 'intercompany' terdaftar (cuma company 1 yang punya di map ini)
  // HARUS tetap lolos tanpa syarat, bukan ikut ter-exclude krn tidak match klausa
  // OR mana pun.
  test('company TIDAK ada di intercompanyIdByCompany → lolos tanpa syarat (bug fix, dulu row-nya ke-exclude semua)', () => {
    // map cuma punya company 1 (MKO) - company 2 (KNT)/3 (SKI) HARUS tetap punya
    // jalur lolos (klausa "NOT IN"), bukan cuma bergantung ke klausa company 1 yang
    // tidak pernah match utk baris company lain.
    const q = toQuery(buildExcludeIntercompanyCondition(invoices.company_id, channel_divisions.division_id, new Map([[1, 4]]), true))
    expect(q?.sql).toContain('"invoices"."company_id" NOT IN ($1)')
    expect(q?.params?.[0]).toBe(1)
  })
})

describe('buildExcludeIntercompanyRaw (company-keyed)', () => {
  test('toggle mati (undefined/false) → bypass, selalu true', () => {
    expect(dialect.sqlToQuery(buildExcludeIntercompanyRaw('i.company_id', 'cd.division_id', new Map([[1, 4]]), undefined)).sql).toBe('true')
    expect(dialect.sqlToQuery(buildExcludeIntercompanyRaw('i.company_id', 'cd.division_id', new Map([[1, 4]]), false)).sql).toBe('true')
  })

  test('intercompanyIdByCompany kosong/undefined → bypass, selalu true', () => {
    expect(dialect.sqlToQuery(buildExcludeIntercompanyRaw('i.company_id', 'cd.division_id', new Map(), true)).sql).toBe('true')
    expect(dialect.sqlToQuery(buildExcludeIntercompanyRaw('i.company_id', 'cd.division_id', undefined, true)).sql).toBe('true')
  })

  test('toggle nyala → division_id IS DISTINCT FROM intercompany id company itu (NULL tetap lolos)', () => {
    const q = dialect.sqlToQuery(buildExcludeIntercompanyRaw('i.company_id', 'cd.division_id', new Map([[1, 4]]), true))
    expect(q.sql).toBe('(i.company_id NOT IN ($1) OR (i.company_id = $2 AND cd.division_id IS DISTINCT FROM $3))')
    expect(q.params).toEqual([1, 1, 4])
  })

  // Bug (2026-08-27) — pola sama persis versi Drizzle-column-based di atas.
  test('company TIDAK ada di intercompanyIdByCompany → lolos tanpa syarat (bug fix, dulu row-nya ke-exclude semua)', () => {
    const q = dialect.sqlToQuery(buildExcludeIntercompanyRaw('i.company_id', 'cd.division_id', new Map([[1, 4]]), true))
    expect(q.sql).toContain('i.company_id NOT IN ($1)')
    expect(q.params[0]).toBe(1)
  })
})
