import { Hono } from 'hono'
import { requirePermission } from '@/middleware/permission'
import { handleGetLoginLogs, handleGetLoginLogById } from './login-log.handler'

export const loginLogRoutes = new Hono()

// Read-only — tidak ada endpoint tulis publik, insert cuma lewat logLoginEvent()
// dipanggil internal dari auth.service.ts / user.service.ts.
loginLogRoutes.get('/', requirePermission('login.log:view'), handleGetLoginLogs)
loginLogRoutes.get('/:id', requirePermission('login.log:view'), handleGetLoginLogById)
