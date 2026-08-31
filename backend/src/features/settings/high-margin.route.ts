import { Hono } from 'hono'
import {
  handleListHighMargins,
  handleCreateHighMargin,
  handleUpdateHighMargin,
  handleDeactivateHighMargin,
  handleDeleteHighMargin,
  handleHighMarginImportTemplate,
  handlePreviewHighMarginImport,
  handleCommitHighMarginImport,
} from './high-margin.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const highMarginRoutes = new Hono()

// 20 mutasi per 5 menit per user (Task002 Task B, audit 2026-07-06)
const highMarginMutationRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })
// Import (task036, 2026-08-31) — limit TERPISAH dari mutasi 1-record di
// atas, didesain utk 1 file besar per klik (bukan per baris) — preview
// TIDAK menulis DB (limit lebih longgar, boleh dicoba ulang), commit
// menulis banyak baris sekaligus (limit lebih ketat).
const highMarginPreviewRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 20, keyFn: keyByUser })
const highMarginCommitRateLimit = rateLimit({ windowMs: 5 * 60 * 1000, max: 5, keyFn: keyByUser })

highMarginRoutes.get('/', requirePermission('settings.product:view'), handleListHighMargins)
// /import/* WAJIB terdaftar sebelum /:id — kalau tidak, Hono bisa
// mencocokkan "import" sbg param :id (pola sama transactions.route.ts).
highMarginRoutes.get('/import/template', requirePermission('settings.product:view'), handleHighMarginImportTemplate)
highMarginRoutes.post('/import/preview', requirePermission('settings.product:view'), highMarginPreviewRateLimit, handlePreviewHighMarginImport)
highMarginRoutes.post('/import/commit', requirePermission('settings.product:create'), highMarginCommitRateLimit, handleCommitHighMarginImport)
highMarginRoutes.post('/', requirePermission('settings.product:create'), highMarginMutationRateLimit, handleCreateHighMargin)
highMarginRoutes.patch('/:id', requirePermission('settings.product:update'), highMarginMutationRateLimit, handleUpdateHighMargin)
highMarginRoutes.patch('/:id/deactivate', requirePermission('settings.product:update'), highMarginMutationRateLimit, handleDeactivateHighMargin)
highMarginRoutes.delete('/:id', requirePermission('settings.product:delete'), highMarginMutationRateLimit, handleDeleteHighMargin)
