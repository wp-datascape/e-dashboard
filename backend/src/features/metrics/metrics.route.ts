import { Hono } from 'hono'
import { handleGetCrossSelling, handleGetCustomerMetrics, handleGetRevenueBreakdown, handleGetExpansionBreakdown, handleGetGpBreakdown, handleGetHmBreakdown, handleGetRorBreakdown, handleGetDormantMetrics, handleGetCategoryPerformance, handleGetProductPerformance, handleGetProductCategoryOptions, handleGetCategoryProducts, handleGetHmDetail, handleGetHmProductDetail, handleGetHmCustomers, handleGetUpsellTargets, handleGetCustomerProducts, handleGetAvgCategory } from './metrics.handler'
import { requirePermission } from '@/middleware/permission'

export const metricsRoutes = new Hono()

// Permission per endpoint disamakan dengan permissionKey halaman frontend yang
// memakainya (routeConstants.tsx) — bukan 'metrics:view' generik (permission lama,
// sudah di-deprecated & tidak pernah di-seed lagi, lihat OLD_PERMISSION_NAMES di
// db/seed.ts). Sebelum ini, TIDAK ADA role non-superadmin yang bisa lolos endpoint
// manapun di sini karena 'metrics:view' tidak pernah bisa di-assign lewat RBAC UI.
metricsRoutes.get('/cross-selling',         requirePermission('cross.selling:view'), handleGetCrossSelling)
// customer-metrics TETAP expansion:view (shared trend/chart data utk KPI3-7
// sekaligus, tidak dipecah — task025 §12). Breakdown per-KPI di bawah SUDAH
// dipecah ke permission spesifik masing-masing (rename dari expansion:view).
metricsRoutes.get('/customer-metrics',      requirePermission('expansion:view'), handleGetCustomerMetrics)
metricsRoutes.get('/revenue-breakdown',     requirePermission('customer.revenue:view'), handleGetRevenueBreakdown)
metricsRoutes.get('/expansion-breakdown',   requirePermission('customer.expansion:view'), handleGetExpansionBreakdown)
metricsRoutes.get('/gp-breakdown',          requirePermission('customer.gross.profit:view'), handleGetGpBreakdown)
metricsRoutes.get('/hm-breakdown',          requirePermission('high.margin.penetration:view'), handleGetHmBreakdown)
metricsRoutes.get('/ror-breakdown',         requirePermission('repeat.order:view'), handleGetRorBreakdown)
metricsRoutes.get('/dormant-customer',      requirePermission('churn.risk:view'), handleGetDormantMetrics)
metricsRoutes.get('/category-performance',  requirePermission('product:view'), handleGetCategoryPerformance)
metricsRoutes.get('/product-performance',   requirePermission('product:view'), handleGetProductPerformance)
metricsRoutes.get('/product-categories',    requirePermission('product:view'), handleGetProductCategoryOptions)
metricsRoutes.get('/category-products',                 requirePermission('product:view'), handleGetCategoryProducts)
metricsRoutes.get('/high-margin-penetration/detail',    requirePermission('high.margin:view'), handleGetHmDetail)
// task017 lanjutan — view flat per-produk (default baru), lihat catatan di
// fetchHmProductDetail(). Permission sama dgn /detail (kategori, sekunder).
metricsRoutes.get('/high-margin-penetration/products',  requirePermission('high.margin:view'), handleGetHmProductDetail)
metricsRoutes.get('/high-margin-penetration/customers', requirePermission('high.margin:view'), handleGetUpsellTargets)
// task017 — drill-down "Customer Pembeli" (produk/kategori HM), permission sama
// dgn tab Category Penetration/Upsell Targets di atas.
metricsRoutes.get('/high-margin-penetration/buyers',    requirePermission('high.margin:view'), handleGetHmCustomers)
metricsRoutes.get('/customer-products',                  requirePermission('high.margin:view'), handleGetCustomerProducts)
metricsRoutes.get('/avg-category',                        requirePermission('product.trend:view'), handleGetAvgCategory)
