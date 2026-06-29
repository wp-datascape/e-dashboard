import { Hono } from 'hono'
import { handleGetAuditLogs, handleGetAuditLogById } from './audit.handler'
import { requirePermission } from '@/middleware/permission'

export const auditRoutes = new Hono()

auditRoutes.get('/', requirePermission('audit.log:view'), handleGetAuditLogs)
auditRoutes.get('/:id', requirePermission('audit.log:view'), handleGetAuditLogById)
