// src/route/routes.tsx
import { lazy, ReactNode } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'

// ─── Lazy Core / Public Pages ────────────────────────────────────────────────
export const Login = lazy(() => import('../pages/Login/index'))
export const NotFound = lazy(() => import('../pages/NotFound/index'))
export const UnderMaintenance = lazy(() => import('../pages/UnderMaintenance/index'))

// ─── Lazy Protected Pages ────────────────────────────────────────────────────
const Dashboard = lazy(() => import('../pages/Dashboard/index'))
const CrossSelling = lazy(() => import('../pages/CrossSelling/index'))
const CustomerMetrics = lazy(() => import('../pages/CustomerMetrics/index'))
const DormantCustomer = lazy(() => import('../pages/DormantCustomer/index'))
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
