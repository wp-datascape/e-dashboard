import { Hono } from 'hono'
import {
  handleListChannelDivisions,
  handleCreateChannelDivision,
  handleUpdateChannelDivision,
  handleDeleteChannelDivision,
  handleImportChannelDivisions,
  handleDownloadChannelDivisionsTemplate,
  handleListUnmappedChannels,
  handleListDivisionValues,
} from './channel-divisions.handler'
import { requirePermission } from '@/middleware/permission'

export const channelDivisionsRoutes = new Hono()

// /values TIDAK di-requirePermission (cuma authMiddleware) — dipakai
// useDivisionOptions() sebagai dropdown filter divisi di banyak halaman, dan
// cuma balikin nilai divisi unik (bukan channel_name asli), beda dari GET /
// di bawah yang balikin mapping lengkap dan tetap terproteksi seperti biasa.
channelDivisionsRoutes.get('/values', handleListDivisionValues)
channelDivisionsRoutes.get('/', requirePermission('settings.channel.division:view'), handleListChannelDivisions)
channelDivisionsRoutes.get('/template', requirePermission('settings.channel.division:view'), handleDownloadChannelDivisionsTemplate)
channelDivisionsRoutes.get('/unmapped-channels', requirePermission('settings.channel.division:view'), handleListUnmappedChannels)
channelDivisionsRoutes.post('/', requirePermission('settings.channel.division:create'), handleCreateChannelDivision)
channelDivisionsRoutes.post('/import', requirePermission('settings.channel.division:create'), handleImportChannelDivisions)
channelDivisionsRoutes.patch('/:id', requirePermission('settings.channel.division:update'), handleUpdateChannelDivision)
channelDivisionsRoutes.delete('/:id', requirePermission('settings.channel.division:delete'), handleDeleteChannelDivision)
