import { Hono } from 'hono'
import { handleGetAnalisis, handleGetRetentionAnalisis } from './analisis.handler'
import { requirePermission } from '@/middleware/permission'

export const analisisRoutes = new Hono()

analisisRoutes.get('/', requirePermission('analisis:view'), handleGetAnalisis)
analisisRoutes.get('/retention', requirePermission('analisis.retention:view'), handleGetRetentionAnalisis)
