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
import { handleListRules, handleCreateRule, handleUpdateRule, handleDeleteRule } from './classification.handler'
import { requirePermission } from '@/middleware/permission'

export const classificationRoutes = new Hono()

classificationRoutes.get('/', requirePermission('config.classification:view'), handleListRules)
classificationRoutes.post('/', requirePermission('config.classification:create'), handleCreateRule)
classificationRoutes.put('/:id', requirePermission('config.classification:update'), handleUpdateRule)
classificationRoutes.delete('/:id', requirePermission('config.classification:delete'), handleDeleteRule)