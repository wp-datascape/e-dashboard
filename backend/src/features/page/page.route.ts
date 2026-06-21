import { Hono } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import {
  getAllPageSettings,
  updatePageSettingService,
} from './page.service'
import { updatePageSettingSchema, pageKeyParamSchema } from './page.schema'

export const pageRoutes = new Hono()

// GET /page-settings — list all page settings
pageRoutes.get('/', async (c) => {
  const results = await getAllPageSettings()
  return success(c, results)
})

// PUT /page-settings/:pageKey — update page readiness flag
pageRoutes.put('/:pageKey', async (c) => {
  const { pageKey } = validateParam(c, pageKeyParamSchema)
  const body = await validateBody(c, updatePageSettingSchema)

  const result = await updatePageSettingService(pageKey, body, c)
  return success(c, result)
})