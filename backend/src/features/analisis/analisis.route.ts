import { Hono } from 'hono'
import { handleGetAnalisis, handleGetRetentionAnalisis } from './analisis.handler'
import { requirePermission } from '@/middleware/permission'

export const analisisRoutes = new Hono()

// Permission direname (task025 §12, 2026-08-07): analisis:view ->
// customer.revenue:view (KPI3), analisis.retention:view -> repeat.order:view
// (KPI6) — tabel ini sekarang jadi bagian /customer-revenue & /repeat-order,
// route lama /analisis/* jadi redirect permanen (App.tsx), TAPI endpoint API
// ini TETAP dipakai (di-fetch dari halaman baru), cuma gate-nya yang berganti
// nama supaya konsisten dgn permission KPI-nya.
analisisRoutes.get('/', requirePermission('customer.revenue:view'), handleGetAnalisis)
analisisRoutes.get('/retention', requirePermission('repeat.order:view'), handleGetRetentionAnalisis)
