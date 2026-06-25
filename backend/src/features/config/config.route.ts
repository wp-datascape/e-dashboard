import { Hono } from 'hono'
import {
  handleGetConfigs, handleUpdateConfig,
  handleGetAccurateCredentials, handleSaveAccurateCredentials,
  handleTestAccurateConnection,
} from './config.handler'

export const configRoutes = new Hono()

configRoutes.get('/', handleGetConfigs)
configRoutes.put('/:key', handleUpdateConfig)
configRoutes.get('/accurate/credentials/:branchId', handleGetAccurateCredentials)
configRoutes.put('/accurate/credentials/:branchId', handleSaveAccurateCredentials)
configRoutes.post('/accurate/test-connection', handleTestAccurateConnection)
