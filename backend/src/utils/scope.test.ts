import { describe, expect, test } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import { invoices, channel_divisions } from '@/db/schema'
import {
  buildBranchCondition,
  buildDivisionCondition,
  buildBranchConditionRaw,
  buildDivisionConditionRaw,
  buildCompanyConditionRaw,
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
    expect(q.sql).toBe('(i.company_id = $1 AND i.branch_id IN ($2, $3))')
    expect(q.params).toEqual([1, 10, 11])
  })

  test('multi-company beda scope — di-gabung OR, company yg tidak di-assign otomatis tersaring', () => {
    const q = dialect.sqlToQuery(
      buildBranchConditionRaw('i.company_id', 'i.branch_id', new Map([[1, [10, 11]], [2, [20]]])),
    )
    expect(q.sql).toBe('(i.company_id = $1 AND i.branch_id IN ($2, $3)) OR (i.company_id = $4 AND i.branch_id IN ($5))')
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
    expect(q.sql).toBe('(i.branch_id = $1 AND cd.division IN ($2, $3))')
    expect(q.params).toEqual([10, 'distribution', 'other'])
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
