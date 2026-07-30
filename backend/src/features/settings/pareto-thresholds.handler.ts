import type { Context } from 'hono'
import { success } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import {
  upsertParetoThresholdSchema,
  listParetoThresholdsQuerySchema,
  paretoThresholdIdParamSchema,
} from './pareto-thresholds.schema'
import {
  listParetoThresholds,
  upsertParetoThresholdService,
  removeParetoThresholdService,
} from './pareto-thresholds.service'

export async function handleListParetoThresholds(c: Context) {
  const query = validateQuery(c, listParetoThresholdsQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listParetoThresholds(scopeIds)
  return success(c, result)
}

export async function handleUpsertParetoThreshold(c: Context) {
  const body = await validateBody(c, upsertParetoThresholdSchema)
  const result = await upsertParetoThresholdService(body, c)
  return success(c, result)
}

export async function handleDeleteParetoThreshold(c: Context) {
  const { id } = validateParam(c, paretoThresholdIdParamSchema)
  await removeParetoThresholdService(id, c)
  return success(c, { id })
}
