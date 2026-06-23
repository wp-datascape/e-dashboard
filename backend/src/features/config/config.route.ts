import { Hono } from 'hono'
import { logger } from '@/utils/logger'
import { success } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import { getConfigs, updateConfig } from './config.service'
import { configKeyParamSchema, updateConfigSchema } from './config.schema'
import { branchIdParamSchema, saveCredentialsSchema, testConnectionSchema } from './accurate.schema'
import { getCredentials, saveCredentials, testConnection } from './accurate.service'
import type { SaveCredentialsDto } from './accurate.schema'

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

// ─── Accurate Credentials ──────────────────────────────────────────────────────

// GET /config/accurate/credentials/:branchId
configRoutes.get('/accurate/credentials/:branchId', async (c) => {
  const { branchId } = validateParam(c, branchIdParamSchema)
  const credential = await getCredentials(branchId)
  return success(c, credential)
})

// PUT /config/accurate/credentials/:branchId
configRoutes.put('/accurate/credentials/:branchId', async (c) => {
  try {
    const { branchId } = validateParam(c, branchIdParamSchema)
    const body = await validateBody(c, saveCredentialsSchema)
    const credential = await saveCredentials(branchId, body as SaveCredentialsDto, c)
    return success(c, credential)
  } catch (err) {
    const requestId = c.req.header('x-request-id') ?? '-'
    // Hanya log ke file jika bukan AppError 4xx (validation / not found)
    // AppError 4xx adalah operational error yang expected, tidak perlu dicatat ke file error
    const { AppError } = await import('@/errors/AppError')
    const is4xxAppError = err instanceof AppError && err.statusCode < 500
    if (!is4xxAppError) {
      logger.error('[config] Failed to save accurate credentials', {
        request_id: requestId,
        error: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      })
    }
    throw err
  }
})

// POST /config/accurate/test-connection
configRoutes.post('/accurate/test-connection', async (c) => {
  const body = await validateBody(c, testConnectionSchema)
  const result = await testConnection(body.subdomain, body.api_token, body.signature_secret)
  return success(c, result)
})
