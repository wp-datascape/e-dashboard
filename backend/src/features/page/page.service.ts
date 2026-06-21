import { AppError, ErrorCode } from '@/errors'
import { logger } from '@/utils/logger'
import { logAudit } from '@/utils/audit'
import {
  findAllPageSettings,
  findPageSettingByKey,
  updatePageSetting,
} from './page.repository'
import type { UpdatePageSettingDto } from './page.schema'
import type { Context } from 'hono'

export async function getAllPageSettings() {
  return findAllPageSettings()
}

export async function getPageSettingByKey(pageKey: string) {
  const result = await findPageSettingByKey(pageKey)
  if (!result) {
    throw new AppError(ErrorCode.NOT_FOUND, 'Page not found', 404)
  }
  return result
}

export async function updatePageSettingService(
  pageKey: string,
  dto: UpdatePageSettingDto,
  ctx: Context,
) {
  // Verify page exists
  await getPageSettingByKey(pageKey)

  // Update
  const result = await updatePageSetting(pageKey, dto)

  logger.info('[page] Page setting updated', { pageKey })

  // Audit
  await logAudit(ctx, {
    action: 'page_setting.update',
    entity: 'page_settings',
    entityId: pageKey,
    companyId: null,
    meta: { changes: dto },
  })

  return result
}