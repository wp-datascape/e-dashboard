import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateParam } from '@/utils/validator'
import { getConfigs, updateConfig } from './config.service'
import { configKeyParamSchema, updateConfigSchema } from './config.schema'
import { branchIdParamSchema, saveCredentialsSchema, testConnectionSchema } from './accurate.schema'
import { getCredentials, saveCredentials, testConnection } from './accurate.service'
import type { SaveCredentialsDto } from './accurate.schema'

export async function handleGetConfigs(c: Context) {
  const rows = await getConfigs()
  return success(c, rows)
}

export async function handleUpdateConfig(c: Context) {
  const { key } = validateParam(c, configKeyParamSchema)
  const body = await validateBody(c, updateConfigSchema)
  const updated = await updateConfig(key, body, c)
  return success(c, updated)
}

export async function handleGetAccurateCredentials(c: Context) {
  const { branchId } = validateParam(c, branchIdParamSchema)
  const credential = await getCredentials(branchId)
  return success(c, credential)
}

export async function handleSaveAccurateCredentials(c: Context) {
  const { branchId } = validateParam(c, branchIdParamSchema)
  const body = await validateBody(c, saveCredentialsSchema)
  const credential = await saveCredentials(branchId, body as SaveCredentialsDto, c)
  return success(c, credential)
}

export async function handleTestAccurateConnection(c: Context) {
  const body = await validateBody(c, testConnectionSchema)
  const result = await testConnection(body.subdomain, body.api_token, body.signature_secret)
  return success(c, result)
}
