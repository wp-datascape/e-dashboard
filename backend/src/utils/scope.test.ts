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

describe('buildDivisionConditionRaw', () => {
  test('scopeMap=undefined → bypass', () => {
    const q = dialect.sqlToQuery(buildDivisionConditionRaw('i.branch_id', 'cd.division', undefined))
    expect(q.sql).toBe('true')
  })

  test('scopeMap kosong → default deny total', () => {
    const q = dialect.sqlToQuery(buildDivisionConditionRaw('i.branch_id', 'cd.division', new Map()))
    expect(q.sql).toBe('false')
  })

  test('1 branch, multi division', () => {
    const q = dialect.sqlToQuery(
      buildDivisionConditionRaw('i.branch_id', 'cd.division', new Map([[10, ['distribution', 'other']]])),
    )
    expect(q.sql).toBe("((i.branch_id = $1 AND coalesce(cd.division, 'other') IN ($2, $3)))")
    expect(q.params).toEqual([10, 'distribution', 'other'])
  })

  // Regresi (2026-07-06): channel_name yang tidak match rule apa pun di channel_divisions
  // menghasilkan division NULL - tanpa COALESCE, "NULL IN (...)" selalu UNKNOWN di SQL,
  // jadi baris itu TIDAK PERNAH lolos walau 'other' ada di daftar scope (ditemukan lewat
  // E2E test G4 - full-coverage user kehilangan 1 baris dibanding superadmin bypass).
  test('division NULL dianggap "other" — COALESCE wajib ada di SQL yang dihasilkan', () => {
    const q = dialect.sqlToQuery(
      buildDivisionConditionRaw('i.branch_id', 'cd.division', new Map([[10, ['other']]])),
    )
    expect(q.sql).toContain("coalesce(cd.division, 'other')")
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
    expect(buildDivisionCondition(invoices.branch_id, channel_divisions.division, undefined)).toBeUndefined()
  })

  test('scopeMap kosong → default deny total', () => {
    const q = toQuery(buildDivisionCondition(invoices.branch_id, channel_divisions.division, new Map()))
    expect(q?.sql).toBe('false')
  })
})

describe('buildExcludeIntercompanyCondition (Drizzle column-based)', () => {
  test('toggle mati (undefined/false) → bypass, return undefined (tidak nambah WHERE clause)', () => {
    expect(buildExcludeIntercompanyCondition(channel_divisions.division, undefined)).toBeUndefined()
    expect(buildExcludeIntercompanyCondition(channel_divisions.division, false)).toBeUndefined()
  })

  test('toggle nyala → division != intercompany, NULL tetap lolos (bukan intercompany)', () => {
    const q = toQuery(buildExcludeIntercompanyCondition(channel_divisions.division, true))
    expect(q?.sql).toBe('("channel_divisions"."division" is null or "channel_divisions"."division" <> $1)')
    expect(q?.params).toEqual(['intercompany'])
  })
})

describe('buildExcludeIntercompanyRaw', () => {
  test('toggle mati (undefined/false) → bypass, selalu true', () => {
    expect(dialect.sqlToQuery(buildExcludeIntercompanyRaw('cd.division', undefined)).sql).toBe('true')
    expect(dialect.sqlToQuery(buildExcludeIntercompanyRaw('cd.division', false)).sql).toBe('true')
  })

  test('toggle nyala → division != intercompany, NULL dianggap "other" (bukan intercompany, tetap lolos)', () => {
    const q = dialect.sqlToQuery(buildExcludeIntercompanyRaw('cd.division', true))
    expect(q.sql).toBe(`coalesce(cd.division, 'other') != 'intercompany'`)
  })
})
