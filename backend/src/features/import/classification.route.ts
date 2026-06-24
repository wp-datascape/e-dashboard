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

export const classificationRoutes = new Hono()

classificationRoutes.get('/', handleListRules)
classificationRoutes.post('/', handleCreateRule)
classificationRoutes.put('/:id', handleUpdateRule)
classificationRoutes.delete('/:id', handleDeleteRule)