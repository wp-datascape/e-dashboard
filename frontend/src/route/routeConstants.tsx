import { ReactNode } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Dashboard,
  Customers,
  CustomerMetrics,
  CrossSelling,
  DormantCustomer,
  Products,
  ProductsHighMargin,
  ProductsTrend,
  Transactions,
  Projects,
  Import,
  Users,
  RBAC,
  Config,
  AuditLog,
  Companies,
} from './routeLazyComponents'

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
  'companies': { 
    path: '/companies', 
    element: withLayout(<Companies />), 
    protected: true 
  },
}
