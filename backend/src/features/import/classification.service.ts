import type { Context } from 'hono'
import { AppError, ErrorCode } from '@/utils/error'
import { logAudit } from '@/utils/audit'
import {
  findClassificationRules,
  createClassificationRule,
  updateClassificationRule,
  deleteClassificationRule,
} from './import.repository'
import { MATCH_TYPE_PRIORITY } from './import.schema'
import type { z } from 'zod'
import type { classificationRuleSchema, classificationRuleUpdateSchema } from './import.schema'

type CreateRuleDto = z.infer<typeof classificationRuleSchema>
type UpdateRuleDto = z.infer<typeof classificationRuleUpdateSchema>

export async function listClassificationRules(companyId?: number) {
  try {
    return await findClassificationRules(companyId)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengambil daftar rules', 500)
  }
}

export async function createClassificationRuleService(data: CreateRuleDto, ctx: Context) {
  try {
    const priority = MATCH_TYPE_PRIORITY[data.match_type] ?? 50
    const rule = await createClassificationRule({ ...data, priority })

    await logAudit(ctx, {
      action: 'classification_rule.create',
      entity: 'item_classification_rules',
      entityId: rule!.id,
      companyId: data.company_id ?? null,
      newValue: { ...data, priority },
    })

    return rule
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat rule', 500)
  }
}

export async function updateClassificationRuleService(id: number, data: UpdateRuleDto, ctx: Context) {
  try {
    const rule = await updateClassificationRule(id, data)
    if (!rule) throw new AppError(ErrorCode.NOT_FOUND, 'Rule tidak ditemukan', 404)

    await logAudit(ctx, {
      action: 'classification_rule.update',
      entity: 'item_classification_rules',
      entityId: id,
      companyId: rule.company_id ?? null,
      oldValue: data,
    })

    return rule
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate rule', 500)
  }
}

export async function deleteClassificationRuleService(id: number, ctx: Context) {
  try {
    await deleteClassificationRule(id)

    await logAudit(ctx, {
      action: 'classification_rule.delete',
      entity: 'item_classification_rules',
      entityId: id,
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus rule', 500)
  }
}
