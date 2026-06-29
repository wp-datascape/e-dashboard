import { Hono } from 'hono'
import {
  handleGetConfigs, handleUpdateConfig,
  handleGetAccurateCredentials, handleSaveAccurateCredentials,
  handleTestAccurateConnection,
} from './config.handler'
import { requirePermission } from '@/middleware/permission'

export const configRoutes = new Hono()

// Business configs (threshold settings)
configRoutes.get('/', requirePermission('settings.threshold:view'), handleGetConfigs)
configRoutes.put('/:key', requirePermission('settings.threshold:update'), handleUpdateConfig)

// Accurate integration credentials
configRoutes.get('/accurate/credentials/:branchId', requirePermission('config.integration:view'), handleGetAccurateCredentials)
configRoutes.put('/accurate/credentials/:branchId', requirePermission('config.integration:create', 'config.integration:update'), handleSaveAccurateCredentials)
configRoutes.post('/accurate/test-connection', requirePermission('config.integration:test'), handleTestAccurateConnection)
