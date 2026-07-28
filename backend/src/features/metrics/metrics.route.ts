import { Hono } from 'hono'
import { handleGetCrossSelling, handleGetCustomerMetrics, handleGetRevenueBreakdown, handleGetExpansionBreakdown, handleGetGpBreakdown, handleGetHmBreakdown, handleGetRorBreakdown, handleGetDormantMetrics, handleGetCategoryPerformance, handleGetProductPerformance, handleGetProductCategoryOptions, handleGetCategoryProducts, handleGetHmDetail, handleGetUpsellTargets, handleGetCustomerProducts, handleGetAvgCategory } from './metrics.handler'
import { requirePermission } from '@/middleware/permission'

export const metricsRoutes = new Hono()

// Permission per endpoint disamakan dengan permissionKey halaman frontend yang
// memakainya (routeConstants.tsx) — bukan 'metrics:view' generik (permission lama,
// sudah di-deprecated & tidak pernah di-seed lagi, lihat OLD_PERMISSION_NAMES di
// db/seed.ts). Sebelum ini, TIDAK ADA role non-superadmin yang bisa lolos endpoint
// manapun di sini karena 'metrics:view' tidak pernah bisa di-assign lewat RBAC UI.
metricsRoutes.get('/cross-selling',         requirePermission('cross.selling:view'), handleGetCrossSelling)
metricsRoutes.get('/customer-metrics',      requirePermission('expansion:view'), handleGetCustomerMetrics)
metricsRoutes.get('/revenue-breakdown',     requirePermission('expansion:view'), handleGetRevenueBreakdown)
metricsRoutes.get('/expansion-breakdown',   requirePermission('expansion:view'), handleGetExpansionBreakdown)
metricsRoutes.get('/gp-breakdown',          requirePermission('expansion:view'), handleGetGpBreakdown)
metricsRoutes.get('/hm-breakdown',          requirePermission('expansion:view'), handleGetHmBreakdown)
metricsRoutes.get('/ror-breakdown',         requirePermission('expansion:view'), handleGetRorBreakdown)
metricsRoutes.get('/dormant-customer',      requirePermission('churn.risk:view'), handleGetDormantMetrics)
metricsRoutes.get('/category-performance',  requirePermission('product:view'), handleGetCategoryPerformance)
metricsRoutes.get('/product-performance',   requirePermission('product:view'), handleGetProductPerformance)
metricsRoutes.get('/product-categories',    requirePermission('product:view'), handleGetProductCategoryOptions)
metricsRoutes.get('/category-products',                 requirePermission('product:view'), handleGetCategoryProducts)
metricsRoutes.get('/high-margin-penetration/detail',    requirePermission('high.margin:view'), handleGetHmDetail)
metricsRoutes.get('/high-margin-penetration/customers', requirePermission('high.margin:view'), handleGetUpsellTargets)
metricsRoutes.get('/customer-products',                  requirePermission('high.margin:view'), handleGetCustomerProducts)
metricsRoutes.get('/avg-category',                        requirePermission('product.trend:view'), handleGetAvgCategory)
