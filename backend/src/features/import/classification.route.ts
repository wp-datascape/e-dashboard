/**
 * features/import/classification.route.ts
 *
 * CRUD endpoints for Item Classification Rules.
 *
 * Endpoints:
 *   GET    /classification-rules          — List all rules
 *   POST   /classification-rules          — Create rule
 *   PUT    /classification-rules/:id      — Update rule
 *   DELETE /classification-rules/:id      — Delete rule
 */
import { Hono } from 'hono'
import {
  handleListRules,
  handleCreateRule,
  handleUpdateRule,
  handleDeleteRule,
  handleImportClassificationRules,
  handleDownloadClassificationTemplate,
} from './classification.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const classificationRoutes = new Hono()

// 20 mutasi per 5 menit per user (Task002 Task B, audit 2026-07-06)
const classificationMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

classificationRoutes.get('/', requirePermission('config.classification:view'), handleListRules)
classificationRoutes.get('/template', requirePermission('config.classification:view'), handleDownloadClassificationTemplate)
classificationRoutes.post('/', requirePermission('config.classification:create'), classificationMutationRateLimit, handleCreateRule)
classificationRoutes.post('/import', requirePermission('config.classification:create'), classificationMutationRateLimit, handleImportClassificationRules)
classificationRoutes.put('/:id', requirePermission('config.classification:update'), classificationMutationRateLimit, handleUpdateRule)
classificationRoutes.delete('/:id', requirePermission('config.classification:delete'), classificationMutationRateLimit, handleDeleteRule)