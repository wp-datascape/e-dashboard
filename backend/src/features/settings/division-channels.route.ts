import { Hono } from 'hono'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'
import {
  handleListDivisionChannels,
  handleGetDivisionChannelById,
  handleCreateDivisionChannel,
  handleUpdateDivisionChannel,
  handleDeleteDivisionChannel,
  handleImportDivisionChannels,
  handleGetDivisionChannelsTemplate,
  handleListDivisionValues,
  handleListUnmappedChannels,
} from './division-channels.handler'
import { requirePermission } from '@/middleware/permission'

const divisionChannelsRoutes = new Hono()

export { divisionChannelsRoutes }

const mutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

divisionChannelsRoutes.get('/', requirePermission('settings.division:view'), handleListDivisionChannels)
divisionChannelsRoutes.get('/values/:companyId', requirePermission('settings.division:view'), handleListDivisionValues)
divisionChannelsRoutes.get('/unmapped/:companyId', requirePermission('settings.division:view'), handleListUnmappedChannels)
divisionChannelsRoutes.get('/template', requirePermission('settings.division:view'), handleGetDivisionChannelsTemplate)
divisionChannelsRoutes.post('/import', requirePermission('settings.division:create'), mutationRateLimit, handleImportDivisionChannels)
divisionChannelsRoutes.post('/', requirePermission('settings.division:create'), mutationRateLimit, handleCreateDivisionChannel)
divisionChannelsRoutes.get('/:id', requirePermission('settings.division:view'), handleGetDivisionChannelById)
divisionChannelsRoutes.put('/:id', requirePermission('settings.division:update'), mutationRateLimit, handleUpdateDivisionChannel)
divisionChannelsRoutes.delete('/:id', requirePermission('settings.division:delete'), mutationRateLimit, handleDeleteDivisionChannel)