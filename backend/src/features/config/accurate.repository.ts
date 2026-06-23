import { eq } from 'drizzle-orm'
import { db } from '@/config/db'
import { accurate_credentials } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { NewAccurateCredential } from '@/db/schema/accurate_credentials'

export async function findCredentialsByBranchId(branchId: number) {
  try {
    const [row] = await db
      .select()
      .from(accurate_credentials)
      .where(eq(accurate_credentials.branch_id, branchId))
      .limit(1)
    return row ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function upsertCredentials(
  branchId: number,
  data: Partial<NewAccurateCredential>,
) {
  try {
    const [row] = await db
      .insert(accurate_credentials)
      .values({ ...data, branch_id: branchId } as NewAccurateCredential)
      .onConflictDoUpdate({
        target: accurate_credentials.branch_id,
        set: { ...data, updated_at: new Date() },
      })
      .returning()
    return row!
  } catch (err) {
    handleDbError(err)
  }
}