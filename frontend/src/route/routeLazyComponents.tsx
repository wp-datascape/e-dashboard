import { lazy } from 'react'

// ─── Lazy Core / Public Pages ────────────────────────────────────────────────
export const Login = lazy(() => import('../pages/Login/index'))
export const NotFound = lazy(() => import('../pages/NotFound/index'))
export const UnderMaintenance = lazy(() => import('../pages/UnderMaintenance/index'))

// ─── Lazy Protected Pages ────────────────────────────────────────────────────
export const Dashboard = lazy(() => import('../pages/Dashboard/index'))
export const Customers = lazy(() => import('../pages/Customers/index'))
export const CrossSelling = lazy(() => import('../pages/CrossSelling/index'))
export const CustomerMetrics = lazy(() => import('../pages/CustomerMetrics/index'))
export const DormantCustomer = lazy(() => import('../pages/DormantCustomer/index'))
export const Products = lazy(() => import('../pages/Products/index'))
export const ProductsHighMargin = lazy(() => import('../pages/ProductsHighMargin/index'))
export const ProductsTrend = lazy(() => import('../pages/ProductsTrend/index'))
export const Transactions = lazy(() => import('../pages/Transactions/index'))
export const Projects = lazy(() => import('../pages/Projects/index'))
export const Import = lazy(() => import('../pages/Import/index'))
export const Users = lazy(() => import('../pages/Users/index'))
export const RBAC = lazy(() => import('../pages/RBAC/index'))
export const Config = lazy(() => import('../pages/Config/index'))
export const AuditLog = lazy(() => import('../pages/AuditLog/index'))
export const Companies = lazy(() => import('../pages/Companies/index'))
