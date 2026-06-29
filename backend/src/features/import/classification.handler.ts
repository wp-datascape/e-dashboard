import type { Context } from 'hono'
import { success, noContent, error } from '@/utils/response'
import { validateBody, validateParam, validateQuery } from '@/utils/validator'
import { ErrorCode } from '@/utils/error'
import { z } from 'zod'
import { classificationRuleSchema, classificationRuleUpdateSchema } from './import.schema'
import {
  listClassificationRules,
  createClassificationRuleService,
  updateClassificationRuleService,
  deleteClassificationRuleService,
  importClassificationRulesService,
  getClassificationRulesTemplate,
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

export async function handleImportClassificationRules(c: Context) {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const companyIdRaw = formData.get('company_id')

  if (!file) return error(c, ErrorCode.VALIDATION_ERROR, 'File wajib diupload', 400)
  if (!companyIdRaw) return error(c, ErrorCode.VALIDATION_ERROR, 'company_id wajib diisi', 400)

  const companyId = Number(companyIdRaw)
  if (!Number.isInteger(companyId) || companyId <= 0) return error(c, ErrorCode.VALIDATION_ERROR, 'company_id tidak valid', 400)

  if (file.size > 5 * 1024 * 1024) return error(c, ErrorCode.FILE_TOO_LARGE, 'File terlalu besar (max 5MB)', 413)

  const isXlsx = file.name.endsWith('.xlsx')
  const isCsv = file.name.endsWith('.csv')
  if (!isXlsx && !isCsv) return error(c, ErrorCode.INVALID_FILE_FORMAT, 'Hanya file .xlsx atau .csv yang diterima', 400)

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await importClassificationRulesService(buffer, isXlsx, companyId, c)
  return success(c, result, `Import selesai: ${result.added} ditambahkan, ${result.skipped} di-skip`)
}

export async function handleDownloadClassificationTemplate(_c: Context) {
  return new Response(getClassificationRulesTemplate(), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="classification_rules_template.xlsx"',
    },
  })
}
