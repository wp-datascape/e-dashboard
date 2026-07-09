import { and, eq, isNull, or } from 'drizzle-orm'
import { db } from '@/config/db'
import { divisions, companies, company_branches } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { NewDivision } from '@/db/schema'

export async function findDivisions(params: { companyId?: number; branchId?: number; isActive?: boolean }) {
  try {
    const conditions = []
    if (params.companyId !== undefined) conditions.push(eq(divisions.company_id, params.companyId))
    if (params.branchId !== undefined) {
      conditions.push(or(eq(divisions.branch_id, params.branchId), isNull(divisions.branch_id))!)
    }
    if (params.isActive !== undefined) conditions.push(eq(divisions.is_active, params.isActive))

    return await db
      .select({
        id: divisions.id,
        company_id: divisions.company_id,
        company_name: companies.name,
        branch_id: divisions.branch_id,
        branch_name: company_branches.name,
        name: divisions.name,
        code: divisions.code,
        dormant_bucket: divisions.dormant_bucket,
        is_active: divisions.is_active,
        created_at: divisions.created_at,
        updated_at: divisions.updated_at,
      })
      .from(divisions)
      .leftJoin(companies, eq(divisions.company_id, companies.id))
      .leftJoin(company_branches, eq(divisions.branch_id, company_branches.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(divisions.company_id, divisions.name)
  } catch (err) {
    handleDbError(err)
  }
}

export async function findDivisionById(id: number) {
  try {
    const [row] = await db.select().from(divisions).where(eq(divisions.id, id)).limit(1)
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function createDivision(data: NewDivision) {
  try {
    const [row] = await db.insert(divisions).values(data).returning()
    return row!
  } catch (err) {
    handleDbError(err)
  }
}

export async function updateDivision(id: number, data: Partial<NewDivision>) {
  try {
    const [row] = await db
      .update(divisions)
      .set({ ...data, updated_at: new Date() })
      .where(eq(divisions.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

/**
 * Soft delete — divisions adalah master data yang direferensikan RBAC
 * (user_divisions) dan histori (channel_divisions), hard delete bisa
 * mengorbankan grant yang sudah ada tanpa disadari.
 */
export async function deactivateDivision(id: number) {
  try {
    const [row] = await db
      .update(divisions)
      .set({ is_active: false, updated_at: new Date() })
      .where(eq(divisions.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

/**
 * Kode divisi aktif yang berlaku untuk (company, branch) — union branch-specific
 * + company-wide (branch_id NULL). Dipakai validasi dinamis (pengganti enum
 * hardcode) dan getMyScopeTree() isFullDivisionAccess.
 */
export async function findActiveDivisionCodesForScope(companyId: number, branchId: number | null): Promise<string[]> {
  try {
    const conditions = [eq(divisions.company_id, companyId), eq(divisions.is_active, true)]
    conditions.push(branchId !== null
      ? or(eq(divisions.branch_id, branchId), isNull(divisions.branch_id))!
      : isNull(divisions.branch_id))

    const rows = await db.select({ code: divisions.code }).from(divisions).where(and(...conditions))
    return [...new Set(rows.map((r) => r.code))]
  } catch (err) {
    handleDbError(err)
  }
}

/**
 * Kode divisi aktif untuk dropdown filter (task005) — beda semantik dari
 * findActiveDivisionCodesForScope di atas (branchId=null di situ artinya
 * "cuma company-wide", dipakai validasi create/update). Di sini kalau branchId
 * TIDAK diisi (undefined, bukan null), artinya "belum ada branch dipilih di
 * dropdown" -> union SEMUA divisi company itu (semua branch + company-wide).
 * companyId 'all' -> union lintas semua company.
 */
export async function findDivisionCodesForFilter(companyId: number | 'all', branchId?: number): Promise<string[]> {
  try {
    const conditions = [eq(divisions.is_active, true)]
    if (companyId !== 'all') conditions.push(eq(divisions.company_id, companyId))
    if (branchId !== undefined) {
      conditions.push(or(eq(divisions.branch_id, branchId), isNull(divisions.branch_id))!)
    }

    const rows = await db.select({ code: divisions.code }).from(divisions).where(and(...conditions))
    return [...new Set(rows.map((r) => r.code))]
  } catch (err) {
    handleDbError(err)
  }
}

/**
 * dormant_bucket untuk 1 kode divisi tertentu di scope (company, branch) —
 * branch-specific menang kalau ada, fallback ke company-wide. Dipakai threshold.ts.
 */
export async function findDormantBucket(companyId: number, branchId: number | null, code: string): Promise<string | null> {
  try {
    const conditions = [
      eq(divisions.company_id, companyId),
      eq(divisions.code, code),
      eq(divisions.is_active, true),
    ]
    conditions.push(branchId !== null
      ? or(eq(divisions.branch_id, branchId), isNull(divisions.branch_id))!
      : isNull(divisions.branch_id))

    const rows = await db
      .select({ branch_id: divisions.branch_id, dormant_bucket: divisions.dormant_bucket })
      .from(divisions)
      .where(and(...conditions))

    if (rows.length === 0) return null
    const specific = rows.find((r) => r.branch_id !== null)
    return (specific ?? rows[0])!.dormant_bucket
  } catch (err) {
    handleDbError(err)
  }
}
