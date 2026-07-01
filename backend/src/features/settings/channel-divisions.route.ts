import { Hono } from 'hono'
import {
  handleListChannelDivisions,
  handleCreateChannelDivision,
  handleUpdateChannelDivision,
  handleDeleteChannelDivision,
  handleImportChannelDivisions,
  handleDownloadChannelDivisionsTemplate,
  handleListUnmappedChannels,
} from './channel-divisions.handler'
import { requirePermission } from '@/middleware/permission'

export const channelDivisionsRoutes = new Hono()

channelDivisionsRoutes.get('/', requirePermission('settings.channel.division:view'), handleListChannelDivisions)
channelDivisionsRoutes.get('/template', requirePermission('settings.channel.division:view'), handleDownloadChannelDivisionsTemplate)
channelDivisionsRoutes.get('/unmapped-channels', requirePermission('settings.channel.division:view'), handleListUnmappedChannels)
channelDivisionsRoutes.post('/', requirePermission('settings.channel.division:create'), handleCreateChannelDivision)
channelDivisionsRoutes.post('/import', requirePermission('settings.channel.division:create'), handleImportChannelDivisions)
channelDivisionsRoutes.patch('/:id', requirePermission('settings.channel.division:update'), handleUpdateChannelDivision)
channelDivisionsRoutes.delete('/:id', requirePermission('settings.channel.division:delete'), handleDeleteChannelDivision)
