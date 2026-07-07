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
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const channelDivisionsRoutes = new Hono()

// 20 mutasi per 5 menit per user (Task002 Task B, audit 2026-07-06) — channel_divisions
// dipakai untuk derive division scope RBAC (task001 §3.5), bukan cuma laporan.
const channelDivisionMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

// /values TIDAK di-requirePermission (cuma authMiddleware) — dipakai
// useDivisionOptions() sebagai dropdown filter divisi di banyak halaman, dan
// cuma balikin nilai divisi unik (bukan channel_name asli), beda dari GET /
// di bawah yang balikin mapping lengkap dan tetap terproteksi seperti biasa.
channelDivisionsRoutes.get('/values', handleListDivisionValues)
channelDivisionsRoutes.get('/', requirePermission('settings.channel.division:view'), handleListChannelDivisions)
channelDivisionsRoutes.get('/template', requirePermission('settings.channel.division:view'), handleDownloadChannelDivisionsTemplate)
channelDivisionsRoutes.get('/unmapped-channels', requirePermission('settings.channel.division:view'), handleListUnmappedChannels)
channelDivisionsRoutes.post('/', requirePermission('settings.channel.division:create'), channelDivisionMutationRateLimit, handleCreateChannelDivision)
channelDivisionsRoutes.post('/import', requirePermission('settings.channel.division:create'), channelDivisionMutationRateLimit, handleImportChannelDivisions)
channelDivisionsRoutes.patch('/:id', requirePermission('settings.channel.division:update'), channelDivisionMutationRateLimit, handleUpdateChannelDivision)
channelDivisionsRoutes.delete('/:id', requirePermission('settings.channel.division:delete'), channelDivisionMutationRateLimit, handleDeleteChannelDivision)
