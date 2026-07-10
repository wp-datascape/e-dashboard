import { and, eq, isNull, or } from 'drizzle-orm'
import { db } from '@/config/db'
import { branch_divisions, companies, company_branches } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { NewBranchDivision } from '@/db/schema'

export async function findDivisions(params: { companyId?: number; branchId?: number; isActive?: boolean }) {
  try {
    const conditions = []
    if (params.companyId !== undefined) conditions.push(eq(branch_divisions.company_id, params.companyId))
    if (params.branchId !== undefined) {
      conditions.push(or(eq(branch_divisions.branch_id, params.branchId), isNull(branch_divisions.branch_id))!)
    }
    if (params.isActive !== undefined) conditions.push(eq(branch_divisions.is_active, params.isActive))

    return await db
      .select({
        id: branch_divisions.id,
        company_id: branch_divisions.company_id,
        company_name: companies.name,
        branch_id: branch_divisions.branch_id,
        branch_name: company_branches.name,
        name: branch_divisions.name,
        code: branch_divisions.code,
        dormant_bucket: branch_divisions.dormant_bucket,
        is_active: branch_divisions.is_active,
        created_at: branch_divisions.created_at,
        updated_at: branch_divisions.updated_at,
      })
      .from(branch_divisions)
      .leftJoin(companies, eq(branch_divisions.company_id, companies.id))
      .leftJoin(company_branches, eq(branch_divisions.branch_id, company_branches.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(branch_divisions.company_id, branch_divisions.name)
  } catch (err) {
    handleDbError(err)
  }
}

export async function findDivisionById(id: number) {
  try {
    const [row] = await db.select().from(branch_divisions).where(eq(branch_divisions.id, id)).limit(1)
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function createDivision(data: NewBranchDivision) {
  try {
    const [row] = await db.insert(branch_divisions).values(data).returning()
    return row!
  } catch (err) {
    handleDbError(err)
  }
}

export async function updateDivision(id: number, data: Partial<NewBranchDivision>) {
  try {
    const [row] = await db
      .update(branch_divisions)
      .set({ ...data, updated_at: new Date() })
      .where(eq(branch_divisions.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function deactivateDivision(id: number) {
  try {
    const [row] = await db
      .update(branch_divisions)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(branch_divisions.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

/**
 * Kode divisi aktif yang berlaku untuk (company, branch) — union branch-specific
 * + company-wide (branch_id NULL).
 */
export async function findActiveDivisionCodesForScope(companyId: number, branchId: number | null): Promise<string[]> {
  try {
    const conditions = [eq(branch_divisions.company_id, companyId), eq(branch_divisions.is_active, true)]
    conditions.push(branchId !== null
      ? or(eq(branch_divisions.branch_id, branchId), isNull(branch_divisions.branch_id))!
      : isNull(branch_divisions.branch_id))

    const rows = await db.select({ code: branch_divisions.code }).from(branch_divisions).where(and(...conditions))
    return [...new Set(rows.map((r) => r.code))]
  } catch (err) {
    handleDbError(err)
  }
}

/**
 * Kode divisi aktif untuk dropdown filter — union SEMUA divisi company itu.
 */
export async function findDivisionCodesForFilter(companyId: number | 'all', branchId?: number): Promise<string[]> {
  try {
    const conditions = [eq(branch_divisions.is_active, true)]
    if (companyId !== 'all') conditions.push(eq(branch_divisions.company_id, companyId))
    if (branchId !== undefined) {
      conditions.push(or(eq(branch_divisions.branch_id, branchId), isNull(branch_divisions.branch_id))!)
    }

    const rows = await db.select({ code: branch_divisions.code }).from(branch_divisions).where(and(...conditions))
    return [...new Set(rows.map((r) => r.code))]
  } catch (err) {
    handleDbError(err)
  }
}

/**
 * dormant_bucket untuk 1 kode divisi tertentu di scope (company, branch).
 */
export async function findDormantBucket(companyId: number, branchId: number | null, code: string): Promise<string | null> {
  try {
    const conditions = [
      eq(branch_divisions.company_id, companyId),
      eq(branch_divisions.code, code),
      eq(branch_divisions.is_active, true),
    ]
    conditions.push(branchId !== null
      ? or(eq(branch_divisions.branch_id, branchId), isNull(branch_divisions.branch_id))!
      : isNull(branch_divisions.branch_id))

    const rows = await db
      .select({ branch_id: branch_divisions.branch_id, dormant_bucket: branch_divisions.dormant_bucket })
      .from(branch_divisions)
      .where(and(...conditions))

    if (rows.length === 0) return null
    const specific = rows.find((r) => r.branch_id !== null)
    return (specific ?? rows[0])!.dormant_bucket
  } catch (err) {
    handleDbError(err)
  }
}