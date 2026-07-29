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
  ActivityLog,
  LoginLog,
  Companies,
  HighMarginSettings,
  DivisionsSettings,
  DivisionManagementSettings,
  CustomerIntercompanySettings,
  ClassificationSettings,
  ThresholdSettings,
  AppSettings,
  IntegrationPage,
  FeaturesPage,
  AbTesting,
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
  permissionKey?: string  // permission yang diperlukan untuk akses halaman ini
}

// ─── Route Registry Dictionary ───────────────────────────────────────────────
export const routeRegistry: Record<string, RouteRegistryItem> = {
  // ── Executive Dashboard ─────────────────────────────────────────────────
  'dashboard':            { path: '/dashboard',              element: withLayout(<Dashboard />),             protected: true, permissionKey: 'dashboard:view' },
  // ── Customer Workbench ───────────────────────────────────────────────────
  'customers':            { path: '/customers',              element: withLayout(<Customers />),             protected: true, permissionKey: 'customer:view' },
  'customers-expansion':  { path: '/customer-metrics',       element: withLayout(<CustomerMetrics />),       protected: true, permissionKey: 'expansion:view' },
  'cross-selling':        { path: '/cross-selling',          element: withLayout(<CrossSelling />),          protected: true, permissionKey: 'cross.selling:view' },
  'dormant-customer':     { path: '/dormant-customer',       element: withLayout(<DormantCustomer />),       protected: true, permissionKey: 'churn.risk:view' },
  // ── Product & Portfolio ──────────────────────────────────────────────────
  'products':             { path: '/products',               element: withLayout(<Products />),              protected: true, permissionKey: 'product:view' },
  'products-high-margin': { path: '/products/high-margin',   element: withLayout(<ProductsHighMargin />),    protected: true, permissionKey: 'high.margin:view' },
  'products-trend':       { path: '/products/trend',         element: withLayout(<ProductsTrend />),         protected: true, permissionKey: 'product.trend:view' },
  // ── Transaction & Revenue ────────────────────────────────────────────────
  'transactions':         { path: '/transactions',           element: withLayout(<Transactions />),          protected: true, permissionKey: 'transaction:view' },
  'projects':             { path: '/projects',               element: withLayout(<Projects />),              protected: true, permissionKey: 'project:view' },
  // ── Administration — Settings ────────────────────────────────────────────
  'settings-app':         { path: '/settings/app',           element: withLayout(<AppSettings />),           protected: true, permissionKey: 'settings.app:view' },
  'companies':            { path: '/companies',              element: withLayout(<Companies />),             protected: true, permissionKey: 'settings.company:view' },
  'settings-divisions':   { path: '/settings/divisions',     element: withLayout(<DivisionsSettings />),     protected: true, permissionKey: 'settings.channel.division:view' },
  'settings-division-management':    { path: '/settings/division-management',   element: withLayout(<DivisionManagementSettings />),    protected: true, permissionKey: 'settings.division:view' },
  'settings-customer-intercompany':  { path: '/settings/customer-intercompany', element: withLayout(<CustomerIntercompanySettings />),  protected: true, permissionKey: 'settings.intercompany:view' },
  'settings-high-margin': { path: '/settings/high-margin',   element: withLayout(<HighMarginSettings />),    protected: true, permissionKey: 'settings.product:view' },
  'settings-threshold':   { path: '/settings/threshold',     element: withLayout(<ThresholdSettings />),     protected: true, permissionKey: 'settings.threshold:view' },
  // ── Administration — Configuration ───────────────────────────────────────
  'settings-classification': { path: '/settings/classification', element: withLayout(<ClassificationSettings />), protected: true, permissionKey: 'config.classification:view' },
  'import':               { path: '/import',                 element: withLayout(<Import />),                protected: true, permissionKey: 'config.import:view' },
  'config-integration':   { path: '/config/integration',     element: withLayout(<IntegrationPage />),       protected: true, permissionKey: 'config.integration:view' },
  'config-features':      { path: '/config/features',        element: withLayout(<FeaturesPage />),          protected: true, permissionKey: 'config.features:view' },
  // ── Administration — Access Control ──────────────────────────────────────
  'users':                { path: '/users',                  element: withLayout(<Users />),                 protected: true, permissionKey: 'access.user:view' },
  'rbac':                 { path: '/rbac',                   element: withLayout(<RBAC />),                  protected: true, permissionKey: 'access.role:view' },
  'ab-testing':           { path: '/ab-testing',              element: withLayout(<AbTesting />),             protected: true, permissionKey: 'access.ab_testing:view' },
  // ── Administration — Log ──────────────────────────────────────────────────
  'audit-log':            { path: '/audit-log',              element: withLayout(<AuditLog />),              protected: true, permissionKey: 'audit.log:view' },
  'activity-log':         { path: '/activity-log',            element: withLayout(<ActivityLog />),           protected: true, permissionKey: 'activity.log:view' },
  'login-log':            { path: '/login-log',               element: withLayout(<LoginLog />),              protected: true, permissionKey: 'login.log:view' },
  // ── Legacy (backward compat — tidak di menu) ─────────────────────────────
  'config':               { path: '/config',                 element: withLayout(<Config />),                protected: true },
}
