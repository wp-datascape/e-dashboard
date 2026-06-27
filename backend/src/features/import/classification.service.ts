import { AppError, ErrorCode } from '@/utils/error'
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

export async function createClassificationRuleService(data: CreateRuleDto) {
  try {
    const priority = MATCH_TYPE_PRIORITY[data.match_type] ?? 50
    return await createClassificationRule({ ...data, priority })
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal membuat rule', 500)
  }
}

export async function updateClassificationRuleService(id: number, data: UpdateRuleDto) {
  try {
    const rule = await updateClassificationRule(id, data)
    if (!rule) throw new AppError(ErrorCode.NOT_FOUND, 'Rule tidak ditemukan', 404)
    return rule
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal mengupdate rule', 500)
  }
}

export async function deleteClassificationRuleService(id: number) {
  try {
    await deleteClassificationRule(id)
  } catch (err) {
    if (err instanceof AppError) throw err
    throw new AppError(ErrorCode.INTERNAL_ERROR, 'Gagal menghapus rule', 500)
  }
}
