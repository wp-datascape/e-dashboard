import { Hono } from 'hono'
import {
  handleListChannelDivisions,
  handleCreateChannelDivision,
  handleUpdateChannelDivision,
  handleDeleteChannelDivision,
} from './channel-divisions.handler'

export const channelDivisionsRoutes = new Hono()

channelDivisionsRoutes.get('/', handleListChannelDivisions)
channelDivisionsRoutes.post('/', handleCreateChannelDivision)
channelDivisionsRoutes.patch('/:id', handleUpdateChannelDivision)
channelDivisionsRoutes.delete('/:id', handleDeleteChannelDivision)
