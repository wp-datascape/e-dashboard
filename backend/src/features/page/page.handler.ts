import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import { getAllPageSettings, updatePageSettingService } from './page.service'
import { updatePageSettingSchema, pageKeyParamSchema } from './page.schema'

export async function handleGetPageSettings(c: Context) {
  const results = await getAllPageSettings()
  return success(c, results)
}

export async function handleUpdatePageSetting(c: Context) {
  const { pageKey } = validateParam(c, pageKeyParamSchema)
  const body = await validateBody(c, updatePageSettingSchema)
  const result = await updatePageSettingService(pageKey, body, c)
  return success(c, result)
}
