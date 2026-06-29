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
import { handleImportFile, handleImportFileStream, handleGetImportLogs, handleGetImportLogDetail, handleGetFakturTemplate } from './import.handler'
import { requirePermission } from '@/middleware/permission'

export const importRoutes = new Hono()

importRoutes.get('/template', requirePermission('config.import:view'), handleGetFakturTemplate)
importRoutes.post('/csv', requirePermission('config.import:import'), handleImportFile)
importRoutes.post('/csv/stream', requirePermission('config.import:import'), handleImportFileStream)
importRoutes.get('/logs', requirePermission('config.import:view'), handleGetImportLogs)
importRoutes.get('/logs/:id', requirePermission('config.import:view'), handleGetImportLogDetail)