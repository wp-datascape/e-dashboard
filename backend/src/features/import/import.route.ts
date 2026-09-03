/**
 * features/import/import.route.ts
 *
 * Import API routes.
 *
 * Endpoints:
 *   POST /import/csv      — Upload file CSV/Excel (multipart)
 *   GET  /import/logs     — Riwayat import
 *   GET  /import/logs/:id — Detail import log + errors
 */
import { Hono } from 'hono'
import {
  handleImportFile,
  handleImportFileStream,
  handlePreviewImportFile,
  handleCommitImportStream,
  handleGetImportLogs,
  handleGetImportLogDetail,
  handleGetFakturTemplate,
} from './import.handler'
import { requirePermission } from '@/middleware/permission'
import { rateLimit, keyByUser } from '@/middleware/rate-limit'

export const importRoutes = new Hono()

// 5 upload per 10 menit per user (Task002 Task B, audit 2026-07-06) — beda karakter
// dari rate limit mutasi lain di app ini: ini BUKAN soal privilege escalation, tapi
// resource exhaustion. 1 file CSV bisa berisi ribuan baris -> ribuan write DB
// (upsert customer/product/invoice/invoice_items). Threshold jauh lebih rendah
// dibanding mutation lain karena upload legit memang jarang (per periode bulanan),
// bukan aktivitas berulang seperti CRUD biasa.
const importRateLimit = rateLimit({ windowMs: 10 * 60 * 1000, max: 5, keyFn: keyByUser })

importRoutes.get('/template', requirePermission('config.import:view'), handleGetFakturTemplate)
importRoutes.post('/csv', requirePermission('config.import:import'), importRateLimit, handleImportFile)
importRoutes.post('/csv/stream', requirePermission('config.import:import'), importRateLimit, handleImportFileStream)
// Review sebelum commit (task037/EDASHBOARD-588) — /preview parse+deteksi
// konflik TANPA tulis DB, /commit tulis DB berdasar pilihan user per invoice
// konflik (Timpa/Lewati). Rate limit SAMA dgn /csv di atas (bukan lebih
// longgar) — payload besar tetap mahal walau /preview tidak tulis DB.
importRoutes.post('/csv/preview', requirePermission('config.import:import'), importRateLimit, handlePreviewImportFile)
importRoutes.post('/csv/commit', requirePermission('config.import:import'), importRateLimit, handleCommitImportStream)
importRoutes.get('/logs', requirePermission('config.import:view'), handleGetImportLogs)
importRoutes.get('/logs/:id', requirePermission('config.import:view'), handleGetImportLogDetail)