import { eq } from 'drizzle-orm'
import { db } from '@/config/db'
import { pageSettings } from '@/db/schema'
import { handleDbError } from '@/utils/dbError'
import type { UpdatePageSettingDto } from './page.schema'

export async function findAllPageSettings() {
  try {
    const results = await db
      .select()
      .from(pageSettings)
      .orderBy(pageSettings.pageKey)

    return results
  } catch (err) {
    handleDbError(err)
  }
}

export async function findPageSettingByKey(pageKey: string) {
  try {
    const [result] = await db
      .select()
      .from(pageSettings)
      .where(eq(pageSettings.pageKey, pageKey))
      .limit(1)

    return result ?? null
  } catch (err) {
    handleDbError(err)
  }
}

export async function updatePageSetting(
  pageKey: string,
  data: UpdatePageSettingDto,
) {
  try {
    const [result] = await db
      .update(pageSettings)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(pageSettings.pageKey, pageKey))
      .returning()

    return result ?? null
  } catch (err) {
    handleDbError(err)
  }
}