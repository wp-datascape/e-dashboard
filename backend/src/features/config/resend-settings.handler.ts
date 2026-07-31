import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody } from '@/utils/validator'
import { upsertResendSettingsSchema, sendTestEmailSchema } from './resend-settings.schema'
import { getResendSettingsForUI, saveResendSettings, sendTestEmail } from './resend-settings.service'

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
