import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody } from '@/utils/validator'
import { upsertResendSettingsSchema, sendTestEmailSchema, sendTestDigestEmailSchema } from './resend-settings.schema'
import { getResendSettingsForUI, saveResendSettings, sendTestEmail, sendTestDigestEmail } from './resend-settings.service'
import { computeManualDigestItems } from '@/features/analisis/scheduler'

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
  // Hitung SEMUA customer Kritis (live, data real dari DB) di sini — bukan di
  // resend-settings.service.ts — supaya tidak circular import (lihat komentar
  // sendTestDigestEmail di resend-settings.service.ts).
  const previewItems = await computeManualDigestItems(body.period_type, body.end_date)
  const result = await sendTestDigestEmail(body.to, previewItems)
  return success(c, result)
}
