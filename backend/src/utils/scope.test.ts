/**
 * Tests untuk utils/scope.ts — buildDivisionConditionRaw, buildDivisionCondition,
 * buildBranchConditionRaw, dll.
 *
 * 2026-07-10: Division scope berubah menjadi integer division_id (FK),
 * bukan varchar division code. Tidak perlu lagi test COALESCE workaround.
 */

import { describe, test, expect } from 'bun:test'
import { PgDialect } from 'drizzle-orm/pg-core'
import { invoices, division_channels } from '@/db/schema'

const dialect = new PgDialect()
import {
  buildBranchConditionRaw,
  buildDivisionConditionRaw,
  buildCompanyConditionRaw,
  buildBranchCondition,
  buildDivisionCondition,
} from './scope'

const toQuery = (sql: ReturnType<typeof buildDivisionCondition>) => {
  if (!sql) return null
  return dialect.sqlToQuery(sql)
}

describe('buildDivisionConditionRaw', () => {
  test('scopeMap=undefined → bypass', () => {
    const q = dialect.sqlToQuery(buildDivisionConditionRaw('i.branch_id', 'dc.division_id', undefined))
    expect(q.sql).toBe('true')
  })

  test('scopeMap kosong → default deny total', () => {
    const q = dialect.sqlToQuery(buildDivisionConditionRaw('i.branch_id', 'dc.division_id', new Map()))
    expect(q.sql).toBe('false')
  })

  test('1 branch, multi division_id', () => {
    const q = dialect.sqlToQuery(
      buildDivisionConditionRaw('i.branch_id', 'dc.division_id', new Map([[10, [1, 2]]])),
    )
    expect(q.sql).toBe("(i.branch_id = $1 AND dc.division_id IN ($2, $3))")
    expect(q.params).toEqual([10, 1, 2])
  })

  test('multi branch, multi division_id', () => {
    const q = dialect.sqlToQuery(
      buildDivisionConditionRaw('i.branch_id', 'dc.division_id', new Map([
        [10, [1, 2]],
        [20, [3, 4, 5]],
      ])),
    )
    expect(q.sql).toContain('i.branch_id = $1 AND dc.division_id IN ($2, $3)')
    expect(q.sql).toContain('i.branch_id = $4 AND dc.division_id IN ($5, $6, $7)')
  })
})

describe('buildDivisionCondition', () => {
  test('scopeMap=undefined → bypass, return undefined', () => {
    expect(buildDivisionCondition(invoices.branch_id, division_channels.division_id, undefined)).toBeUndefined()
  })

  test('scopeMap kosong → default deny total', () => {
    const q = toQuery(buildDivisionCondition(invoices.branch_id, division_channels.division_id, new Map()))
    expect(q?.sql).toBe('false')
  })

  test('multi branch, multi division_id', () => {
    const q = toQuery(buildDivisionCondition(
      invoices.branch_id,
      division_channels.division_id,
      new Map([[10, [1, 2]]]),
    ))
    expect(q?.sql).toContain('"invoices"."branch_id"')
    expect(q?.sql).toContain('"division_channels"."division_id"')
    expect(q?.params).toEqual([10, 1, 2])
  })
})

describe('buildBranchConditionRaw', () => {
  test('bypass', () => {
    const q = dialect.sqlToQuery(buildBranchConditionRaw('i.company_id', 'i.branch_id', undefined))
    expect(q.sql).toBe('true')
  })

  test('default deny', () => {
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

  test('multi company, multi branch', () => {
    const q = dialect.sqlToQuery(
      buildBranchConditionRaw('i.company_id', 'i.branch_id', new Map([
        [1, [10, 11]],
        [2, [20]],
      ])),
    )
    expect(q.sql).toBe('(i.company_id = $1 AND i.branch_id IN ($2, $3)) OR (i.company_id = $4 AND i.branch_id IN ($5))')
    expect(q.params).toEqual([1, 10, 11, 2, 20])
  })
})

describe('buildCompanyConditionRaw', () => {
  test('cid=0, scopeIds=undefined → bypass total (superadmin)', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 0, undefined))
    expect(q.sql).toBe('true')
  })

  test('cid=0, scopeIds=[] → default deny total', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 0, []))
    expect(q.sql).toBe('false')
  })

  test('cid=0, scopeIds=[1, 2] → filter IN', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 0, [1, 2]))
    expect(q.sql).toBe('i.company_id IN ($1, $2)')
    expect(q.params).toEqual([1, 2])
  })

  test('cid=5 → filter langsung', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 5, undefined))
    expect(q.sql).toBe('i.company_id = $1')
    expect(q.params).toEqual([5])
  })

  test('cid=5, scopeIds diabaikan (tidak dipakai karena cid spesifik)', () => {
    const q = dialect.sqlToQuery(buildCompanyConditionRaw('i.company_id', 5, [1, 2]))
    expect(q.sql).toBe('i.company_id = $1')
    expect(q.params).toEqual([5])
  })
})