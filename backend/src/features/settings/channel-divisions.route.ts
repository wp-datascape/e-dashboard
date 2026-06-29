import { Hono } from 'hono'
import {
  handleListChannelDivisions,
  handleCreateChannelDivision,
  handleUpdateChannelDivision,
  handleDeleteChannelDivision,
} from './channel-divisions.handler'
import { requirePermission } from '@/middleware/permission'

export const channelDivisionsRoutes = new Hono()

channelDivisionsRoutes.get('/', requirePermission('settings.channel.division:view'), handleListChannelDivisions)
channelDivisionsRoutes.post('/', requirePermission('settings.channel.division:create'), handleCreateChannelDivision)
channelDivisionsRoutes.patch('/:id', requirePermission('settings.channel.division:update'), handleUpdateChannelDivision)
channelDivisionsRoutes.delete('/:id', requirePermission('settings.channel.division:delete'), handleDeleteChannelDivision)
