import type { Context } from 'hono'
import { success, noContent } from '@/utils/response'
import { validateBody, validateParam, validateQuery } from '@/utils/validator'
import { z } from 'zod'
import { classificationRuleSchema, classificationRuleUpdateSchema } from './import.schema'
import {
  listClassificationRules,
  createClassificationRuleService,
  updateClassificationRuleService,
  deleteClassificationRuleService,
} from './classification.service'

const ruleIdParamSchema = z.object({ id: z.coerce.number().int().positive() })
const companyIdQuerySchema = z.object({ company_id: z.coerce.number().int().positive().optional() })

export async function handleListRules(c: Context) {
  const { company_id } = validateQuery(c, companyIdQuerySchema)
  const rules = await listClassificationRules(company_id)
  return success(c, rules)
}

export async function handleCreateRule(c: Context) {
  const body = await validateBody(c, classificationRuleSchema)
  const rule = await createClassificationRuleService(body, c)
  return success(c, rule, 'Rule created', 201)
}

export async function handleUpdateRule(c: Context) {
  const { id } = validateParam(c, ruleIdParamSchema)
  const body = await validateBody(c, classificationRuleUpdateSchema)
  const rule = await updateClassificationRuleService(id, body, c)
  return success(c, rule)
}

export async function handleDeleteRule(c: Context) {
  const { id } = validateParam(c, ruleIdParamSchema)
  await deleteClassificationRuleService(id, c)
  return noContent(c)
}
