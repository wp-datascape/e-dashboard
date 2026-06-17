// src/route/routes.tsx
import { lazy, ReactNode } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

// ─── Lazy Core / Public Pages ────────────────────────────────────────────────
export const Login = lazy(() => import('../pages/Login/index'))
export const NotFound = lazy(() => import('../pages/NotFound/index'))
export const UnderMaintenance = lazy(() => import('../pages/UnderMaintenance/index'))

// ─── Lazy Protected Pages ────────────────────────────────────────────────────
const Dashboard = lazy(() => import('../pages/Dashboard/index'))
const Customers = lazy(() => import('../pages/Customers/index'))
const CrossSelling = lazy(() => import('../pages/CrossSelling/index'))
const CustomerMetrics = lazy(() => import('../pages/CustomerMetrics/index'))
const DormantCustomer = lazy(() => import('../pages/DormantCustomer/index'))
const Products = lazy(() => import('../pages/Products/index'))
const ProductsHighMargin = lazy(() => import('../pages/ProductsHighMargin/index'))
const ProductsTrend = lazy(() => import('../pages/ProductsTrend/index'))
const Transactions = lazy(() => import('../pages/Transactions/index'))
const Projects = lazy(() => import('../pages/Projects/index'))
const Import = lazy(() => import('../pages/Import/index'))
const Users = lazy(() => import('../pages/Users/index'))
const RBAC = lazy(() => import('../pages/RBAC/index'))
const Config = lazy(() => import('../pages/Config/index'))
const AuditLog = lazy(() => import('../pages/AuditLog/index'))

// Helper: wrap page in DashboardLayout
const withLayout = (page: ReactNode) => (
  <DashboardLayout>{page}</DashboardLayout>
)

// ─── Route Registry Contract Type ────────────────────────────────────────────
export interface RouteRegistryItem {
  path: string
  element: ReactNode
  protected: boolean
}

// ─── Route Registry Dictionary ───────────────────────────────────────────────
// Key di bawah ini (misal: 'dashboard') harus sama persis dengan 'pageKey' 
// yang dikirim oleh Mock MSW / Database Backend Anda.
export const routeRegistry: Record<string, RouteRegistryItem> = {
  'dashboard': { 
    path: '/dashboard', 
    element: withLayout(<Dashboard />), 
    protected: true 
  },
  'customers': { 
    path: '/customers', 
    element: withLayout(<Customers />), 
    protected: true 
  },
  'customers-expansion': { 
    path: '/customer-metrics', 
    element: withLayout(<CustomerMetrics />), 
    protected: true 
  },
  'cross-selling': { 
    path: '/cross-selling', 
    element: withLayout(<CrossSelling />), 
    protected: true 
  },
  'customer-metrics': { 
    path: '/customer-metrics', 
    element: withLayout(<CustomerMetrics />), 
    protected: true 
  },
  'dormant-customer': { 
    path: '/dormant-customer', 
    element: withLayout(<DormantCustomer />), 
    protected: true 
  },
  'products': { 
    path: '/products', 
    element: withLayout(<Products />), 
    protected: true 
  },
  'products-high-margin': { 
    path: '/products/high-margin', 
    element: withLayout(<ProductsHighMargin />), 
    protected: true 
  },
  'products-trend': { 
    path: '/products/trend', 
    element: withLayout(<ProductsTrend />), 
    protected: true 
  },
  'transactions': { 
    path: '/transactions', 
    element: withLayout(<Transactions />), 
    protected: true 
  },
  'projects': { 
    path: '/projects', 
    element: withLayout(<Projects />), 
    protected: true 
  },
  'import': { 
    path: '/import', 
    element: withLayout(<Import />), 
    protected: true 
  },
  'users': { 
    path: '/users', 
    element: withLayout(<Users />), 
    protected: true 
  },
  'rbac': { 
    path: '/rbac', 
    element: withLayout(<RBAC />), 
    protected: true 
  },
  'config': { 
    path: '/config', 
    element: withLayout(<Config />), 
    protected: true 
  },
  'audit-log': { 
    path: '/audit-log', 
    element: withLayout(<AuditLog />), 
    protected: true 
  },
}
