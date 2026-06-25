import type { Context } from 'hono'
import { success } from '@/utils/response'
import { AppError, ErrorCode } from '@/utils/error'
import { logger } from '@/utils/logger'
import { validateBody, validateParam } from '@/utils/validator'
import { getConfigs, updateConfig } from './config.service'
import { configKeyParamSchema, updateConfigSchema } from './config.schema'
import { branchIdParamSchema, saveCredentialsSchema, testConnectionSchema } from './accurate.schema'
import { getCredentials, saveCredentials, testConnection } from './accurate.service'
import type { SaveCredentialsDto } from './accurate.schema'

export async function handleGetConfigs(c: Context) {
  try {
    const rows = await getConfigs()
    return success(c, rows)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch configs', 500)
  }
}

export async function handleUpdateConfig(c: Context) {
  try {
    const { key } = validateParam(c, configKeyParamSchema)
    const body = await validateBody(c, updateConfigSchema)
    const updated = await updateConfig(key, body, c)
    return success(c, updated)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to update config', 500)
  }
}

export async function handleGetAccurateCredentials(c: Context) {
  try {
    const { branchId } = validateParam(c, branchIdParamSchema)
    const credential = await getCredentials(branchId)
    return success(c, credential)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to fetch Accurate credentials', 500)
  }
}

export async function handleSaveAccurateCredentials(c: Context) {
  try {
    const { branchId } = validateParam(c, branchIdParamSchema)
    const body = await validateBody(c, saveCredentialsSchema)
    const credential = await saveCredentials(branchId, body as SaveCredentialsDto, c)
    return success(c, credential)
  } catch (err) {
    if (err instanceof AppError) throw err
    const requestId = c.req.header('x-request-id') ?? '-'
    logger.error('[config] Failed to save accurate credentials', {
      request_id: requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    })
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Failed to save Accurate credentials', 500)
  }
}

export async function handleTestAccurateConnection(c: Context) {
  try {
    const body = await validateBody(c, testConnectionSchema)
    const result = await testConnection(body.subdomain, body.api_token, body.signature_secret)
    return success(c, result)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.ACCURATE_API_ERROR, 'Failed to test Accurate connection', 502)
  }
}
