import { Hono } from 'hono'
import { handleGetAnalisis } from './analisis.handler'
import { requirePermission } from '@/middleware/permission'

export const analisisRoutes = new Hono()

analisisRoutes.get('/', requirePermission('analisis:view'), handleGetAnalisis)
