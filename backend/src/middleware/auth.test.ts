import { describe, expect, test } from 'bun:test'
import type { Context } from 'hono'
import { AppError } from '@/errors'
import { resolveCompanyScope, resolveBranchScope, resolveDivisionScope } from './auth'

interface FakeUser {
  isSuperAdmin: boolean
  companyIds: number[]
  branchScopes: { company_id: number; branch_id: number }[]
  divisionScopes: { branch_id: number; division: string }[]
}

function ctx(user: FakeUser): Context {
  return { var: { user } } as unknown as Context
}

describe('resolveCompanyScope', () => {
  test('superadmin + "all" → bypass (undefined)', () => {
    const c = ctx({ isSuperAdmin: true, companyIds: [], branchScopes: [], divisionScopes: [] })
    expect(resolveCompanyScope(c, 'all')).toBeUndefined()
  })

  test('superadmin + company spesifik → [companyId], tanpa perlu ada di companyIds', () => {
    const c = ctx({ isSuperAdmin: true, companyIds: [], branchScopes: [], divisionScopes: [] })
    expect(resolveCompanyScope(c, 99)).toEqual([99])
  })

  test('non-superadmin + "all" → companyIds miliknya (bisa kosong = default deny)', () => {
    const c = ctx({ isSuperAdmin: false, companyIds: [1, 3], branchScopes: [], divisionScopes: [] })
    expect(resolveCompanyScope(c, 'all')).toEqual([1, 3])

    const cEmpty = ctx({ isSuperAdmin: false, companyIds: [], branchScopes: [], divisionScopes: [] })
    expect(resolveCompanyScope(cEmpty, 'all')).toEqual([])
  })

  test('non-superadmin + company yang jadi haknya → [companyId]', () => {
    const c = ctx({ isSuperAdmin: false, companyIds: [1, 3], branchScopes: [], divisionScopes: [] })
    expect(resolveCompanyScope(c, 1)).toEqual([1])
  })

  test('non-superadmin + company yang BUKAN haknya → throw FORBIDDEN', () => {
    const c = ctx({ isSuperAdmin: false, companyIds: [1, 3], branchScopes: [], divisionScopes: [] })
    expect(() => resolveCompanyScope(c, 2)).toThrow(AppError)
  })
})

describe('resolveBranchScope', () => {
  test('superadmin → bypass (undefined)', () => {
    const c = ctx({ isSuperAdmin: true, companyIds: [], branchScopes: [], divisionScopes: [] })
    expect(resolveBranchScope(c, undefined)).toBeUndefined()
  })

  test('non-superadmin tanpa branch assignment sama sekali → Map kosong (default deny total)', () => {
    const c = ctx({ isSuperAdmin: false, companyIds: [1], branchScopes: [], divisionScopes: [] })
    expect(resolveBranchScope(c, [1])).toEqual(new Map())
  })

  test('multi-company beda scope — dikelompokkan per company_id', () => {
    const c = ctx({
      isSuperAdmin: false,
      companyIds: [1, 3],
      branchScopes: [
        { company_id: 1, branch_id: 10 },
        { company_id: 1, branch_id: 11 },
      ],
      divisionScopes: [],
    })
    // company 3 ada di companyScopeIds tapi tidak punya branch assignment sama sekali
    // → default deny total utk company 3 (tidak muncul di Map), sesuai §4.4
    expect(resolveBranchScope(c, [1, 3])).toEqual(new Map([[1, [10, 11]]]))
  })

  test('branch di company yang tersaring companyScopeIds ikut tersaring', () => {
    const c = ctx({
      isSuperAdmin: false,
      companyIds: [1, 2],
      branchScopes: [
        { company_id: 1, branch_id: 10 },
        { company_id: 2, branch_id: 20 },
      ],
      divisionScopes: [],
    })
    // company_id=2 di-request spesifik (companyScopeIds=[1]) → branch company 2 ikut hilang
    expect(resolveBranchScope(c, [1])).toEqual(new Map([[1, [10]]]))
  })
})

describe('resolveDivisionScope', () => {
  test('superadmin → bypass (undefined)', () => {
    const c = ctx({ isSuperAdmin: true, companyIds: [], branchScopes: [], divisionScopes: [] })
    expect(resolveDivisionScope(c, undefined)).toBeUndefined()
  })

  test('non-superadmin tanpa division assignment sama sekali → Map kosong', () => {
    const c = ctx({ isSuperAdmin: false, companyIds: [1], branchScopes: [], divisionScopes: [] })
    const branchScope = new Map([[1, [10]]])
    expect(resolveDivisionScope(c, branchScope)).toEqual(new Map())
  })

  test('§4.4: branch yang diizinkan tapi tidak punya division assignment → default deny berjenjang', () => {
    const c = ctx({
      isSuperAdmin: false,
      companyIds: [1],
      branchScopes: [],
      divisionScopes: [
        { branch_id: 10, division: 'distribution' },
        { branch_id: 10, division: 'project' },
      ],
    })
    // branchScope hasil resolveBranchScope: company 1 -> branch [10, 11]
    const branchScope = new Map([[1, [10, 11]]])
    // branch 11 tidak muncul di divisionScope sama sekali → child dianggap kosong, bukan "tidak dibatasi"
    expect(resolveDivisionScope(c, branchScope)).toEqual(new Map([[10, ['distribution', 'project']]]))
  })

  test('division utk branch yang TIDAK ada di branchScope diabaikan (branch sendiri sudah default-deny)', () => {
    const c = ctx({
      isSuperAdmin: false,
      companyIds: [1],
      branchScopes: [],
      divisionScopes: [{ branch_id: 99, division: 'distribution' }],
    })
    const branchScope = new Map([[1, [10]]]) // branch 99 bukan bagian dari branchScope user
    expect(resolveDivisionScope(c, branchScope)).toEqual(new Map())
  })

  test('branchScope bypass (undefined, dari superadmin di layer atas) tapi dipanggil oleh non-superadmin → tetap Map kosong kalau tidak ada divisionScopes', () => {
    const c = ctx({ isSuperAdmin: false, companyIds: [1], branchScopes: [], divisionScopes: [] })
    expect(resolveDivisionScope(c, undefined)).toEqual(new Map())
  })
})
