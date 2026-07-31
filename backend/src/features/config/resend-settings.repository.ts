import { eq } from 'drizzle-orm'
import { db } from '@/config/db'
import { resend_settings } from '@/db/schema'
import type { ResendSetting } from '@/db/schema'

// Singleton — 1 row GLOBAL (bukan per-company, lihat komentar schema).
// Selalu ambil row PERTAMA yang ada (kalau belum pernah di-save, null).
export async function findResendSettings(): Promise<ResendSetting | null> {
  const [row] = await db.select().from(resend_settings).limit(1)
  return row ?? null
}

export async function upsertResendSettings(data: Partial<ResendSetting>): Promise<ResendSetting> {
  const existing = await findResendSettings()
  if (existing) {
    const [row] = await db
      .update(resend_settings)
      .set({ ...data, updated_at: new Date() })
      .where(eq(resend_settings.id, existing.id))
      .returning()
    return row!
  }
  const [row] = await db.insert(resend_settings).values(data).returning()
  return row!
}
