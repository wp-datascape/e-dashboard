import { lazy } from 'react'

// ─── Lazy Core / Public Pages ────────────────────────────────────────────────
export const Login = lazy(() => import('../pages/Login/index'))
export const NotFound = lazy(() => import('../pages/NotFound/index'))
export const Forbidden = lazy(() => import('../pages/Forbidden/index'))
export const UnderMaintenance = lazy(() => import('../pages/UnderMaintenance/index'))

// ─── Lazy Protected Pages ────────────────────────────────────────────────────
export const Dashboard = lazy(() => import('../pages/Dashboard/index'))
export const Customers = lazy(() => import('../pages/Customers/index'))
export const CrossSelling = lazy(() => import('../pages/CrossSelling/index'))
// CrossSelling (bundel KPI1+KPI2, 1 route) dipecah task025 §14 — KPI2 (M2,
// rata-rata kategori per customer) pindah ke halaman sendiri, menggantikan
// `ProductsTrend` (`/products/trend`) yang REDUNDAN (endpoint lamanya cuma
// agregat tanpa detail per customer).
export const AvgCategoryPerCustomer = lazy(() => import('../pages/AvgCategoryPerCustomer/index'))
// DormantCustomer (bundel M8+M9+M10, 1 route) dipecah jadi 3 halaman task025
// §7a, mengikuti ux-menu-mapping.md v8 "1 route = 1 KPI" — TIDAK ADA lagi
// pola multi-section/sub-nav.
export const DormantRate = lazy(() => import('../pages/DormantRate/index'))
export const DormantValue = lazy(() => import('../pages/DormantValue/index'))
export const ReactivationRate = lazy(() => import('../pages/ReactivationRate/index'))
// CustomerMetrics (bundel M3-M7, 1 route) dipecah jadi 5 halaman KPI task025
// §12 — sama pola dgn DormantCustomer di atas. /analisis/revenue &
// /analisis/retention (tabel KPI3/KPI6 yang direuse) DIGABUNG ke sini juga.
export const CustomerRevenue = lazy(() => import('../pages/CustomerRevenue/index'))
export const CustomerGrossProfit = lazy(() => import('../pages/CustomerGrossProfit/index'))
export const HighMarginPenetration = lazy(() => import('../pages/HighMarginPenetration/index'))
export const RepeatOrder = lazy(() => import('../pages/RepeatOrder/index'))
export const CustomerExpansion = lazy(() => import('../pages/CustomerExpansion/index'))
export const Products = lazy(() => import('../pages/Products/index'))
export const ProductsHighMargin = lazy(() => import('../pages/ProductsHighMargin/index'))
export const Transactions = lazy(() => import('../pages/Transactions/index'))
export const Projects = lazy(() => import('../pages/Projects/index'))
export const Import = lazy(() => import('../pages/Import/index'))
export const Users = lazy(() => import('../pages/Users/index'))
export const RBAC = lazy(() => import('../pages/RBAC/index'))
export const Config = lazy(() => import('../pages/Config/index'))
export const AuditLog = lazy(() => import('../pages/AuditLog/index'))
export const ActivityLog = lazy(() => import('../pages/ActivityLog/index'))
export const LoginLog = lazy(() => import('../pages/LoginLog/index'))
export const Companies = lazy(() => import('../pages/Companies/index'))
export const HighMarginSettings = lazy(() => import('../pages/Settings/HighMargin/index'))
export const DivisionsSettings = lazy(() => import('../pages/Settings/Divisions/index'))
export const DivisionManagementSettings = lazy(() => import('../pages/Settings/DivisionManagement/index'))
export const CustomerIntercompanySettings = lazy(() => import('../pages/Settings/CustomerIntercompany/index'))
export const ClassificationSettings = lazy(() => import('../pages/Config/Classification/index'))
export const ThresholdSettings = lazy(() => import('../pages/Settings/Threshold/index'))
export const ParetoCustomersSettings = lazy(() => import('../pages/Settings/ParetoCustomers/index'))
export const NotificationsPage = lazy(() => import('../pages/Notifications/index'))
export const AppSettings = lazy(() => import('../pages/Settings/AppSettings/index'))
export const IntegrationPage = lazy(() => import('../pages/Config/Integration/index'))
export const FeaturesPage = lazy(() => import('../pages/Config/Features/index'))
export const AbTesting = lazy(() => import('../pages/AbTesting/index'))
