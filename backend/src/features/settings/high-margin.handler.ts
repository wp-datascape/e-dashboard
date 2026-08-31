import type { Context } from 'hono'
import { success, error } from '@/utils/response'
import { validateBody, validateQuery, validateParam } from '@/utils/validator'
import { resolveCompanyScope } from '@/middleware/auth'
import { ErrorCode } from '@/utils/error'
import {
  createHighMarginSchema,
  updateHighMarginSchema,
  listHighMarginQuerySchema,
  highMarginIdParamSchema,
  highMarginImportTemplateQuerySchema,
  highMarginImportCommitSchema,
} from './high-margin.schema'
import {
  listHighMargins,
  addHighMargin,
  editHighMargin,
  deactivateHighMargin,
  removeHighMargin,
} from './high-margin.service'
import {
  getHighMarginImportTemplate,
  previewHighMarginImport,
  commitHighMarginImport,
} from './high-margin-import.service'

export async function handleListHighMargins(c: Context) {
  const query = validateQuery(c, listHighMarginQuerySchema)
  const scopeIds = resolveCompanyScope(c, query.company_id)
  const result = await listHighMargins({ ...query, active_only: query.active_only ?? false }, scopeIds)
  return success(c, result)
}

export async function handleCreateHighMargin(c: Context) {
  const body = await validateBody(c, createHighMarginSchema)
  resolveCompanyScope(c, body.company_id) // throw 403 kalau company di luar akses user
  const userId = Number(c.req.header('x-user-id') ?? 1)
  const result = await addHighMargin(body, userId, c)
  return success(c, result, 'Created', 201)
}

export async function handleUpdateHighMargin(c: Context) {
  const { id } = validateParam(c, highMarginIdParamSchema)
  const body = await validateBody(c, updateHighMarginSchema)
  const result = await editHighMargin(id, body, c)
  return success(c, result)
}

export async function handleDeactivateHighMargin(c: Context) {
  const { id } = validateParam(c, highMarginIdParamSchema)
  const result = await deactivateHighMargin(id, c)
  return success(c, result)
}

export async function handleDeleteHighMargin(c: Context) {
  const { id } = validateParam(c, highMarginIdParamSchema)
  await removeHighMargin(id, c)
  return success(c, { id })
}

// ─── Bulk Import (task036, 2026-08-31) ─────────────────────────────────────

export async function handleHighMarginImportTemplate(c: Context) {
  const { company_id } = validateQuery(c, highMarginImportTemplateQuerySchema)
  resolveCompanyScope(c, company_id) // throw 403 kalau company di luar akses user
  const buffer = await getHighMarginImportTemplate(company_id)
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': 'attachment; filename="high_margin_import_template.xlsx"',
    },
  })
}

export async function handlePreviewHighMarginImport(c: Context) {
  const formData = await c.req.formData()
  const file = formData.get('file') as File | null
  const companyIdRaw = formData.get('company_id')

  if (!file) return error(c, ErrorCode.VALIDATION_ERROR, 'File wajib diupload', 400)
  if (!companyIdRaw) return error(c, ErrorCode.VALIDATION_ERROR, 'company_id wajib diisi', 400)

  const companyId = Number(companyIdRaw)
  if (!Number.isInteger(companyId) || companyId <= 0) return error(c, ErrorCode.VALIDATION_ERROR, 'company_id tidak valid', 400)
  resolveCompanyScope(c, companyId) // throw 403 kalau company di luar akses user

  if (file.size > 5 * 1024 * 1024) return error(c, ErrorCode.FILE_TOO_LARGE, 'File terlalu besar (max 5MB)', 413)

  const isXlsx = file.name.endsWith('.xlsx')
  const isCsv = file.name.endsWith('.csv')
  if (!isXlsx && !isCsv) return error(c, ErrorCode.INVALID_FILE_FORMAT, 'Hanya file .xlsx atau .csv yang diterima', 400)

  const buffer = Buffer.from(await file.arrayBuffer())
  const result = await previewHighMarginImport(buffer, isXlsx, companyId)
  return success(c, result)
}

export async function handleCommitHighMarginImport(c: Context) {
  const body = await validateBody(c, highMarginImportCommitSchema)
  resolveCompanyScope(c, body.company_id) // throw 403 kalau company di luar akses user
  const userId = c.var.user.userId
  const result = await commitHighMarginImport(body, userId, c)
  return success(c, result, `Import selesai: ${result.added} ditambahkan${result.superseded > 0 ? `, ${result.superseded} mapping lama dinonaktifkan` : ''}`)
}
