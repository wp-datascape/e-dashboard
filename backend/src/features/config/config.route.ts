import { Hono } from 'hono'
import { success, noContent } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import { getConfigs, updateConfig } from './config.service'
import { configKeyParamSchema, updateConfigSchema } from './config.schema'

export const configRoutes = new Hono()

// GET /config
configRoutes.get('/', async (c) => {
  const rows = await getConfigs()
  return success(c, rows)
})

// PUT /config/:key
configRoutes.put('/:key', async (c) => {
  const { key } = validateParam(c, configKeyParamSchema)
  const body = await validateBody(c, updateConfigSchema)
  const updated = await updateConfig(key, body, c)
  return success(c, updated)
})