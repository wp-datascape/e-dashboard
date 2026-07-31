import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody } from '@/utils/validator'
import { upsertResendSettingsSchema, sendTestEmailSchema, sendTestDigestEmailSchema } from './resend-settings.schema'
import { getResendSettingsForUI, saveResendSettings, sendTestEmail, sendTestDigestEmail } from './resend-settings.service'
import { previewCurrentDigestItems, type DigestPreviewFilter } from '@/features/analisis/scheduler'
import type { PeriodType } from '@/features/analisis/period.util'

// Peta 1 dropdown "trigger" simulasi (frontend) -> filter (period_type, checkpoint)
// scheduler.ts — 'all' = undefined (gabungan semua, perilaku lama).
function resolveTriggerFilter(trigger: string): DigestPreviewFilter | undefined {
  if (trigger === 'all') return undefined
  if (trigger === 'mid_month') return { periodType: 'monthly', checkpoint: 'mid_month' }
  return { periodType: trigger as PeriodType, checkpoint: 'closed' }
}

export async function handleGetResendSettings(c: Context) {
  const result = await getResendSettingsForUI()
  return success(c, result)
}

export async function handleSaveResendSettings(c: Context) {
  const body = await validateBody(c, upsertResendSettingsSchema)
  const result = await saveResendSettings(body, c)
  return success(c, result)
}

export async function handleSendTestEmail(c: Context) {
  const body = await validateBody(c, sendTestEmailSchema)
  const result = await sendTestEmail(body.to)
  return success(c, result)
}

export async function handleSendTestDigestEmail(c: Context) {
  const body = await validateBody(c, sendTestDigestEmailSchema)
  // Hitung SEMUA customer Kritis SEKARANG (live dari analisis/scheduler.ts, lintas
  // company) di sini — bukan di resend-settings.service.ts — supaya tidak circular
  // import (lihat komentar sendTestDigestEmail di resend-settings.service.ts).
  const previewItems = await previewCurrentDigestItems(resolveTriggerFilter(body.trigger))
  const result = await sendTestDigestEmail(body.to, previewItems)
  return success(c, result)
}
