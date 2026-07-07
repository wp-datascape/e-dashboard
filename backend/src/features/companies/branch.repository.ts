import { eq, and } from 'drizzle-orm'
import { db } from '@/config/db'
import { company_branches } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { NewCompanyBranch } from '@/db/schema'

export async function findBranchesByCompanyId(companyId: number) {
  try {
    return await db
      .select()
      .from(company_branches)
      .where(eq(company_branches.company_id, companyId))
      .orderBy(company_branches.name)
  } catch (err) {
    handleDbError(err)
  }
}

export async function findBranchById(id: number) {
  try {
    const [row] = await db
      .select()
      .from(company_branches)
      .where(eq(company_branches.id, id))
      .limit(1)
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function createBranch(data: NewCompanyBranch) {
  try {
    const [row] = await db
      .insert(company_branches)
      .values(data)
      .returning()
    return row!
  } catch (err) {
    handleDbError(err)
  }
}

export async function updateBranch(id: number, data: Partial<NewCompanyBranch>) {
  try {
    const [row] = await db
      .update(company_branches)
      .set({ ...data, updated_at: new Date() })
      .where(eq(company_branches.id, id))
      .returning()
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function deleteBranch(id: number) {
  try {
    const [row] = await db
      .delete(company_branches)
      .where(eq(company_branches.id, id))
      .returning({ id: company_branches.id })
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}