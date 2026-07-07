import { eq, sql, inArray } from 'drizzle-orm'
import { db } from '@/config/db'
import { companies, company_branches } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { NewCompany } from '@/db/schema'

export async function findAllCompanies(companyIds?: number[]) {
  if (companyIds !== undefined && companyIds.length === 0) return []
  try {
    return await db
      .select({
        id: companies.id,
        code: companies.code,
        name: companies.name,
        created_at: companies.created_at,
        updated_at: companies.updated_at,
        branch_count: sql<number>`count(${company_branches.id})::int`,
      })
      .from(companies)
      .leftJoin(company_branches, eq(companies.id, company_branches.company_id))
      .where(companyIds ? inArray(companies.id, companyIds) : undefined)
      .groupBy(companies.id)
      .orderBy(companies.name)
  } catch (err) {
    handleDbError(err)
  }
}

export async function findCompanyById(id: number) {
  try {
    const [row] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function findCompanyByCode(code: string) {
  try {
    const [row] = await db
      .select()
      .from(companies)
      .where(eq(companies.code, code))
      .limit(1)
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function createCompany(data: Pick<NewCompany, 'code' | 'name'>) {
  try {
    const [row] = await db
      .insert(companies)
      .values(data)
      .returning()
    return row!
  } catch (err) {
    handleDbError(err)
  }
}

export async function updateCompany(id: number, data: Partial<Pick<NewCompany, 'code' | 'name'>>) {
  try {
    const [row] = await db
      .update(companies)
      .set({ ...data, updated_at: new Date() })
      .where(eq(companies.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function deleteCompany(id: number) {
  try {
    const [row] = await db
      .delete(companies)
      .where(eq(companies.id, id))
      .returning({ id: companies.id })
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}