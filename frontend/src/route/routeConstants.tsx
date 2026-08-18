import { ReactNode } from 'react'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import {
  Dashboard,
  Customers,
  CrossSelling,
  AvgCategoryPerCustomer,
  DormantRate,
  DormantValue,
  ReactivationRate,
  CustomerRevenue,
  CustomerGrossProfit,
  HighMarginPenetration,
  RepeatOrder,
  CustomerExpansion,
  Products,
  ProductsHighMargin,
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
  ParetoCustomersSettings,
  NotificationsPage,
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
  'cross-selling':        { path: '/cross-selling',          element: withLayout(<CrossSelling />),          protected: true, permissionKey: 'cross.selling:view' },
  // CrossSelling (bundel KPI1+KPI2) dipecah task025 §14 — permission TETAP
  // 1 (`cross.selling:*`, reuse), backend juga masih 1 endpoint gabungan;
  // menggantikan `products-trend` (dihapus, redundan).
  'avg-category-per-customer': { path: '/avg-category-per-customer', element: withLayout(<AvgCategoryPerCustomer />), protected: true, permissionKey: 'cross.selling:view' },
  // DormantCustomer (bundel M8+M9+M10) dipecah task025 §7a — permission TETAP
  // 1 (`churn.risk:*`, reuse), backend juga masih 1 endpoint gabungan; lihat
  // rationale lengkap di task025.md §7a.
  'dormant-rate':         { path: '/dormant-rate',           element: withLayout(<DormantRate />),           protected: true, permissionKey: 'churn.risk:view' },
  'dormant-value':        { path: '/dormant-value',          element: withLayout(<DormantValue />),          protected: true, permissionKey: 'churn.risk:view' },
  'reactivation-rate':    { path: '/reactivation-rate',       element: withLayout(<ReactivationRate />),      protected: true, permissionKey: 'churn.risk:view' },
  // CustomerMetrics (bundel M3-M7) dipecah task025 §12 — 5 permission
  // spesifik per-KPI (rename dari expansion:*/analisis:*/analisis.retention:*,
  // lihat backend/src/db/seed.ts migrateRenamedPermissions()).
  'customer-revenue':       { path: '/customer-revenue',       element: withLayout(<CustomerRevenue />),       protected: true, permissionKey: 'customer.revenue:view' },
  // CustomerGrossProfit (KPI4) — pilot pertama revert Fase 3 (task026 §8,
  // 2026-08-09): 1 halaman gabungan chart+tabel lagi, TIDAK ada prop `mode`.
  'customer-gross-profit':  { path: '/customer-gross-profit',  element: withLayout(<CustomerGrossProfit />),   protected: true, permissionKey: 'customer.gross.profit:view' },
  'high-margin-penetration': { path: '/high-margin-penetration', element: withLayout(<HighMarginPenetration />), protected: true, permissionKey: 'high.margin.penetration:view' },
  'repeat-order':           { path: '/repeat-order',           element: withLayout(<RepeatOrder />),           protected: true, permissionKey: 'repeat.order:view' },
  'customer-expansion':     { path: '/customer-expansion',      element: withLayout(<CustomerExpansion />),     protected: true, permissionKey: 'customer.expansion:view' },
  // ── Route `/report/*` DIHAPUS (2026-08-10) — 9 halaman KPI di atas
  // sekarang 1 halaman gabungan chart+tabel spt CustomerGrossProfit/KPI4
  // (tidak ada lagi prop `mode`), jadi `/report/*` cuma duplikat murni dari
  // route Statistik di atas (komponen sama persis). Nav grup "Report" di
  // config/menu.tsx ikut dihapus (lihat komentar di sana).
  // ── Product & Portfolio ──────────────────────────────────────────────────
  'products':             { path: '/products',               element: withLayout(<Products />),              protected: true, permissionKey: 'product:view' },
  'products-high-margin': { path: '/products/high-margin',   element: withLayout(<ProductsHighMargin />),    protected: true, permissionKey: 'high.margin:view' },
  // ── Transaction & Revenue ────────────────────────────────────────────────
  'transactions':         { path: '/transactions',           element: withLayout(<Transactions />),          protected: true, permissionKey: 'transaction:view' },
  'projects':             { path: '/projects',               element: withLayout(<Projects />),              protected: true, permissionKey: 'project:view' },
  // Personal, tidak butuh permission spesifik — siapa pun yang login berhak
  // lihat notifikasi miliknya sendiri (di-scope by user_id di backend).
  'notifications':        { path: '/notifications',           element: withLayout(<NotificationsPage />),      protected: true, permissionKey: 'notifications:view' },
  // ── Administration — Settings ────────────────────────────────────────────
  'settings-app':         { path: '/settings/app',           element: withLayout(<AppSettings />),           protected: true, permissionKey: 'settings.app:view' },
  'companies':            { path: '/companies',              element: withLayout(<Companies />),             protected: true, permissionKey: 'settings.company:view' },
  'settings-divisions':   { path: '/settings/divisions',     element: withLayout(<DivisionsSettings />),     protected: true, permissionKey: 'settings.channel.division:view' },
  'settings-division-management':    { path: '/settings/division-management',   element: withLayout(<DivisionManagementSettings />),    protected: true, permissionKey: 'settings.division:view' },
  'settings-customer-intercompany':  { path: '/settings/customer-intercompany', element: withLayout(<CustomerIntercompanySettings />),  protected: true, permissionKey: 'settings.intercompany:view' },
  'settings-high-margin': { path: '/settings/high-margin',   element: withLayout(<HighMarginSettings />),    protected: true, permissionKey: 'settings.product:view' },
  'settings-threshold':   { path: '/settings/threshold',     element: withLayout(<ThresholdSettings />),     protected: true, permissionKey: 'settings.threshold:view' },
  'settings-pareto-customers': { path: '/settings/pareto-customers', element: withLayout(<ParetoCustomersSettings />), protected: true, permissionKey: 'settings.pareto:view' },
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
