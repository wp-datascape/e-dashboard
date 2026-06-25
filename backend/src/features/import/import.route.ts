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
import { handleImportFile, handleImportFileStream, handleGetImportLogs, handleGetImportLogDetail } from './import.handler'

export const importRoutes = new Hono()

// POST /import/csv — Upload & process file (one-shot response)
importRoutes.post('/csv', handleImportFile)

// POST /import/csv/stream — Upload & process file (SSE streaming progress)
importRoutes.post('/csv/stream', handleImportFileStream)

// GET /import/logs — Riwayat import
importRoutes.get('/logs', handleGetImportLogs)

// GET /import/logs/:id — Detail import log
importRoutes.get('/logs/:id', handleGetImportLogDetail)