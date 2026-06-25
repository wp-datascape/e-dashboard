import { Hono } from 'hono'
import { handleGetAuditLogs, handleGetAuditLogById } from './audit.handler'

export const auditRoutes = new Hono()

auditRoutes.get('/', handleGetAuditLogs)
auditRoutes.get('/:id', handleGetAuditLogById)
