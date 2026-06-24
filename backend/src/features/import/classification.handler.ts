/**
 * features/import/classification.handler.ts
 *
 * Hono handlers for CRUD operations on item_classification_rules table.
 */
import type { Context } from 'hono'
import { success, noContent, error } from '@/utils/response'
import { ErrorCode } from '@/utils/error'
import { classificationRuleSchema, classificationRuleUpdateSchema, MATCH_TYPE_PRIORITY } from './import.schema'
import {
  findClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
} from './import.repository'

export async function handleListRules(c: Context) {
  const rawCompanyId = c.req.query('company_id')
  const companyId = rawCompanyId ? Number(rawCompanyId) : undefined
  const rules = await findClassificationRules(companyId)
  return success(c, rules)
}

export async function handleCreateRule(c: Context) {
  const body = await c.req.json()
  const parsed = classificationRuleSchema.safeParse(body)
  if (!parsed.success) {
    return error(c, ErrorCode.VALIDATION_ERROR, parsed.error.errors.map(e => e.message).join(', '), 400)
  }

  // Auto-assign priority based on match_type — user tidak perlu mikir angka
  const priority = MATCH_TYPE_PRIORITY[parsed.data.match_type] ?? 50

  const rule = await createClassificationRule({ ...parsed.data, priority })
  return success(c, rule, 'Rule created', 201)
}

export async function handleUpdateRule(c: Context) {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return error(c, ErrorCode.VALIDATION_ERROR, 'Invalid ID', 400)

  const body = await c.req.json()
  const parsed = classificationRuleUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return error(c, ErrorCode.VALIDATION_ERROR, parsed.error.errors.map(e => e.message).join(', '), 400)
  }
  const rule = await updateClassificationRule(id, parsed.data)
  if (!rule) return error(c, ErrorCode.NOT_FOUND, 'Rule not found', 404)
  return success(c, rule)
}

export async function handleDeleteRule(c: Context) {
  const id = Number(c.req.param('id'))
  if (isNaN(id)) return error(c, ErrorCode.VALIDATION_ERROR, 'Invalid ID', 400)

  await deleteClassificationRule(id)
  return noContent(c)
}