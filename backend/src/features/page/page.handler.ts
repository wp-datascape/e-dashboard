import type { Context } from 'hono'
import { success } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { validateBody, validateParam } from '@/utils/validator'
import { getAllPageSettings, updatePageSettingService } from './page.service'
import { updatePageSettingSchema, pageKeyParamSchema } from './page.schema'

export async function handleGetPageSettings(c: Context) {
  try {
    const results = await getAllPageSettings()
    return success(c, results)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch page settings', 500)
  }
}

export async function handleUpdatePageSetting(c: Context) {
  try {
    const { pageKey } = validateParam(c, pageKeyParamSchema)
    const body = await validateBody(c, updatePageSettingSchema)
    const result = await updatePageSettingService(pageKey, body, c)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update page setting', 500)
  }
}
