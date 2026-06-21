import { db } from '@/config/db'
import { businessConfigs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { AppError, ErrorCode } from '@/errors'

export async function findAllConfigs() {
  return db
    .select({
      key: businessConfigs.key,
      value: businessConfigs.value,
      description: businessConfigs.description,
    })
    .from(businessConfigs)
    .orderBy(businessConfigs.key)
}

export async function findConfigByKey(key: string) {
  const [row] = await db
    .select({
      key: businessConfigs.key,
      value: businessConfigs.value,
      description: businessConfigs.description,
    })
    .from(businessConfigs)
    .where(eq(businessConfigs.key, key))
    .limit(1)
  return row ?? null
}

export async function updateConfigValue(key: string, value: string) {
  const [row] = await db
    .update(businessConfigs)
    .set({ value, updatedAt: new Date() })
    .where(eq(businessConfigs.key, key))
    .returning({
      key: businessConfigs.key,
      value: businessConfigs.value,
      description: businessConfigs.description,
    })
  if (!row) throw new AppError(ErrorCode.NOT_FOUND, `Config "${key}" not found`)
  return row
}