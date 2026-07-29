/**
 * features/settings/intercompany-names.route.ts
 *
 * Daftar nama customer (per company) yang representasi sister company (task013).
 * Dipakai sync otomatis ke customers.division_override_id - lihat
 * docs-v2/task/task013.md §3.
 *
 * Endpoints:
 *   GET    /settings/intercompany-names                    — List per company
 *   POST   /settings/intercompany-names                    — Tambah nama, langsung sync override
 *   DELETE /settings/intercompany-names/:id                — Hapus nama, langsung clear override
 *   GET    /settings/intercompany-names/ambiguous-channels — Deteksi channel dipakai campuran (proaktif)
 */
import { Hono } from 'hono'
import {
  handleListIntercompanyNames,
  handleCreateIntercompanyName,
  handleDeleteIntercompanyName,
  handleListAmbiguousChannels,
} from './intercompany-names.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const intercompanyNamesRoutes = new Hono()

const intercompanyMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })

// Route statis '/ambiguous-channels' WAJIB didaftar sebelum '/:id' (delete) supaya
// tidak ketabrak param matching Hono - tapi ini GET vs DELETE beda method jadi
// aman, taruh di atas cuma soal keterbacaan urutan endpoint di file.
intercompanyNamesRoutes.get('/ambiguous-channels', requirePermission('settings.intercompany:view'), handleListAmbiguousChannels)
intercompanyNamesRoutes.get('/', requirePermission('settings.intercompany:view'), handleListIntercompanyNames)
intercompanyNamesRoutes.post('/', requirePermission('settings.intercompany:create'), intercompanyMutationRateLimit, handleCreateIntercompanyName)
intercompanyNamesRoutes.delete('/:id', requirePermission('settings.intercompany:delete'), intercompanyMutationRateLimit, handleDeleteIntercompanyName)
